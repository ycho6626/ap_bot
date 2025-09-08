/**
 * Query expansion lexicon for AP Calculus
 */

/**
 * Calculus term mappings for query expansion
 */
export const CALC_TERMS = {
  // Derivatives
  derivative: ['rate of change', 'slope', 'instantaneous rate', 'd/dx'],
  'rate of change': ['derivative', 'slope', 'instantaneous rate'],
  slope: ['derivative', 'rate of change', 'instantaneous rate'],
  'instantaneous rate': ['derivative', 'rate of change', 'slope'],
  'd/dx': ['derivative', 'rate of change', 'slope'],

  // Integrals
  integral: ['antiderivative', 'primitive', 'area under curve', '∫'],
  antiderivative: ['integral', 'primitive', 'area under curve'],
  primitive: ['integral', 'antiderivative', 'area under curve'],
  'area under curve': ['integral', 'antiderivative', 'primitive'],
  '∫': ['integral', 'antiderivative', 'primitive'],

  // Limits
  limit: ['approaching', 'tends to', 'as x approaches', 'lim'],
  approaching: ['limit', 'tends to', 'as x approaches'],
  'tends to': ['limit', 'approaching', 'as x approaches'],
  'as x approaches': ['limit', 'approaching', 'tends to'],
  lim: ['limit', 'approaching', 'tends to'],

  // Continuity
  continuous: ['unbroken', 'no gaps', 'smooth'],
  discontinuity: ['break', 'gap', 'jump', 'hole'],
  removable: ['hole', 'point discontinuity'],
  jump: ['discontinuity', 'break'],
  infinite: ['vertical asymptote', 'unbounded'],

  // BC-specific terms
  series: ['infinite sum', 'convergence', 'divergence', 'partial sum'],
  'infinite sum': ['series', 'convergence', 'divergence'],
  convergence: ['series', 'converges', 'convergent'],
  divergence: ['series', 'diverges', 'divergent'],
  'partial sum': ['series', 'infinite sum'],

  // Polar coordinates
  polar: ['r =', 'θ =', 'polar form', 'polar equation'],
  'polar form': ['polar', 'r =', 'θ ='],
  'polar equation': ['polar', 'r =', 'θ ='],

  // Parametric equations
  parametric: ['x(t)', 'y(t)', 'parameter', 'parametric form'],
  'parametric form': ['parametric', 'x(t)', 'y(t)'],
  parameter: ['parametric', 't', 'parameter t'],

  // Vectors
  vector: ['magnitude', 'direction', 'components', 'unit vector'],
  magnitude: ['vector', 'length', 'norm'],
  direction: ['vector', 'angle', 'bearing'],

  // Differential equations
  'differential equation': ['dy/dx', 'separable', 'homogeneous'],
  'dy/dx': ['differential equation', 'derivative'],
  separable: ['differential equation', 'separable variables'],
  homogeneous: ['differential equation', 'homogeneous equation'],

  // Theorems
  'mean value theorem': ['MVT', 'mean value', 'average rate'],
  MVT: ['mean value theorem', 'mean value'],
  'intermediate value theorem': ['IVT', 'intermediate value'],
  IVT: ['intermediate value theorem', 'intermediate value'],
  'rolle\'s theorem': ['Rolle', 'Rolle\'s', 'critical point'],
  'rolle': ['Rolle\'s theorem', 'critical point'],
  'fundamental theorem': ['FTC', 'fundamental theorem of calculus'],
  FTC: ['fundamental theorem', 'fundamental theorem of calculus'],

  // Common functions
  polynomial: ['polynomial function', 'degree', 'coefficient'],
  rational: ['rational function', 'fraction', 'numerator', 'denominator'],
  exponential: ['e^x', 'natural exponential', 'growth', 'decay'],
  logarithmic: ['ln', 'log', 'natural log', 'logarithm'],
  trigonometric: ['sin', 'cos', 'tan', 'trig', 'trigonometric function'],
  'inverse trigonometric': ['arcsin', 'arccos', 'arctan', 'inverse trig'],

  // Calculus concepts
  critical: ['critical point', 'critical value', 'stationary'],
  'critical point': ['critical', 'stationary point', 'max/min'],
  stationary: ['critical point', 'stationary point'],
  inflection: ['inflection point', 'concavity', 'second derivative'],
  'inflection point': ['inflection', 'concavity change'],
  concavity: ['concave up', 'concave down', 'inflection'],
  'concave up': ['concavity', 'positive second derivative'],
  'concave down': ['concavity', 'negative second derivative'],

  // Optimization
  optimization: ['maximize', 'minimize', 'extrema', 'optimization problem'],
  maximize: ['optimization', 'maximum', 'max'],
  minimize: ['optimization', 'minimum', 'min'],
  extrema: ['maximum', 'minimum', 'optimization'],

  // Related rates
  'related rates': ['rate', 'changing', 'time derivative'],
  'changing rate': ['related rates', 'time derivative'],

  // Area and volume
  area: ['region', 'bounded', 'between curves'],
  volume: ['solid', 'revolution', 'cross section'],
  'between curves': ['area', 'bounded region'],
  revolution: ['volume', 'solid of revolution', 'rotating'],

  // Sequences and series (BC)
  sequence: ['terms', 'nth term', 'recursive', 'explicit'],
  'nth term': ['sequence', 'general term'],
  recursive: ['sequence', 'recurrence relation'],
  explicit: ['sequence', 'direct formula'],
  geometric: ['geometric series', 'common ratio', 'r'],
  arithmetic: ['arithmetic series', 'common difference', 'd'],
  'power series': ['Taylor series', 'Maclaurin series', 'coefficients'],
  'Taylor series': ['power series', 'Taylor polynomial'],
  'Maclaurin series': ['power series', 'Maclaurin polynomial'],

  // Integration techniques
  'integration by parts': ['parts', 'u-substitution', 'LIATE'],
  'u-substitution': ['substitution', 'change of variables'],
  'partial fractions': ['decomposition', 'rational functions'],
  'trigonometric substitution': ['trig sub', 'trigonometric integrals'],
  'improper integral': ['infinite limit', 'unbounded', 'convergence'],

  // Applications
  'riemann sum': ['approximation', 'left', 'right', 'midpoint', 'trapezoidal'],
  'left sum': ['riemann sum', 'left endpoint'],
  'right sum': ['riemann sum', 'right endpoint'],
  'midpoint sum': ['riemann sum', 'midpoint'],
  'trapezoidal rule': ['riemann sum', 'trapezoid'],
  'simpson\'s rule': ['riemann sum', 'parabolic approximation'],
} as const;

