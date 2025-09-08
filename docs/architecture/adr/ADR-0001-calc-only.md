# ADR-0001: Single-Subject Focus (AP Calculus Only)

**Date**: 2024-12-19  
**Status**: Accepted  
**Deciders**: Development Team  
**Technical Story**: CALC-P12

## Context and Problem Statement

The AP Calculus tutoring system needs to establish its initial scope and focus. The team must decide whether to build a multi-subject platform from the start or focus on a single subject initially.

### Key Considerations

1. **Quality Requirements**: The system must achieve ≥98.5% verified share and ≥99% verifier equivalence
2. **Complexity Management**: Each subject requires specialized knowledge, rubrics, and verification logic
3. **Time to Market**: Faster delivery with focused scope vs. broader but delayed platform
4. **Resource Constraints**: Limited development team and computational resources
5. **User Experience**: Deep, specialized experience vs. broad but shallow coverage

## Decision Drivers

- **Quality First**: Achieving high-quality, verified answers is the primary goal
- **Resource Efficiency**: Focus development effort on core functionality
- **Market Validation**: Prove value proposition with one subject before expansion
- **Technical Complexity**: Each subject adds significant complexity to the system
- **User Needs**: AP Calculus students need deep, specialized help

## Considered Options

### Option 1: Multi-Subject Platform from Start
**Pros:**
- Broader market appeal
- Single platform for all AP subjects
- Economies of scale in infrastructure

**Cons:**
- Significantly higher complexity
- Longer time to market
- Risk of shallow coverage across subjects
- Difficult to achieve quality thresholds
- Resource dilution across subjects

### Option 2: Single-Subject Focus (AP Calculus)
**Pros:**
- Deep, specialized expertise
- Faster time to market
- Easier to achieve quality thresholds
- Focused development effort
- Clear value proposition
- Easier to iterate and improve

**Cons:**
- Limited initial market scope
- Need to rebuild for other subjects later
- Potential user confusion about scope

### Option 3: Phased Multi-Subject Approach
**Pros:**
- Gradual expansion
- Learn from each subject
- Maintain focus while building breadth

**Cons:**
- Still complex initial implementation
- Delayed delivery of core value
- Risk of over-engineering

## Decision Outcome

**Chosen Option**: Single-Subject Focus (AP Calculus)

### Rationale

1. **Quality Achievement**: Focusing on AP Calculus allows the team to achieve the required quality thresholds (≥98.5% verified share, ≥99% verifier equivalence) more reliably.

2. **Technical Complexity**: Each subject requires:
   - Specialized knowledge base
   - Subject-specific rubrics
   - Custom verification logic
   - Subject-specific problem types
   - Different pedagogical approaches

3. **Resource Efficiency**: The development team can focus all efforts on perfecting the calculus experience rather than spreading across multiple subjects.

4. **Market Validation**: AP Calculus is a high-demand subject with clear value proposition. Success here validates the approach before expansion.

5. **User Experience**: Students get a deep, specialized experience rather than a shallow, general one.

## Implementation Details

### Scope Definition

**Included:**
- AP Calculus AB (single-variable calculus)
- AP Calculus BC (single-variable + series/sequences)
- Both exam variants with appropriate content separation
- Comprehensive coverage of all calculus topics

**Excluded:**
- Other AP subjects (Physics, Chemistry, Biology, etc.)
- Non-AP calculus content
- General math tutoring

### Technical Architecture

#### Subject-Specific Components
```typescript
// Exam variant handling
type ExamVariant = 'calc_ab' | 'calc_bc';

// Subject-specific rubrics
const CALC_RUBRICS = {
  derivatives: { /* derivative-specific rules */ },
  integrals: { /* integral-specific rules */ },
  limits: { /* limit-specific rules */ }
};

// Subject-specific verification
const CALC_VERIFIER = {
  checkDerivative: (answer, expected) => { /* ... */ },
  checkIntegral: (answer, expected) => { /* ... */ },
  checkLimit: (answer, expected) => { /* ... */ }
};
```

#### Knowledge Base Structure
```sql
-- Subject-specific knowledge base
CREATE TABLE kb_document (
  id UUID PRIMARY KEY,
  content TEXT NOT NULL,
  exam_variant exam_variant_enum NOT NULL,
  topic TEXT NOT NULL,
  difficulty difficulty_enum NOT NULL,
  -- ... other fields
);

-- Subject-specific embeddings
CREATE TABLE kb_embedding (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES kb_document(id),
  embedding vector(1536), -- OpenAI embedding dimension
  model TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Future Expansion Strategy

#### Phase 1: AP Calculus (Current)
- Focus on perfecting calculus tutoring
- Achieve quality thresholds
- Build core platform infrastructure
- Validate market demand

#### Phase 2: Additional AP Subjects
- Physics (AP Physics 1, 2, C)
- Chemistry (AP Chemistry)
- Biology (AP Biology)
- Statistics (AP Statistics)

#### Phase 3: Non-AP Subjects
- General calculus
- Pre-calculus
- Statistics
- Other math subjects

### Migration Path

#### Database Schema
```sql
-- Future-proof schema design
CREATE TYPE subject_enum AS ENUM (
  'calc',      -- Current focus
  'physics',   -- Future expansion
  'chemistry', -- Future expansion
  'biology'    -- Future expansion
);

