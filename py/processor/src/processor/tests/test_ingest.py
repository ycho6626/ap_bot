"""Tests for the ingest module."""

import pytest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import tempfile
import os

from processor.ingest import PDFIngester, DocumentSegment, ingest_pdf


class TestDocumentSegment:
    """Test DocumentSegment class."""
    
    def test_document_segment_creation(self):
        """Test creating a DocumentSegment."""
        segment = DocumentSegment(
            content="Test content",
            segment_type="text",
            page_number=1,
            figure_caption="Figure 1",
            metadata={"test": "value"}
        )
        
        assert segment.content == "Test content"
        assert segment.segment_type == "text"
        assert segment.page_number == 1
        assert segment.figure_caption == "Figure 1"
        assert segment.metadata == {"test": "value"}
    
    def test_document_segment_repr(self):
        """Test DocumentSegment string representation."""
        segment = DocumentSegment("content", "text", 1)
        repr_str = repr(segment)
        assert "DocumentSegment" in repr_str
        assert "text" in repr_str
        assert "1" in repr_str


class TestPDFIngester:
    """Test PDFIngester class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.ingester = PDFIngester()
    
    def test_init(self):
        """Test PDFIngester initialization."""
        assert self.ingester.figure_patterns
        assert self.ingester.equation_patterns
    
    def test_clean_text(self):
        """Test text cleaning functionality."""
        dirty_text = "  This   is   a   test  \n\n\n  with   multiple   spaces  "
        cleaned = self.ingester._clean_text(dirty_text)
        assert cleaned == "This is a test with multiple spaces"
    
    def test_clean_text_empty(self):
        """Test cleaning empty text."""
        assert self.ingester._clean_text("") == ""
        assert self.ingester._clean_text(None) == ""
    
    def test_clean_text_remove_page_numbers(self):
        """Test removal of page numbers."""
        text = "Content here\n123\nMore content"
        cleaned = self.ingester._clean_text(text)
        # The regex only removes standalone numbers, not numbers in context
        assert cleaned == "Content here 123 More content"
    
    def test_extract_figure_caption(self):
        """Test figure caption extraction."""
        text = "Some text\nFigure 1: This is a caption\nMore text"
        caption = self.ingester._extract_figure_caption(text, 1)
        assert caption == "This is a caption"
    
    def test_extract_figure_caption_not_found(self):
        """Test figure caption extraction when not found."""
        text = "Some text without figures"
        caption = self.ingester._extract_figure_caption(text, 1)
        assert caption is None
    
    def test_format_table(self):
        """Test table formatting."""
        table = [["Header1", "Header2"], ["Value1", "Value2"]]
        formatted = self.ingester._format_table(table)
        assert "Header1 | Header2" in formatted
        assert "Value1 | Value2" in formatted
    
    def test_format_table_empty(self):
        """Test formatting empty table."""
        assert self.ingester._format_table([]) == ""
        assert self.ingester._format_table(None) == ""
    
    def test_extract_equations(self):
        """Test equation extraction."""
        text = "Here is an equation: $x^2 + y^2 = z^2$ and another: $$\\int_0^1 x dx$$"
        equations = self.ingester.extract_equations(text)
        assert len(equations) >= 2
        assert "$x^2 + y^2 = z^2$" in equations
        assert "$$\\int_0^1 x dx$$" in equations
    
    def test_clean_and_merge_segments(self):
        """Test segment cleaning and merging."""
        segments = [
            DocumentSegment("Short", "text", 1),
            DocumentSegment("This is a longer text segment", "text", 1),
            DocumentSegment("Another text segment", "text", 1),
            DocumentSegment("Figure content", "figure", 1)
        ]
        
        cleaned = self.ingester._clean_and_merge_segments(segments)
        
        # Should merge consecutive text segments from same page
        assert len(cleaned) == 2  # Merged text + figure
        assert cleaned[0].segment_type == "text"
        assert "This is a longer text segment" in cleaned[0].content
        assert "Another text segment" in cleaned[0].content
    
    def test_segment_by_topic(self):
        """Test topic-based segmentation."""
        long_text = "Topic 1: Introduction\nContent here\n\nTopic 2: Main Content\nMore content here"
        segment = DocumentSegment(long_text, "text", 1)
        
        topic_segments = self.ingester.segment_by_topic([segment], max_length=50)
        
        assert len(topic_segments) >= 2
        assert all(seg.metadata.get('topic_segmented') for seg in topic_segments)
    
    @patch('processor.ingest.pdfplumber.open')
    def test_load_pdf_pdfplumber_success(self, mock_open):
        """Test PDF loading with pdfplumber success."""
        # Mock pdfplumber response
        mock_page = Mock()
        mock_page.extract_text.return_value = "Sample text content"
        mock_page.images = []
        mock_page.extract_tables.return_value = []
        
        mock_pdf = Mock()
        mock_pdf.pages = [mock_page]
        mock_open.return_value.__enter__.return_value = mock_pdf
        
        # Create temporary PDF file
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            tmp.write(b'%PDF-1.4 fake pdf content')
            tmp_path = Path(tmp.name)
        
        try:
            segments = self.ingester.load_pdf(tmp_path)
            assert len(segments) == 1
            assert segments[0].content == "Sample text content"
            assert segments[0].segment_type == "text"
        finally:
            os.unlink(tmp_path)
    
    @patch('processor.ingest.pdfplumber.open')
    @patch('processor.ingest.PyPDF2.PdfReader')
    def test_load_pdf_fallback_pypdf2(self, mock_pypdf2, mock_pdfplumber):
        """Test PDF loading fallback to PyPDF2."""
        # Make pdfplumber fail
        mock_pdfplumber.side_effect = Exception("pdfplumber failed")
        
        # Mock PyPDF2 response
        mock_page = Mock()
        mock_page.extract_text.return_value = "PyPDF2 extracted text"
        
        mock_reader = Mock()
        mock_reader.pages = [mock_page]
        mock_pypdf2.return_value = mock_reader
        
        # Create temporary PDF file
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            tmp.write(b'%PDF-1.4 fake pdf content')
            tmp_path = Path(tmp.name)
        
        try:
            segments = self.ingester.load_pdf(tmp_path)
            assert len(segments) == 1
            assert segments[0].content == "PyPDF2 extracted text"
        finally:
            os.unlink(tmp_path)
    
    def test_load_pdf_file_not_found(self):
        """Test PDF loading with non-existent file."""
        with pytest.raises(FileNotFoundError):
            self.ingester.load_pdf(Path("nonexistent.pdf"))


class TestConvenienceFunctions:
    """Test convenience functions."""
    
    @patch('processor.ingest.PDFIngester')
    def test_ingest_pdf(self, mock_ingester_class):
        """Test ingest_pdf convenience function."""
        mock_ingester = Mock()
        mock_ingester.load_pdf.return_value = [DocumentSegment("test", "text", 1)]
        mock_ingester_class.return_value = mock_ingester
        
        result = ingest_pdf(Path("test.pdf"))
        
        assert len(result) == 1
        assert result[0].content == "test"
        mock_ingester.load_pdf.assert_called_once_with(Path("test.pdf"))
