# Quality Gates Runbook

This runbook covers the quality assurance system, including thresholds, monitoring, and automated deployment gates for the AP Calculus tutoring system.

## Overview

The quality gates system ensures that only high-quality, verified content reaches production. It monitors key metrics and blocks deployments when quality thresholds are not met.

## Quality Metrics

### Primary Thresholds

| Metric | Threshold | Description |
|--------|-----------|-------------|
| **Verified Share** | ≥ 98.5% | Percentage of answers that pass verification |
| **Verifier Equivalence** | ≥ 99% | Agreement between tutor and verifier |
| **Response Time** | ≤ 5000ms | Average response time |
| **Error Rate** | ≤ 1% | Percentage of failed requests |
| **Trust Score** | ≥ 0.92 | Average confidence in answers |

### Secondary Metrics

| Metric | Threshold | Description |
|--------|-----------|-------------|
| **Abstain Rate** | ≤ 5% | Percentage of questions the system abstains from |
| **Coverage** | ≥ 95% | Percentage of questions with verified answers |
| **Consistency** | ≥ 97% | Consistency across similar questions |

## Quality Gate Implementation

### 1. QA Harness

The QA harness runs automated tests against golden datasets and trap questions.

#### Golden Dataset (200 items)
- **AB/BC Mix**: 100 AB, 99 BC questions
- **Topics**: Derivatives, integrals, limits, applications
- **Difficulty**: Easy (40%), Medium (40%), Hard (20%)
- **Expected**: All questions should receive verified answers

#### Trap Dataset (40 items)
- **Sign Errors**: Common sign mistakes
- **L'Hôpital Misuse**: Incorrect rule application
- **Unit Issues**: Missing or incorrect units
- **Power Rule Errors**: Wrong derivative/integral rules
- **Chain Rule Errors**: Missing chain rule applications

### 2. VAM Analysis

Verified Answer Mode (VAM) analysis tracks system performance over time.

#### Metrics Calculation
```typescript
// Verified share calculation
const verifiedShare = verifiedCount / totalRequests;

// Verifier equivalence calculation
const verifierEquiv = verifierAgreements / verifiedCount;

// Abstain rate calculation
const abstainRate = abstainCount / totalRequests;
```

#### Time Periods
- **Last Hour**: Real-time monitoring
- **Last Day**: Daily performance tracking
- **Last Week**: Weekly trend analysis

### 3. Quality Gate Enforcement

#### CI/CD Integration
```yaml
# .github/workflows/ci.yml
quality-gates:
  runs-on: ubuntu-latest
  needs: [setup, qa-harness-staging]
  steps:
    - name: Run Quality Gates
      run: |
        cd packages/analyzer
        pnpm gate staging 24
      env:
        SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

#### Gate Configuration
```typescript
// packages/analyzer/src/gate.ts
const QUALITY_GATES = {
  min_verified_share: 0.985,
  min_verifier_equiv: 0.99,
  max_avg_response_time_ms: 5000,
  max_error_rate: 0.01,
  min_trust_score: 0.92,
} as const;
```

## Monitoring and Alerting

### Real-time Monitoring

#### Dashboard Metrics
```typescript
// Key metrics to display
interface QualityMetrics {
  verified_share: number;
  verifier_equiv_rate: number;
  avg_response_time_ms: number;
  error_rate: number;
  abstain_rate: number;
  total_requests: number;
}
```

#### Alert Thresholds
```typescript
// Alert configuration
const ALERT_THRESHOLDS = {
  verified_share_warning: 0.98,    // 98%
  verified_share_critical: 0.97,   // 97%
  response_time_warning: 4000,     // 4s
  response_time_critical: 6000,    // 6s
  error_rate_warning: 0.005,       // 0.5%
  error_rate_critical: 0.01,       // 1%
};
```

### Automated Alerts

#### Email Notifications
```typescript
// Alert on quality degradation
if (verifiedShare < ALERT_THRESHOLDS.verified_share_critical) {
  await sendAlert({
    type: 'QUALITY_DEGRADATION',
    severity: 'critical',
    message: `Verified share dropped to ${verifiedShare * 100}%`,
    metrics: { verified_share: verifiedShare }
  });
}
```

#### Slack Integration
```typescript
// Slack notifications for quality issues
if (errorRate > ALERT_THRESHOLDS.error_rate_warning) {
  await sendSlackMessage({
    channel: '#alerts',
    text: `⚠️ High error rate: ${errorRate * 100}%`,
    attachments: [{
      color: 'warning',
      fields: [{
        title: 'Error Rate',
        value: `${errorRate * 100}%`,
        short: true
      }]
    }]
  });
}
```

## Quality Gate Workflows

### 1. PR Quality Checks

#### Mock Mode Testing
```bash
# Run QA harness in mock mode for PRs
cd tests/qa-harness
pnpm harness > results.json
pnpm report results.json report.md
```

#### PR Commenting
```typescript
// GitHub Actions PR commenting
- name: Comment QA Results
  uses: actions/github-script@v7
  with:
    script: |
      const report = fs.readFileSync('tests/qa-harness/report.md', 'utf8');
      const comment = `## QA Harness Results\n\n\`\`\`\n${report}\n\`\`\``;
      
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: comment
      });
