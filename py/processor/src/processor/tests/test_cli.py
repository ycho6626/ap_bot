"""Tests for the CLI module."""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from pathlib import Path
import tempfile
import os

from processor.cli import _run_ingestion, _display_results, _get_tagging_stats, _get_paraphrase_stats, _get_embedding_stats, _get_upsert_stats
from processor.ingest import DocumentSegment
from processor.tagging import ContentTag, ExamVariant, ContentType, SkillTag
from processor.paraphrase import ParaphraseResult
from processor.embeddings import EmbeddingResult
from processor.supabase_io import UpsertResult


class TestCLIFunctions:
    """Test CLI helper functions."""
    
    def test_get_tagging_stats(self):
        """Test tagging statistics calculation."""
        tags = [
            ContentTag(ExamVariant.CALC_AB, ContentType.PRACTICE, [], 0.8, [], []),
            ContentTag(ExamVariant.CALC_AB, ContentType.NOTES, [], 0.9, [], []),
            ContentTag(ExamVariant.CALC_BC, ContentType.PRACTICE, [], 0.7, [], [])
        ]
        
        stats = _get_tagging_stats(tags)
        
        assert stats['calc_ab'] == 2
        assert stats['calc_bc'] == 1
        assert abs(stats['avg_confidence'] - (0.8 + 0.9 + 0.7) / 3) < 0.01
    
    def test_get_paraphrase_stats(self):
        """Test paraphrase statistics calculation."""
        results = [
            ParaphraseResult("text1", "para1", 0.8, False, token_count=50),
            ParaphraseResult("text2", "para2", 0.9, False, token_count=60),
            ParaphraseResult("text3", "text3", 1.0, True, reason="skipped", token_count=0)
        ]
        
        stats = _get_paraphrase_stats(results)
        
        assert stats['total'] == 3
        assert stats['paraphrased'] == 2
        assert stats['skipped'] == 1
        assert stats['skip_rate'] == 1/3
    
    def test_get_embedding_stats(self):
        """Test embedding statistics calculation."""
        results = [
            EmbeddingResult("text1", [0.1] * 1000, 50, "model", True),
            EmbeddingResult("text2", [0.2] * 1000, 60, "model", True),
            EmbeddingResult("text3", [], 0, "model", False, "Error")
        ]
        
        stats = _get_embedding_stats(results)
        
        assert stats['total'] == 3
        assert stats['successful'] == 2
        assert stats['total_tokens'] == 110
        assert stats['total_cost'] == (110 / 1000) * 0.00013
    
    def test_get_upsert_stats(self):
        """Test upsert statistics calculation."""
        results = [
            UpsertResult("doc1", "emb1", True),
            UpsertResult("doc2", "emb2", True),
            UpsertResult("doc3", "emb3", False, "Error")
        ]
        
        stats = _get_upsert_stats(results)
        
        assert stats['total'] == 3
        assert stats['successful'] == 2
        assert stats['success_rate'] == 2/3


