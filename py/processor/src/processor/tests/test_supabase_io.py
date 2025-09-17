"""Tests for the supabase_io module."""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timezone
import uuid

from processor.supabase_io import (
    DocumentRecord, EmbeddingRecord, UpsertResult, SupabaseIO,
    upsert_content
)


class TestDocumentRecord:
    """Test DocumentRecord class."""
    
    def test_document_record_creation(self):
        """Test creating a DocumentRecord."""
        record = DocumentRecord(
            id="test-id",
            content="Test content",
            partition="public_kb",
            year=2024,
            content_type="Notes",
            variant="calc_ab",
            source_file="test.pdf",
            page_number=1,
            figure_caption="Figure 1",
            metadata={"test": "value"},
            created_at=datetime.now(timezone.utc)
        )
        
        assert record.id == "test-id"
        assert record.content == "Test content"
        assert record.partition == "public_kb"
        assert record.year == 2024
        assert record.content_type == "Notes"
        assert record.variant == "calc_ab"
        assert record.source_file == "test.pdf"
        assert record.page_number == 1
        assert record.figure_caption == "Figure 1"
        assert record.metadata == {"test": "value"}
        assert isinstance(record.created_at, datetime)
        assert record.created_at.tzinfo == timezone.utc


class TestEmbeddingRecord:
    """Test EmbeddingRecord class."""
    
    def test_embedding_record_creation(self):
        """Test creating an EmbeddingRecord."""
        embedding = [0.1, 0.2, 0.3] * 1000  # 3000 dimensions
        record = EmbeddingRecord(
            id="embedding-id",
            document_id="doc-id",
            embedding=embedding,
            model="text-embedding-3-large",
            token_count=50,
            created_at=datetime.now(timezone.utc)
        )
        
        assert record.id == "embedding-id"
        assert record.document_id == "doc-id"
        assert len(record.embedding) == 3000
        assert record.model == "text-embedding-3-large"
        assert record.token_count == 50
        assert isinstance(record.created_at, datetime)
        assert record.created_at.tzinfo == timezone.utc


class TestUpsertResult:
    """Test UpsertResult class."""
    
    def test_upsert_result_success(self):
        """Test successful UpsertResult."""
        result = UpsertResult(
            document_id="doc-id",
            embedding_id="emb-id",
            success=True
        )
        
        assert result.document_id == "doc-id"
        assert result.embedding_id == "emb-id"
        assert result.success
        assert result.error is None
    
    def test_upsert_result_failure(self):
        """Test failed UpsertResult."""
        result = UpsertResult(
            document_id="doc-id",
            embedding_id="emb-id",
            success=False,
            error="Database error"
        )
        
        assert not result.success
        assert result.error == "Database error"


