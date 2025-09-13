import { supabaseService, createLogger } from '@ap/shared';
import { traceDatabaseOperation } from '@ap/shared';
import { createSearchTerms } from './query';
import type { KbDocument } from '@ap/shared';

/**
 * Search result with scoring and provenance
 */
export interface SearchResult {
  document: KbDocument;
  score: number;
  snippet: string;
  provenance: {
    source: string;
    partition: string;
    topic?: string;
    subtopic?: string;
  };
}

/**
 * Hybrid search options
 */
export interface HybridSearchOptions {
  examVariant?: 'calc_ab' | 'calc_bc';
  limit?: number;
  minScore?: number;
  includePartitions?: string[];
  excludePartitions?: string[];
}

/**
 * Hybrid search implementation combining textual search and vector similarity
 */
export class HybridRetrieval {
  private logger = createLogger('hybrid-retrieval');

  /**
   * Perform hybrid search combining textual and vector search
   * @param query - Search query
   * @param options - Search options
   * @returns Array of scored search results
   */
  async search(query: string, options: HybridSearchOptions = {}): Promise<SearchResult[]> {
    const {
      examVariant = 'calc_ab',
      limit = 10,
      minScore = 0.1,
      includePartitions = ['public_kb', 'paraphrased_kb'],
      excludePartitions = [],
    } = options;

    this.logger.debug({ query, examVariant, limit, minScore }, 'Starting hybrid search');

    try {
      // Perform textual search
      const textualResults = await this.textualSearch(query, {
        examVariant,
        limit: limit * 2, // Get more results for reranking
        includePartitions,
        excludePartitions,
      });

      // Perform vector search
      const vectorResults = await this.vectorSearch(query, {
        examVariant,
        limit: limit * 2,
        includePartitions,
        excludePartitions,
      });

      // Combine and rerank results
      const combinedResults = this.combineAndRerank(
        textualResults,
        vectorResults,
        query,
        examVariant
      );

      // Filter by minimum score and limit
      const filteredResults = combinedResults
        .filter(result => result.score >= minScore)
        .slice(0, limit);

      this.logger.debug(
        {
          query,
          totalResults: combinedResults.length,
          filteredResults: filteredResults.length,
          topScore: filteredResults[0]?.score ?? 0,
        },
        'Hybrid search completed'
      );

      return filteredResults;
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Hybrid search failed'
      );
      throw error;
    }
  }

  /**
   * Perform textual search using PostgreSQL full-text search
   * @param query - Search query
   * @param options - Search options
   * @returns Array of search results
   */
  private async textualSearch(
    query: string,
    options: {
      examVariant: 'calc_ab' | 'calc_bc';
      limit: number;
      includePartitions: string[];
      excludePartitions: string[];
    }
  ): Promise<SearchResult[]> {
    return traceDatabaseOperation('textual_search', 'kb_document', async () => {
      const { examVariant, limit, includePartitions, excludePartitions } = options;

      // Create search terms
      const searchTerms = createSearchTerms(query, examVariant);
      const searchQuery = searchTerms.join(' | ');

      // Build the query
      let queryBuilder = supabaseService
        .from('kb_document')
        .select('*')
        .textSearch('content', searchQuery)
        .eq('subject', 'calc')
        .limit(limit);

      // Apply exam variant filter
      if (examVariant) {
        queryBuilder = queryBuilder.or(`exam_variant.eq.${examVariant},exam_variant.is.null`);
      }

      // Apply partition filters
      if (includePartitions.length > 0) {
        queryBuilder = queryBuilder.in('partition', includePartitions);
      }
      if (excludePartitions.length > 0) {
        queryBuilder = queryBuilder.not('partition', 'in', `(${excludePartitions.join(',')})`);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        throw new Error(`Textual search failed: ${error.message}`);
      }

      return (data || []).map(doc => this.createSearchResult(doc, 0.5, query));
    });
  }

  /**
   * Perform vector search using pgvector
   * @param query - Search query
   * @param options - Search options
   * @returns Array of search results
   */
  private async vectorSearch(
    query: string,
    options: {
      examVariant: 'calc_ab' | 'calc_bc';
      limit: number;
      includePartitions: string[];
      excludePartitions: string[];
    }
  ): Promise<SearchResult[]> {
    return traceDatabaseOperation('vector_search', 'kb_document', async () => {
      const { examVariant, limit, includePartitions, excludePartitions } = options;

      // Get query embedding (this would typically come from OpenAI)
      // For now, we'll use a placeholder - in practice, you'd call OpenAI's embedding API
      const queryEmbedding = await this.getQueryEmbedding(query);

      // Build the vector search query
      let queryBuilder = supabaseService
        .from('kb_document')
        .select(
          `
            *,
            kb_embedding!inner(embedding)
          `
        )
        .eq('subject', 'calc')
        .limit(limit);

      // Apply exam variant filter
      if (examVariant) {
        queryBuilder = queryBuilder.or(`exam_variant.eq.${examVariant},exam_variant.is.null`);
      }

      // Apply partition filters
      if (includePartitions.length > 0) {
        queryBuilder = queryBuilder.in('partition', includePartitions);
      }
      if (excludePartitions.length > 0) {
        queryBuilder = queryBuilder.not('partition', 'in', `(${excludePartitions.join(',')})`);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        throw new Error(`Vector search failed: ${error.message}`);
      }

      // Calculate similarity scores
      const results = (data ?? [])
        .map(doc => {
          const embedding = (doc as { kb_embedding?: { embedding: number[] } }).kb_embedding
            ?.embedding;
          if (!embedding) {
            return null;
          }

          const similarity = this.calculateCosineSimilarity(queryEmbedding, embedding);
          return this.createSearchResult(doc, similarity, query);
        })
        .filter((result): result is SearchResult => result !== null);

      // Sort by similarity score
      return results.sort((a, b) => b.score - a.score);
    });
  }

  /**
   * Combine textual and vector results and rerank
   * @param textualResults - Textual search results
   * @param vectorResults - Vector search results
   * @param query - Original query
   * @param examVariant - Exam variant
   * @returns Reranked search results
   */
  private combineAndRerank(
    textualResults: SearchResult[],
    vectorResults: SearchResult[],
    _query: string,
    examVariant: 'calc_ab' | 'calc_bc'
  ): SearchResult[] {
    // Create a map of document ID to result
    const resultMap = new Map<string, SearchResult>();

    // Add textual results
    textualResults.forEach(result => {
      resultMap.set(result.document.id, {
        ...result,
        score: result.score * 0.4, // Weight textual search
      });
    });

    // Add or update with vector results
    vectorResults.forEach(result => {
      const existing = resultMap.get(result.document.id);
      if (existing) {
        // Combine scores
        existing.score = existing.score + result.score * 0.6;
      } else {
        resultMap.set(result.document.id, {
          ...result,
          score: result.score * 0.6, // Weight vector search
        });
      }
    });

    // Apply variant boost
    const boostedResults = Array.from(resultMap.values()).map(result => {
      const boost = this.calculateVariantBoost(result.document, examVariant);
      return {
        ...result,
        score: result.score * boost,
      };
    });

    // Sort by combined score
    return boostedResults.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate variant boost for a document
   * @param document - Document to boost
   * @param examVariant - Exam variant
   * @returns Boost factor
   */
  private calculateVariantBoost(document: KbDocument, examVariant: 'calc_ab' | 'calc_bc'): number {
    let boost = 1.0;

    // Exact variant match gets highest boost
    if (document.exam_variant === examVariant) {
      boost = 1.5;
    }
    // Null variant (applies to both) gets medium boost
    else if (document.exam_variant === null) {
      boost = 1.2;
    }
    // Other variant gets lower boost
    else {
      boost = 0.8;
    }

    return boost;
  }

  /**
   * Create a search result from a document
   * @param document - Document
   * @param score - Relevance score
   * @param query - Original query
   * @returns Search result
   */
  private createSearchResult(document: KbDocument, score: number, query: string): SearchResult {
    return {
      document,
      score,
      snippet: this.extractSnippet(document.content, query),
      provenance: {
        source: document.id,
        partition: document.partition as string,
        ...(document.topic && { topic: document.topic }),
        ...(document.subtopic && { subtopic: document.subtopic }),
      },
    };
  }

  /**
   * Extract a relevant snippet from document content
   * @param content - Document content
   * @param query - Search query
   * @returns Extracted snippet
   */
  private extractSnippet(content: string, _query: string): string {
    const queryTerms = _query.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/);

    // Find sentences that contain query terms
    const relevantSentences = sentences.filter(sentence =>
      queryTerms.some(term => sentence.toLowerCase().includes(term))
    );

    if (relevantSentences.length === 0) {
      // Fallback to first few sentences
      return `${sentences.slice(0, 2).join('. ').substring(0, 200)}...`;
    }

    // Return the most relevant sentence
    const bestSentence = relevantSentences[0];
    if (!bestSentence) {
      return `${sentences.slice(0, 2).join('. ').substring(0, 200)}...`;
    }
    return `${bestSentence.substring(0, 300)}${bestSentence.length > 300 ? '...' : ''}`;
  }

  /**
   * Get query embedding (placeholder - would call OpenAI in practice)
   * @param query - Query to embed
   * @returns Query embedding vector
   */
  private getQueryEmbedding(_query: string): Promise<number[]> {
    // In practice, this would call OpenAI's embedding API
    // For now, return a placeholder vector
    return Promise.resolve(new Array(1536).fill(0).map(() => Math.random() - 0.5));
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param a - First vector
   * @param b - Second vector
   * @returns Cosine similarity score
   */
  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const aVal = a[i] ?? 0;
      const bVal = b[i] ?? 0;
      dotProduct += aVal * bVal;
      normA += aVal * aVal;
      normB += bVal * bVal;
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

/**
 * Default hybrid retrieval instance
 */
export const hybridRetrieval = new HybridRetrieval();
