"""Content paraphrasing with OpenAI API and rate limiting."""

import asyncio
import time
from typing import List, Dict, Any, Optional, Tuple
import logging
from dataclasses import dataclass

import openai
import tiktoken
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger(__name__)


@dataclass
class ParaphraseResult:
    """Result of paraphrasing operation."""
    original_text: str
    paraphrased_text: str
    confidence: float
    skipped: bool
    reason: Optional[str] = None
    token_count: int = 0
    api_cost: float = 0.0
    
    @property
    def success(self) -> bool:
        """Whether the paraphrasing was successful."""
        return not self.skipped or (self.skipped and self.reason and "dry run" in self.reason.lower())


class RateLimiter:
    """Simple rate limiter for API calls."""
    
    def __init__(self, max_requests_per_minute: int = 50):
        self.max_requests = max_requests_per_minute
        self.requests = []
        self.lock = asyncio.Lock()
    
    async def acquire(self) -> None:
        """Acquire permission to make a request."""
        async with self.lock:
            now = time.time()
            # Remove requests older than 1 minute
            self.requests = [req_time for req_time in self.requests if now - req_time < 60]
            
            if len(self.requests) >= self.max_requests:
                # Wait until we can make another request
                sleep_time = 60 - (now - self.requests[0]) + 1
                if sleep_time > 0:
                    logger.info(f"Rate limit reached, sleeping for {sleep_time:.1f} seconds")
                    await asyncio.sleep(sleep_time)
                    # Clean up old requests again
                    now = time.time()
                    self.requests = [req_time for req_time in self.requests if now - req_time < 60]
            
            self.requests.append(now)