class TestSupabaseIO:
    """Test SupabaseIO class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.io = SupabaseIO("https://test.supabase.co", "test-key")
    
    def test_init(self):
        """Test SupabaseIO initialization."""
        assert self.io.url == "https://test.supabase.co"
        assert self.io.key == "test-key"
        assert self.io.client is None  # Client is not initialized immediately
    
    def test_generate_id(self):
        """Test ID generation."""
        id1 = self.io._generate_id()
        id2 = self.io._generate_id()
        
        assert id1 != id2
        assert isinstance(id1, str)
        assert len(id1) > 0
    
    def test_prepare_document_record(self):
        """Test document record preparation."""
        record = self.io._prepare_document_record(
            content="Test content",
            partition="public_kb",
            year=2024,
            content_type="Notes",
            variant="calc_ab",
            source_file="test.pdf",
            page_number=1,
            figure_caption="Figure 1",
            metadata={"test": "value"}
        )
        
        assert isinstance(record, DocumentRecord)
        assert record.content == "Test content"
        assert record.partition == "public_kb"
        assert record.year == 2024
        assert record.content_type == "Notes"
        assert record.variant == "calc_ab"
        assert record.source_file == "test.pdf"
        assert record.page_number == 1
        assert record.figure_caption == "Figure 1"
        assert record.metadata == {"test": "value"}
        assert isinstance(record.id, str)
        assert isinstance(record.created_at, datetime)
    
    def test_prepare_embedding_record(self):
        """Test embedding record preparation."""
        embedding = [0.1, 0.2, 0.3] * 1000
        record = self.io._prepare_embedding_record(
            document_id="doc-id",
            embedding=embedding,
            model="text-embedding-3-large",
            token_count=50
        )
        
        assert isinstance(record, EmbeddingRecord)
        assert record.document_id == "doc-id"
        assert len(record.embedding) == 3000
        assert record.model == "text-embedding-3-large"
        assert record.token_count == 50
        assert isinstance(record.id, str)
        assert isinstance(record.created_at, datetime)
    
    @pytest.mark.asyncio
    @patch('supabase._async.client.AsyncClient')
    async def test_upsert_document_success(self, mock_async_client_class):
        """Test successful document upsert."""
        # Mock Supabase response
        mock_response = Mock()
        mock_response.data = [{"id": "test-id", "content": "Test content"}]
        
        mock_client = Mock()
        mock_client.table.return_value.upsert.return_value.execute = AsyncMock(return_value=mock_response)
        mock_async_client_class.return_value = mock_client
        
        # Create test record
        document = DocumentRecord(
            id="test-id",
            content="Test content",
            partition="public_kb",
            year=2024,
            content_type="Notes",
            variant="calc_ab"
        )
        
        success, error = await self.io.upsert_document(document)
        
        assert success
        assert error is None
    
    @pytest.mark.asyncio
    @patch('supabase._async.client.AsyncClient')
    async def test_upsert_document_failure(self, mock_async_client_class):
        """Test failed document upsert."""
        # Mock Supabase response with no data
        mock_response = Mock()
        mock_response.data = None
        
        mock_client = Mock()
        mock_client.table.return_value.upsert.return_value.execute = AsyncMock(return_value=mock_response)
        mock_async_client_class.return_value = mock_client
        
        # Create test record
        document = DocumentRecord(
            id="test-id",
            content="Test content",
            partition="public_kb",
            year=2024,
            content_type="Notes",
            variant="calc_ab"
        )
        
        success, error = await self.io.upsert_document(document)
        
        assert not success
        assert "No data returned" in error
    
    @pytest.mark.asyncio
    @patch('supabase._async.client.AsyncClient')
    async def test_upsert_embedding_success(self, mock_async_client_class):
        """Test successful embedding upsert."""
        # Mock Supabase response
        mock_response = Mock()
        mock_response.data = [{"id": "embedding-id"}]
        
        mock_client = Mock()
        mock_client.table.return_value.upsert.return_value.execute = AsyncMock(return_value=mock_response)
        mock_async_client_class.return_value = mock_client
        
        # Create test record
        embedding = EmbeddingRecord(
            id="embedding-id",
            document_id="doc-id",
            embedding=[0.1, 0.2, 0.3] * 1000,
            model="text-embedding-3-large",
            token_count=50
        )
        
        success, error = await self.io.upsert_embedding(embedding)
        
        assert success
        assert error is None
    
    @pytest.mark.asyncio
    @patch('supabase._async.client.AsyncClient')
    async def test_upsert_document_with_embedding_success(self, mock_async_client_class):
        """Test successful document and embedding upsert."""
        # Mock Supabase responses
        mock_doc_response = Mock()
        mock_doc_response.data = [{"id": "doc-id"}]
        
        mock_emb_response = Mock()
        mock_emb_response.data = [{"id": "embedding-id"}]
        
        mock_client = Mock()
        mock_client.table.return_value.upsert.return_value.execute = AsyncMock(side_effect=[
            mock_doc_response, mock_emb_response
        ])
        mock_async_client_class.return_value = mock_client
        
        # Create test records
        document = DocumentRecord(
            id="doc-id",
            content="Test content",
            partition="public_kb",
            year=2024,
            content_type="Notes",
            variant="calc_ab"
        )
        
        embedding = EmbeddingRecord(
            id="embedding-id",
            document_id="doc-id",
            embedding=[0.1, 0.2, 0.3] * 1000,
            model="text-embedding-3-large",
            token_count=50
        )
        
        result = await self.io.upsert_document_with_embedding(document, embedding)
        
        assert result.success
        assert result.document_id == "doc-id"
        assert result.embedding_id == "embedding-id"
        assert result.error is None
    
    @pytest.mark.asyncio
    @patch('supabase._async.client.AsyncClient')
    async def test_upsert_document_with_embedding_document_failure(self, mock_async_client_class):
        """Test document and embedding upsert with document failure."""
        # Mock Supabase response with no data for document
        mock_doc_response = Mock()
        mock_doc_response.data = None
        
        mock_client = Mock()
        mock_client.table.return_value.upsert.return_value.execute = AsyncMock(return_value=mock_doc_response)
        mock_async_client_class.return_value = mock_client
        
        # Create test records
        document = DocumentRecord(
            id="doc-id",
            content="Test content",
            partition="public_kb",
            year=2024,
            content_type="Notes",
            variant="calc_ab"
        )
        
        embedding = EmbeddingRecord(
            id="embedding-id",
            document_id="doc-id",
            embedding=[0.1, 0.2, 0.3] * 1000,
            model="text-embedding-3-large",
            token_count=50
        )
        
        result = await self.io.upsert_document_with_embedding(document, embedding)
        
        assert not result.success
        assert "Document upsert failed" in result.error
    
    @pytest.mark.asyncio
    @patch('supabase._async.client.AsyncClient')
    async def test_batch_upsert_documents(self, mock_async_client_class):
        """Test batch document upsert."""
        # Mock Supabase responses
        mock_response = Mock()
        mock_response.data = [{"id": "doc-id"}]
        
        mock_client = Mock()
        mock_client.table.return_value.upsert.return_value.execute = AsyncMock(return_value=mock_response)
        mock_async_client_class.return_value = mock_client
        
        # Create test documents
        documents = [
            DocumentRecord("doc1", "content1", "public_kb", 2024, "Notes", "calc_ab"),
            DocumentRecord("doc2", "content2", "public_kb", 2024, "Notes", "calc_ab")
        ]
        
        results = await self.io.batch_upsert_documents(documents, batch_size=1)
        
        assert len(results) == 2
        assert all(success for success, _ in results)
    
    @pytest.mark.asyncio
    @patch('supabase._async.client.AsyncClient')
    async def test_batch_upsert_embeddings(self, mock_async_client_class):
        """Test batch embedding upsert."""
        # Mock Supabase responses
        mock_response = Mock()
        mock_response.data = [{"id": "embedding-id"}]
        
        mock_client = Mock()
        mock_client.table.return_value.upsert.return_value.execute = AsyncMock(return_value=mock_response)
        mock_async_client_class.return_value = mock_client
        
        # Create test embeddings
        embeddings = [
            EmbeddingRecord("emb1", "doc1", [0.1] * 1000, "model", 50),
            EmbeddingRecord("emb2", "doc2", [0.2] * 1000, "model", 60)
        ]
        
        results = await self.io.batch_upsert_embeddings(embeddings, batch_size=1)
        
        assert len(results) == 2
        assert all(success for success, _ in results)
    
    @pytest.mark.asyncio
    @patch('supabase._async.client.AsyncClient')
    async def test_batch_upsert_documents_with_embeddings(self, mock_async_client_class):
        """Test batch document and embedding upsert."""
        # Mock Supabase responses
        mock_doc_response = Mock()
        mock_doc_response.data = [{"id": "doc-id"}]
        
        mock_emb_response = Mock()
        mock_emb_response.data = [{"id": "embedding-id"}]
        
        mock_client = Mock()
        mock_client.table.return_value.upsert.return_value.execute = AsyncMock(side_effect=[
            mock_doc_response, mock_emb_response,
            mock_doc_response, mock_emb_response
        ])
        mock_async_client_class.return_value = mock_client
        
        # Create test records
        documents = [
            DocumentRecord("doc1", "content1", "public_kb", 2024, "Notes", "calc_ab"),
            DocumentRecord("doc2", "content2", "public_kb", 2024, "Notes", "calc_ab")
        ]
        
        embeddings = [
            EmbeddingRecord("emb1", "doc1", [0.1] * 1000, "model", 50),
            EmbeddingRecord("emb2", "doc2", [0.2] * 1000, "model", 60)
        ]
        
        results = await self.io.batch_upsert_documents_with_embeddings(
            documents, embeddings, batch_size=1
        )
        
        assert len(results) == 2
        assert all(result.success for result in results)
    
    @pytest.mark.asyncio
    @patch('supabase._async.client.AsyncClient')
    async def test_get_document_by_id(self, mock_async_client_class):
        """Test getting document by ID."""
        # Mock Supabase response
        mock_response = Mock()
        mock_response.data = [{"id": "doc-id", "content": "Test content"}]
        
        mock_client = Mock()
        mock_client.table.return_value.select.return_value.eq.return_value.execute = AsyncMock(return_value=mock_response)
        mock_async_client_class.return_value = mock_client
        
        result = await self.io.get_document_by_id("doc-id")
        
        assert result is not None
        assert result["id"] == "doc-id"
        assert result["content"] == "Test content"
    
    @pytest.mark.asyncio
    @patch('supabase._async.client.AsyncClient')
    async def test_get_embedding_by_document_id(self, mock_async_client_class):
        """Test getting embedding by document ID."""
        # Mock Supabase response
        mock_response = Mock()
        mock_response.data = [{"id": "emb-id", "document_id": "doc-id"}]
        
        mock_client = Mock()
        mock_client.table.return_value.select.return_value.eq.return_value.execute = AsyncMock(return_value=mock_response)
        mock_async_client_class.return_value = mock_client
        
        result = await self.io.get_embedding_by_document_id("doc-id")
        
        assert result is not None
        assert result["id"] == "emb-id"
        assert result["document_id"] == "doc-id"
    
    @pytest.mark.asyncio
    @patch('supabase._async.client.AsyncClient')
    async def test_search_documents(self, mock_async_client_class):
        """Test document search with filters."""
        # Mock Supabase response
        mock_response = Mock()
        mock_response.data = [
            {"id": "doc1", "variant": "calc_ab"},
            {"id": "doc2", "variant": "calc_ab"}
        ]
        
        mock_client = Mock()
        mock_table = Mock()
        mock_select = Mock()
        mock_eq1 = Mock()
        mock_eq2 = Mock()
        mock_limit = Mock()
        mock_limit.execute = AsyncMock(return_value=mock_response)
        mock_eq2.limit.return_value = mock_limit
        mock_eq1.eq.return_value = mock_eq2
        mock_select.eq.return_value = mock_eq1
        mock_table.select.return_value = mock_select
        mock_client.table.return_value = mock_table
        mock_async_client_class.return_value = mock_client
        
        results = await self.io.search_documents(
            partition="public_kb",
            variant="calc_ab",
            limit=10
        )
        
        assert len(results) == 2
        assert all(doc["variant"] == "calc_ab" for doc in results)
    
    def test_get_upsert_stats(self):
        """Test upsert statistics calculation."""
        results = [
            UpsertResult("doc1", "emb1", True),
            UpsertResult("doc2", "emb2", True),
            UpsertResult("doc3", "emb3", False, "Error")
        ]
        
        stats = self.io.get_upsert_stats(results)
        
        assert stats['total_records'] == 3
        assert stats['successful'] == 2
        assert stats['failed'] == 1
        assert stats['success_rate'] == 2/3
        assert len(stats['errors']) == 1
        assert stats['errors'][0] == "Error"
    
    def test_get_upsert_stats_empty(self):
        """Test upsert statistics with empty results."""
        stats = self.io.get_upsert_stats([])
        assert stats == {}


class TestConvenienceFunctions:
    """Test convenience functions."""
    
    @pytest.mark.asyncio
    @patch('processor.supabase_io.SupabaseIO')
    async def test_upsert_content(self, mock_io_class):
        """Test upsert_content convenience function."""
        mock_io = Mock()
        mock_io._prepare_document_record.return_value = DocumentRecord(
            "doc-id", "content", "public_kb", 2024, "Notes", "calc_ab"
        )
        mock_io._prepare_embedding_record.return_value = EmbeddingRecord(
            "emb-id", "doc-id", [0.1] * 1000, "model", 50
        )
        mock_io.upsert_document_with_embedding = AsyncMock(return_value=UpsertResult(
            "doc-id", "emb-id", True
        ))
        mock_io_class.return_value = mock_io
        
        result = await upsert_content(
            content="Test content",
            partition="public_kb",
            year=2024,
            content_type="Notes",
            variant="calc_ab",
            embedding=[0.1] * 1000,
            model="text-embedding-3-large",
            token_count=50,
            supabase_url="https://test.supabase.co",
            supabase_key="test-key"
        )
        
        assert result.success
        assert result.document_id == "doc-id"
        assert result.embedding_id == "emb-id"
