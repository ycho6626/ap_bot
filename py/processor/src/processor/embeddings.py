"""Batch embeddings generation with OpenAI text-embedding-3-large."""

import asyncio
import time
from typing import List, Dict, Any, Optional, Tuple
import logging
from dataclasses import dataclass

import openai
import numpy as np
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger(__name__)


@dataclass
class EmbeddingResult:
    """Result of embedding generation."""
    text: str
    embedding: List[float]
    token_count: int
    model: str
    success: bool
    error: Optional[str] = None


class EmbeddingGenerator:
    """Handles batch embedding generation with OpenAI API."""
    
    def __init__(
        self,
        api_key: str,
        model: str = "text-embedding-3-large",
        batch_size: int = 100,
        max_requests_per_minute: int = 3000,
        max_tokens_per_request: int = 8191
    ):
        self.client = openai.AsyncOpenAI(api_key=api_key)
        self.model = model
        self.batch_size = batch_size
        self.max_requests_per_minute = max_requests_per_minute
        self.max_tokens_per_request = max_tokens_per_request
        
        # Rate limiting
        self.requests_made = 0
        self.window_start = time.time()
        self.lock = asyncio.Lock()
        
        # Cost tracking (approximate)
        self.cost_per_1k_tokens = 0.00013  # $0.00013 for text-embedding-3-large
    
    async def _rate_limit(self) -> None:
        """Apply rate limiting."""
        async with self.lock:
            now = time.time()
            
            # Reset window if more than 1 minute has passed
            if now - self.window_start >= 60:
                self.requests_made = 0
                self.window_start = now
            
            # Check if we need to wait
            if self.requests_made >= self.max_requests_per_minute:
                sleep_time = 60 - (now - self.window_start) + 1
                if sleep_time > 0:
                    logger.info(f"Rate limit reached, sleeping for {sleep_time:.1f} seconds")
                    await asyncio.sleep(sleep_time)
                    self.requests_made = 0
                    self.window_start = time.time()
            
            self.requests_made += 1
    
    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count for text (rough approximation)."""
        # Simple estimation: ~4 characters per token
        return len(text) // 4
    
    def _truncate_text(self, text: str) -> str:
        """Truncate text to fit within token limit."""
        estimated_tokens = self._estimate_tokens(text)
        
        if estimated_tokens <= self.max_tokens_per_request:
            return text
        
        # Truncate to approximately max_tokens_per_request
        target_length = int(len(text) * (self.max_tokens_per_request / estimated_tokens))
        return text[:target_length]
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((openai.RateLimitError, openai.APITimeoutError))
    )
    async def _generate_embedding(self, text: str) -> Tuple[List[float], int]:
        """Generate embedding for a single text."""
        await self._rate_limit()
        
        # Truncate if necessary
        truncated_text = self._truncate_text(text)
        
        try:
            response = await self.client.embeddings.create(
                model=self.model,
                input=truncated_text
            )
            
            embedding = response.data[0].embedding
            token_count = response.usage.total_tokens
            
            return embedding, token_count
            
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise
    
    async def generate_embedding(self, text: str) -> EmbeddingResult:
        """Generate embedding for a single text."""
        if not text or not text.strip():
            return EmbeddingResult(
                text=text,
                embedding=[],
                token_count=0,
                model=self.model,
                success=False,
                error="Empty text"
            )
        
        try:
            embedding, token_count = await self._generate_embedding(text)
            
            return EmbeddingResult(
                text=text,
                embedding=embedding,
                token_count=token_count,
                model=self.model,
                success=True
            )
            
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return EmbeddingResult(
                text=text,
                embedding=[],
                token_count=0,
                model=self.model,
                success=False,
                error=str(e)
            )
    
    async def generate_batch_embeddings(
        self, 
        texts: List[str], 
        max_concurrent: int = 10
    ) -> List[EmbeddingResult]:
        """Generate embeddings for multiple texts with concurrency control."""
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def generate_with_semaphore(text: str) -> EmbeddingResult:
            async with semaphore:
                return await self.generate_embedding(text)
        
        tasks = [generate_with_semaphore(text) for text in texts]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Error generating embedding for text {i}: {result}")
                processed_results.append(EmbeddingResult(
                    text=texts[i],
                    embedding=[],
                    token_count=0,
                    model=self.model,
                    success=False,
                    error=f"Exception: {str(result)}"
                ))
            else:
                processed_results.append(result)
        
        return processed_results
    
    def calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings."""
        if not embedding1 or not embedding2:
            return 0.0
        
        # Convert to numpy arrays
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)
        
        # Calculate cosine similarity
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        similarity = dot_product / (norm1 * norm2)
        return float(similarity)
    
    def find_most_similar(
        self, 
        query_embedding: List[float], 
        candidate_embeddings: List[Tuple[str, List[float]]],
        top_k: int = 5
    ) -> List[Tuple[str, float]]:
        """Find most similar embeddings to query."""
        similarities = []
        
        for text, embedding in candidate_embeddings:
            similarity = self.calculate_similarity(query_embedding, embedding)
            similarities.append((text, similarity))
        
        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:top_k]
    
    def get_embedding_stats(self, results: List[EmbeddingResult]) -> Dict[str, Any]:
        """Get statistics from embedding results."""
        if not results:
            return {}
        
        total_texts = len(results)
        successful = sum(1 for r in results if r.success)
        failed = total_texts - successful
        
        total_tokens = sum(r.token_count for r in results)
        total_cost = (total_tokens / 1000) * self.cost_per_1k_tokens
        
        # Calculate embedding dimensions
        dimensions = 0
        if successful > 0:
            first_successful = next(r for r in results if r.success)
            dimensions = len(first_successful.embedding)
        
        return {
            'total_texts': total_texts,
            'successful': successful,
            'failed': failed,
            'success_rate': successful / total_texts if total_texts > 0 else 0,
            'total_tokens': total_tokens,
            'total_cost': total_cost,
            'embedding_dimensions': dimensions,
            'average_tokens_per_text': total_tokens / total_texts if total_texts > 0 else 0
        }
    
    def save_embeddings_to_file(
        self, 
        results: List[EmbeddingResult], 
        filepath: str
    ) -> None:
        """Save embeddings to a file for later use."""
        import json
        
        data = {
            'model': self.model,
            'embeddings': [
                {
                    'text': result.text,
                    'embedding': result.embedding,
                    'token_count': result.token_count,
                    'success': result.success,
                    'error': result.error
                }
                for result in results
            ]
        }
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        
        logger.info(f"Saved {len(results)} embeddings to {filepath}")
    
    def load_embeddings_from_file(self, filepath: str) -> List[EmbeddingResult]:
        """Load embeddings from a file."""
        import json
        
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        results = []
        for item in data['embeddings']:
            result = EmbeddingResult(
                text=item['text'],
                embedding=item['embedding'],
                token_count=item['token_count'],
                model=data['model'],
                success=item['success'],
                error=item.get('error')
            )
            results.append(result)
        
        logger.info(f"Loaded {len(results)} embeddings from {filepath}")
        return results


# Convenience functions
async def generate_embeddings(
    texts: List[str],
    api_key: str,
    model: str = "text-embedding-3-large",
    max_concurrent: int = 10
) -> List[EmbeddingResult]:
    """Convenience function to generate embeddings for multiple texts."""
    generator = EmbeddingGenerator(api_key=api_key, model=model)
    return await generator.generate_batch_embeddings(texts, max_concurrent)


async def generate_single_embedding(
    text: str,
    api_key: str,
    model: str = "text-embedding-3-large"
) -> EmbeddingResult:
    """Convenience function to generate embedding for a single text."""
    generator = EmbeddingGenerator(api_key=api_key, model=model)
    return await generator.generate_embedding(text)
