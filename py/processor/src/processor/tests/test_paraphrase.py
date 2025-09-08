"""Tests for the paraphrase module."""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
import time

from processor.paraphrase import (
    ParaphraseResult, RateLimiter, ContentParaphraser,
    paraphrase_content, paraphrase_single
)


class TestParaphraseResult:
    """Test ParaphraseResult class."""
    
    def test_paraphrase_result_creation(self):
        """Test creating a ParaphraseResult."""
        result = ParaphraseResult(
            original_text="Original",
            paraphrased_text="Paraphrased",
            confidence=0.8,
            skipped=False,
            token_count=100,
            api_cost=0.02
        )
        
        assert result.original_text == "Original"
        assert result.paraphrased_text == "Paraphrased"
        assert result.confidence == 0.8
        assert not result.skipped
        assert result.token_count == 100
        assert result.api_cost == 0.02


class TestRateLimiter:
    """Test RateLimiter class."""
    
    @pytest.mark.asyncio
    async def test_rate_limiter_acquire(self):
        """Test rate limiter acquire method."""
        limiter = RateLimiter(max_requests_per_minute=2)
        
        # First two requests should go through immediately
        start_time = time.time()
        await limiter.acquire()
        await limiter.acquire()
        first_two_time = time.time() - start_time
        
        # Third request should be delayed
        start_time = time.time()
        await limiter.acquire()
        third_request_time = time.time() - start_time
        
        assert first_two_time < 1.0  # First two should be fast
        assert third_request_time > 50.0  # Third should be delayed
    
    @pytest.mark.asyncio
    async def test_rate_limiter_concurrent(self):
        """Test rate limiter with concurrent requests."""
        limiter = RateLimiter(max_requests_per_minute=5)
        
        # Make multiple concurrent requests
        start_time = time.time()
        tasks = [limiter.acquire() for _ in range(3)]
        await asyncio.gather(*tasks)
        elapsed = time.time() - start_time
        
        # Should complete quickly for first few requests
        assert elapsed < 2.0