class ContentParaphraser:
    """Handles content paraphrasing with OpenAI API."""
    
    def __init__(
        self,
        api_key: str,
        model: str = "gpt-3.5-turbo",
        max_requests_per_minute: int = 50,
        max_tokens_per_request: int = 4000
    ):
        self.client = openai.AsyncOpenAI(api_key=api_key)
        self.model = model
        self.rate_limiter = RateLimiter(max_requests_per_minute)
        self.max_tokens = max_tokens_per_request
        self.encoding = tiktoken.encoding_for_model(model)
        
        # Cost per 1K tokens (approximate)
        self.cost_per_1k_tokens = 0.002  # $0.002 for gpt-3.5-turbo
    
    def _count_tokens(self, text: str) -> int:
        """Count tokens in text."""
        return len(self.encoding.encode(text))
    
    def _should_skip_paraphrase(self, text: str) -> Tuple[bool, Optional[str]]:
        """Determine if text should be skipped from paraphrasing."""
        # Skip very short text
        if len(text.strip()) < 20:
            return True, "Text too short"
        
        # Skip if mostly mathematical notation
        math_chars = sum(1 for c in text if c in '()[]{}^_+-=<>/\\')
        if math_chars / len(text) > 0.3:
            return True, "Mostly mathematical notation"
        
        # Skip if contains too many special characters
        special_chars = sum(1 for c in text if not c.isalnum() and c not in ' .,!?;:')
        if special_chars / len(text) > 0.4:
            return True, "Too many special characters"
        
        # Skip if looks like a list or enumeration
        lines = text.strip().split('\n')
        if len(lines) > 3 and all(line.strip().startswith(('-', '*', '•', '1.', '2.', '3.')) for line in lines[:3]):
            return True, "Appears to be a list"
        
        return False, None
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((openai.RateLimitError, openai.APITimeoutError))
    )
    async def _paraphrase_text(self, text: str) -> Tuple[str, int]:
        """Paraphrase a single text using OpenAI API."""
        await self.rate_limiter.acquire()
        
        prompt = f"""Please paraphrase the following text while preserving all mathematical content, technical terms, and key concepts. 
        Keep the same level of detail and accuracy. Only change the wording and sentence structure, not the meaning.

        Text to paraphrase:
        {text}

        Paraphrased version:"""
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that paraphrases educational content while preserving mathematical accuracy and technical precision."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=0.7,
                top_p=0.9
            )
            
            paraphrased = response.choices[0].message.content.strip()
            tokens_used = response.usage.total_tokens
            
            return paraphrased, tokens_used
            
        except Exception as e:
            logger.error(f"Error paraphrasing text: {e}")
            raise
    
    async def paraphrase_text(self, text: str) -> ParaphraseResult:
        """Paraphrase a single text."""
        should_skip, reason = self._should_skip_paraphrase(text)
        
        if should_skip:
            return ParaphraseResult(
                original_text=text,
                paraphrased_text=text,
                confidence=1.0,
                skipped=True,
                reason=reason,
                token_count=0,
                api_cost=0.0
            )
        
        try:
            paraphrased, tokens_used = await self._paraphrase_text(text)
            
            # Calculate confidence based on similarity (simple heuristic)
            confidence = self._calculate_confidence(text, paraphrased)
            
            # Calculate API cost
            api_cost = (tokens_used / 1000) * self.cost_per_1k_tokens
            
            return ParaphraseResult(
                original_text=text,
                paraphrased_text=paraphrased,
                confidence=confidence,
                skipped=False,
                token_count=tokens_used,
                api_cost=api_cost
            )
            
        except Exception as e:
            logger.error(f"Failed to paraphrase text: {e}")
            return ParaphraseResult(
                original_text=text,
                paraphrased_text=text,
                confidence=0.0,
                skipped=True,
                reason=f"API error: {str(e)}",
                token_count=0,
                api_cost=0.0
            )
    
    def _calculate_confidence(self, original: str, paraphrased: str) -> float:
        """Calculate confidence score for paraphrasing quality."""
        # Simple heuristic based on length similarity and word overlap
        orig_words = set(original.lower().split())
        para_words = set(paraphrased.lower().split())
        
        # Word overlap ratio
        overlap = len(orig_words.intersection(para_words))
        total_unique = len(orig_words.union(para_words))
        word_similarity = overlap / total_unique if total_unique > 0 else 0
        
        # Length similarity
        length_ratio = min(len(paraphrased), len(original)) / max(len(paraphrased), len(original))
        
        # Combined confidence (higher is better)
        confidence = (word_similarity * 0.6 + length_ratio * 0.4)
        
        return min(confidence, 1.0)
    
    async def paraphrase_batch(self, texts: List[str], max_concurrent: int = 5) -> List[ParaphraseResult]:
        """Paraphrase multiple texts with concurrency control."""
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def paraphrase_with_semaphore(text: str) -> ParaphraseResult:
            async with semaphore:
                return await self.paraphrase_text(text)
        
        tasks = [paraphrase_with_semaphore(text) for text in texts]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Error paraphrasing text {i}: {result}")
                processed_results.append(ParaphraseResult(
                    original_text=texts[i],
                    paraphrased_text=texts[i],
                    confidence=0.0,
                    skipped=True,
                    reason=f"Exception: {str(result)}",
                    token_count=0,
                    api_cost=0.0
                ))
            else:
                processed_results.append(result)
        
        return processed_results
    
    def get_paraphrase_stats(self, results: List[ParaphraseResult]) -> Dict[str, Any]:
        """Get statistics from paraphrase results."""
        total_texts = len(results)
        skipped = sum(1 for r in results if r.skipped)
        paraphrased = total_texts - skipped
        
        total_tokens = sum(r.token_count for r in results)
        total_cost = sum(r.api_cost for r in results)
        
        avg_confidence = sum(r.confidence for r in results if not r.skipped) / max(paraphrased, 1)
        
        return {
            'total_texts': total_texts,
            'paraphrased': paraphrased,
            'skipped': skipped,
            'skip_rate': skipped / total_texts if total_texts > 0 else 0,
            'total_tokens': total_tokens,
            'total_cost': total_cost,
            'average_confidence': avg_confidence
        }


# Convenience functions
async def paraphrase_content(
    texts: List[str],
    api_key: str,
    model: str = "gpt-3.5-turbo",
    max_concurrent: int = 5
) -> List[ParaphraseResult]:
    """Convenience function to paraphrase multiple texts."""
    paraphraser = ContentParaphraser(api_key=api_key, model=model)
    return await paraphraser.paraphrase_batch(texts, max_concurrent)


async def paraphrase_single(
    text: str,
    api_key: str,
    model: str = "gpt-3.5-turbo"
) -> ParaphraseResult:
    """Convenience function to paraphrase a single text."""
    paraphraser = ContentParaphraser(api_key=api_key, model=model)
    return await paraphraser.paraphrase_text(text)
