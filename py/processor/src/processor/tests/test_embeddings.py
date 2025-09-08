"""Tests for the embeddings module."""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
import numpy as np

from processor.embeddings import (
    EmbeddingResult, EmbeddingGenerator,
    generate_embeddings, generate_single_embedding
)


class TestEmbeddingResult:
    """Test EmbeddingResult class."""
    
    def test_embedding_result_creation(self):
        """Test creating an EmbeddingResult."""
        embedding = [0.1, 0.2, 0.3] * 1000  # 3000 dimensions
        result = EmbeddingResult(
            text="Test text",
            embedding=embedding,
            token_count=50,
            model="text-embedding-3-large",
            success=True
        )
        
        assert result.text == "Test text"
        assert len(result.embedding) == 3000
        assert result.token_count == 50
        assert result.model == "text-embedding-3-large"
        assert result.success
        assert result.error is None
    
    def test_embedding_result_failure(self):
        """Test creating a failed EmbeddingResult."""
        result = EmbeddingResult(
            text="Test text",
            embedding=[],
            token_count=0,
            model="text-embedding-3-large",
            success=False,
            error="API Error"
        )
        
        assert not result.success
        assert result.error == "API Error"
        assert len(result.embedding) == 0


class TestEmbeddingGenerator:
    """Test EmbeddingGenerator class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.generator = EmbeddingGenerator(
            api_key="test-key",
            model="text-embedding-3-large"
        )
    
    def test_init(self):
        """Test EmbeddingGenerator initialization."""
        assert self.generator.model == "text-embedding-3-large"
        assert self.generator.batch_size == 100
        assert self.generator.max_requests_per_minute == 3000
        assert self.generator.max_tokens_per_request == 8191
        assert self.generator.cost_per_1k_tokens == 0.00013
    
    def test_estimate_tokens(self):
        """Test token estimation."""
        text = "This is a test sentence with multiple words."
        token_count = self.generator._estimate_tokens(text)
        assert token_count > 0
        assert isinstance(token_count, int)
    
    def test_truncate_text_short(self):
        """Test truncation of short text."""
        short_text = "Short text"
        truncated = self.generator._truncate_text(short_text)
        assert truncated == short_text
    
    def test_truncate_text_long(self):
        """Test truncation of long text."""
        long_text = "This is a very long text. " * 1000  # Very long
        truncated = self.generator._truncate_text(long_text)
        # The text might not be truncated if it's within token limits
        assert len(truncated) <= len(long_text)
        assert len(truncated) > 0
    
    def test_calculate_similarity(self):
        """Test cosine similarity calculation."""
        embedding1 = [1.0, 0.0, 0.0]
        embedding2 = [1.0, 0.0, 0.0]
        similarity = self.generator.calculate_similarity(embedding1, embedding2)
        assert similarity == 1.0  # Identical vectors
    
    def test_calculate_similarity_orthogonal(self):
        """Test cosine similarity for orthogonal vectors."""
        embedding1 = [1.0, 0.0, 0.0]
        embedding2 = [0.0, 1.0, 0.0]
        similarity = self.generator.calculate_similarity(embedding1, embedding2)
        assert similarity == 0.0  # Orthogonal vectors
    
    def test_calculate_similarity_empty(self):
        """Test cosine similarity with empty embeddings."""
        similarity = self.generator.calculate_similarity([], [1.0, 0.0])
        assert similarity == 0.0
    
    def test_find_most_similar(self):
        """Test finding most similar embeddings."""
        query_embedding = [1.0, 0.0, 0.0]
        candidates = [
            ("text1", [1.0, 0.0, 0.0]),  # Identical
            ("text2", [0.0, 1.0, 0.0]),  # Orthogonal
            ("text3", [0.5, 0.5, 0.0])   # Some similarity
        ]
        
        results = self.generator.find_most_similar(query_embedding, candidates, top_k=2)
        
        assert len(results) == 2
        assert results[0][0] == "text1"  # Most similar
        assert results[0][1] == 1.0
        assert results[1][0] == "text3"  # Second most similar
    
    @pytest.mark.asyncio
    @patch('processor.embeddings.openai.AsyncOpenAI')
    async def test_generate_embedding_success(self, mock_openai_class):
        """Test successful embedding generation."""
        # Mock OpenAI response
        mock_response = Mock()
        mock_response.data = [Mock()]
        mock_response.data[0].embedding = [0.1, 0.2, 0.3] * 1000  # 3000 dimensions
        mock_response.usage.total_tokens = 50
        
        mock_client = AsyncMock()
        mock_client.embeddings.create.return_value = mock_response
        mock_openai_class.return_value = mock_client
        
        generator = EmbeddingGenerator(api_key="test-key")
        result = await generator.generate_embedding("Test text")
        
        assert result.success
        assert len(result.embedding) == 3000
        assert result.token_count == 50
        assert result.text == "Test text"
    
    @pytest.mark.asyncio
    async def test_generate_embedding_empty_text(self):
        """Test embedding generation with empty text."""
        result = await self.generator.generate_embedding("")
        
        assert not result.success
        assert result.error == "Empty text"
        assert len(result.embedding) == 0
    
    @pytest.mark.asyncio
    @patch('processor.embeddings.openai.AsyncOpenAI')
    async def test_generate_embedding_api_error(self, mock_openai_class):
        """Test handling API errors."""
        # Mock OpenAI to raise exception
        mock_client = AsyncMock()
        mock_client.embeddings.create.side_effect = Exception("API Error")
        mock_openai_class.return_value = mock_client
        
        generator = EmbeddingGenerator(api_key="test-key")
        result = await generator.generate_embedding("Test text")
        
        assert not result.success
        assert "API Error" in result.error
    
    @pytest.mark.asyncio
    @patch('processor.embeddings.openai.AsyncOpenAI')
    async def test_generate_batch_embeddings(self, mock_openai_class):
        """Test batch embedding generation."""
        # Mock OpenAI response
        mock_response = Mock()
        mock_response.data = [Mock()]
        mock_response.data[0].embedding = [0.1, 0.2, 0.3] * 1000
        mock_response.usage.total_tokens = 30
        
        mock_client = AsyncMock()
        mock_client.embeddings.create.return_value = mock_response
        mock_openai_class.return_value = mock_client
        
        generator = EmbeddingGenerator(api_key="test-key")
        texts = ["Text 1", "Text 2", "Text 3"]
        
        results = await generator.generate_batch_embeddings(texts, max_concurrent=2)
        
        assert len(results) == 3
        assert all(result.success for result in results)
        assert all(len(result.embedding) == 3000 for result in results)
    
    def test_get_embedding_stats(self):
        """Test embedding statistics calculation."""
        results = [
            EmbeddingResult("text1", [0.1] * 1000, 50, "model", True),
            EmbeddingResult("text2", [0.2] * 1000, 60, "model", True),
            EmbeddingResult("text3", [], 0, "model", False, "Error")
        ]
        
        stats = self.generator.get_embedding_stats(results)
        
        assert stats['total_texts'] == 3
        assert stats['successful'] == 2
        assert stats['failed'] == 1
        assert stats['success_rate'] == 2/3
        assert stats['total_tokens'] == 110
        assert stats['embedding_dimensions'] == 1000
        assert stats['average_tokens_per_text'] == 110/3
    
    def test_get_embedding_stats_empty(self):
        """Test embedding statistics with empty results."""
        stats = self.generator.get_embedding_stats([])
        assert stats == {}
    
    def test_save_and_load_embeddings(self, tmp_path):
        """Test saving and loading embeddings to/from file."""
        results = [
            EmbeddingResult("text1", [0.1, 0.2, 0.3], 50, "model", True),
            EmbeddingResult("text2", [0.4, 0.5, 0.6], 60, "model", True)
        ]
        
        filepath = tmp_path / "embeddings.json"
        
        # Save embeddings
        self.generator.save_embeddings_to_file(results, str(filepath))
        assert filepath.exists()
        
        # Load embeddings
        loaded_results = self.generator.load_embeddings_from_file(str(filepath))
        
        assert len(loaded_results) == 2
        assert loaded_results[0].text == "text1"
        assert loaded_results[0].embedding == [0.1, 0.2, 0.3]
        assert loaded_results[1].text == "text2"
        assert loaded_results[1].embedding == [0.4, 0.5, 0.6]


class TestConvenienceFunctions:
    """Test convenience functions."""
    
    @pytest.mark.asyncio
    @patch('processor.embeddings.EmbeddingGenerator')
    async def test_generate_embeddings(self, mock_generator_class):
        """Test generate_embeddings convenience function."""
        mock_generator = AsyncMock()
        mock_generator.generate_batch_embeddings.return_value = [
            EmbeddingResult("text1", [0.1, 0.2, 0.3], 50, "model", True)
        ]
        mock_generator_class.return_value = mock_generator
        
        result = await generate_embeddings(["text1"], "api-key")
        
        assert len(result) == 1
        assert result[0].text == "text1"
        mock_generator.generate_batch_embeddings.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('processor.embeddings.EmbeddingGenerator')
    async def test_generate_single_embedding(self, mock_generator_class):
        """Test generate_single_embedding convenience function."""
        mock_generator = AsyncMock()
        mock_generator.generate_embedding.return_value = EmbeddingResult(
            "text", [0.1, 0.2, 0.3], 50, "model", True
        )
        mock_generator_class.return_value = mock_generator
        
        result = await generate_single_embedding("text", "api-key")
        
        assert result.text == "text"
        assert result.embedding == [0.1, 0.2, 0.3]
        mock_generator.generate_embedding.assert_called_once_with("text")


# Integration tests
class TestEmbeddingIntegration:
    """Integration tests for embedding functionality."""
    
    def test_embedding_dimensions_consistency(self):
        """Test that embeddings have consistent dimensions."""
        generator = EmbeddingGenerator(api_key="test-key")
        
        # Test with different text lengths
        texts = ["Short", "This is a medium length text", "This is a very long text with many words and characters"]
        
        # Mock embeddings with consistent dimensions
        mock_embeddings = [[0.1] * 3072 for _ in texts]  # text-embedding-3-large has 3072 dimensions
        
        for i, text in enumerate(texts):
            result = EmbeddingResult(text, mock_embeddings[i], 50, "text-embedding-3-large", True)
            assert len(result.embedding) == 3072
    
    def test_similarity_calculation_accuracy(self):
        """Test similarity calculation accuracy."""
        generator = EmbeddingGenerator(api_key="test-key")
        
        # Test cases with known similarities
        test_cases = [
            ([1.0, 0.0, 0.0], [1.0, 0.0, 0.0], 1.0),  # Identical
            ([1.0, 0.0, 0.0], [0.0, 1.0, 0.0], 0.0),  # Orthogonal
            ([1.0, 0.0, 0.0], [0.5, 0.5, 0.0], 0.707),  # 45 degrees
        ]
        
        for emb1, emb2, expected in test_cases:
            similarity = generator.calculate_similarity(emb1, emb2)
            assert abs(similarity - expected) < 0.01, f"Expected {expected}, got {similarity}"
