# Supabase Database Schema

This directory contains the database schema and migrations for the AP Calculus AB/BC tutoring bot.

## Overview

The database uses PostgreSQL with the pgvector extension for vector similarity search. It implements Row Level Security (RLS) to control access to different knowledge base partitions based on user roles.

## Related Documentation

- [Data Ingestion Runbook](../docs/runbooks/ingest.md) - Content processing and database population
- [User Roles Runbook](../docs/runbooks/roles.md) - Role-based access control and Stripe integration
- [Quality Gates Runbook](../docs/runbooks/quality-gates.md) - Quality monitoring and thresholds
- [Architecture Decision Record](../docs/architecture/adr/ADR-0001-calc-only.md) - Single-subject focus rationale

## Setup

### Prerequisites

- Supabase CLI installed
- Supabase project created

### Initialize Database

```bash
# Reset the database and apply all migrations
supabase db reset

# Or apply migrations to existing database
supabase db push
```

### Environment Variables

Copy `env.example` to `.env` and configure:

```bash
cp env.example .env
```

Required variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key

## Database Schema

### Core Tables

#### `user_roles`
Stores user role assignments for access control.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID | Primary key, references auth.users |
| `role` | TEXT | User role: 'public', 'calc_paid', 'teacher', 'all_paid' |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

#### `kb_document`
Knowledge base documents with partition-based access control.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `subject` | TEXT | Always 'calc' |
| `exam_variant` | TEXT | 'calc_ab' or 'calc_bc' |
| `partition` | TEXT | 'public_kb', 'paraphrased_kb', 'private_kb' |
| `topic` | TEXT | Subject topic |
| `subtopic` | TEXT | Subject subtopic |
| `year` | INTEGER | Document year |
| `difficulty` | TEXT | Difficulty level |
| `type` | TEXT | Document type |
| `bloom_level` | TEXT | Bloom's taxonomy level |
| `refs` | JSONB | References and metadata |
| `content` | TEXT | Document content |
| `latex` | JSONB | LaTeX expressions |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

#### `kb_embedding`
Vector embeddings for semantic search.

| Column | Type | Description |
|--------|------|-------------|
| `doc_id` | UUID | References kb_document.id |
| `embedding` | VECTOR(1536) | OpenAI text-embedding-3-large vector |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

#### `kb_canonical_solution`
Canonical solutions for verified answers.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `subject` | TEXT | Always 'calc' |
| `exam_variant` | TEXT | 'calc_ab' or 'calc_bc' |
| `unit` | TEXT | AP unit |
| `skill` | TEXT | Specific skill |
| `problem_key` | TEXT | Unique problem identifier |
| `question_template` | TEXT | Question template |
| `steps` | JSONB | Solution steps |
| `final_answer` | TEXT | Final answer |
| `rubric` | JSONB | Grading rubric |
| `tags` | TEXT[] | Problem tags |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

#### `kb_canonical_embedding`
Vector embeddings for canonical solutions.

| Column | Type | Description |
|--------|------|-------------|
| `solution_id` | UUID | References kb_canonical_solution.id |
| `embedding` | VECTOR(1536) | OpenAI text-embedding-3-large vector |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

#### `webhook_event`
Webhook event logging for idempotency.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `provider` | TEXT | Webhook provider (e.g., 'stripe') |
| `event_type` | TEXT | Event type |
| `received_at` | TIMESTAMPTZ | When event was received |
| `signature_ok` | BOOLEAN | Whether signature verification passed |
| `http_status` | INTEGER | HTTP response status |
| `payload` | JSONB | Event payload |
| `dedupe_key` | TEXT | Deduplication key |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

#### `review_case`
Human-in-the-loop review cases.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | User who submitted the case |
| `subject` | TEXT | Always 'calc' |
| `exam_variant` | TEXT | 'calc_ab' or 'calc_bc' |
| `question` | TEXT | User's question |
| `context` | JSONB | Additional context |
| `status` | TEXT | 'new', 'in_progress', 'resolved', 'canonicalized' |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

