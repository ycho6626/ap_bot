import { supabaseService, createLogger } from '@ap/shared';
import { traceDatabaseOperation } from '@ap/shared';
// import { hybridRetrieval } from './retrieval';
import type { KbCanonicalSolution } from '@ap/shared';

/**
 * Canonical solution with metadata
 */
export interface CanonicalResult {
  solution: KbCanonicalSolution;
  score: number;
  relevance: number;
  metadata: {
    topic?: string;
    subtopic?: string;
    difficulty?: string;
    examVariant?: 'calc_ab' | 'calc_bc';
  };
}

/**
 * Canonical solution search options
 */
export interface CanonicalSearchOptions {
  examVariant?: 'calc_ab' | 'calc_bc';
  topic?: string;
  subtopic?: string;
  difficulty?: string;
  limit?: number;
  minScore?: number;
}

/**
 * Canonical solution formatter
 */
export interface FormattedStep {
  step: number;
  description: string;
  work: string;
  justification?: string | undefined;
  theorem?: string | undefined;
}

/**
 * Canonical solution manager
 */
export class CanonicalManager {
  private logger = createLogger('canonical-manager');

  /**
   * Find the best canonical solution for a query
   * @param query - Search query
   * @param options - Search options
   * @returns Best canonical solution or null
   */
  async findBestCanonical(
    query: string,
    options: CanonicalSearchOptions = {}
  ): Promise<CanonicalResult | null> {
    const {
      examVariant = 'calc_ab',
      topic,
      subtopic,
      difficulty,
      limit = 5,
      minScore = 0.3,
    } = options;

    this.logger.debug(
      { query, examVariant, topic, subtopic, difficulty },
      'Finding best canonical solution'
    );

    try {
      // Search for canonical solutions
      const searchOptions: CanonicalSearchOptions = {
        examVariant,
        limit: limit || 10,
        minScore,
      };

      if (topic) searchOptions.topic = topic;
      if (subtopic) searchOptions.subtopic = subtopic;
      if (difficulty) searchOptions.difficulty = difficulty;

      const candidates = await this.searchCanonicalSolutions(query, searchOptions);

      if (candidates.length === 0) {
        this.logger.debug({ query }, 'No canonical solutions found');
        return null;
      }

      // Select the best candidate
      const best = candidates[0];

      if (!best) {
        this.logger.debug({ query }, 'No canonical solutions found');
        return null;
      }

      this.logger.debug(
        {
          query,
          solutionId: best.solution.id,
          score: best.score,
          relevance: best.relevance,
        },
        'Found best canonical solution'
      );

      return best;
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to find canonical solution'
      );
      throw error;
    }
  }

  /**
   * Search for canonical solutions
   * @param query - Search query
   * @param options - Search options
   * @returns Array of canonical solutions
   */
  private async searchCanonicalSolutions(
    query: string,
    options: CanonicalSearchOptions
  ): Promise<CanonicalResult[]> {
    return traceDatabaseOperation(
      'search_canonical_solutions',
      'kb_canonical_solution',
      async () => {
        const { examVariant, topic, subtopic, difficulty, limit, minScore } = options;

        // Build the query
        let queryBuilder = supabaseService
          .from('kb_canonical_solution')
          .select(
            `
            *,
            kb_canonical_embedding!inner(embedding)
          `
          )
          .eq('subject', 'calc')
          .limit(limit || 10);

        // Apply exam variant filter
        if (examVariant) {
          queryBuilder = queryBuilder.or(`exam_variant.eq.${examVariant},exam_variant.is.null`);
        }

        // Apply topic filter
        if (topic) {
          queryBuilder = queryBuilder.eq('topic', topic);
        }

        // Apply subtopic filter
        if (subtopic) {
          queryBuilder = queryBuilder.eq('subtopic', subtopic);
        }

        // Apply difficulty filter
        if (difficulty) {
          queryBuilder = queryBuilder.eq('difficulty', difficulty);
        }

        const { data, error } = await queryBuilder;

        if (error) {
          throw new Error(`Canonical solution search failed: ${error.message}`);
        }

        // Calculate relevance scores
        const results = (data || []).map(solution => {
          const relevance = this.calculateRelevance(solution, query, examVariant || 'calc_ab');
          const score = this.calculateScore(solution, query, examVariant || 'calc_ab');

          return {
            solution,
            score,
            relevance,
            metadata: {
              topic: solution.topic || undefined,
              subtopic: solution.subtopic || undefined,
              difficulty: solution.difficulty || undefined,
              examVariant: solution.exam_variant || undefined,
            },
          };
        });

        // Filter by minimum score and sort by relevance
        return results
          .filter(result => result.score >= (minScore || 0))
          .sort((a, b) => b.relevance - a.relevance);
      }
    );
  }

  /**
   * Calculate relevance score for a canonical solution
   * @param solution - Canonical solution
   * @param query - Search query
   * @param examVariant - Exam variant
   * @returns Relevance score
   */
  private calculateRelevance(
    solution: KbCanonicalSolution,
    query: string,
    examVariant: 'calc_ab' | 'calc_bc'
  ): number {
    let relevance = 0;

    // Text similarity - use question_template and final_answer
    const queryLower = query.toLowerCase();
    const questionLower = solution.question_template.toLowerCase();
    const answerLower = solution.final_answer.toLowerCase();
    const contentLower = `${questionLower} ${answerLower}`;

    // Check for exact matches
    if (contentLower.includes(queryLower)) {
      relevance += 0.5;
    }

    // Check for keyword matches
    const queryWords = queryLower.split(/\s+/);
    const contentWords = contentLower.split(/\s+/);
    const matchingWords = queryWords.filter(word =>
      contentWords.some((contentWord: string) => contentWord.includes(word))
    );
    relevance += (matchingWords.length / queryWords.length) * 0.3;

    // Exam variant relevance
    if (solution.exam_variant === examVariant) {
      relevance += 0.2;
    } else if (solution.exam_variant === null) {
      relevance += 0.1;
    }

    return Math.min(relevance, 1.0);
  }

  /**
   * Calculate overall score for a canonical solution
   * @param solution - Canonical solution
   * @param query - Search query
   * @param examVariant - Exam variant
   * @returns Overall score
   */
  private calculateScore(
    solution: KbCanonicalSolution,
    query: string,
    examVariant: 'calc_ab' | 'calc_bc'
  ): number {
    const relevance = this.calculateRelevance(solution, query, examVariant);

    // Quality factors
    let quality = 1.0;

    // Prefer solutions with more steps
    if (solution.steps.length > 3) {
      quality += 0.1;
    }

    // Prefer solutions with detailed work
    const totalWork = solution.steps.reduce((sum, step) => sum + step.work.length, 0);
    if (totalWork > 200) {
      quality += 0.1;
    }

    // Prefer solutions with justifications
    const hasJustification = solution.steps.some(
      step => step.description.includes('because') || step.description.includes('since')
    );
    if (hasJustification) {
      quality += 0.1;
    }

    return relevance * quality;
  }

  /**
   * Format canonical solution steps
   * @param solution - Canonical solution
   * @returns Formatted steps
   */
  formatSteps(solution: KbCanonicalSolution): FormattedStep[] {
    const steps: FormattedStep[] = [];

    // Use the structured steps from the solution
    solution.steps.forEach(step => {
      const justification = this.extractJustification(step.description);
      const theorem = this.extractTheorem(step.description);

      steps.push({
        step: step.step,
        description: step.description,
        work: step.work,
        justification: justification || undefined,
        theorem: theorem || undefined,
      });
    });

    // If no steps found, create a single step
    if (steps.length === 0) {
      steps.push({
        step: 1,
        description: 'Solution',
        work: solution.final_answer,
      });
    }

    return steps;
  }

  /**
   * Extract justification from step text
   * @param stepText - Step text
   * @returns Justification
   */
  private extractJustification(stepText: string): string | undefined {
    const patterns = [
      /(?:because|since|as|due to|by)\s+[^]*?(?=\n|$)/i,
      /(?:This is because|This follows from|We can do this because)\s+[^]*?(?=\n|$)/i,
    ];

    for (const pattern of patterns) {
      const match = stepText.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }

    return undefined;
  }

  /**
   * Extract theorem reference from step text
   * @param stepText - Step text
   * @returns Theorem name
   */
  private extractTheorem(stepText: string): string | undefined {
    const theorems = [
      'Mean Value Theorem',
      'Intermediate Value Theorem',
      "Rolle's Theorem",
      'Fundamental Theorem of Calculus',
      'Chain Rule',
      'Product Rule',
      'Quotient Rule',
      "L'Hôpital's Rule",
      'Squeeze Theorem',
    ];

    for (const theorem of theorems) {
      if (stepText.includes(theorem)) {
        return theorem;
      }
    }

    return undefined;
  }

  /**
   * Get canonical solution by ID
   * @param id - Solution ID
   * @returns Canonical solution or null
   */
  async getCanonicalById(id: string): Promise<KbCanonicalSolution | null> {
    return traceDatabaseOperation('get_canonical_by_id', 'kb_canonical_solution', async () => {
      const { data, error } = await supabaseService
        .from('kb_canonical_solution')
        .select('*')
        .eq('id', id)
        .eq('subject', 'calc')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to get canonical solution: ${error.message}`);
      }

      return data;
    });
  }

  /**
   * Get related canonical solutions
   * @param solution - Reference solution
   * @param limit - Maximum number of related solutions
   * @returns Array of related solutions
   */
  async getRelatedCanonical(solution: KbCanonicalSolution, limit = 3): Promise<CanonicalResult[]> {
    const options: CanonicalSearchOptions = {
      examVariant: solution.exam_variant || 'calc_ab',
      limit,
    };

    // Use the solution question template as a query
    const query = solution.question_template.substring(0, 200);
    return this.searchCanonicalSolutions(query, options);
  }
}

/**
 * Default canonical manager instance
 */
export const canonicalManager = new CanonicalManager();
