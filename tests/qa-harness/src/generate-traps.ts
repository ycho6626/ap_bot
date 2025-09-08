#!/usr/bin/env tsx

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TrapItem {
  id: string;
  exam_variant: 'calc_ab' | 'calc_bc';
  question: string;
  expected_answer: string;
  trap_type: string;
  wrong_answer: string;
  description: string;
}

const trapItems: TrapItem[] = [
  // Sign flip errors
  { id: 'trap_001', exam_variant: 'calc_ab', question: 'Find the derivative of f(x) = 3x² + 2x - 1', expected_answer: "f'(x) = 6x + 2", trap_type: 'sign_flip', wrong_answer: "f'(x) = -6x - 2", description: 'Common sign error in derivative calculation' },
  { id: 'trap_002', exam_variant: 'calc_bc', question: 'Find the derivative of f(x) = -2x³ + 5x² - 3x + 1', expected_answer: "f'(x) = -6x² + 10x - 3", trap_type: 'sign_flip', wrong_answer: "f'(x) = 6x² - 10x + 3", description: 'Sign error when differentiating negative coefficients' },
  { id: 'trap_003', exam_variant: 'calc_ab', question: 'Find ∫ sin(x) dx', expected_answer: '-cos(x) + C', trap_type: 'sign_error', wrong_answer: 'cos(x) + C', description: 'Sign error in trigonometric integration' },
  { id: 'trap_004', exam_variant: 'calc_bc', question: 'Find ∫ cos(x) dx', expected_answer: 'sin(x) + C', trap_type: 'sign_error', wrong_answer: '-sin(x) + C', description: 'Sign error in trigonometric integration' },
  
  // L'Hôpital's rule misuse
  { id: 'trap_005', exam_variant: 'calc_ab', question: 'Find lim(x→0) (sin x)/x', expected_answer: '1', trap_type: 'lhopital_misuse', wrong_answer: '0', description: 'Incorrectly applying L\'Hôpital\'s rule when not needed' },
  { id: 'trap_006', exam_variant: 'calc_bc', question: 'Find lim(x→0) (1 - cos x)/x', expected_answer: '0', trap_type: 'lhopital_misuse', wrong_answer: '1', description: 'Misapplying L\'Hôpital\'s rule to non-indeterminate form' },
  { id: 'trap_007', exam_variant: 'calc_ab', question: 'Find lim(x→2) (x² - 4)/(x - 2)', expected_answer: '4', trap_type: 'lhopital_misuse', wrong_answer: '0', description: 'Using L\'Hôpital\'s rule instead of factoring' },
  { id: 'trap_008', exam_variant: 'calc_bc', question: 'Find lim(x→∞) (2x + 1)/(x - 3)', expected_answer: '2', trap_type: 'lhopital_misuse', wrong_answer: '∞', description: 'Incorrectly applying L\'Hôpital\'s rule to rational functions' },
  
  // Power rule errors
  { id: 'trap_009', exam_variant: 'calc_ab', question: 'Find the derivative of f(x) = x³', expected_answer: "f'(x) = 3x²", trap_type: 'power_rule_error', wrong_answer: "f'(x) = 3x", description: 'Incorrect power rule application' },
  { id: 'trap_010', exam_variant: 'calc_bc', question: 'Find the derivative of f(x) = x⁴', expected_answer: "f'(x) = 4x³", trap_type: 'power_rule_error', wrong_answer: "f'(x) = 4x", description: 'Incorrect power rule application' },
  { id: 'trap_011', exam_variant: 'calc_ab', question: 'Find ∫ x² dx', expected_answer: 'x³/3 + C', trap_type: 'integration_error', wrong_answer: 'x³ + C', description: 'Incorrect integration power rule' },
  { id: 'trap_012', exam_variant: 'calc_bc', question: 'Find ∫ x³ dx', expected_answer: 'x⁴/4 + C', trap_type: 'integration_error', wrong_answer: 'x⁴ + C', description: 'Incorrect integration power rule' },
  
  // Chain rule errors
  { id: 'trap_013', exam_variant: 'calc_ab', question: 'Find the derivative of f(x) = e^(2x)', expected_answer: "f'(x) = 2e^(2x)", trap_type: 'chain_rule_error', wrong_answer: "f'(x) = e^(2x)", description: 'Missing chain rule in exponential derivative' },
  { id: 'trap_014', exam_variant: 'calc_bc', question: 'Find the derivative of f(x) = ln(x²)', expected_answer: "f'(x) = 2/x", trap_type: 'chain_rule_error', wrong_answer: "f'(x) = 1/x²", description: 'Missing chain rule in logarithmic derivative' },
  { id: 'trap_015', exam_variant: 'calc_ab', question: 'Find the derivative of f(x) = sin(2x)', expected_answer: "f'(x) = 2cos(2x)", trap_type: 'chain_rule_error', wrong_answer: "f'(x) = cos(2x)", description: 'Missing chain rule in trigonometric derivative' },
  { id: 'trap_016', exam_variant: 'calc_bc', question: 'Find the derivative of f(x) = (x + 1)³', expected_answer: "f'(x) = 3(x + 1)²", trap_type: 'chain_rule_error', wrong_answer: "f'(x) = 3x²", description: 'Missing chain rule in polynomial derivative' },
  
  // Integration constant errors
  { id: 'trap_017', exam_variant: 'calc_ab', question: 'Evaluate ∫₀¹ x² dx', expected_answer: '1/3', trap_type: 'integration_constant', wrong_answer: '1/3 + C', description: 'Adding integration constant to definite integral' },
  { id: 'trap_018', exam_variant: 'calc_bc', question: 'Evaluate ∫₀^π sin(x) dx', expected_answer: '2', trap_type: 'integration_constant', wrong_answer: '2 + C', description: 'Adding integration constant to definite integral' },
  { id: 'trap_019', exam_variant: 'calc_ab', question: 'Find ∫ x dx', expected_answer: 'x²/2 + C', trap_type: 'integration_error', wrong_answer: 'x + C', description: 'Incorrect integration of x' },
  { id: 'trap_020', exam_variant: 'calc_bc', question: 'Find ∫ 2x dx', expected_answer: 'x² + C', trap_type: 'integration_error', wrong_answer: '2x + C', description: 'Incorrect integration with constant coefficient' },
  
  // Limit evaluation errors
  { id: 'trap_021', exam_variant: 'calc_ab', question: 'Find lim(x→2) (x² - 4)/(x - 2)', expected_answer: '4', trap_type: 'limit_evaluation', wrong_answer: 'undefined', description: 'Incorrectly evaluating limit by direct substitution' },
  { id: 'trap_022', exam_variant: 'calc_bc', question: 'Find lim(x→0) (e^x - 1)/x', expected_answer: '1', trap_type: 'limit_evaluation', wrong_answer: '0', description: 'Incorrectly evaluating limit by direct substitution' },
  { id: 'trap_023', exam_variant: 'calc_ab', question: 'Find lim(x→∞) (x + 1)/x', expected_answer: '1', trap_type: 'limit_evaluation', wrong_answer: '∞', description: 'Incorrectly evaluating limit at infinity' },
  { id: 'trap_024', exam_variant: 'calc_bc', question: 'Find lim(x→0) (1 - cos x)/x²', expected_answer: '1/2', trap_type: 'limit_evaluation', wrong_answer: '0', description: 'Incorrectly evaluating limit with trigonometric function' },
  
  // Product rule errors
  { id: 'trap_025', exam_variant: 'calc_ab', question: 'Find the derivative of f(x) = x² · e^x', expected_answer: "f'(x) = e^x(x² + 2x)", trap_type: 'product_rule_error', wrong_answer: "f'(x) = 2x · e^x", description: 'Incorrectly applying product rule' },
  { id: 'trap_026', exam_variant: 'calc_bc', question: 'Find the derivative of f(x) = x · ln(x)', expected_answer: "f'(x) = ln(x) + 1", trap_type: 'product_rule_error', wrong_answer: "f'(x) = 1/x", description: 'Incorrectly applying product rule' },
  { id: 'trap_027', exam_variant: 'calc_ab', question: 'Find the derivative of f(x) = x · sin(x)', expected_answer: "f'(x) = sin(x) + x cos(x)", trap_type: 'product_rule_error', wrong_answer: "f'(x) = cos(x)", description: 'Incorrectly applying product rule' },
  { id: 'trap_028', exam_variant: 'calc_bc', question: 'Find the derivative of f(x) = x² · cos(x)', expected_answer: "f'(x) = 2x cos(x) - x² sin(x)", trap_type: 'product_rule_error', wrong_answer: "f'(x) = 2x · cos(x)", description: 'Incorrectly applying product rule' },
  
  // Quotient rule errors
  { id: 'trap_029', exam_variant: 'calc_ab', question: 'Find the derivative of f(x) = (x + 1)/(x - 1)', expected_answer: "f'(x) = -2/(x - 1)²", trap_type: 'quotient_rule_error', wrong_answer: "f'(x) = 1", description: 'Incorrectly applying quotient rule' },
  { id: 'trap_030', exam_variant: 'calc_bc', question: 'Find the derivative of f(x) = e^x/x', expected_answer: "f'(x) = e^x(x - 1)/x²", trap_type: 'quotient_rule_error', wrong_answer: "f'(x) = e^x/x²", description: 'Incorrectly applying quotient rule' },
  { id: 'trap_031', exam_variant: 'calc_ab', question: 'Find the derivative of f(x) = sin(x)/x', expected_answer: "f'(x) = (x cos(x) - sin(x))/x²", trap_type: 'quotient_rule_error', wrong_answer: "f'(x) = cos(x)", description: 'Incorrectly applying quotient rule' },
  { id: 'trap_032', exam_variant: 'calc_bc', question: 'Find the derivative of f(x) = ln(x)/x', expected_answer: "f'(x) = (1 - ln(x))/x²", trap_type: 'quotient_rule_error', wrong_answer: "f'(x) = 1/x²", description: 'Incorrectly applying quotient rule' },
  
  // Unit and dimensional analysis errors
  { id: 'trap_033', exam_variant: 'calc_ab', question: 'A particle moves with velocity v(t) = 3t² m/s. Find the acceleration at t = 2s.', expected_answer: '12 m/s²', trap_type: 'unit_error', wrong_answer: '12 m/s', description: 'Incorrect units in acceleration calculation' },
  { id: 'trap_034', exam_variant: 'calc_bc', question: 'Find the area under y = x² from x = 0 to x = 3.', expected_answer: '9 square units', trap_type: 'unit_error', wrong_answer: '9 units', description: 'Missing units in area calculation' },
  { id: 'trap_035', exam_variant: 'calc_ab', question: 'A tank is filling at rate 2t + 1 gallons per minute. How much water is added in 5 minutes?', expected_answer: '30 gallons', trap_type: 'unit_error', wrong_answer: '30', description: 'Missing units in volume calculation' },
  { id: 'trap_036', exam_variant: 'calc_bc', question: 'Find the derivative of f(x) = 5x³ where x is in meters.', expected_answer: "f'(x) = 15x² m²", trap_type: 'unit_error', wrong_answer: "f'(x) = 15x²", description: 'Missing units in derivative calculation' },
  
  // Fundamental theorem errors
  { id: 'trap_037', exam_variant: 'calc_ab', question: 'If F(x) = ∫₀^x t² dt, find F\'(x).', expected_answer: "F'(x) = x²", trap_type: 'ftc_error', wrong_answer: "F'(x) = x³/3", description: 'Incorrectly applying Fundamental Theorem of Calculus' },
  { id: 'trap_038', exam_variant: 'calc_bc', question: 'If F(x) = ∫₁^x (1/t) dt, find F\'(x).', expected_answer: "F'(x) = 1/x", trap_type: 'ftc_error', wrong_answer: "F'(x) = ln(x)", description: 'Incorrectly applying Fundamental Theorem of Calculus' },
  { id: 'trap_039', exam_variant: 'calc_ab', question: 'If F(x) = ∫₀^x sin(t) dt, find F\'(x).', expected_answer: "F'(x) = sin(x)", trap_type: 'ftc_error', wrong_answer: "F'(x) = -cos(x)", description: 'Incorrectly applying Fundamental Theorem of Calculus' },
  { id: 'trap_040', exam_variant: 'calc_bc', question: 'If F(x) = ∫₀^x e^t dt, find F\'(x).', expected_answer: "F'(x) = e^x", trap_type: 'ftc_error', wrong_answer: "F'(x) = e^x - 1", description: 'Incorrectly applying Fundamental Theorem of Calculus' },
];

// Write to JSONL file
const jsonlContent = trapItems.map(item => JSON.stringify(item)).join('\n') + '\n';
writeFileSync(join(__dirname, '../data/traps.jsonl'), jsonlContent);

console.log(`Generated ${trapItems.length} trap test items`);
console.log(`AB items: ${trapItems.filter(item => item.exam_variant === 'calc_ab').length}`);
console.log(`BC items: ${trapItems.filter(item => item.exam_variant === 'calc_bc').length}`);
console.log(`Trap types: ${[...new Set(trapItems.map(item => item.trap_type))].join(', ')}`);
