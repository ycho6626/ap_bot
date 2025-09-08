"""Supabase I/O operations for kb_document and kb_embedding tables."""

import asyncio
from typing import List, Dict, Any, Optional, Tuple
import logging
from dataclasses import dataclass
from datetime import datetime
import uuid

from supabase import create_client, Client
from supabase._async.client import AsyncClient

logger = logging.getLogger(__name__)


@dataclass
class DocumentRecord:
    """Represents a document record for database insertion."""
    id: str
    content: str
    partition: str
    year: int
    content_type: str
    variant: str
    source_file: Optional[str] = None
    page_number: Optional[int] = None
    figure_caption: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None


@dataclass
class EmbeddingRecord:
    """Represents an embedding record for database insertion."""
    id: str
    document_id: str
    embedding: List[float]
    model: str
    token_count: int
    created_at: Optional[datetime] = None


@dataclass
class UpsertResult:
    """Result of upsert operation."""
    document_id: str
    embedding_id: Optional[str]
    success: bool
    error: Optional[str] = None


class SupabaseIO:
    """Handles Supabase database operations for knowledge base."""
    
    def __init__(self, url: str, key: str):
        self.url = url
        self.key = key
        # Don't initialize client immediately to avoid connection issues in tests
        self.client: Optional[Client] = None
        self.async_client: Optional[AsyncClient] = None
    
    async def _get_async_client(self) -> AsyncClient:
        """Get or create async client."""
        if self.async_client is None:
            from supabase._async.client import AsyncClient
            self.async_client = AsyncClient(self.url, self.key)
        return self.async_client
    
    def _generate_id(self) -> str:
        """Generate a UUID for records."""
        return str(uuid.uuid4())
    
    def _prepare_document_record(
        self,
        content: str,
        partition: str,
        year: int,
        content_type: str,
        variant: str,
        source_file: Optional[str] = None,
        page_number: Optional[int] = None,
        figure_caption: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> DocumentRecord:
        """Prepare a document record for insertion."""
        return DocumentRecord(
            id=self._generate_id(),
            content=content,
            partition=partition,
            year=year,
            content_type=content_type,
            variant=variant,
            source_file=source_file,
            page_number=page_number,
            figure_caption=figure_caption,
            metadata=metadata or {},
            created_at=datetime.utcnow()
        )
    
    def _prepare_embedding_record(
        self,
        document_id: str,
        embedding: List[float],
        model: str,
        token_count: int
    ) -> EmbeddingRecord:
        """Prepare an embedding record for insertion."""
        return EmbeddingRecord(
            id=self._generate_id(),
            document_id=document_id,
            embedding=embedding,
            model=model,
            token_count=token_count,
            created_at=datetime.utcnow()
        )
    
    async def upsert_document(self, document: DocumentRecord) -> Tuple[bool, Optional[str]]:
        """Upsert a single document record."""
        try:
            client = await self._get_async_client()
            
            # Prepare data for insertion
            data = {
                'id': document.id,
                'content': document.content,
                'partition': document.partition,
                'year': document.year,
                'content_type': document.content_type,
                'variant': document.variant,
                'source_file': document.source_file,
                'page_number': document.page_number,
                'figure_caption': document.figure_caption,
                'metadata': document.metadata,
                'created_at': document.created_at.isoformat() if document.created_at else None
            }
            
            # Remove None values
            data = {k: v for k, v in data.items() if v is not None}
            
            result = await client.table('kb_document').upsert(data).execute()
            
            if result.data:
                logger.info(f"Successfully upserted document {document.id}")
                return True, None
            else:
                error_msg = "No data returned from upsert operation"
                logger.error(error_msg)
                return False, error_msg
                
        except Exception as e:
            error_msg = f"Error upserting document: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
    
    async def upsert_embedding(self, embedding: EmbeddingRecord) -> Tuple[bool, Optional[str]]:
        """Upsert a single embedding record."""
        try:
            client = await self._get_async_client()
            
            # Prepare data for insertion
            data = {
                'id': embedding.id,
                'document_id': embedding.document_id,
                'embedding': embedding.embedding,
                'model': embedding.model,
                'token_count': embedding.token_count,
                'created_at': embedding.created_at.isoformat() if embedding.created_at else None
            }
            
            result = await client.table('kb_embedding').upsert(data).execute()
            
            if result.data:
                logger.info(f"Successfully upserted embedding {embedding.id}")
                return True, None
            else:
                error_msg = "No data returned from upsert operation"
                logger.error(error_msg)
                return False, error_msg
                
        except Exception as e:
            error_msg = f"Error upserting embedding: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
    
    async def upsert_document_with_embedding(
        self,
        document: DocumentRecord,
        embedding: EmbeddingRecord
    ) -> UpsertResult:
        """Upsert both document and embedding in a transaction."""
        try:
            # Upsert document first
            doc_success, doc_error = await self.upsert_document(document)
            if not doc_success:
                return UpsertResult(
                    document_id=document.id,
                    embedding_id=None,
                    success=False,
                    error=f"Document upsert failed: {doc_error}"
                )
            
            # Upsert embedding
            emb_success, emb_error = await self.upsert_embedding(embedding)
            if not emb_success:
                return UpsertResult(
                    document_id=document.id,
                    embedding_id=embedding.id,
                    success=False,
                    error=f"Embedding upsert failed: {emb_error}"
                )
            
            return UpsertResult(
                document_id=document.id,
                embedding_id=embedding.id,
                success=True
            )
            
        except Exception as e:
            error_msg = f"Transaction failed: {str(e)}"
            logger.error(error_msg)
            return UpsertResult(
                document_id=document.id,
                embedding_id=embedding.id if 'embedding' in locals() else None,
                success=False,
                error=error_msg
            )
    
    async def batch_upsert_documents(
        self,
        documents: List[DocumentRecord],
        batch_size: int = 100
    ) -> List[Tuple[bool, Optional[str]]]:
        """Batch upsert multiple documents."""
        results = []
        
        for i in range(0, len(documents), batch_size):
            batch = documents[i:i + batch_size]
            
            # Process batch concurrently
            tasks = [self.upsert_document(doc) for doc in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Handle exceptions
            for j, result in enumerate(batch_results):
                if isinstance(result, Exception):
                    logger.error(f"Error in batch upsert: {result}")
                    results.append((False, str(result)))
                else:
                    results.append(result)
        
        return results
    
    async def batch_upsert_embeddings(
        self,
        embeddings: List[EmbeddingRecord],
        batch_size: int = 100
    ) -> List[Tuple[bool, Optional[str]]]:
        """Batch upsert multiple embeddings."""
        results = []
        
        for i in range(0, len(embeddings), batch_size):
            batch = embeddings[i:i + batch_size]
            
            # Process batch concurrently
            tasks = [self.upsert_embedding(emb) for emb in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Handle exceptions
            for j, result in enumerate(batch_results):
                if isinstance(result, Exception):
                    logger.error(f"Error in batch upsert: {result}")
                    results.append((False, str(result)))
                else:
                    results.append(result)
        
        return results
    
    async def batch_upsert_documents_with_embeddings(
        self,
        documents: List[DocumentRecord],
        embeddings: List[EmbeddingRecord],
        batch_size: int = 50
    ) -> List[UpsertResult]:
        """Batch upsert documents with their embeddings."""
        if len(documents) != len(embeddings):
            raise ValueError("Documents and embeddings lists must have the same length")
        
        results = []
        
        for i in range(0, len(documents), batch_size):
            doc_batch = documents[i:i + batch_size]
            emb_batch = embeddings[i:i + batch_size]
            
            # Process batch concurrently
            tasks = [
                self.upsert_document_with_embedding(doc, emb)
                for doc, emb in zip(doc_batch, emb_batch)
            ]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Handle exceptions
            for j, result in enumerate(batch_results):
                if isinstance(result, Exception):
                    logger.error(f"Error in batch upsert: {result}")
                    results.append(UpsertResult(
                        document_id=doc_batch[j].id,
                        embedding_id=emb_batch[j].id,
                        success=False,
                        error=str(result)
                    ))
                else:
                    results.append(result)
        
        return results
    
    async def get_document_by_id(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Get a document by ID."""
        try:
            client = await self._get_async_client()
            result = await client.table('kb_document').select('*').eq('id', document_id).execute()
            
            if result.data:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Error getting document {document_id}: {e}")
            return None
    
    async def get_embedding_by_document_id(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Get embedding by document ID."""
        try:
            client = await self._get_async_client()
            result = await client.table('kb_embedding').select('*').eq('document_id', document_id).execute()
            
            if result.data:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Error getting embedding for document {document_id}: {e}")
            return None
    
    async def search_documents(
        self,
        partition: Optional[str] = None,
        variant: Optional[str] = None,
        content_type: Optional[str] = None,
        year: Optional[int] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Search documents with filters."""
        try:
            client = await self._get_async_client()
            query = client.table('kb_document').select('*')
            
            if partition:
                query = query.eq('partition', partition)
            if variant:
                query = query.eq('variant', variant)
            if content_type:
                query = query.eq('content_type', content_type)
            if year:
                query = query.eq('year', year)
            
            result = await query.limit(limit).execute()
            return result.data or []
            
        except Exception as e:
            logger.error(f"Error searching documents: {e}")
            return []
    
    def get_upsert_stats(self, results: List[UpsertResult]) -> Dict[str, Any]:
        """Get statistics from upsert results."""
        if not results:
            return {}
        
        total = len(results)
        successful = sum(1 for r in results if r.success)
        failed = total - successful
        
        return {
            'total_records': total,
            'successful': successful,
            'failed': failed,
            'success_rate': successful / total if total > 0 else 0,
            'errors': [r.error for r in results if r.error]
        }


# Convenience functions
async def upsert_content(
    content: str,
    partition: str,
    year: int,
    content_type: str,
    variant: str,
    embedding: List[float],
    model: str,
    token_count: int,
    supabase_url: str,
    supabase_key: str,
    source_file: Optional[str] = None,
    page_number: Optional[int] = None,
    figure_caption: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> UpsertResult:
    """Convenience function to upsert content with embedding."""
    io = SupabaseIO(supabase_url, supabase_key)
    
    # Create document record
    document = io._prepare_document_record(
        content=content,
        partition=partition,
        year=year,
        content_type=content_type,
        variant=variant,
        source_file=source_file,
        page_number=page_number,
        figure_caption=figure_caption,
        metadata=metadata
    )
    
    # Create embedding record
    embedding_record = io._prepare_embedding_record(
        document_id=document.id,
        embedding=embedding,
        model=model,
        token_count=token_count
    )
    
    return await io.upsert_document_with_embedding(document, embedding_record)