class TestRunIngestion:
    """Test the main ingestion function."""
    
    @pytest.mark.asyncio
    @patch('processor.cli.PDFIngester')
    @patch('processor.cli.APCalculusTagger')
    @patch('processor.cli.ContentParaphraser')
    @patch('processor.cli.EmbeddingGenerator')
    @patch('processor.cli.SupabaseIO')
    async def test_run_ingestion_dry_run(
        self, mock_supabase_io, mock_embedding_generator, 
        mock_paraphraser, mock_tagger, mock_ingester
    ):
        """Test dry run ingestion."""
        # Create temporary PDF file
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            tmp.write(b'%PDF-1.4 fake pdf content')
            pdf_path = Path(tmp.name)
        
        try:
            # Mock ingester
            mock_ingester_instance = Mock()
            mock_ingester_instance.load_pdf.return_value = [
                DocumentSegment("Test content", "text", 1)
            ]
            mock_ingester.return_value = mock_ingester_instance
            
            # Mock tagger
            mock_tagger_instance = Mock()
            mock_tagger_instance.tag_content.return_value = ContentTag(
                ExamVariant.CALC_AB, ContentType.NOTES, [], 0.8, [], []
            )
            mock_tagger.return_value = mock_tagger_instance
            
            # Run dry run
            await _run_ingestion(
                pdf=pdf_path,
                partition="public_kb",
                year=2024,
                content_type="Notes",
                variant="calc_ab",
                dry_run=True,
                openai_key=None,
                supabase_url=None,
                supabase_key=None,
                max_concurrent=5
            )
            
            # Verify mocks were called
            mock_ingester_instance.load_pdf.assert_called_once_with(pdf_path)
            mock_tagger_instance.tag_content.assert_called_once_with("Test content")
            
            # Verify no API calls were made
            mock_paraphraser.assert_not_called()
            mock_embedding_generator.assert_not_called()
            mock_supabase_io.assert_not_called()
            
        finally:
            os.unlink(pdf_path)
    
    @pytest.mark.asyncio
    @patch('processor.cli.PDFIngester')
    @patch('processor.cli.APCalculusTagger')
    @patch('processor.cli.ContentParaphraser')
    @patch('processor.cli.EmbeddingGenerator')
    @patch('processor.cli.SupabaseIO')
    async def test_run_ingestion_live(
        self, mock_supabase_io, mock_embedding_generator,
        mock_paraphraser, mock_tagger, mock_ingester
    ):
        """Test live ingestion with API calls."""
        # Create temporary PDF file
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            tmp.write(b'%PDF-1.4 fake pdf content')
            pdf_path = Path(tmp.name)
        
        try:
            # Mock ingester
            mock_ingester_instance = Mock()
            mock_ingester_instance.load_pdf.return_value = [
                DocumentSegment("Test content", "text", 1)
            ]
            mock_ingester.return_value = mock_ingester_instance
            
            # Mock tagger
            mock_tagger_instance = Mock()
            mock_tagger_instance.tag_content.return_value = ContentTag(
                ExamVariant.CALC_AB, ContentType.NOTES, [], 0.8, [], []
            )
            mock_tagger.return_value = mock_tagger_instance
            
            # Mock paraphraser
            mock_paraphraser_instance = AsyncMock()
            mock_paraphraser_instance.paraphrase_batch.return_value = [
                ParaphraseResult("Test content", "Paraphrased content", 0.8, False, token_count=50)
            ]
            mock_paraphraser.return_value = mock_paraphraser_instance
            
            # Mock embedding generator
            mock_embedding_generator_instance = AsyncMock()
            mock_embedding_generator_instance.generate_batch_embeddings.return_value = [
                EmbeddingResult("Paraphrased content", [0.1] * 1000, 50, "model", True)
            ]
            mock_embedding_generator.return_value = mock_embedding_generator_instance
            
            # Mock Supabase IO
            mock_supabase_io_instance = Mock()
            mock_supabase_io_instance._prepare_document_record.return_value = Mock(id="doc1")
            mock_supabase_io_instance._prepare_embedding_record.return_value = Mock(id="emb1")
            mock_supabase_io_instance.batch_upsert_documents_with_embeddings = AsyncMock(return_value=[
                UpsertResult("doc1", "emb1", True)
            ])
            mock_supabase_io.return_value = mock_supabase_io_instance
            
            # Run live ingestion
            await _run_ingestion(
                pdf=pdf_path,
                partition="public_kb",
                year=2024,
                content_type="Notes",
                variant="calc_ab",
                dry_run=False,
                openai_key="test-key",
                supabase_url="https://test.supabase.co",
                supabase_key="test-key",
                max_concurrent=5
            )
            
            # Verify all mocks were called
            mock_ingester_instance.load_pdf.assert_called_once()
            mock_tagger_instance.tag_content.assert_called_once()
            mock_paraphraser_instance.paraphrase_batch.assert_called_once()
            mock_embedding_generator_instance.generate_batch_embeddings.assert_called_once()
            mock_supabase_io_instance.batch_upsert_documents_with_embeddings.assert_called_once()
            
        finally:
            os.unlink(pdf_path)
    
    @pytest.mark.asyncio
    @patch('processor.cli.PDFIngester')
    async def test_run_ingestion_no_content(self, mock_ingester):
        """Test ingestion with no content extracted."""
        # Create temporary PDF file
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            tmp.write(b'%PDF-1.4 fake pdf content')
            pdf_path = Path(tmp.name)
        
        try:
            # Mock ingester to return no content
            mock_ingester_instance = Mock()
            mock_ingester_instance.load_pdf.return_value = []
            mock_ingester.return_value = mock_ingester_instance
            
            # Run ingestion
            await _run_ingestion(
                pdf=pdf_path,
                partition="public_kb",
                year=2024,
                content_type="Notes",
                variant="calc_ab",
                dry_run=True,
                openai_key=None,
                supabase_url=None,
                supabase_key=None,
                max_concurrent=5
            )
            
            # Should complete without errors
            mock_ingester_instance.load_pdf.assert_called_once()
            
        finally:
            os.unlink(pdf_path)


class TestDisplayResults:
    """Test result display functionality."""
    
    def test_display_results_with_data(self, capsys):
        """Test displaying results with data."""
        segments = [DocumentSegment("Test content", "text", 1)]
        tags = [ContentTag(ExamVariant.CALC_AB, ContentType.NOTES, [], 0.8, [], [])]
        paraphrase_results = [ParaphraseResult("Test", "Paraphrased", 0.8, False, token_count=50)]
        embedding_results = [EmbeddingResult("Paraphrased", [0.1] * 1000, 50, "model", True)]
        upsert_results = [UpsertResult("doc1", "emb1", True)]
        
        _display_results(segments, tags, paraphrase_results, embedding_results, upsert_results, False)
        
        # Should not raise any exceptions
        captured = capsys.readouterr()
        assert "Processing Complete!" in captured.out
    
    def test_display_results_dry_run(self, capsys):
        """Test displaying results for dry run."""
        segments = [DocumentSegment("Test content", "text", 1)]
        tags = [ContentTag(ExamVariant.CALC_AB, ContentType.NOTES, [], 0.8, [], [])]
        paraphrase_results = [ParaphraseResult("Test", "Test", 1.0, True, reason="Dry run")]
        embedding_results = [EmbeddingResult("Test", [0.0] * 3072, 0, "model", True)]
        upsert_results = []
        
        _display_results(segments, tags, paraphrase_results, embedding_results, upsert_results, True)
        
        captured = capsys.readouterr()
        assert "DRY RUN" in captured.out or "dry run" in captured.out


# Integration tests
class TestCLIIntegration:
    """Integration tests for CLI functionality."""
    
    def test_cli_import(self):
        """Test that CLI module can be imported without errors."""
        from processor.cli import cli, setup_logging
        
        assert cli is not None
        assert setup_logging is not None
    
    def test_setup_logging(self):
        """Test logging setup."""
        from processor.cli import setup_logging
        
        # Should not raise any exceptions
        setup_logging(verbose=False)
        setup_logging(verbose=True)
    
    @patch('processor.cli.click')
    def test_cli_group_creation(self, mock_click):
        """Test CLI group creation."""
        from processor.cli import cli
        
        # Should not raise any exceptions during import
        assert cli is not None