class TestContentParaphraser:
    """Test ContentParaphraser class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.paraphraser = ContentParaphraser(
            api_key="test-key",
            model="gpt-3.5-turbo",
            max_requests_per_minute=100
        )
    
    def test_init(self):
        """Test ContentParaphraser initialization."""
        assert self.paraphraser.model == "gpt-3.5-turbo"
        assert self.paraphraser.max_tokens == 4000
        assert self.paraphraser.cost_per_1k_tokens == 0.002
    
    def test_count_tokens(self):
        """Test token counting."""
        text = "This is a test sentence."
        token_count = self.paraphraser._count_tokens(text)
        assert token_count > 0
        assert isinstance(token_count, int)
    
    def test_should_skip_paraphrase_short_text(self):
        """Test skipping short text."""
        should_skip, reason = self.paraphraser._should_skip_paraphrase("Short")
        assert should_skip
        assert "too short" in reason.lower()
    
    def test_should_skip_paraphrase_math_notation(self):
        """Test skipping mostly mathematical notation."""
        math_text = "()[]{}^_+-=<>/\\" * 10  # Mostly math chars
        should_skip, reason = self.paraphraser._should_skip_paraphrase(math_text)
        assert should_skip
        assert "mathematical" in reason.lower()
    
    def test_should_skip_paraphrase_special_chars(self):
        """Test skipping text with too many special characters."""
        special_text = "!@#$%^&*()" * 20  # Many special chars
        should_skip, reason = self.paraphraser._should_skip_paraphrase(special_text)
        assert should_skip
        assert "special characters" in reason.lower()
    
    def test_should_skip_paraphrase_list(self):
        """Test skipping list-like content."""
        list_text = "- Item 1\n- Item 2\n- Item 3\n- Item 4"
        should_skip, reason = self.paraphraser._should_skip_paraphrase(list_text)
        assert should_skip
        assert "list" in reason.lower()
    
    def test_should_skip_paraphrase_normal_text(self):
        """Test not skipping normal text."""
        normal_text = "This is a normal sentence with regular words and punctuation."
        should_skip, reason = self.paraphraser._should_skip_paraphrase(normal_text)
        assert not should_skip
        assert reason is None
    
    def test_calculate_confidence(self):
        """Test confidence calculation."""
        original = "The derivative of x squared is 2x"
        paraphrased = "The derivative of x squared equals 2x"
        
        confidence = self.paraphraser._calculate_confidence(original, paraphrased)
        assert 0.0 <= confidence <= 1.0
        assert confidence > 0.5  # Should be high for similar text
    
    def test_calculate_confidence_different_text(self):
        """Test confidence calculation for different text."""
        original = "The derivative of x squared is 2x"
        paraphrased = "Completely different content about something else"
        
        confidence = self.paraphraser._calculate_confidence(original, paraphrased)
        assert 0.0 <= confidence <= 1.0
        assert confidence < 0.5  # Should be low for different text
    
    @pytest.mark.asyncio
    @patch('processor.paraphrase.openai.AsyncOpenAI')
    async def test_paraphrase_text_success(self, mock_openai_class):
        """Test successful text paraphrasing."""
        # Mock OpenAI response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "Paraphrased version of the text"
        mock_response.usage.total_tokens = 50
        
        mock_client = AsyncMock()
        mock_client.chat.completions.create.return_value = mock_response
        mock_openai_class.return_value = mock_client
        
        paraphraser = ContentParaphraser(api_key="test-key")
        result = await paraphraser.paraphrase_text("Original text to paraphrase")
        
        assert result.success
        assert not result.skipped
        assert result.paraphrased_text == "Paraphrased version of the text"
        assert result.token_count == 50
        assert result.confidence > 0
    
    @pytest.mark.asyncio
    async def test_paraphrase_text_skip(self):
        """Test skipping text that should not be paraphrased."""
        result = await self.paraphraser.paraphrase_text("Short")
        
        assert result.skipped
        assert result.paraphrased_text == "Short"
        assert result.confidence == 1.0
        assert result.token_count == 0
        assert result.api_cost == 0.0
    
    @pytest.mark.asyncio
    @patch('processor.paraphrase.openai.AsyncOpenAI')
    async def test_paraphrase_text_api_error(self, mock_openai_class):
        """Test handling API errors."""
        # Mock OpenAI to raise exception
        mock_client = AsyncMock()
        mock_client.chat.completions.create.side_effect = Exception("API Error")
        mock_openai_class.return_value = mock_client
        
        paraphraser = ContentParaphraser(api_key="test-key")
        result = await paraphraser.paraphrase_text("Text to paraphrase")
        
        assert result.skipped
        assert "API error" in result.reason.lower() or "text too short" in result.reason.lower()
        # Confidence is 1.0 for skipped text, 0.0 for API errors
        assert result.confidence in [0.0, 1.0]
    
    @pytest.mark.asyncio
    @patch('processor.paraphrase.openai.AsyncOpenAI')
    async def test_paraphrase_batch(self, mock_openai_class):
        """Test batch paraphrasing."""
        # Mock OpenAI response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "Paraphrased"
        mock_response.usage.total_tokens = 30
        
        mock_client = AsyncMock()
        mock_client.chat.completions.create.return_value = mock_response
        mock_openai_class.return_value = mock_client
        
        paraphraser = ContentParaphraser(api_key="test-key")
        texts = ["This is a longer text that should not be skipped", "Another longer text for testing", "Short"]  # Last one should be skipped
        
        results = await paraphraser.paraphrase_batch(texts, max_concurrent=2)
        
        assert len(results) == 3
        # First two should be successful (not skipped), third should be skipped
        assert not results[0].skipped
        assert not results[1].skipped
        assert results[2].skipped  # Short text should be skipped
    
    def test_get_paraphrase_stats(self):
        """Test paraphrase statistics calculation."""
        results = [
            ParaphraseResult("text1", "para1", 0.8, False, token_count=50),
            ParaphraseResult("text2", "para2", 0.9, False, token_count=60),
            ParaphraseResult("text3", "text3", 1.0, True, reason="skipped", token_count=0)
        ]
        
        stats = self.paraphraser.get_paraphrase_stats(results)
        
        assert stats['total_texts'] == 3
        assert stats['paraphrased'] == 2
        assert stats['skipped'] == 1
        assert stats['skip_rate'] == 1/3
        assert stats['total_tokens'] == 110
        assert abs(stats['average_confidence'] - 0.85) < 0.01


class TestConvenienceFunctions:
    """Test convenience functions."""
    
    @pytest.mark.asyncio
    @patch('processor.paraphrase.ContentParaphraser')
    async def test_paraphrase_content(self, mock_paraphraser_class):
        """Test paraphrase_content convenience function."""
        mock_paraphraser = AsyncMock()
        mock_paraphraser.paraphrase_batch.return_value = [
            ParaphraseResult("text1", "para1", 0.8, False)
        ]
        mock_paraphraser_class.return_value = mock_paraphraser
        
        result = await paraphrase_content(["text1"], "api-key")
        
        assert len(result) == 1
        assert result[0].paraphrased_text == "para1"
        mock_paraphraser.paraphrase_batch.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('processor.paraphrase.ContentParaphraser')
    async def test_paraphrase_single(self, mock_paraphraser_class):
        """Test paraphrase_single convenience function."""
        mock_paraphraser = AsyncMock()
        mock_paraphraser.paraphrase_text.return_value = ParaphraseResult(
            "text", "para", 0.8, False
        )
        mock_paraphraser_class.return_value = mock_paraphraser
        
        result = await paraphrase_single("text", "api-key")
        
        assert result.paraphrased_text == "para"
        mock_paraphraser.paraphrase_text.assert_called_once_with("text")