```

### 2. Staging Quality Gates

#### Real Model Testing
```bash
# Run QA harness with real models
cd tests/qa-harness
MOCK_OPENAI=false pnpm harness > results.json
pnpm report results.json report.md
```

#### Quality Gate Validation
```bash
# Run quality gates
cd packages/analyzer
pnpm gate staging 24
```

### 3. Production Quality Gates

#### Pre-deployment Checks
```bash
# Production quality gates with 1-week window
cd packages/analyzer
pnpm gate production 168
```

#### Deployment Blocking
```yaml
# Block deployment if quality gates fail
deploy-production:
  needs: [quality-gates]
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  steps:
    - name: Run Production Quality Gates
      run: |
        cd packages/analyzer
        pnpm gate production 168
      env:
        SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

## Quality Gate Configuration

### Environment-specific Thresholds

#### Staging Environment
```typescript
const STAGING_GATES = {
  min_verified_share: 0.98,        // 98% (slightly lower for testing)
  min_verifier_equiv: 0.99,        // 99%
  max_avg_response_time_ms: 6000,  // 6s (more lenient)
  max_error_rate: 0.02,            // 2% (more lenient)
  min_trust_score: 0.90,           // 0.90 (more lenient)
};
```

#### Production Environment
```typescript
const PRODUCTION_GATES = {
  min_verified_share: 0.985,       // 98.5% (strict)
  min_verifier_equiv: 0.99,        // 99% (strict)
  max_avg_response_time_ms: 5000,  // 5s (strict)
  max_error_rate: 0.01,            // 1% (strict)
  min_trust_score: 0.92,           // 0.92 (strict)
};
```

### Custom Thresholds

#### Per-exam Variant Thresholds
```typescript
// Different thresholds for AB vs BC
const VARIANT_GATES = {
  calc_ab: {
    min_verified_share: 0.98,
    min_verifier_equiv: 0.99,
  },
  calc_bc: {
    min_verified_share: 0.985,
    min_verifier_equiv: 0.99,
  }
};
```

#### Time-based Thresholds
```typescript
// Stricter thresholds during peak hours
const PEAK_HOURS_GATES = {
  min_verified_share: 0.99,        // 99% during peak
  max_avg_response_time_ms: 3000,  // 3s during peak
};
```

## Quality Gate Reports

### Automated Reporting

#### Daily Quality Report
```typescript
// Generate daily quality report
export async function generateDailyReport(): Promise<string> {
  const analysis = await analyzeVAM(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
    new Date()
  );
  
  return `
# Daily Quality Report - ${new Date().toISOString().split('T')[0]}

## Overall Metrics
- **Verified Share**: ${(analysis.overall.verified_share * 100).toFixed(2)}%
- **Verifier Equiv**: ${(analysis.overall.verifier_equiv_rate * 100).toFixed(2)}%
- **Avg Response Time**: ${analysis.overall.avg_response_time_ms}ms
- **Error Rate**: ${(analysis.overall.verification_failures / analysis.overall.total_requests * 100).toFixed(2)}%

## Trends
- **Verified Share**: ${analysis.trends.verified_share_trend}
- **Response Time**: ${analysis.trends.response_time_trend}
  `;
}
```

