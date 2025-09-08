"""Content tagging for AB/BC detection and skill mapping."""

import re
from typing import Dict, List, Any, Optional, Tuple, Set
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ExamVariant(Enum):
    """AP Calculus exam variants."""
    CALC_AB = "calc_ab"
    CALC_BC = "calc_bc"


class ContentType(Enum):
    """Content types."""
    NOTES = "Notes"
    PRACTICE = "Practice"
    REVIEW = "Review"
    EXAMPLE = "Example"


@dataclass
class SkillTag:
    """Represents a skill tag."""
    unit: str
    subtopic: str
    skill: str
    confidence: float


@dataclass
class ContentTag:
    """Represents content tagging result."""
    variant: ExamVariant
    content_type: ContentType
    skills: List[SkillTag]
    confidence: float
    keywords_found: List[str]
    uncertainty_reasons: List[str]


class APCalculusTagger:
    """Tags content for AP Calculus AB/BC classification and skill mapping."""
    
    def __init__(self):
        # BC-specific keywords (topics not in AB)
        self.bc_keywords = {
            'series': [
                'series', 'convergence', 'divergence', 'geometric series', 'p-series',
                'ratio test', 'root test', 'comparison test', 'limit comparison test',
                'integral test', 'alternating series', 'absolute convergence',
                'conditional convergence', 'radius of convergence', 'interval of convergence',
                'power series', 'taylor series', 'maclaurin series', 'taylor polynomial',
                'remainder', 'lagrange error bound', 'cauchy remainder'
            ],
            'parametric': [
                'parametric', 'parameter', 'parametric equations', 'parametric curve',
                'parametric form', 'x(t)', 'y(t)', 'parametric derivative',
                'parametric integral', 'arc length parametric', 'parametric area'
            ],
            'polar': [
                'polar', 'polar coordinates', 'polar form', 'r =', 'theta', 'θ',
                'polar graph', 'polar curve', 'polar derivative', 'polar integral',
                'polar area', 'arc length polar', 'polar to cartesian'
            ],
            'vector': [
                'vector', 'vector-valued function', 'vector function', 'position vector',
                'velocity vector', 'acceleration vector', 'vector derivative',
                'vector integral', 'unit tangent vector', 'unit normal vector',
                'curvature', 'arc length vector'
            ]
        }
        
        # AB topics (common to both AB and BC)
        self.ab_keywords = {
            'limits': [
                'limit', 'lim', 'approaches', 'continuity', 'continuous', 'discontinuous',
                'removable discontinuity', 'jump discontinuity', 'infinite discontinuity',
                'squeeze theorem', 'intermediate value theorem', 'one-sided limit'
            ],
            'derivatives': [
                'derivative', 'differentiation', 'differentiable', 'chain rule',
                'product rule', 'quotient rule', 'implicit differentiation',
                'related rates', 'optimization', 'critical point', 'inflection point',
                'concavity', 'increasing', 'decreasing', 'local maximum', 'local minimum',
                'absolute maximum', 'absolute minimum', 'mean value theorem',
                'rolle\'s theorem', 'l\'hopital\'s rule'
            ],
            'integrals': [
                'integral', 'integration', 'antiderivative', 'indefinite integral',
                'definite integral', 'fundamental theorem of calculus', 'ftc',
                'riemann sum', 'trapezoidal rule', 'simpson\'s rule', 'u-substitution',
                'integration by parts', 'partial fractions', 'improper integral',
                'area under curve', 'net change', 'average value'
            ],
            'applications': [
                'area', 'volume', 'cross section', 'disk method', 'washer method',
                'shell method', 'arc length', 'surface area', 'work', 'force',
                'pressure', 'center of mass', 'moment'
            ]
        }
        
        # Unit mapping
        self.unit_mapping = {
            'limits': 'Unit 1: Limits and Continuity',
            'derivatives': 'Unit 2: Differentiation',
            'integrals': 'Unit 3: Integration',
            'applications': 'Unit 4: Applications of Integration',
            'series': 'Unit 5: Infinite Series',
            'parametric': 'Unit 6: Parametric Equations',
            'polar': 'Unit 7: Polar Coordinates',
            'vector': 'Unit 8: Vector-Valued Functions'
        }
        
        # Subtopic mapping
        self.subtopic_mapping = {
            'limits': {
                'introduction': 'Introduction to Limits',
                'properties': 'Properties of Limits',
                'continuity': 'Continuity',
                'asymptotes': 'Asymptotes'
            },
            'derivatives': {
                'definition': 'Definition of Derivative',
                'rules': 'Derivative Rules',
                'implicit': 'Implicit Differentiation',
                'applications': 'Applications of Derivatives'
            },
            'integrals': {
                'antiderivatives': 'Antiderivatives',
                'definite': 'Definite Integrals',
                'techniques': 'Integration Techniques',
                'applications': 'Applications of Integrals'
            },
            'series': {
                'convergence': 'Convergence Tests',
                'power': 'Power Series',
                'taylor': 'Taylor Series'
            }
        }
    
    def detect_variant(self, text: str) -> Tuple[ExamVariant, float, List[str]]:
        """Detect if content is AB or BC based on keywords."""
        text_lower = text.lower()
        found_keywords = []
        
        # Check for BC-specific keywords
        bc_score = 0
        for category, keywords in self.bc_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    bc_score += 1
                    found_keywords.append(keyword)
        
        # If any BC keywords found, likely BC
        if bc_score > 0:
            confidence = min(0.9, 0.5 + (bc_score * 0.1))
            return ExamVariant.CALC_BC, confidence, found_keywords
        
        # Check for AB keywords
        ab_score = 0
        for category, keywords in self.ab_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    ab_score += 1
                    found_keywords.append(keyword)
        
        # If AB keywords found but no BC keywords, likely AB
        if ab_score > 0:
            confidence = min(0.8, 0.4 + (ab_score * 0.05))
            return ExamVariant.CALC_AB, confidence, found_keywords
        
        # No clear indicators - default to AB with low confidence
        return ExamVariant.CALC_AB, 0.3, []
    
    def detect_content_type(self, text: str) -> Tuple[ContentType, float]:
        """Detect content type based on text patterns."""
        text_lower = text.lower()
        
        # Practice problems indicators
        practice_indicators = [
            'problem', 'question', 'solve', 'find', 'calculate', 'determine',
            'practice', 'exercise', 'homework', 'assignment', 'quiz', 'test'
        ]
        
        # Review indicators
        review_indicators = [
            'review', 'summary', 'overview', 'recap', 'key points', 'main ideas',
            'concepts', 'formulas', 'theorems', 'definitions'
        ]
        
        # Example indicators
        example_indicators = [
            'example', 'for instance', 'consider', 'suppose', 'let\'s look at',
            'illustration', 'demonstration'
        ]
        
        practice_score = sum(1 for indicator in practice_indicators if indicator in text_lower)
        review_score = sum(1 for indicator in review_indicators if indicator in text_lower)
        example_score = sum(1 for indicator in example_indicators if indicator in text_lower)
        
        max_score = max(practice_score, review_score, example_score)
        
        if max_score == 0:
            return ContentType.NOTES, 0.5
        
        if practice_score == max_score:
            confidence = min(0.9, 0.6 + (practice_score * 0.1))
            return ContentType.PRACTICE, confidence
        elif review_score == max_score:
            confidence = min(0.9, 0.6 + (review_score * 0.1))
            return ContentType.REVIEW, confidence
        elif example_score == max_score:
            confidence = min(0.9, 0.6 + (example_score * 0.1))
            return ContentType.EXAMPLE, confidence
        
        return ContentType.NOTES, 0.5
    
    def extract_skills(self, text: str, variant: ExamVariant) -> List[SkillTag]:
        """Extract skills from text based on detected variant."""
        text_lower = text.lower()
        skills = []
        
        # Determine which keyword sets to use
        keyword_sets = self.ab_keywords.copy()
        if variant == ExamVariant.CALC_BC:
            keyword_sets.update(self.bc_keywords)
        
        for category, keywords in keyword_sets.items():
            found_keywords = [kw for kw in keywords if kw in text_lower]
            
            if found_keywords:
                # Calculate confidence based on keyword density
                keyword_density = len(found_keywords) / len(keywords)
                confidence = min(0.9, 0.3 + (keyword_density * 0.6))
                
                # Map to subtopic
                subtopic = self._map_to_subtopic(category, found_keywords)
                
                # Create skill tag
                skill_tag = SkillTag(
                    unit=self.unit_mapping.get(category, f"Unit: {category.title()}"),
                    subtopic=subtopic,
                    skill=self._extract_skill_name(found_keywords, category),
                    confidence=confidence
                )
                skills.append(skill_tag)
        
        # Sort by confidence
        skills.sort(key=lambda x: x.confidence, reverse=True)
        
        return skills[:5]  # Return top 5 skills
    
    def _map_to_subtopic(self, category: str, keywords: List[str]) -> str:
        """Map category and keywords to specific subtopic."""
        subtopics = self.subtopic_mapping.get(category, {})
        
        # Simple keyword-based mapping
        for subtopic, subtopic_name in subtopics.items():
            if any(subtopic in kw for kw in keywords):
                return subtopic_name
        
        # Default subtopic
        return f"{category.title()} Concepts"
    
    def _extract_skill_name(self, keywords: List[str], category: str) -> str:
        """Extract specific skill name from keywords."""
        # Map common keywords to skill names
        skill_mapping = {
            'limit': 'Evaluating Limits',
            'derivative': 'Finding Derivatives',
            'integral': 'Evaluating Integrals',
            'series': 'Analyzing Series Convergence',
            'parametric': 'Working with Parametric Equations',
            'polar': 'Converting Polar Coordinates',
            'vector': 'Vector Calculus Operations'
        }
        
        for keyword in keywords:
            for skill_key, skill_name in skill_mapping.items():
                if skill_key in keyword:
                    return skill_name
        
        return f"{category.title()} Problem Solving"
    
    def tag_content(self, text: str) -> ContentTag:
        """Tag content with variant, type, and skills."""
        # Detect variant
        variant, variant_confidence, variant_keywords = self.detect_variant(text)
        
        # Detect content type
        content_type, type_confidence = self.detect_content_type(text)
        
        # Extract skills
        skills = self.extract_skills(text, variant)
        
        # Calculate overall confidence
        overall_confidence = (variant_confidence + type_confidence) / 2
        if skills:
            skill_confidence = sum(skill.confidence for skill in skills) / len(skills)
            overall_confidence = (overall_confidence + skill_confidence) / 2
        
        # Identify uncertainty reasons
        uncertainty_reasons = []
        if variant_confidence < 0.6:
            uncertainty_reasons.append("Unclear exam variant (AB vs BC)")
        if type_confidence < 0.6:
            uncertainty_reasons.append("Unclear content type")
        if not skills:
            uncertainty_reasons.append("No clear skill indicators found")
        elif all(skill.confidence < 0.5 for skill in skills):
            uncertainty_reasons.append("Low confidence in skill detection")
        
        return ContentTag(
            variant=variant,
            content_type=content_type,
            skills=skills,
            confidence=overall_confidence,
            keywords_found=variant_keywords,
            uncertainty_reasons=uncertainty_reasons
        )
    
    def get_tagging_stats(self, tags: List[ContentTag]) -> Dict[str, Any]:
        """Get statistics from tagging results."""
        if not tags:
            return {}
        
        variant_counts = {}
        type_counts = {}
        total_skills = 0
        total_confidence = 0
        
        for tag in tags:
            variant_counts[tag.variant.value] = variant_counts.get(tag.variant.value, 0) + 1
            type_counts[tag.content_type.value] = type_counts.get(tag.content_type.value, 0) + 1
            total_skills += len(tag.skills)
            total_confidence += tag.confidence
        
        return {
            'total_content': len(tags),
            'variant_distribution': variant_counts,
            'type_distribution': type_counts,
            'average_skills_per_content': total_skills / len(tags),
            'average_confidence': total_confidence / len(tags),
            'low_confidence_count': sum(1 for tag in tags if tag.confidence < 0.5)
        }


# Convenience functions
def tag_content(text: str) -> ContentTag:
    """Convenience function to tag content."""
    tagger = APCalculusTagger()
    return tagger.tag_content(text)


def detect_variant(text: str) -> Tuple[ExamVariant, float]:
    """Convenience function to detect exam variant."""
    tagger = APCalculusTagger()
    variant, confidence, _ = tagger.detect_variant(text)
    return variant, confidence
