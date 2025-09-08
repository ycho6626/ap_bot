# Data Ingestion Runbook

This runbook covers the data ingestion pipeline for the AP Calculus tutoring system, including content processing, paraphrasing, tagging, and embedding generation.

## Overview

The ingestion pipeline processes educational content and prepares it for the knowledge base using the following components:

- **Content Ingestion**: Parse and validate educational materials
- **Paraphrasing**: Generate alternative phrasings for better retrieval
- **Tagging**: Classify content by exam variant (AB/BC) and topics
- **Embedding Generation**: Create vector embeddings for semantic search
- **Database Upsert**: Store processed content in Supabase

## Prerequisites

- Python 3.9+ with Poetry
- Access to Supabase database
- OpenAI API key for embeddings
- Content files in supported formats (JSON, YAML, TXT)

## Environment Setup

```bash
cd py/processor
poetry install
poetry shell
```

Set required environment variables:

```bash
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_KEY="your-service-key"
export OPENAI_API_KEY="your-openai-key"
```

## CLI Usage

### Basic Ingestion

```bash
# Ingest a single file
poetry run python src/processor/cli.py ingest --file content.json

# Ingest multiple files
poetry run python src/processor/cli.py ingest --file content1.json --file content2.json

# Ingest from directory
poetry run python src/processor/cli.py ingest --dir ./content/
```

### Advanced Options

```bash
# Specify exam variant
poetry run python src/processor/cli.py ingest --file content.json --variant calc_ab

# Override topic classification
poetry run python src/processor/cli.py ingest --file content.json --topic derivatives

# Dry run (validate without inserting)
poetry run python src/processor/cli.py ingest --file content.json --dry-run

# Verbose output
poetry run python src/processor/cli.py ingest --file content.json --verbose
```

### Batch Processing

```bash
# Process entire content directory
poetry run python src/processor/cli.py batch --input-dir ./raw-content/ --output-dir ./processed/

# With custom configuration
poetry run python src/processor/cli.py batch \
  --input-dir ./raw-content/ \
  --output-dir ./processed/ \
  --config ./config.yaml \
  --parallel 4
```

## Content Formats

### Supported Input Formats

#### JSON Format
```json
{
  "id": "content_001",
  "title": "Derivative Rules",
  "content": "The power rule states that...",
  "topic": "derivatives",
  "difficulty": "easy",
  "exam_variant": "calc_ab",
  "metadata": {
    "source": "textbook",
    "chapter": 3,
    "page": 45
  }
}
```

#### YAML Format
```yaml
id: content_001
title: "Derivative Rules"
content: "The power rule states that..."
topic: derivatives
difficulty: easy
exam_variant: calc_ab
metadata:
  source: textbook
  chapter: 3
  page: 45
```

#### Plain Text
```
Title: Derivative Rules
Topic: derivatives
Difficulty: easy
Exam Variant: calc_ab

The power rule states that d/dx[x^n] = nx^(n-1)...
```

### Content Schema

Required fields:
- `id`: Unique identifier
- `content`: Main text content
- `exam_variant`: Either "calc_ab" or "calc_bc"

Optional fields:
- `title`: Human-readable title
- `topic`: Subject topic (derivatives, integrals, limits, etc.)
- `difficulty`: easy, medium, hard
- `metadata`: Additional structured data

## Processing Pipeline

### 1. Content Validation

```bash
# Validate content before processing
poetry run python src/processor/cli.py validate --file content.json
```

Validates:
- Required fields present
- Exam variant format
- Content length limits
- Topic classification

### 2. Paraphrasing

Generates alternative phrasings for better retrieval:

```python
# Example paraphrasing
original = "Find the derivative of f(x) = x²"
paraphrases = [
  "Calculate the derivative of f(x) = x²",
  "Determine f'(x) for f(x) = x²",
  "What is the derivative of f(x) = x²?"
]
```

### 3. Tagging

Automatically classifies content by:
- **Exam Variant**: AB vs BC specific content
- **Topic**: Derivatives, integrals, limits, applications
- **Difficulty**: Easy, medium, hard
- **Subtopic**: Specific techniques or concepts

