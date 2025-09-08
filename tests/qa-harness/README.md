# QA Harness

Automated quality assurance harness for the AP Calculus tutor system.

## Overview

The QA harness provides comprehensive testing of the tutor's Verified Answer Mode (VAM) through:

- **Golden Tests**: 200 high-quality test cases covering AB/BC calculus topics
- **Trap Tests**: 40 test cases designed to catch common mistakes
- **Quality Gates**: Automated deployment gates based on performance thresholds

## Structure

```
tests/qa-harness/
├── data/
│   ├── gold/
│   │   └── ap_calc.jsonl          # 200 golden test cases
│   └── traps.jsonl                # 40 trap test cases
├── src/
│   ├── runner.ts                  # Main harness runner
│   ├── report.ts                  # Report generator
│   ├── generate-golden.ts         # Golden dataset generator
│   └── generate-traps.ts          # Trap dataset generator
└── package.json
```

## Usage

### Running the Harness

```bash
# Install dependencies
pnpm install

# Run harness with mock OpenAI (for PRs)
MOCK_OPENAI=true pnpm harness

# Run harness with real models (for staging)
MOCK_OPENAI=false pnpm harness

# Generate report
pnpm report results.json report.md
```

### Configuration

Environment variables:

- `MOCK_OPENAI`: Use mock OpenAI responses (default: true)
- `MAX_CONCURRENCY`: Maximum concurrent requests (default: 5)
- `TIMEOUT_MS`: Request timeout in milliseconds (default: 30000)

### Quality Gates

The harness enforces these thresholds:

- **Verified Share**: ≥ 98.5%
- **Verifier Equivalence**: ≥ 99%
- **Average Response Time**: ≤ 5000ms
- **Error Rate**: ≤ 1%

## Test Data

### Golden Tests (200 items)

- **AB Items**: 100 test cases for Calculus AB
- **BC Items**: 99 test cases for Calculus BC
- **Topics**: Derivatives, integrals, limits, applications
- **Difficulty**: Easy, medium, hard

### Trap Tests (40 items)

Designed to catch common mistakes:

- **Sign Errors**: Incorrect sign handling
- **L'Hôpital Misuse**: Wrong application of L'Hôpital's rule
- **Power Rule Errors**: Incorrect power rule application
- **Chain Rule Errors**: Missing chain rule applications
- **Integration Errors**: Wrong integration techniques
- **Unit Errors**: Missing or incorrect units
- **FTC Errors**: Fundamental Theorem of Calculus mistakes

## CI Integration

The harness is integrated into the CI pipeline:

1. **PR Checks**: Run with mock OpenAI, comment results
2. **Staging**: Run with real models, enforce quality gates
3. **Production**: Run quality gates before deployment

## Reports

The harness generates comprehensive reports including:

- Overall metrics (verified share, verifier equiv rate)
- Performance by exam variant (AB vs BC)
- Failure analysis with specific examples
- Quality gate status
- Trends and recommendations

## Adding New Tests

### Golden Tests

1. Add test cases to `src/generate-golden.ts`
2. Run `npx tsx src/generate-golden.ts` to regenerate dataset
3. Ensure proper coverage of AB/BC topics

### Trap Tests

1. Add trap cases to `src/generate-traps.ts`
2. Run `npx tsx src/generate-traps.ts` to regenerate dataset
3. Focus on common student mistakes

## Troubleshooting

### Common Issues

1. **Timeout Errors**: Increase `TIMEOUT_MS` or reduce `MAX_CONCURRENCY`
2. **Mock OpenAI Issues**: Ensure `MOCK_OPENAI=true` for PR tests
3. **Database Connection**: Check Supabase credentials for real model tests

### Debug Mode

```bash
# Run with debug logging
DEBUG=* pnpm harness
```

## Performance Targets

- **Verified Share**: ≥ 98.5% (quality threshold)
- **Verifier Equivalence**: ≥ 99% (accuracy threshold)
- **Response Time**: ≤ 5s average (performance threshold)
- **Error Rate**: ≤ 1% (reliability threshold)

## Contributing

When adding new tests:

1. Follow the existing JSONL format
2. Include proper justifications
3. Test both AB and BC variants
4. Update documentation as needed