-- Add subject field to existing tables
ALTER TABLE kb_document ADD COLUMN subject subject_enum DEFAULT 'calc';
ALTER TABLE analytics_event ADD COLUMN subject subject_enum DEFAULT 'calc';
```

#### Code Architecture
```typescript
// Abstract subject interface
interface SubjectHandler {
  processQuestion(question: string, context: Context): Promise<Response>;
  verifyAnswer(answer: string, expected: string): Promise<VerificationResult>;
  getRubrics(): RubricConfig;
}

// Calculus implementation
class CalculusHandler implements SubjectHandler {
  // Current implementation
}

// Future physics implementation
class PhysicsHandler implements SubjectHandler {
  // Future implementation
}
```

## Consequences

### Positive Consequences

1. **Quality Achievement**: Easier to achieve and maintain high quality standards
2. **Faster Development**: Focused effort leads to faster delivery
3. **Deep Expertise**: Build deep, specialized knowledge in calculus
4. **Clear Value Proposition**: Students know exactly what they're getting
5. **Easier Testing**: Simpler to test and validate quality
6. **Resource Efficiency**: All resources focused on one subject

### Negative Consequences

1. **Limited Market**: Smaller initial addressable market
2. **User Confusion**: Users might expect broader coverage
3. **Future Complexity**: Will need to refactor for multi-subject support
4. **Competitive Risk**: Competitors might offer broader coverage first

### Mitigation Strategies

1. **Clear Communication**: Make scope clear in all user-facing materials
2. **Future-Proof Design**: Build architecture to support future expansion
3. **Rapid Iteration**: Use focused approach to iterate quickly and improve
4. **Market Validation**: Prove value with calculus before expanding

## Monitoring and Success Metrics

### Quality Metrics
- Verified share ≥ 98.5%
- Verifier equivalence ≥ 99%
- User satisfaction scores
- Problem-solving accuracy

### Business Metrics
- User acquisition rate
- User retention rate
- Revenue per user
- Market penetration in AP Calculus

### Technical Metrics
- Response time
- System reliability
- Error rates
- Scalability metrics

## Review and Update Process

### Regular Reviews
- **Monthly**: Review quality metrics and user feedback
- **Quarterly**: Assess expansion readiness and market demand
- **Annually**: Evaluate overall strategy and consider major changes

### Expansion Criteria
Before adding new subjects, the following criteria must be met:
1. AP Calculus quality thresholds consistently achieved
2. Strong user satisfaction and retention
3. Stable, scalable platform
4. Clear market demand for additional subjects
5. Sufficient resources for expansion

### Decision Points
- **6 months**: Evaluate calculus success and expansion readiness
- **12 months**: Make decision on first additional subject
- **18 months**: Implement first additional subject if criteria met

## Related Decisions

- **ADR-0002**: Quality Thresholds and Verification Strategy
- **ADR-0003**: Knowledge Base Architecture
- **ADR-0004**: User Role and Access Control

## References

- [AP Calculus Course Description](https://apcentral.collegeboard.org/courses/ap-calculus-ab)
- [Quality Gates Runbook](../../runbooks/quality-gates.md)
- [Ingest Runbook](../../runbooks/ingest.md)
- [Roles Runbook](../../runbooks/roles.md)

## Appendix

### Subject Complexity Analysis

| Subject | Knowledge Base Size | Rubric Complexity | Verification Complexity | User Base |
|---------|-------------------|------------------|----------------------|-----------|
| AP Calculus | Medium | High | High | Large |
| AP Physics | Large | Very High | Very High | Medium |
| AP Chemistry | Large | High | High | Medium |
| AP Biology | Very Large | Medium | Medium | Large |

### Quality Threshold Justification

The 98.5% verified share and 99% verifier equivalence thresholds are based on:
1. **Educational Standards**: AP-level content requires high accuracy
2. **User Expectations**: Students expect reliable, correct answers
3. **Competitive Analysis**: Industry standards for educational AI
4. **Risk Assessment**: Low tolerance for incorrect answers in education

### Technical Debt Considerations

The single-subject approach creates some technical debt:
1. **Database Schema**: Will need to be extended for multi-subject support
2. **Code Architecture**: Will need to be refactored for subject abstraction
3. **User Interface**: Will need to be updated for subject selection
4. **API Design**: Will need to support subject-specific endpoints

However, this debt is manageable and the benefits of focused development outweigh the costs.