/**
 * Exam variant specific terms
 */
export const VARIANT_TERMS = {
  calc_ab: [
    'derivative', 'integral', 'limit', 'continuity', 'chain rule', 'product rule',
    'quotient rule', 'implicit differentiation', 'related rates', 'optimization',
    'mean value theorem', 'intermediate value theorem', 'rolle\'s theorem',
    'fundamental theorem of calculus', 'riemann sum', 'definite integral',
    'indefinite integral', 'antiderivative', 'u-substitution', 'area between curves',
    'volume of revolution', 'average value', 'particle motion'
  ],
  calc_bc: [
    // All AB terms plus:
    'series', 'convergence', 'divergence', 'power series', 'taylor series',
    'maclaurin series', 'radius of convergence', 'interval of convergence',
    'polar coordinates', 'parametric equations', 'vector-valued functions',
    'differential equations', 'separable', 'slope fields', 'euler\'s method',
    'integration by parts', 'partial fractions', 'trigonometric substitution',
    'improper integrals', 'arc length', 'surface area', 'polar area',
    'parametric derivatives', 'parametric integrals', 'vector derivatives',
    'vector integrals', 'unit tangent', 'unit normal', 'curvature'
  ],
} as const;

/**
 * Expand a query with related terms
 * @param query - Original query
 * @param examVariant - Exam variant for context
 * @returns Expanded query terms
 */
export function expandQuery(query: string, examVariant: 'calc_ab' | 'calc_bc'): string[] {
  const terms = new Set<string>();
  const lowerQuery = query.toLowerCase();

  // Add original query
  terms.add(query);

  // Add variant-specific terms if they match
  const variantTerms = VARIANT_TERMS[examVariant];
  for (const term of variantTerms) {
    if (lowerQuery.includes(term.toLowerCase())) {
      terms.add(term);
    }
  }

  // Expand with related terms
  for (const [key, relatedTerms] of Object.entries(CALC_TERMS)) {
    if (lowerQuery.includes(key.toLowerCase())) {
      terms.add(key);
      relatedTerms.forEach(term => terms.add(term));
    }
  }

  // Add common mathematical symbols and notation
  const mathSymbols = ['+', '-', '*', '/', '^', '=', '<', '>', '≤', '≥', '∞', 'π', 'e'];
  for (const symbol of mathSymbols) {
    if (query.includes(symbol)) {
      terms.add(symbol);
    }
  }

  return Array.from(terms);
}

