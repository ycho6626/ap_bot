"""Tests for the tagging module."""

import pytest

from processor.tagging import (
    ExamVariant, ContentType, SkillTag, ContentTag, APCalculusTagger,
    tag_content, detect_variant
)


class TestEnums:
    """Test enum classes."""
    
    def test_exam_variant(self):
        """Test ExamVariant enum."""
        assert ExamVariant.CALC_AB.value == "calc_ab"
        assert ExamVariant.CALC_BC.value == "calc_bc"
    
    def test_content_type(self):
        """Test ContentType enum."""
        assert ContentType.NOTES.value == "Notes"
        assert ContentType.PRACTICE.value == "Practice"
        assert ContentType.REVIEW.value == "Review"
        assert ContentType.EXAMPLE.value == "Example"


class TestSkillTag:
    """Test SkillTag class."""
    
    def test_skill_tag_creation(self):
        """Test creating a SkillTag."""
        skill = SkillTag(
            unit="Unit 1: Limits and Continuity",
            subtopic="Introduction to Limits",
            skill="Evaluating Limits",
            confidence=0.8
        )
        
        assert skill.unit == "Unit 1: Limits and Continuity"
        assert skill.subtopic == "Introduction to Limits"
        assert skill.skill == "Evaluating Limits"
        assert skill.confidence == 0.8


class TestContentTag:
    """Test ContentTag class."""
    
    def test_content_tag_creation(self):
        """Test creating a ContentTag."""
        skills = [
            SkillTag("Unit 1", "Limits", "Evaluating", 0.8),
            SkillTag("Unit 2", "Derivatives", "Finding", 0.9)
        ]
        
        tag = ContentTag(
            variant=ExamVariant.CALC_AB,
            content_type=ContentType.PRACTICE,
            skills=skills,
            confidence=0.85,
            keywords_found=["limit", "derivative"],
            uncertainty_reasons=[]
        )
        
        assert tag.variant == ExamVariant.CALC_AB
        assert tag.content_type == ContentType.PRACTICE
        assert len(tag.skills) == 2
        assert tag.confidence == 0.85
        assert "limit" in tag.keywords_found
        assert len(tag.uncertainty_reasons) == 0


