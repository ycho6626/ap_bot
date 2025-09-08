# AP Calculus Content Processor

A Python package for ingesting, processing, and storing AP Calculus content through a comprehensive pipeline.

## Features

- **PDF Ingestion**: Extract text, figures, tables, and equations from PDF documents
- **Content Paraphrasing**: Conservative paraphrasing with OpenAI API and rate limiting
- **Content Tagging**: Automatic AB/BC variant detection and skill mapping
- **Embedding Generation**: Batch embeddings with text-embedding-3-large
- **Database Storage**: Upsert to Supabase with kb_document and kb_embedding tables
- **CLI Interface**: Command-line tool with dry-run functionality

## Installation

```bash
cd py/processor
poetry install
```

## Environment Variables

Create a `.env` file with:

```env
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Usage

### CLI Usage

```bash
# Dry run to see what would be processed
poetry run python -m processor.cli ingest \
  --pdf path/to/document.pdf \
  --partition public_kb \
  --year 2024 \
  --type Notes \
  --variant calc_ab \
  --dry-run

# Live processing
poetry run python -m processor.cli ingest \
  --pdf path/to/document.pdf \
  --partition paraphrased_kb \
  --year 2024 \
  --type Practice \
  --variant calc_bc
```

### Programmatic Usage

```python
import asyncio
from processor.ingest import PDFIngester
from processor.paraphrase import ContentParaphraser
from processor.tagging import APCalculusTagger
from processor.embeddings import EmbeddingGenerator
from processor.supabase_io import SupabaseIO

async def process_document(pdf_path, api_key, supabase_url, supabase_key):
    # Ingest PDF
    ingester = PDFIngester()
    segments = ingester.load_pdf(pdf_path)
    
    # Tag content
    tagger = APCalculusTagger()
    tags = [tagger.tag_content(segment.content) for segment in segments]
    
    # Paraphrase content
    paraphraser = ContentParaphraser(api_key=api_key)
    texts = [segment.content for segment in segments]
    paraphrase_results = await paraphraser.paraphrase_batch(texts)
    
    # Generate embeddings
    generator = EmbeddingGenerator(api_key=api_key)
    paraphrased_texts = [result.paraphrased_text for result in paraphrase_results]
    embedding_results = await generator.generate_batch_embeddings(paraphrased_texts)
    
    # Store in database
    io = SupabaseIO(supabase_url, supabase_key)
    # ... upsert logic
```

## Modules

### ingest.py
- PDF loading with pdfplumber and PyPDF2 fallback
- Text cleaning and segmentation
- Figure caption extraction
- Table and equation detection

### paraphrase.py
- OpenAI API integration with rate limiting
- Conservative paraphrasing with quality checks
- Batch processing with concurrency control
- Cost tracking and statistics

### tagging.py
- AB/BC variant detection based on keywords
- Content type classification (Notes, Practice, Review, Example)
- Skill extraction and mapping to units/subtopics
- Confidence scoring and uncertainty detection

### embeddings.py
- Batch embedding generation with text-embedding-3-large
- Rate limiting and token management
- Similarity calculation and search
- Cost tracking and statistics

### supabase_io.py
- Document and embedding record management
- Batch upsert operations
- Transaction handling
- Search and retrieval functions

### cli.py
- Command-line interface with rich output
- Progress tracking and statistics
- Dry-run mode for testing
- Error handling and reporting

## Testing

Run the test suite:

```bash
poetry run pytest -v
```

Run specific test modules:

```bash
poetry run pytest tests/test_ingest.py -v
poetry run pytest tests/test_paraphrase.py -v
poetry run pytest tests/test_tagging.py -v
poetry run pytest tests/test_embeddings.py -v
poetry run pytest tests/test_supabase_io.py -v
poetry run pytest tests/test_cli.py -v
```

## Configuration

The processor supports various configuration options:

- **Rate Limiting**: Adjust API request limits
- **Batch Sizes**: Control concurrent processing
- **Token Limits**: Manage OpenAI token usage
- **Confidence Thresholds**: Set quality standards

## Error Handling

The processor includes comprehensive error handling:

- API failures with retry logic
- Rate limit management
- Graceful degradation
- Detailed error reporting

## Performance

- Concurrent processing for API calls
- Batch operations for database writes
- Memory-efficient streaming for large files
- Progress tracking and statistics

## License

This project is part of the AP Bot system.
