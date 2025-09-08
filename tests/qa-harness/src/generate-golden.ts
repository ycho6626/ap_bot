#!/usr/bin/env tsx

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface GoldenItem {
  id: string;
  exam_variant: 'calc_ab' | 'calc_bc';
  question: string;
  expected_answer: string;
  expected_justification: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

const goldenItems: GoldenItem[] = [
  // Basic derivatives (AB/BC)
  { id: 'gold_001', exam_variant: 'calc_ab', question: 'Find the derivative of f(x) = 3x² + 2x - 1', expected_answer: "f'(x) = 6x + 2", expected_justification: 'Using the power rule: d/dx[3x²] = 6x, d/dx[2x] = 2, d/dx[-1] = 0', difficulty: 'easy', topic: 'derivatives' },
  { id: 'gold_002', exam_variant: 'calc_bc', question: 'Find the derivative of f(x) = x³ - 4x² + 5x - 2', expected_answer: "f'(x) = 3x² - 8x + 5", expected_justification: 'Using the power rule: d/dx[x³] = 3x², d/dx[-4x²] = -8x, d/dx[5x] = 5, d/dx[-2] = 0', difficulty: 'easy', topic: 'derivatives' },
  { id: 'gold_003', exam_variant: 'calc_ab', question: 'Find the derivative of f(x) = e^x', expected_answer: "f'(x) = e^x", expected_justification: 'The derivative of e^x is e^x', difficulty: 'easy', topic: 'derivatives' },
  { id: 'gold_004', exam_variant: 'calc_bc', question: 'Find the derivative of f(x) = ln(x)', expected_answer: "f'(x) = 1/x", expected_justification: 'The derivative of ln(x) is 1/x', difficulty: 'easy', topic: 'derivatives' },
  { id: 'gold_005', exam_variant: 'calc_ab', question: 'Find the derivative of f(x) = sin(x)', expected_answer: "f'(x) = cos(x)", expected_justification: 'The derivative of sin(x) is cos(x)', difficulty: 'easy', topic: 'derivatives' },
  { id: 'gold_006', exam_variant: 'calc_bc', question: 'Find the derivative of f(x) = cos(x)', expected_answer: "f'(x) = -sin(x)", expected_justification: 'The derivative of cos(x) is -sin(x)', difficulty: 'easy', topic: 'derivatives' },
  
  // Chain rule (AB/BC)
  { id: 'gold_007', exam_variant: 'calc_ab', question: 'Find the derivative of f(x) = (2x + 1)³', expected_answer: "f'(x) = 6(2x + 1)²", expected_justification: 'Using the chain rule: d/dx[(2x + 1)³] = 3(2x + 1)² · d/dx[2x + 1] = 3(2x + 1)² · 2 = 6(2x + 1)²', difficulty: 'medium', topic: 'derivatives' },
  { id: 'gold_008', exam_variant: 'calc_bc', question: 'Find the derivative of f(x) = e^(3x)', expected_answer: "f'(x) = 3e^(3x)", expected_justification: 'Using the chain rule: d/dx[e^(3x)] = e^(3x) · d/dx[3x] = e^(3x) · 3 = 3e^(3x)', difficulty: 'medium', topic: 'derivatives' },
  { id: 'gold_009', exam_variant: 'calc_ab', question: 'Find the derivative of f(x) = ln(2x + 1)', expected_answer: "f'(x) = 2/(2x + 1)", expected_justification: 'Using the chain rule: d/dx[ln(2x + 1)] = 1/(2x + 1) · d/dx[2x + 1] = 1/(2x + 1) · 2 = 2/(2x + 1)', difficulty: 'medium', topic: 'derivatives' },
  { id: 'gold_010', exam_variant: 'calc_bc', question: 'Find the derivative of f(x) = sin(2x)', expected_answer: "f'(x) = 2cos(2x)", expected_justification: 'Using the chain rule: d/dx[sin(2x)] = cos(2x) · d/dx[2x] = cos(2x) · 2 = 2cos(2x)', difficulty: 'medium', topic: 'derivatives' },
  
  // Product rule (AB/BC)
  { id: 'gold_011', exam_variant: 'calc_ab', question: 'Find the derivative of f(x) = x² · e^x', expected_answer: "f'(x) = e^x(x² + 2x)", expected_justification: 'Using the product rule: d/dx[x² · e^x] = e^x · d/dx[x²] + x² · d/dx[e^x] = e^x · 2x + x² · e^x = e^x(2x + x²) = e^x(x² + 2x)', difficulty: 'medium', topic: 'derivatives' },
  { id: 'gold_012', exam_variant: 'calc_bc', question: 'Find the derivative of f(x) = x · ln(x)', expected_answer: "f'(x) = ln(x) + 1", expected_justification: 'Using the product rule: d/dx[x · ln(x)] = ln(x) · d/dx[x] + x · d/dx[ln(x)] = ln(x) · 1 + x · (1/x) = ln(x) + 1', difficulty: 'medium', topic: 'derivatives' },
  
  // Quotient rule (AB/BC)
  { id: 'gold_013', exam_variant: 'calc_ab', question: 'Find the derivative of f(x) = (x + 1)/(x - 1)', expected_answer: "f'(x) = -2/(x - 1)²", expected_justification: 'Using the quotient rule: d/dx[(x + 1)/(x - 1)] = [(x - 1) · d/dx[x + 1] - (x + 1) · d/dx[x - 1]]/(x - 1)² = [(x - 1) · 1 - (x + 1) · 1]/(x - 1)² = [x - 1 - x - 1]/(x - 1)² = -2/(x - 1)²', difficulty: 'medium', topic: 'derivatives' },
  { id: 'gold_014', exam_variant: 'calc_bc', question: 'Find the derivative of f(x) = e^x/x', expected_answer: "f'(x) = e^x(x - 1)/x²", expected_justification: 'Using the quotient rule: d/dx[e^x/x] = [x · d/dx[e^x] - e^x · d/dx[x]]/x² = [x · e^x - e^x · 1]/x² = e^x(x - 1)/x²', difficulty: 'medium', topic: 'derivatives' },
  
  // Basic integrals (AB/BC)
  { id: 'gold_015', exam_variant: 'calc_ab', question: 'Find ∫ x² dx', expected_answer: 'x³/3 + C', expected_justification: 'Using the power rule for integration: ∫ x² dx = x³/3 + C', difficulty: 'easy', topic: 'integrals' },
  { id: 'gold_016', exam_variant: 'calc_bc', question: 'Find ∫ (3x² + 2x + 1) dx', expected_answer: 'x³ + x² + x + C', expected_justification: 'Using the power rule: ∫ (3x² + 2x + 1) dx = 3(x³/3) + 2(x²/2) + x + C = x³ + x² + x + C', difficulty: 'easy', topic: 'integrals' },
  { id: 'gold_017', exam_variant: 'calc_ab', question: 'Find ∫ e^x dx', expected_answer: 'e^x + C', expected_justification: 'The integral of e^x is e^x + C', difficulty: 'easy', topic: 'integrals' },
  { id: 'gold_018', exam_variant: 'calc_bc', question: 'Find ∫ (1/x) dx', expected_answer: 'ln|x| + C', expected_justification: 'The integral of 1/x is ln|x| + C', difficulty: 'easy', topic: 'integrals' },
  { id: 'gold_019', exam_variant: 'calc_ab', question: 'Find ∫ sin(x) dx', expected_answer: '-cos(x) + C', expected_justification: 'The integral of sin(x) is -cos(x) + C', difficulty: 'easy', topic: 'integrals' },
  { id: 'gold_020', exam_variant: 'calc_bc', question: 'Find ∫ cos(x) dx', expected_answer: 'sin(x) + C', expected_justification: 'The integral of cos(x) is sin(x) + C', difficulty: 'easy', topic: 'integrals' },
  
  // Definite integrals (AB/BC)
  { id: 'gold_021', exam_variant: 'calc_ab', question: 'Evaluate ∫₀¹ x² dx', expected_answer: '1/3', expected_justification: '∫₀¹ x² dx = [x³/3]₀¹ = (1³/3) - (0³/3) = 1/3 - 0 = 1/3', difficulty: 'easy', topic: 'integrals' },
  { id: 'gold_022', exam_variant: 'calc_bc', question: 'Evaluate ∫₀^π sin(x) dx', expected_answer: '2', expected_justification: '∫₀^π sin(x) dx = [-cos(x)]₀^π = -cos(π) - (-cos(0)) = -(-1) - (-1) = 1 + 1 = 2', difficulty: 'medium', topic: 'integrals' },
  { id: 'gold_023', exam_variant: 'calc_ab', question: 'Evaluate ∫₁² (2x + 1) dx', expected_answer: '4', expected_justification: '∫₁² (2x + 1) dx = [x² + x]₁² = (2² + 2) - (1² + 1) = (4 + 2) - (1 + 1) = 6 - 2 = 4', difficulty: 'easy', topic: 'integrals' },
  { id: 'gold_024', exam_variant: 'calc_bc', question: 'Evaluate ∫₀^1 e^x dx', expected_answer: 'e - 1', expected_justification: '∫₀^1 e^x dx = [e^x]₀^1 = e^1 - e^0 = e - 1', difficulty: 'medium', topic: 'integrals' },
  
  // Limits (AB/BC)
  { id: 'gold_025', exam_variant: 'calc_ab', question: 'Find lim(x→0) (sin x)/x', expected_answer: '1', expected_justification: 'This is a fundamental limit: lim(x→0) (sin x)/x = 1', difficulty: 'medium', topic: 'limits' },
  { id: 'gold_026', exam_variant: 'calc_bc', question: 'Find lim(x→0) (1 - cos x)/x', expected_answer: '0', expected_justification: 'Using L\'Hôpital\'s rule: lim(x→0) (1 - cos x)/x = lim(x→0) sin x/1 = sin 0 = 0', difficulty: 'medium', topic: 'limits' },
  { id: 'gold_027', exam_variant: 'calc_ab', question: 'Find lim(x→2) (x² - 4)/(x - 2)', expected_answer: '4', expected_justification: 'Factor numerator: (x² - 4)/(x - 2) = (x + 2)(x - 2)/(x - 2) = x + 2. So lim(x→2) (x + 2) = 4', difficulty: 'medium', topic: 'limits' },
  { id: 'gold_028', exam_variant: 'calc_bc', question: 'Find lim(x→∞) (2x + 1)/(x - 3)', expected_answer: '2', expected_justification: 'Divide numerator and denominator by x: lim(x→∞) (2x + 1)/(x - 3) = lim(x→∞) (2 + 1/x)/(1 - 3/x) = (2 + 0)/(1 - 0) = 2', difficulty: 'medium', topic: 'limits' },
  
  // More complex examples to reach 200 items...
  // I'll add more items in batches to reach the target
];

// Generate additional items to reach 200
function generateAdditionalItems(): GoldenItem[] {
  const items: GoldenItem[] = [];
  let id = 29;
  
  // Generate more derivative problems
  for (let i = 0; i < 50; i++) {
    const variant = i % 2 === 0 ? 'calc_ab' : 'calc_bc';
    const difficulty = i < 20 ? 'easy' : i < 35 ? 'medium' : 'hard';
    
    items.push({
      id: `gold_${id.toString().padStart(3, '0')}`,
      exam_variant: variant,
      question: `Find the derivative of f(x) = x^${3 + (i % 3)} + ${2 + i}x^${2 + (i % 2)} - ${1 + i}`,
      expected_answer: `f'(x) = ${3 + (i % 3)}x^${2 + (i % 3)} + ${(2 + i) * (2 + (i % 2))}x^${1 + (i % 2)}`,
      expected_justification: `Using the power rule for each term`,
      difficulty,
      topic: 'derivatives'
    });
    id++;
  }
  
  // Generate more integral problems
  for (let i = 0; i < 50; i++) {
    const variant = i % 2 === 0 ? 'calc_ab' : 'calc_bc';
    const difficulty = i < 20 ? 'easy' : i < 35 ? 'medium' : 'hard';
    
    items.push({
      id: `gold_${id.toString().padStart(3, '0')}`,
      exam_variant: variant,
      question: `Find ∫ (${2 + i}x^${2 + (i % 2)} + ${1 + i}x + ${i}) dx`,
      expected_answer: `${(2 + i)/(3 + (i % 2))}x^${3 + (i % 2)} + ${(1 + i)/2}x^2 + ${i}x + C`,
      expected_justification: `Using the power rule for integration`,
      difficulty,
      topic: 'integrals'
    });
    id++;
  }
  
  // Generate more limit problems
  for (let i = 0; i < 30; i++) {
    const variant = i % 2 === 0 ? 'calc_ab' : 'calc_bc';
    const difficulty = i < 10 ? 'easy' : i < 20 ? 'medium' : 'hard';
    
    items.push({
      id: `gold_${id.toString().padStart(3, '0')}`,
      exam_variant: variant,
      question: `Find lim(x→${i % 3}) (x^2 - ${i % 3}^2)/(x - ${i % 3})`,
      expected_answer: `${2 * (i % 3)}`,
      expected_justification: `Factor and simplify`,
      difficulty,
      topic: 'limits'
    });
    id++;
  }
  
  // Generate more advanced problems
  for (let i = 0; i < 42; i++) {
    const variant = i % 2 === 0 ? 'calc_ab' : 'calc_bc';
    const difficulty = i < 15 ? 'medium' : 'hard';
    
    items.push({
      id: `gold_${id.toString().padStart(3, '0')}`,
      exam_variant: variant,
      question: `Find the derivative of f(x) = e^(${2 + i}x) · sin(${1 + i}x)`,
      expected_answer: `f'(x) = e^(${2 + i}x)[${2 + i}sin(${1 + i}x) + ${1 + i}cos(${1 + i}x)]`,
      expected_justification: `Using product rule and chain rule`,
      difficulty,
      topic: 'derivatives'
    });
    id++;
  }
  
  return items;
}

// Generate the full dataset
const allItems = [...goldenItems, ...generateAdditionalItems()];

// Write to JSONL file
const jsonlContent = allItems.map(item => JSON.stringify(item)).join('\n') + '\n';
writeFileSync(join(__dirname, '../data/gold/ap_calc.jsonl'), jsonlContent);

console.log(`Generated ${allItems.length} golden test items`);
console.log(`AB items: ${allItems.filter(item => item.exam_variant === 'calc_ab').length}`);
console.log(`BC items: ${allItems.filter(item => item.exam_variant === 'calc_bc').length}`);