class TestAPCalculusTagger:
    """Test APCalculusTagger class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.tagger = APCalculusTagger()
    
    def test_init(self):
        """Test APCalculusTagger initialization."""
        assert self.tagger.bc_keywords
        assert self.tagger.ab_keywords
        assert self.tagger.unit_mapping
        assert self.tagger.subtopic_mapping
    
    def test_detect_variant_bc_keywords(self):
        """Test BC variant detection."""
        bc_text = "This content covers series convergence and parametric equations."
        variant, confidence, keywords = self.tagger.detect_variant(bc_text)
        
        assert variant == ExamVariant.CALC_BC
        assert confidence > 0.5
        assert "series" in keywords
        assert "parametric" in keywords
    
    def test_detect_variant_ab_keywords(self):
        """Test AB variant detection."""
        ab_text = "This content covers limits, derivatives, and integrals."
        variant, confidence, keywords = self.tagger.detect_variant(ab_text)
        
        assert variant == ExamVariant.CALC_AB
        assert confidence > 0.3
        assert "limit" in keywords
        assert "derivative" in keywords
        assert "integral" in keywords
    
    def test_detect_variant_no_keywords(self):
        """Test variant detection with no clear keywords."""
        generic_text = "This is some generic content without specific calculus terms."
        variant, confidence, keywords = self.tagger.detect_variant(generic_text)
        
        assert variant == ExamVariant.CALC_AB  # Default to AB
        assert confidence < 0.5
        assert len(keywords) == 0
    
    def test_detect_content_type_practice(self):
        """Test practice content type detection."""
        practice_text = "Solve the following problems. Find the derivative of each function."
        content_type, confidence = self.tagger.detect_content_type(practice_text)
        
        assert content_type == ContentType.PRACTICE
        assert confidence > 0.5
    
    def test_detect_content_type_review(self):
        """Test review content type detection."""
        review_text = "Review the key concepts. Summary of important formulas and theorems."
        content_type, confidence = self.tagger.detect_content_type(review_text)
        
        assert content_type == ContentType.REVIEW
        assert confidence > 0.5
    
    def test_detect_content_type_example(self):
        """Test example content type detection."""
        example_text = "For example, consider the function f(x) = x^2. Let's look at this illustration."
        content_type, confidence = self.tagger.detect_content_type(example_text)
        
        assert content_type == ContentType.EXAMPLE
        assert confidence > 0.5
    
    def test_detect_content_type_notes(self):
        """Test notes content type detection."""
        notes_text = "The derivative represents the rate of change of a function."
        content_type, confidence = self.tagger.detect_content_type(notes_text)
        
        assert content_type == ContentType.NOTES
        assert confidence <= 0.5  # Default with low confidence
    
    def test_extract_skills_ab_content(self):
        """Test skill extraction for AB content."""
        ab_text = "Find the limit as x approaches 2 of (x^2 - 4)/(x - 2)."
        skills = self.tagger.extract_skills(ab_text, ExamVariant.CALC_AB)
        
        assert len(skills) > 0
        assert any("limit" in skill.unit.lower() for skill in skills)
        assert all(skill.confidence > 0 for skill in skills)
    
    def test_extract_skills_bc_content(self):
        """Test skill extraction for BC content."""
        bc_text = "Determine if the series converges using the ratio test."
        skills = self.tagger.extract_skills(bc_text, ExamVariant.CALC_BC)
        
        assert len(skills) > 0
        assert any("series" in skill.unit.lower() for skill in skills)
        assert all(skill.confidence > 0 for skill in skills)
    
    def test_extract_skills_no_keywords(self):
        """Test skill extraction with no keywords."""
        generic_text = "This is generic content without calculus terms."
        skills = self.tagger.extract_skills(generic_text, ExamVariant.CALC_AB)
        
        assert len(skills) == 0
    
    def test_map_to_subtopic(self):
        """Test subtopic mapping."""
        subtopic = self.tagger._map_to_subtopic("limits", ["limit", "continuity"])
        assert "limit" in subtopic.lower() or "continuity" in subtopic.lower()
    
    def test_map_to_subtopic_default(self):
        """Test default subtopic mapping."""
        subtopic = self.tagger._map_to_subtopic("unknown", ["keyword"])
        assert subtopic == "Unknown Concepts"
    
    def test_extract_skill_name(self):
        """Test skill name extraction."""
        skill_name = self.tagger._extract_skill_name(["limit", "continuity"], "limits")
        assert "limit" in skill_name.lower()
    
    def test_extract_skill_name_default(self):
        """Test default skill name extraction."""
        skill_name = self.tagger._extract_skill_name(["unknown"], "unknown")
        assert "Unknown Problem Solving" == skill_name
    
    def test_tag_content_comprehensive(self):
        """Test comprehensive content tagging."""
        content = "Find the derivative of f(x) = x^2 + 3x - 1. This is a practice problem."
        tag = self.tagger.tag_content(content)
        
        assert tag.variant == ExamVariant.CALC_AB
        assert tag.content_type == ContentType.PRACTICE
        assert len(tag.skills) > 0
        assert tag.confidence > 0
        assert "derivative" in tag.keywords_found
    
    def test_tag_content_uncertainty(self):
        """Test content tagging with uncertainty."""
        content = "Some generic content without clear indicators."
        tag = self.tagger.tag_content(content)
        
        assert len(tag.uncertainty_reasons) > 0
        assert any("unclear" in reason.lower() for reason in tag.uncertainty_reasons)
    
    def test_get_tagging_stats(self):
        """Test tagging statistics calculation."""
        tags = [
            ContentTag(ExamVariant.CALC_AB, ContentType.PRACTICE, [], 0.8, [], []),
            ContentTag(ExamVariant.CALC_BC, ContentType.NOTES, [], 0.9, [], []),
            ContentTag(ExamVariant.CALC_AB, ContentType.REVIEW, [], 0.3, [], [])  # Low confidence
        ]
        
        stats = self.tagger.get_tagging_stats(tags)
        
        assert stats['total_content'] == 3
        assert stats['variant_distribution']['calc_ab'] == 2
        assert stats['variant_distribution']['calc_bc'] == 1
        assert stats['type_distribution']['Practice'] == 1
        assert stats['type_distribution']['Notes'] == 1
        assert stats['type_distribution']['Review'] == 1
        assert stats['average_confidence'] == (0.8 + 0.9 + 0.3) / 3
        assert stats['low_confidence_count'] == 1
    
    def test_get_tagging_stats_empty(self):
        """Test tagging statistics with empty list."""
        stats = self.tagger.get_tagging_stats([])
        assert stats == {}


class TestConvenienceFunctions:
    """Test convenience functions."""
    
    def test_tag_content(self):
        """Test tag_content convenience function."""
        content = "Find the limit of sin(x)/x as x approaches 0."
        tag = tag_content(content)
        
        assert isinstance(tag, ContentTag)
        assert tag.variant == ExamVariant.CALC_AB
        assert "limit" in tag.keywords_found
    
    def test_detect_variant(self):
        """Test detect_variant convenience function."""
        content = "This covers series convergence and parametric equations."
        variant, confidence = detect_variant(content)
        
        assert variant == ExamVariant.CALC_BC
        assert confidence > 0.5


# Golden sample test data
GOLDEN_SAMPLES = {
    "calc_ab_limits": {
        "text": "Find the limit as x approaches 3 of (x^2 - 9)/(x - 3). Use algebraic manipulation to simplify the expression.",
        "expected_variant": ExamVariant.CALC_AB,
        "expected_type": ContentType.PRACTICE,
        "expected_skills": ["limit"]
    },
    "calc_ab_derivatives": {
        "text": "Find the derivative of f(x) = x^3 + 2x^2 - 5x + 1 using the power rule.",
        "expected_variant": ExamVariant.CALC_AB,
        "expected_type": ContentType.PRACTICE,
        "expected_skills": ["derivative"]
    },
    "calc_bc_series": {
        "text": "Determine the convergence of the series Σ(n=1 to ∞) 1/n^2 using the p-series test.",
        "expected_variant": ExamVariant.CALC_BC,
        "expected_type": ContentType.PRACTICE,
        "expected_skills": ["series"]
    },
    "calc_bc_parametric": {
        "text": "Find the derivative dy/dx for the parametric equations x = t^2, y = t^3.",
        "expected_variant": ExamVariant.CALC_BC,
        "expected_type": ContentType.PRACTICE,
        "expected_skills": ["parametric"]
    },
    "review_content": {
        "text": "Review: Key formulas for derivatives include the power rule, product rule, and chain rule.",
        "expected_variant": ExamVariant.CALC_AB,
        "expected_type": ContentType.REVIEW,
        "expected_skills": ["derivative"]
    }
}


class TestGoldenSamples:
    """Test with golden sample data."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.tagger = APCalculusTagger()
    
    @pytest.mark.parametrize("sample_name,sample_data", GOLDEN_SAMPLES.items())
    def test_golden_samples(self, sample_name, sample_data):
        """Test tagging with golden samples."""
        text = sample_data["text"]
        expected_variant = sample_data["expected_variant"]
        expected_type = sample_data["expected_type"]
        expected_skills = sample_data["expected_skills"]
        
        tag = self.tagger.tag_content(text)
        
        # Check variant
        assert tag.variant == expected_variant, f"Variant mismatch for {sample_name}"
        
        # Check content type
        assert tag.content_type == expected_type, f"Type mismatch for {sample_name}"
        
        # Check skills
        skill_units = [skill.unit.lower() for skill in tag.skills]
        skill_names = [skill.skill.lower() for skill in tag.skills]
        for expected_skill in expected_skills:
            assert (any(expected_skill in unit for unit in skill_units) or 
                   any(expected_skill in name for name in skill_names)), \
                f"Missing skill {expected_skill} for {sample_name}"
        
        # Check confidence
        assert tag.confidence > 0.3, f"Low confidence for {sample_name}: {tag.confidence}"
