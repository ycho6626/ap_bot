-- Insert sample data for AP Calculus AB/BC
-- This includes public knowledge base documents and one paraphrased document

-- Insert public knowledge base documents (accessible to all users)
INSERT INTO kb_document (
    subject, exam_variant, partition, topic, subtopic, year, difficulty, type, bloom_level,
    content, latex, refs
) VALUES 
-- AB Calculus - Limits
(
    'calc', 'calc_ab', 'public_kb', 'Limits', 'Introduction to Limits', 2024, 'medium', 'Notes', 'comprehension',
    'Limits are fundamental to calculus. A limit describes the behavior of a function as the input approaches a particular value. The limit of f(x) as x approaches a is L, written as lim(x→a) f(x) = L, if we can make f(x) arbitrarily close to L by taking x sufficiently close to a (but not equal to a).',
    '{"definition": "\\lim_{x \\to a} f(x) = L", "example": "\\lim_{x \\to 2} (x^2 + 1) = 5"}',
    '{"sources": ["AP Calculus AB Course Description"], "page": 15}'
),
-- BC Calculus - Series
(
    'calc', 'calc_bc', 'public_kb', 'Series', 'Convergence Tests', 2024, 'hard', 'Notes', 'analysis',
    'Series convergence tests are essential tools in BC Calculus. The Ratio Test states that for a series Σaₙ, if lim(n→∞) |aₙ₊₁/aₙ| = L, then the series converges absolutely if L < 1, diverges if L > 1, and is inconclusive if L = 1. Other important tests include the Comparison Test, Integral Test, and Alternating Series Test.',
    '{"ratio_test": "\\lim_{n \\to \\infty} \\left|\\frac{a_{n+1}}{a_n}\\right| = L", "convergence": "L < 1 \\Rightarrow \\text{converges absolutely}"}',
    '{"sources": ["AP Calculus BC Course Description"], "page": 28}'
),
-- AB Calculus - Derivatives
(
    'calc', 'calc_ab', 'public_kb', 'Derivatives', 'Power Rule', 2024, 'easy', 'Notes', 'application',
    'The Power Rule is one of the most fundamental derivative rules. If f(x) = xⁿ, then f''(x) = nxⁿ⁻¹. This rule applies to all real numbers n, including negative exponents and fractional exponents. For example, d/dx(x³) = 3x² and d/dx(√x) = d/dx(x^(1/2)) = (1/2)x^(-1/2) = 1/(2√x).',
    '{"power_rule": "\\frac{d}{dx}(x^n) = nx^{n-1}", "examples": ["\\frac{d}{dx}(x^3) = 3x^2", "\\frac{d}{dx}(\\sqrt{x}) = \\frac{1}{2\\sqrt{x}}"]}',
    '{"sources": ["AP Calculus AB Course Description"], "page": 22}'
);

-- Insert one paraphrased document (accessible to paid users and teachers)
INSERT INTO kb_document (
    subject, exam_variant, partition, topic, subtopic, year, difficulty, type, bloom_level,
    content, latex, refs
) VALUES 
(
    'calc', 'calc_ab', 'paraphrased_kb', 'Derivatives', 'Chain Rule', 2024, 'medium', 'Notes', 'application',
    'The Chain Rule enables us to differentiate composite functions. When we have a function composed of other functions, like f(g(x)), the derivative is f''(g(x)) · g''(x). This means we take the derivative of the outer function evaluated at the inner function, then multiply by the derivative of the inner function. For instance, to find the derivative of (x² + 1)³, we get 3(x² + 1)² · 2x = 6x(x² + 1)².',
    '{"chain_rule": "\\frac{d}{dx}[f(g(x))] = f''(g(x)) \\cdot g''(x)", "example": "\\frac{d}{dx}[(x^2 + 1)^3] = 3(x^2 + 1)^2 \\cdot 2x"}',
    '{"sources": ["AP Calculus AB Course Description"], "page": 24, "paraphrased": true}'
);

