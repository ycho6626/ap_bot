"""Command-line interface for the AP Calculus processor."""

import asyncio
import os
import sys
from pathlib import Path
from typing import List, Optional, Dict, Any
import logging

import click
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.panel import Panel
from rich.text import Text
from dotenv import load_dotenv

from .ingest import PDFIngester, DocumentSegment
from .paraphrase import ContentParaphraser, ParaphraseResult
from .tagging import APCalculusTagger, ContentTag, ExamVariant, ContentType
from .embeddings import EmbeddingGenerator, EmbeddingResult
from .supabase_io import SupabaseIO, DocumentRecord, EmbeddingRecord, UpsertResult

# Load environment variables
load_dotenv()

console = Console()


def setup_logging(verbose: bool = False) -> None:
    """Setup logging configuration."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )


@click.group()
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose logging')
@click.pass_context
def cli(ctx: click.Context, verbose: bool) -> None:
    """AP Calculus content processor CLI."""
    ctx.ensure_object(dict)
    ctx.obj['verbose'] = verbose
    setup_logging(verbose)


@cli.command()
@click.option('--pdf', required=True, type=click.Path(exists=True, path_type=Path), help='Path to PDF file')
@click.option('--partition', required=True, type=click.Choice(['public_kb', 'paraphrased_kb']), help='Partition for storage')
@click.option('--year', required=True, type=int, help='Year of content')
@click.option('--type', 'content_type', required=True, type=click.Choice(['Notes', 'Practice', 'Review', 'Example']), help='Content type')
@click.option('--variant', required=True, type=click.Choice(['calc_ab', 'calc_bc']), help='Exam variant')
@click.option('--dry-run', is_flag=True, help='Show what would be processed without making changes')
@click.option('--openai-key', envvar='OPENAI_API_KEY', help='OpenAI API key')
@click.option('--supabase-url', envvar='SUPABASE_URL', help='Supabase URL')
@click.option('--supabase-key', envvar='SUPABASE_ANON_KEY', help='Supabase anon key')
@click.option('--max-concurrent', default=5, help='Maximum concurrent API calls')
@click.pass_context
def ingest(
    ctx: click.Context,
    pdf: Path,
    partition: str,
    year: int,
    content_type: str,
    variant: str,
    dry_run: bool,
    openai_key: Optional[str],
    supabase_url: Optional[str],
    supabase_key: Optional[str],
    max_concurrent: int
) -> None:
    """Ingest PDF content through the full processing pipeline."""
    
    # Validate required environment variables for non-dry-run
    if not dry_run:
        if not openai_key:
            console.print("[red]Error: OpenAI API key is required (set OPENAI_API_KEY or use --openai-key)[/red]")
            sys.exit(1)
        if not supabase_url or not supabase_key:
            console.print("[red]Error: Supabase credentials are required (set SUPABASE_URL and SUPABASE_ANON_KEY or use --supabase-url and --supabase-key)[/red]")
            sys.exit(1)
    
    # Run the ingestion process
    asyncio.run(_run_ingestion(
        pdf=pdf,
        partition=partition,
        year=year,
        content_type=content_type,
        variant=variant,
        dry_run=dry_run,
        openai_key=openai_key,
        supabase_url=supabase_url,
        supabase_key=supabase_key,
        max_concurrent=max_concurrent
    ))


async def _run_ingestion(
    pdf: Path,
    partition: str,
    year: int,
    content_type: str,
    variant: str,
    dry_run: bool,
    openai_key: Optional[str],
    supabase_url: Optional[str],
    supabase_key: Optional[str],
    max_concurrent: int
) -> None:
    """Run the full ingestion pipeline."""
    
    console.print(Panel.fit(f"[bold blue]AP Calculus Content Processor[/bold blue]\n"
                           f"Processing: {pdf.name}\n"
                           f"Partition: {partition}\n"
                           f"Year: {year}\n"
                           f"Type: {content_type}\n"
                           f"Variant: {variant}\n"
                           f"Mode: {'DRY RUN' if dry_run else 'LIVE'}"))
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console
    ) as progress:
        
        # Step 1: Ingest PDF
        task1 = progress.add_task("Ingesting PDF...", total=None)
        ingester = PDFIngester()
        segments = ingester.load_pdf(pdf)
        progress.update(task1, description=f"✅ Ingested {len(segments)} segments")
        
        if not segments:
            console.print("[red]No content extracted from PDF[/red]")
            return
        
        # Step 2: Tag content
        task2 = progress.add_task("Tagging content...", total=len(segments))
        tagger = APCalculusTagger()
        tags = []
        for segment in segments:
            tag = tagger.tag_content(segment.content)
            tags.append(tag)
            progress.advance(task2)
        progress.update(task2, description=f"✅ Tagged {len(tags)} segments")
        
        # Step 3: Paraphrase content (if not dry run and OpenAI key available)
        paraphrase_results = []
        if not dry_run and openai_key:
            task3 = progress.add_task("Paraphrasing content...", total=len(segments))
            paraphraser = ContentParaphraser(api_key=openai_key)
            texts = [segment.content for segment in segments]
            paraphrase_results = await paraphraser.paraphrase_batch(texts, max_concurrent)
            progress.update(task3, description=f"✅ Paraphrased {len(paraphrase_results)} segments")
        else:
            # Create dummy results for dry run
            for segment in segments:
                paraphrase_results.append(ParaphraseResult(
                    original_text=segment.content,
                    paraphrased_text=segment.content,
                    confidence=1.0,
                    skipped=True,
                    reason="Dry run mode"
                ))
        
        # Step 4: Generate embeddings (if not dry run and OpenAI key available)
        embedding_results = []
        if not dry_run and openai_key:
            task4 = progress.add_task("Generating embeddings...", total=len(paraphrase_results))
            generator = EmbeddingGenerator(api_key=openai_key)
            texts = [result.paraphrased_text for result in paraphrase_results]
            embedding_results = await generator.generate_batch_embeddings(texts, max_concurrent)
            progress.update(task4, description=f"✅ Generated {len(embedding_results)} embeddings")
        else:
            # Create dummy results for dry run
            for result in paraphrase_results:
                embedding_results.append(EmbeddingResult(
                    text=result.paraphrased_text,
                    embedding=[0.0] * 3072,  # Dummy embedding
                    token_count=0,
                    model="text-embedding-3-large",
                    success=True
                ))
        
        # Step 5: Upsert to database (if not dry run)
        upsert_results = []
        if not dry_run and supabase_url and supabase_key:
            task5 = progress.add_task("Upserting to database...", total=len(segments))
            io = SupabaseIO(supabase_url, supabase_key)
            
            # Prepare records
            documents = []
            embeddings = []
            
            for i, (segment, tag, paraphrase_result, embedding_result) in enumerate(
                zip(segments, tags, paraphrase_results, embedding_results)
            ):
                # Create document record
                document = io._prepare_document_record(
                    content=paraphrase_result.paraphrased_text,
                    partition=partition,
                    year=year,
                    content_type=content_type,
                    variant=variant,
                    source_file=str(pdf),
                    page_number=segment.page_number,
                    figure_caption=segment.figure_caption,
                    metadata={
                        'segment_type': segment.segment_type,
                        'tag_confidence': tag.confidence,
                        'paraphrase_confidence': paraphrase_result.confidence,
                        'paraphrase_skipped': paraphrase_result.skipped,
                        'skills': [{'unit': skill.unit, 'subtopic': skill.subtopic, 'skill': skill.skill, 'confidence': skill.confidence} for skill in tag.skills]
                    }
                )
                documents.append(document)
                
                # Create embedding record
                if embedding_result.success:
                    embedding = io._prepare_embedding_record(
                        document_id=document.id,
                        embedding=embedding_result.embedding,
                        model=embedding_result.model,
                        token_count=embedding_result.token_count
                    )
                    embeddings.append(embedding)
            
            # Batch upsert
            upsert_results = await io.batch_upsert_documents_with_embeddings(
                documents, embeddings, batch_size=10
            )
            progress.update(task5, description=f"✅ Upserted {len(upsert_results)} records")
        
        # Display results
        _display_results(
            segments, tags, paraphrase_results, embedding_results, upsert_results, dry_run
        )


def _display_results(
    segments: List[DocumentSegment],
    tags: List[ContentTag],
    paraphrase_results: List[ParaphraseResult],
    embedding_results: List[EmbeddingResult],
    upsert_results: List[UpsertResult],
    dry_run: bool
) -> None:
    """Display processing results."""
    
    console.print("\n[bold green]Processing Complete![/bold green]\n")
    
    # Summary table
    table = Table(title="Processing Summary")
    table.add_column("Metric", style="cyan")
    table.add_column("Count", style="magenta")
    table.add_column("Details", style="green")
    
    table.add_row("Segments Extracted", str(len(segments)), f"From PDF content")
    
    # Tagging stats
    tag_stats = _get_tagging_stats(tags)
    table.add_row("Variant Detection", f"{tag_stats['calc_ab']} AB, {tag_stats['calc_bc']} BC", f"Avg confidence: {tag_stats['avg_confidence']:.2f}")
    
    # Paraphrase stats
    if paraphrase_results:
        para_stats = _get_paraphrase_stats(paraphrase_results)
        table.add_row("Paraphrasing", f"{para_stats['paraphrased']} processed", f"{para_stats['skipped']} skipped ({para_stats['skip_rate']:.1%})")
    
    # Embedding stats
    if embedding_results:
        emb_stats = _get_embedding_stats(embedding_results)
        table.add_row("Embeddings", f"{emb_stats['successful']} generated", f"{emb_stats['total_tokens']} tokens, ${emb_stats['total_cost']:.4f}")
    
    # Upsert stats
    if upsert_results:
        upsert_stats = _get_upsert_stats(upsert_results)
        table.add_row("Database", f"{upsert_stats['successful']} upserted", f"{upsert_stats['success_rate']:.1%} success rate")
    
    console.print(table)
    
    # Show sample content
    if segments:
        console.print("\n[bold blue]Sample Content:[/bold blue]")
        sample_segment = segments[0]
        sample_content = sample_segment.content[:200] + "..." if len(sample_segment.content) > 200 else sample_segment.content
        console.print(Panel(sample_content, title=f"Segment 1 ({sample_segment.segment_type})"))
    
    # Show warnings/errors
    warnings = []
    if paraphrase_results:
        failed_paraphrases = [r for r in paraphrase_results if not r.success and not r.skipped]
        if failed_paraphrases:
            warnings.append(f"{len(failed_paraphrases)} paraphrase failures")
    
    if embedding_results:
        failed_embeddings = [r for r in embedding_results if not r.success]
        if failed_embeddings:
            warnings.append(f"{len(failed_embeddings)} embedding failures")
    
    if upsert_results:
        failed_upserts = [r for r in upsert_results if not r.success]
        if failed_upserts:
            warnings.append(f"{len(failed_upserts)} database upsert failures")
    
    if warnings:
        console.print(f"\n[bold yellow]Warnings:[/bold yellow] {', '.join(warnings)}")
    
    if dry_run:
        console.print("\n[bold yellow]This was a dry run - no changes were made to the database.[/bold yellow]")


def _get_tagging_stats(tags: List[ContentTag]) -> Dict[str, Any]:
    """Get tagging statistics."""
    calc_ab = sum(1 for tag in tags if tag.variant == ExamVariant.CALC_AB)
    calc_bc = sum(1 for tag in tags if tag.variant == ExamVariant.CALC_BC)
    avg_confidence = sum(tag.confidence for tag in tags) / len(tags) if tags else 0
    
    return {
        'calc_ab': calc_ab,
        'calc_bc': calc_bc,
        'avg_confidence': avg_confidence
    }


def _get_paraphrase_stats(results: List[ParaphraseResult]) -> Dict[str, Any]:
    """Get paraphrase statistics."""
    total = len(results)
    paraphrased = sum(1 for r in results if not r.skipped)
    skipped = total - paraphrased
    skip_rate = skipped / total if total > 0 else 0
    
    return {
        'total': total,
        'paraphrased': paraphrased,
        'skipped': skipped,
        'skip_rate': skip_rate
    }


def _get_embedding_stats(results: List[EmbeddingResult]) -> Dict[str, Any]:
    """Get embedding statistics."""
    total = len(results)
    successful = sum(1 for r in results if r.success)
    total_tokens = sum(r.token_count for r in results)
    total_cost = (total_tokens / 1000) * 0.00013  # Approximate cost
    
    return {
        'total': total,
        'successful': successful,
        'total_tokens': total_tokens,
        'total_cost': total_cost
    }


def _get_upsert_stats(results: List[UpsertResult]) -> Dict[str, Any]:
    """Get upsert statistics."""
    total = len(results)
    successful = sum(1 for r in results if r.success)
    success_rate = successful / total if total > 0 else 0
    
    return {
        'total': total,
        'successful': successful,
        'success_rate': success_rate
    }


if __name__ == '__main__':
    cli()