#### `review_action`
Actions taken on review cases.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `case_id` | UUID | References review_case.id |
| `actor` | UUID | User who performed the action |
| `action` | TEXT | Action taken |
| `details` | JSONB | Action details |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

#### `analytics_event`
Analytics events for monitoring.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `kind` | TEXT | Event type |
| `payload` | JSONB | Event data |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

## Row Level Security (RLS)

### Access Control Matrix

| Role | public_kb | paraphrased_kb | private_kb | canonical_solutions | webhook_events | review_cases |
|------|-----------|----------------|------------|-------------------|----------------|--------------|
| `public` | ✅ Read | ❌ | ❌ | ❌ | ❌ | Own only |
| `calc_paid` | ✅ Read | ✅ Read | ❌ | ❌ | ❌ | Own only |
| `teacher` | ✅ Read | ✅ Read | ✅ Read | ✅ Read | ✅ Read | All |
| `all_paid` | ✅ Read | ✅ Read | ❌ | ❌ | ❌ | Own only |
| `service_role` | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All | All |

### RLS Examples

#### Check User Role
```sql
-- Get current user's role
SELECT current_role();

-- Check if user has paid access
SELECT current_role() IN ('calc_paid', 'teacher', 'all_paid');
```

#### Query Knowledge Base
```sql
-- Public users can only see public_kb
SELECT * FROM kb_document WHERE partition = 'public_kb';

-- Paid users can see public_kb and paraphrased_kb
SELECT * FROM kb_document 
WHERE partition IN ('public_kb', 'paraphrased_kb');

-- Teachers can see all partitions
SELECT * FROM kb_document;
```

#### Vector Similarity Search
```sql
-- Find similar documents using cosine similarity
SELECT 
    d.*,
    1 - (e.embedding <=> '[0.1, 0.2, ...]'::vector) as similarity
FROM kb_document d
JOIN kb_embedding e ON d.id = e.doc_id
WHERE d.subject = 'calc' 
  AND d.exam_variant = 'calc_ab'
ORDER BY similarity DESC
LIMIT 5;
```

## Migrations

### 0001_init_core.sql
- Enables required extensions (pgcrypto, pg_trgm, vector)
- Creates core tables (user_roles, kb_document, kb_embedding, analytics_event)
- Sets up RLS policies
- Creates helper functions

### 0002_ab_bc_variant.sql
- Adds performance indexes
- Creates vector similarity search indexes
- Adds composite indexes for common queries

### 0003_canonical.sql
- Creates canonical solution tables
- Sets up RLS for canonical solutions
- Adds vector embeddings for canonical solutions

### 0004_webhook_event.sql
- Creates webhook event logging table
- Implements idempotency constraints
- Sets up RLS for webhook events

### 0005_review_hitl.sql
- Creates human-in-the-loop review tables
- Sets up RLS for review cases and actions
- Adds automatic timestamp updates

### 0006_analytics_event.sql
- Enhances analytics event table
- Adds helper functions for analytics
- Creates summary functions for teachers

### 0007_seeds_calc.sql
- Inserts sample data
- Creates test cases and analytics events
- Sets up review cases for testing

## Helper Functions

### `current_role()`
Returns the current user's role, defaulting to 'public' if not found.

### `log_vam_outcome(kind, payload)`
Logs VAM (Verified Answer Mode) outcomes to analytics.

### `get_analytics_summary(start_date, end_date)`
Returns analytics summary for teachers (teacher role required).

## Performance Considerations

- Vector similarity search uses ivfflat indexes for fast approximate nearest neighbor search
- Composite indexes optimize common query patterns
- Partial indexes reduce index size for filtered queries
- RLS policies are optimized for minimal performance impact

## Security Notes

- All tables have RLS enabled
- Service role bypasses RLS for system operations
- Webhook events are idempotent to prevent duplicate processing
- User data is isolated by user_id in review cases
- Analytics events are open for insertion but restricted for reading
