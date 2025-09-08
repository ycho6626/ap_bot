"""PDF ingestion and content extraction module."""

import re
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import logging

import PyPDF2
import pdfplumber
from bs4 import BeautifulSoup
import lxml.html

logger = logging.getLogger(__name__)


class DocumentSegment:
    """Represents a segment of extracted document content."""
    
    def __init__(
        self,
        content: str,
        segment_type: str,
        page_number: int,
        figure_caption: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.content = content.strip()
        self.segment_type = segment_type  # 'text', 'figure', 'table', 'equation'
        self.page_number = page_number
        self.figure_caption = figure_caption
        self.metadata = metadata or {}
    
    def __repr__(self) -> str:
        return f"DocumentSegment(type={self.segment_type}, page={self.page_number}, len={len(self.content)})"


class PDFIngester:
    """Handles PDF loading, cleaning, and segmentation."""
    
    def __init__(self):
        self.figure_patterns = [
            r'Figure\s+\d+[\.:]?\s*(.+?)(?=\n\n|\n[A-Z]|\n\d+\.|\Z)',
            r'Fig\.\s+\d+[\.:]?\s*(.+?)(?=\n\n|\n[A-Z]|\n\d+\.|\Z)',
            r'^\s*(\d+\.\d+)\s+(.+?)(?=\n\n|\n[A-Z]|\n\d+\.|\Z)',
        ]
        self.equation_patterns = [
            r'\$\$.*?\$\$',
            r'\$.*?\$',
            r'\\begin\{equation\}.*?\\end\{equation\}',
        ]
    
    def load_pdf(self, pdf_path: Path) -> List[DocumentSegment]:
        """Load and extract content from PDF file."""
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
        
        segments = []
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    page_segments = self._extract_page_content(page, page_num)
                    segments.extend(page_segments)
        except Exception as e:
            logger.error(f"Error loading PDF with pdfplumber: {e}")
            # Fallback to PyPDF2
            segments = self._load_with_pypdf2(pdf_path)
        
        return self._clean_and_merge_segments(segments)
    
    def _extract_page_content(self, page, page_num: int) -> List[DocumentSegment]:
        """Extract content from a single page."""
        segments = []
        
        # Extract text
        text = page.extract_text()
        if text:
            # Clean text
            cleaned_text = self._clean_text(text)
            if cleaned_text:
                segments.append(DocumentSegment(
                    content=cleaned_text,
                    segment_type='text',
                    page_number=page_num
                ))
        
        # Extract figures and captions
        figures = page.images
        for i, figure in enumerate(figures):
            caption = self._extract_figure_caption(text, i + 1)
            segments.append(DocumentSegment(
                content=f"[Figure {i + 1}]",
                segment_type='figure',
                page_number=page_num,
                figure_caption=caption,
                metadata={'figure_index': i + 1, 'bbox': figure.get('bbox')}
            ))
        
        # Extract tables
        tables = page.extract_tables()
        for i, table in enumerate(tables):
            table_text = self._format_table(table)
            segments.append(DocumentSegment(
                content=table_text,
                segment_type='table',
                page_number=page_num,
                metadata={'table_index': i + 1}
            ))
        
        return segments
    
    def _load_with_pypdf2(self, pdf_path: Path) -> List[DocumentSegment]:
        """Fallback PDF loading using PyPDF2."""
        segments = []
        
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            for page_num, page in enumerate(pdf_reader.pages, 1):
                text = page.extract_text()
                if text:
                    cleaned_text = self._clean_text(text)
                    if cleaned_text:
                        segments.append(DocumentSegment(
                            content=cleaned_text,
                            segment_type='text',
                            page_number=page_num
                        ))
        
        return segments
    
    def _clean_text(self, text: str) -> str:
        """Clean extracted text."""
        if not text:
            return ""
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove page numbers and headers/footers (standalone numbers)
        text = re.sub(r'^\s*\d+\s*$', '', text, flags=re.MULTILINE)
        
        # Clean up common PDF artifacts
        text = re.sub(r'[^\x00-\x7F]+', ' ', text)  # Remove non-ASCII
        text = re.sub(r'\f', '\n', text)  # Replace form feeds with newlines
        
        # Remove empty lines and clean up
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        return '\n'.join(lines)
    
    def _extract_figure_caption(self, text: str, figure_num: int) -> Optional[str]:
        """Extract caption for a figure."""
        for pattern in self.figure_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
            for match in matches:
                if isinstance(match, tuple):
                    match = match[1] if len(match) > 1 else match[0]
                
                # Check if this caption corresponds to our figure
                if f"figure {figure_num}" in match.lower() or f"fig. {figure_num}" in match.lower():
                    return match.strip()
        
        # Try a simpler pattern for the test case
        simple_pattern = rf'Figure\s+{figure_num}:\s*(.+?)(?=\n|$)'
        match = re.search(simple_pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
        
        return None
    
    def _format_table(self, table: List[List[str]]) -> str:
        """Format table data as text."""
        if not table:
            return ""
        
        formatted_rows = []
        for row in table:
            if row:
                # Clean and join cells
                clean_row = [str(cell).strip() if cell else "" for cell in row]
                formatted_rows.append(" | ".join(clean_row))
        
        return "\n".join(formatted_rows)
    
    def _clean_and_merge_segments(self, segments: List[DocumentSegment]) -> List[DocumentSegment]:
        """Clean and merge related segments."""
        cleaned = []
        
        for segment in segments:
            # Skip very short segments
            if len(segment.content) < 10:
                continue
            
            # Merge consecutive text segments from same page
            if (cleaned and 
                segment.segment_type == 'text' and 
                cleaned[-1].segment_type == 'text' and 
                cleaned[-1].page_number == segment.page_number):
                
                cleaned[-1].content += "\n\n" + segment.content
            else:
                cleaned.append(segment)
        
        return cleaned
    
    def extract_equations(self, text: str) -> List[str]:
        """Extract mathematical equations from text."""
        equations = []
        
        for pattern in self.equation_patterns:
            matches = re.findall(pattern, text, re.DOTALL)
            equations.extend(matches)
        
        return equations
    
    def segment_by_topic(self, segments: List[DocumentSegment], max_length: int = 2000) -> List[DocumentSegment]:
        """Segment content by topic boundaries."""
        topic_segments = []
        
        for segment in segments:
            if segment.segment_type != 'text':
                topic_segments.append(segment)
                continue
            
            # Split by topic boundaries (headers, section breaks)
            topic_boundaries = re.split(r'\n(?=[A-Z][a-z]+.*:|\d+\.\s+[A-Z])', segment.content)
            
            current_topic = ""
            for boundary in topic_boundaries:
                if len(current_topic + boundary) > max_length and current_topic:
                    # Create new segment
                    topic_segments.append(DocumentSegment(
                        content=current_topic.strip(),
                        segment_type='text',
                        page_number=segment.page_number,
                        metadata={'topic_segmented': True}
                    ))
                    current_topic = boundary
                else:
                    current_topic += boundary
            
            # Add remaining content
            if current_topic.strip():
                topic_segments.append(DocumentSegment(
                    content=current_topic.strip(),
                    segment_type='text',
                    page_number=segment.page_number,
                    metadata={'topic_segmented': True}
                ))
        
        return topic_segments


def ingest_pdf(pdf_path: Path) -> List[DocumentSegment]:
    """Convenience function to ingest a PDF file."""
    ingester = PDFIngester()
    return ingester.load_pdf(pdf_path)