-- Insert sample canonical solutions
INSERT INTO kb_canonical_solution (
    subject, exam_variant, unit, skill, problem_key, question_template, steps, final_answer, rubric, tags
) VALUES 
(
    'calc', 'calc_ab', 'Unit 2: Differentiation', 'Power Rule', 'power_rule_basic_001',
    'Find the derivative of f(x) = x^4 using the Power Rule.',
    '[
        {"step": 1, "description": "Identify the function and apply the Power Rule", "work": "f(x) = x^4"},
        {"step": 2, "description": "Apply the Power Rule: d/dx(x^n) = nx^(n-1)", "work": "f''(x) = 4x^(4-1)"},
        {"step": 3, "description": "Simplify the exponent", "work": "f''(x) = 4x^3"}
    ]',
    '4x^3',
    '{"points": 3, "criteria": ["Correctly applies Power Rule", "Shows work", "Simplifies to final answer"]}',
    ARRAY['power_rule', 'derivatives', 'basic']
),
(
    'calc', 'calc_bc', 'Unit 10: Infinite Series', 'Ratio Test', 'ratio_test_convergence_001',
    'Determine if the series Σ(n=1 to ∞) n!/n^n converges using the Ratio Test.',
    '[
        {"step": 1, "description": "Set up the ratio test limit", "work": "L = lim(n→∞) |a_(n+1)/a_n|"},
        {"step": 2, "description": "Substitute the general terms", "work": "L = lim(n→∞) |((n+1)!/(n+1)^(n+1)) / (n!/n^n)|"},
        {"step": 3, "description": "Simplify the ratio", "work": "L = lim(n→∞) |(n+1)!/(n+1)^(n+1) · n^n/n!|"},
        {"step": 4, "description": "Cancel factorials and simplify", "work": "L = lim(n→∞) |(n+1) · n^n/(n+1)^(n+1)|"},
        {"step": 5, "description": "Apply limit and conclude", "work": "L = lim(n→∞) n^n/(n+1)^n = 1/e < 1"}
    ]',
    'The series converges by the Ratio Test since L = 1/e < 1.',
    '{"points": 5, "criteria": ["Correctly sets up ratio test", "Shows algebraic manipulation", "Evaluates limit correctly", "States conclusion"]}',
    ARRAY['ratio_test', 'series', 'convergence', 'advanced']
);

-- Insert sample analytics events
INSERT INTO analytics_event (kind, payload) VALUES 
('vam_answer_verified', '{"subject": "calc", "exam_variant": "calc_ab", "trust_score": 0.95, "verification_time_ms": 1200}'),
('vam_answer_abstained', '{"subject": "calc", "exam_variant": "calc_bc", "reason": "low_trust_score", "trust_score": 0.85}'),
('retrieval_performed', '{"subject": "calc", "exam_variant": "calc_ab", "query_type": "hybrid", "results_count": 5}'),
('canonical_solution_used', '{"subject": "calc", "problem_key": "power_rule_basic_001", "match_score": 0.92}');

-- Insert sample review case
INSERT INTO review_case (user_id, subject, exam_variant, question, context, status) VALUES 
(
    '00000000-0000-0000-0000-000000000001', -- Sample user ID
    'calc', 'calc_ab', 
    'How do I find the derivative of x^3 + 2x^2 - 5x + 1?',
    '{"user_level": "beginner", "topic": "derivatives", "difficulty": "easy"}',
    'new'
);

-- Insert sample review action
INSERT INTO review_action (case_id, actor, action, details) VALUES 
(
    (SELECT id FROM review_case WHERE question LIKE '%derivative of x^3%' LIMIT 1),
    '00000000-0000-0000-0000-000000000002', -- Sample teacher ID
    'assigned',
    '{"assigned_to": "teacher_001", "priority": "medium"}'
);
