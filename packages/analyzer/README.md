# Analyzer Package

Quality analysis and deployment gates for the AP Calculus tutor system.

## Overview

The analyzer package provides:

- **VAM Analysis**: Verified Answer Mode performance metrics
- **Quality Gates**: Automated deployment gates based on performance thresholds
- **Trend Analysis**: Performance trends over time
- **Reporting**: Comprehensive quality reports

## Structure

```
packages/analyzer/
├── src/
│   ├── vam.ts                     # VAM analysis and metrics
│   ├── gate.ts                    # Quality gates and thresholds
│   └── index.ts                   # Package exports
└── package.json
```

## Usage

### VAM Analysis

```bash
# Analyze VAM performance
pnpm vam

# Analyze with time range
pnpm vam "2024-01-01" "2024-01-31"

# Analyze specific exam variant
pnpm vam "" "" calc_ab
```

### Quality Gates

```bash
# Run quality gates for production
pnpm gate production

# Run quality gates for staging
pnpm gate staging

# Run with custom time window
pnpm gate production 168  # 1 week window
```

## VAM Metrics

The analyzer tracks these key metrics:

- **Verified Share**: Percentage of responses that are verified
- **Abstain Rate**: Percentage of responses that abstain
- **Verifier Equivalence**: Percentage of verified responses that match verifier
- **Average Trust Score**: Mean trust score across all responses
- **Response Time**: Average response time in milliseconds
- **Error Rate**: Percentage of failed requests

## Quality Gates

### Thresholds

- **Min Verified Share**: 98.5%
- **Min Verifier Equivalence**: 99%
- **Max Response Time**: 5000ms
- **Max Error Rate**: 1%
- **Min Trust Score**: 0.92

### Gate Results

Quality gates return:

- **Passed**: All thresholds met
- **Failed**: One or more thresholds not met
- **Warnings**: Approaching threshold limits
- **Summary**: Detailed performance breakdown

## Analysis Features

### By Exam Variant

Separate analysis for:
- Calculus AB
- Calculus BC

### By Time Period

Analysis across different time windows:
- Last hour
- Last day
- Last week

### Trend Analysis

Identifies trends in:
- Verified share (improving/declining/stable)
- Response time (improving/declining/stable)

## Database Schema

The analyzer reads from the `analytics_event` table:

```sql
CREATE TABLE analytics_event (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'vam_outcome', 'abstain', 'verification_failure'
  exam_variant TEXT NOT NULL, -- 'calc_ab', 'calc_bc'
  is_verified BOOLEAN NOT NULL,
  trust_score DECIMAL NOT NULL,
  verifier_equiv BOOLEAN,
  response_time_ms INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL,
  metadata JSONB
);
```

## CI Integration

The analyzer is integrated into the CI pipeline:

1. **Staging Gates**: Run after QA harness on develop branch
2. **Production Gates**: Run before deployment to main branch
3. **Failure Handling**: Block deployment if gates fail

## Configuration

### Environment Variables

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_KEY`: Supabase service role key

### Custom Thresholds

Quality gates can be configured with custom thresholds:

```typescript
const config = {
  environment: 'production',
  time_window_hours: 24,
  custom_thresholds: {
    min_verified_share: 0.99,
    min_verifier_equiv: 0.995,
    max_avg_response_time_ms: 3000,
  }
};
```

## Reports

### VAM Report

Comprehensive analysis including:
- Overall metrics
- Performance by variant
- Time period analysis
- Trend analysis

### Gate Report

Quality gate results including:
- Pass/fail status
- Threshold comparisons
- Failure details
- Warnings and recommendations

## API

### VAM Analysis

```typescript
import { analyzeVAM, formatVAMReport } from '@ap/analyzer';

// Analyze VAM performance
const analysis = await analyzeVAM(startDate, endDate, examVariant);

// Generate report
const report = formatVAMReport(analysis);
```

### Quality Gates

```typescript
import { runQualityGates, runDefaultQualityGates } from '@ap/analyzer';

// Run with custom config
const result = await runQualityGates(config);

// Run with defaults
const result = await runDefaultQualityGates('production');
```

## Monitoring

### Key Metrics to Watch

1. **Verified Share**: Should stay above 98.5%
2. **Verifier Equivalence**: Should stay above 99%
3. **Response Time**: Should stay below 5 seconds
4. **Error Rate**: Should stay below 1%

### Alerting

Set up alerts for:
- Quality gate failures
- Performance degradation
- High error rates
- Low verified share

## Troubleshooting

### Common Issues

1. **No Data**: Check date ranges and exam variant filters
2. **Low Sample Size**: Ensure sufficient test data
3. **Database Connection**: Verify Supabase credentials
4. **Threshold Failures**: Review performance trends

### Debug Mode

```bash
# Run with debug logging
DEBUG=* pnpm vam
DEBUG=* pnpm gate
```

## Contributing

When modifying the analyzer:

1. Update tests for new functionality
2. Document new metrics and thresholds
3. Ensure backward compatibility
4. Update CI integration as needed