#### Weekly Quality Summary
```typescript
// Generate weekly quality summary
export async function generateWeeklySummary(): Promise<string> {
  const analysis = await analyzeVAM(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    new Date()
  );
  
  // Calculate week-over-week changes
  const previousWeek = await analyzeVAM(
    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  
  const verifiedShareChange = analysis.overall.verified_share - previousWeek.overall.verified_share;
  
  return `
# Weekly Quality Summary

## Key Metrics
- **Verified Share**: ${(analysis.overall.verified_share * 100).toFixed(2)}% (${verifiedShareChange > 0 ? '+' : ''}${(verifiedShareChange * 100).toFixed(2)}%)
- **Total Requests**: ${analysis.overall.total_requests}
- **Avg Response Time**: ${analysis.overall.avg_response_time_ms}ms

## Quality Gate Status
${analysis.overall.verified_share >= 0.985 ? '✅' : '❌'} Verified Share (${(analysis.overall.verified_share * 100).toFixed(2)}% / 98.5%)
${analysis.overall.verifier_equiv_rate >= 0.99 ? '✅' : '❌'} Verifier Equiv (${(analysis.overall.verifier_equiv_rate * 100).toFixed(2)}% / 99%)
  `;
}
```

## Troubleshooting

### Common Quality Issues

#### 1. Verified Share Below Threshold

**Symptoms:**
- Verified share < 98.5%
- More unverified answers than expected

**Debugging:**
```bash
# Check recent verification failures
SELECT * FROM analytics_event 
WHERE event_type = 'verification_failure' 
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

# Check verifier service status
curl -X GET https://verifier.example.com/health
```

**Solutions:**
- Check verifier service health
- Review recent content changes
- Adjust verification thresholds
- Investigate specific failure patterns

#### 2. High Response Times

**Symptoms:**
- Average response time > 5000ms
- User complaints about slow responses

**Debugging:**
```bash
# Check response time distribution
SELECT 
  CASE 
    WHEN response_time_ms < 1000 THEN '< 1s'
    WHEN response_time_ms < 3000 THEN '1-3s'
    WHEN response_time_ms < 5000 THEN '3-5s'
    ELSE '> 5s'
  END as time_range,
  COUNT(*) as count
FROM analytics_event
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY 1
ORDER BY 1;
```

**Solutions:**
- Scale up LLM services
- Optimize database queries
- Implement response caching
- Review external API dependencies

#### 3. High Error Rates

**Symptoms:**
- Error rate > 1%
- System instability

**Debugging:**
```bash
# Check error patterns
SELECT 
  error_type,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM analytics_event
WHERE event_type = 'error'
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY 1
ORDER BY 2 DESC;
```

**Solutions:**
- Fix identified error patterns
- Implement better error handling
- Add circuit breakers
- Scale infrastructure

### Quality Gate Bypass

#### Emergency Bypass
```bash
# Emergency bypass for critical fixes
export QUALITY_GATE_BYPASS=true
pnpm gate production 168
```

**⚠️ Warning**: Only use in emergencies and ensure quality is restored quickly.

#### Gradual Rollout
```typescript
// Implement gradual rollout for quality improvements
const rolloutConfig = {
  initial_percentage: 10,
  increment_percentage: 10,
  increment_interval: '1 hour',
  max_percentage: 100
};
```

## Performance Optimization

### Quality Gate Performance

#### Parallel Processing
```typescript
// Run quality gates in parallel
const gateResults = await Promise.all([
  checkVerifiedShare(),
  checkVerifierEquiv(),
  checkResponseTime(),
  checkErrorRate()
]);
```

#### Caching
```typescript
// Cache quality metrics
const cacheKey = `quality-metrics-${timeWindow}`;
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}
```

#### Database Optimization
```sql
-- Index for quality gate queries
CREATE INDEX CONCURRENTLY idx_analytics_event_created_at 
ON analytics_event (created_at);

-- Index for verification queries
CREATE INDEX CONCURRENTLY idx_analytics_event_verified 
ON analytics_event (is_verified, created_at);
```

## Related Documentation

- [Ingest Runbook](./ingest.md) - Content processing pipeline
- [Roles Runbook](./roles.md) - User roles and Stripe integration
- [Supabase README](../../supabase/README.md) - Database schema and setup
- [QA Harness README](../../tests/qa-harness/README.md) - Test harness documentation

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review quality gate logs
3. Monitor real-time metrics dashboard
4. Contact the development team with specific error messages