/**
 * Create search terms for a calculus problem
 * @param problem - Problem description
 * @param examVariant - Exam variant
 * @returns Array of search terms
 */
export function createSearchTerms(problem: string, examVariant: 'calc_ab' | 'calc_bc'): string[] {
  const expanded = expandQuery(problem, examVariant);
  
  // Add common problem type indicators
  const problemTypes = [
    'find', 'calculate', 'determine', 'evaluate', 'solve', 'prove', 'show',
    'maximum', 'minimum', 'critical', 'inflection', 'concavity', 'increasing',
    'decreasing', 'continuous', 'differentiable', 'limit', 'derivative',
    'integral', 'area', 'volume', 'rate', 'optimization'
  ];

  const terms = new Set(expanded);
  problemTypes.forEach(type => {
    if (problem.toLowerCase().includes(type)) {
      terms.add(type);
    }
  });

  return Array.from(terms);
}

/**
 * Boost terms based on exam variant relevance
 * @param terms - Search terms
 * @param examVariant - Exam variant
 * @returns Terms with relevance scores
 */
export function boostTermsByVariant(
  terms: string[],
  examVariant: 'calc_ab' | 'calc_bc',
): Array<{ term: string; boost: number }> {
  const variantTerms = VARIANT_TERMS[examVariant];
  
  return terms.map(term => {
    const lowerTerm = term.toLowerCase();
    let boost = 1.0;

    // Boost variant-specific terms
    if (variantTerms.some(vt => lowerTerm.includes(vt.toLowerCase()))) {
      boost = 1.5;
    }

    // Boost core calculus terms
    const coreTerms = ['derivative', 'integral', 'limit', 'continuity'];
    if (coreTerms.some(ct => lowerTerm.includes(ct))) {
      boost = 1.3;
    }

    // Boost BC-specific terms for BC variant
    if (examVariant === 'calc_bc') {
      const bcTerms = ['series', 'polar', 'parametric', 'vector', 'differential'];
      if (bcTerms.some(bt => lowerTerm.includes(bt))) {
        boost = 1.4;
      }
    }

    return { term, boost };
  });
}

/**
 * Extract mathematical expressions from text
 * @param text - Text to extract expressions from
 * @returns Array of mathematical expressions
 */
export function extractMathExpressions(text: string): string[] {
  const expressions: string[] = [];
  
  // Common mathematical patterns
  const patterns = [
    // Functions
    /[a-zA-Z]\s*\([^)]+\)/g,
    // Equations
    /[a-zA-Z0-9]+\s*[=<>≤≥]\s*[a-zA-Z0-9+\-*/^()]+/g,
    // Derivatives
    /d[a-zA-Z]\/d[a-zA-Z]/g,
    // Integrals
    /∫[^∫]+d[a-zA-Z]/g,
    // Limits
    /lim\s*[a-zA-Z0-9+\-*/^()]+/g,
    // Series notation
    /∑[^∑]+/g,
    // Fractions
    /[0-9]+\/[0-9]+/g,
    // Powers
    /[a-zA-Z0-9]+\^[0-9]+/g,
  ];

  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      expressions.push(...matches);
    }
  });

  return expressions;
}

/**
 * Normalize mathematical notation
 * @param text - Text to normalize
 * @returns Normalized text
 */
export function normalizeMathNotation(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\*\*/g, '^') // Convert ** to ^
    .replace(/\*\s*\*/g, '^') // Convert * * to ^
    .replace(/\s*=\s*/g, ' = ') // Normalize equals
    .replace(/\s*\+\s*/g, ' + ') // Normalize plus
    .replace(/\s*-\s*/g, ' - ') // Normalize minus
    .replace(/\s*\*\s*/g, ' * ') // Normalize multiply
    .replace(/\s*\/\s*/g, ' / ') // Normalize divide
    .trim();
}