### 4. Embedding Generation

Creates vector embeddings using OpenAI's text-embedding-ada-002:

```python
# Embedding generation
embedding = openai.Embedding.create(
  input=content,
  model="text-embedding-ada-002"
)
```

### 5. Database Upsert

Stores processed content in Supabase:

```sql
-- Knowledge base document
INSERT INTO kb_document (
  id, title, content, exam_variant, topic, difficulty, metadata
) VALUES (...);

-- Embedding storage
INSERT INTO kb_embedding (
  document_id, embedding, model, created_at
) VALUES (...);
```

## Configuration

### CLI Configuration File

Create `config.yaml`:

```yaml
# Processing settings
paraphrasing:
  enabled: true
  max_paraphrases: 3
  temperature: 0.7

tagging:
  auto_classify: true
  confidence_threshold: 0.8

embeddings:
  model: "text-embedding-ada-002"
  batch_size: 100
  max_retries: 3

database:
  batch_size: 50
  retry_attempts: 3
  timeout: 30
```

### Environment Variables

```bash
# Required
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
OPENAI_API_KEY=your-openai-key

# Optional
PROCESSOR_LOG_LEVEL=INFO
PROCESSOR_MAX_WORKERS=4
PROCESSOR_BATCH_SIZE=100
```

## Monitoring and Troubleshooting

### Logging

```bash
# Enable debug logging
export PROCESSOR_LOG_LEVEL=DEBUG
poetry run python src/processor/cli.py ingest --file content.json --verbose
```

Log files are written to `logs/processor.log` with rotation.

### Common Issues

#### 1. Content Validation Errors

```bash
# Check content format
poetry run python src/processor/cli.py validate --file content.json --verbose
```

**Solutions:**
- Ensure required fields are present
- Check exam_variant format (calc_ab or calc_bc)
- Validate content length (max 10,000 characters)

#### 2. Embedding Generation Failures

```bash
# Test OpenAI connection
poetry run python src/processor/cli.py test-embeddings
```

**Solutions:**
- Verify OpenAI API key
- Check rate limits
- Reduce batch size

#### 3. Database Connection Issues

```bash
# Test database connection
poetry run python src/processor/cli.py test-db
```

**Solutions:**
- Verify Supabase credentials
- Check network connectivity
- Validate database schema

### Performance Optimization

#### Batch Processing

```bash
# Process large datasets efficiently
poetry run python src/processor/cli.py batch \
  --input-dir ./content/ \
  --parallel 8 \
  --batch-size 200
```

#### Memory Management

```bash
# Process with memory limits
poetry run python src/processor/cli.py ingest \
  --file large-content.json \
  --max-memory 2GB \
  --chunk-size 1000
```

## Quality Assurance

### Content Validation

```bash
# Comprehensive validation
poetry run python src/processor/cli.py validate \
  --file content.json \
  --check-embeddings \
  --check-duplicates \
  --check-classification
```

### Duplicate Detection

```bash
# Find and handle duplicates
poetry run python src/processor/cli.py dedupe \
  --input-dir ./content/ \
  --similarity-threshold 0.9
```

### Content Statistics

```bash
# Generate processing statistics
poetry run python src/processor/cli.py stats \
  --input-dir ./content/ \
  --output-file stats.json
```

## Integration with CI/CD

### Pre-commit Validation

```bash
# Validate content before commit
poetry run python src/processor/cli.py validate \
  --file content.json \
  --exit-on-error
```

### Automated Processing

```yaml
# GitHub Actions example
- name: Process Content
  run: |
    cd py/processor
    poetry install
    poetry run python src/processor/cli.py batch \
      --input-dir ./content/ \
      --dry-run
```

## Related Documentation

- [Quality Gates Runbook](./quality-gates.md) - Quality thresholds and monitoring
- [Supabase README](../../supabase/README.md) - Database schema and setup
- [Architecture Decision Record](../architecture/adr/ADR-0001-calc-only.md) - Single-subject approach

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review logs in `logs/processor.log`
3. Run validation commands to identify issues
4. Contact the development team with specific error messages
