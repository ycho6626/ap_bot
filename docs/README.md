# AP Calculus Bot Documentation

This directory contains comprehensive documentation for the AP Calculus AB/BC tutoring system.

## Documentation Structure

### Runbooks
Operational guides for system administration and maintenance.

- **[Data Ingestion Runbook](runbooks/ingest.md)** - Content processing pipeline and database population
- **[User Roles Runbook](runbooks/roles.md)** - Role-based access control and Stripe integration  
- **[Quality Gates Runbook](runbooks/quality-gates.md)** - Quality monitoring, thresholds, and deployment gates

### Architecture Decision Records (ADRs)
Technical decisions and their rationale.

- **[ADR-0001: Single-Subject Focus](architecture/adr/ADR-0001-calc-only.md)** - Why we focus on AP Calculus only initially

## Quick Start

1. **Setup**: Follow the [Supabase README](../../supabase/README.md) for database setup
2. **Content**: Use the [Data Ingestion Runbook](runbooks/ingest.md) to populate the knowledge base
3. **Users**: Configure roles using the [User Roles Runbook](runbooks/roles.md)
4. **Quality**: Monitor system quality with the [Quality Gates Runbook](runbooks/quality-gates.md)

## Related Documentation

- [Supabase Database Schema](../../supabase/README.md) - Database schema and migrations
- [QA Harness Documentation](../../tests/qa-harness/README.md) - Automated testing system
- [Project Rules](../../.cursor/rules.md) - Development guidelines and architecture

## Contributing

When adding new documentation:

1. Follow the existing structure and naming conventions
2. Include cross-links to related documentation
3. Use clear, concise language
4. Include code examples where appropriate
5. Update this index when adding new documents

## Support

For questions about the documentation or system:

1. Check the relevant runbook for your issue
2. Review the Architecture Decision Records for context
3. Contact the development team with specific questions
