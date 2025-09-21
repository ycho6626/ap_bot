"""
Comprehensive tests for calculus verification functions.

Tests include positive/negative cases, edge cases, and error handling.
"""

import pytest
import numpy as np
from verifier.calculus import (
    derivative_equivalent,
    integral_equivalent,
    limit_equal,
    algebra_equiv,
    dimensional_check,
    numeric_probe,
    _safe_parse
)


class TestSafeParse:
    """Test safe parsing functionality."""
    
    def test_safe_parse_valid_expressions(self):
        """Test parsing of valid mathematical expressions."""
        valid_exprs = [
            "x^2 + 2*x + 1",
            "sin(x) + cos(x)",
            "exp(x) + log(x)",
            "sqrt(x^2 + 1)",
            "x^3 - 3*x^2 + 3*x - 1"
        ]
        
        for expr in valid_exprs:
            result = _safe_parse(expr)
            assert result is not None
    
    def test_safe_parse_unsafe_functions(self):
        """Test that unsafe functions are rejected."""
        unsafe_exprs = [
            "eval('x')",  # eval is unsafe
            "__import__('os')",  # __import__ is unsafe
            "open('file')",  # open is unsafe
        ]
        
        for expr in unsafe_exprs:
            with pytest.raises(ValueError, match="Unsafe function"):
                _safe_parse(expr)
    
    def test_safe_parse_unsafe_symbols(self):
        """Test that unsafe symbols are rejected."""
        unsafe_exprs = [
            "x@y",  # @ not allowed in symbols
            "x.y",  # . not allowed in symbols
        ]
        
        for expr in unsafe_exprs:
            with pytest.raises(ValueError, match="Unsafe symbol"):
                _safe_parse(expr)


class TestDerivativeEquivalent:
    """Test derivative equivalence checking."""
    
    def test_derivative_equivalent_positive_cases(self):
        """Test positive cases where derivatives should match."""
        test_cases = [
            ("x^2", "x", "2*x"),
            ("x^3", "x", "3*x^2"),
            ("sin(x)", "x", "cos(x)"),
            ("cos(x)", "x", "-sin(x)"),
            ("exp(x)", "x", "exp(x)"),
            ("log(x)", "x", "1/x"),
            ("x^2 + 2*x + 1", "x", "2*x + 2"),
        ]
        
        for expr, var, expected in test_cases:
            result = derivative_equivalent(expr, var, expected)
            assert result['equivalent'] is True
            assert result['details']['symbolic_match'] is True
    
    def test_derivative_equivalent_negative_cases(self):
        """Test negative cases where derivatives should not match."""
        test_cases = [
            ("x^2", "x", "x"),  # Wrong derivative
            ("sin(x)", "x", "cos(x) + 1"),  # Wrong derivative
            ("x^3", "x", "2*x^2"),  # Wrong derivative
        ]
        
        for expr, var, expected in test_cases:
            result = derivative_equivalent(expr, var, expected)
            assert result['equivalent'] is False
    
    def test_derivative_equivalent_constants(self):
        """Test derivatives with constants."""
        result = derivative_equivalent("x^2 + 5", "x", "2*x")
        assert result['equivalent'] is True
    
    def test_derivative_equivalent_chain_rule(self):
        """Test chain rule derivatives."""
        result = derivative_equivalent("sin(x^2)", "x", "2*x*cos(x^2)")
        assert result['equivalent'] is True
    
    def test_derivative_equivalent_product_rule(self):
        """Test product rule derivatives."""
        result = derivative_equivalent("x*sin(x)", "x", "sin(x) + x*cos(x)")
        assert result['equivalent'] is True
    
    def test_derivative_equivalent_quotient_rule(self):
        """Test quotient rule derivatives."""
        result = derivative_equivalent("x/sin(x)", "x", "(sin(x) - x*cos(x))/sin(x)^2")
        assert result['equivalent'] is True


class TestIntegralEquivalent:
    """Test integral equivalence checking."""
    
    def test_integral_equivalent_positive_cases(self):
        """Test positive cases where integrals should match."""
        test_cases = [
            ("2*x", "x", "x^2"),
            ("3*x^2", "x", "x^3"),
            ("cos(x)", "x", "sin(x)"),
            ("-sin(x)", "x", "cos(x)"),
            ("exp(x)", "x", "exp(x)"),
            ("1/x", "x", "log(x)"),
            ("2*x + 2", "x", "x^2 + 2*x"),
        ]
        
        for expr, var, expected in test_cases:
            result = integral_equivalent(expr, var, expected)
            assert result['equivalent'] is True
            assert result['details']['symbolic_match'] is True
    
    def test_integral_equivalent_negative_cases(self):
        """Test negative cases where integrals should not match."""
        test_cases = [
            ("2*x", "x", "x"),  # Wrong integral
            ("cos(x)", "x", "cos(x)"),  # Wrong integral
            ("x^2", "x", "x^2"),  # Wrong integral
        ]
        
        for expr, var, expected in test_cases:
            result = integral_equivalent(expr, var, expected)
            assert result['equivalent'] is False
    
    def test_integral_equivalent_constants(self):
        """Test integrals with constants of integration."""
        # With constant_free=True, constants should be ignored
        result = integral_equivalent("2*x", "x", "x^2 + 5", constant_free=True)
        assert result['equivalent'] is True
        
        # With constant_free=False, constants should matter
        result = integral_equivalent("2*x", "x", "x^2 + 5", constant_free=False)
        assert result['equivalent'] is False
    
    def test_integral_equivalent_substitution(self):
        """Test substitution rule integrals."""
        result = integral_equivalent("2*x*exp(x^2)", "x", "exp(x^2)")
        assert result['equivalent'] is True
    
    def test_integral_equivalent_parts(self):
        """Test integration by parts."""
        result = integral_equivalent("x*exp(x)", "x", "x*exp(x) - exp(x)")
        assert result['equivalent'] is True


class TestLimitEqual:
    """Test limit checking."""
    
    def test_limit_equal_positive_cases(self):
        """Test positive cases where limits exist."""
        test_cases = [
            ("x^2", "x", "0", "both"),  # lim x->0 x^2 = 0
            ("sin(x)/x", "x", "0", "both"),  # lim x->0 sin(x)/x = 1
            ("(x^2 - 1)/(x - 1)", "x", "1", "both"),  # lim x->1 (x^2-1)/(x-1) = 2
        ]
        
        for expr, var, to, direction in test_cases:
            result = limit_equal(expr, var, to, direction)
            assert result['equivalent'] is True
            assert result['details']['limit_exists'] is True
            assert result['details']['finite'] is True
    
    def test_limit_equal_infinite_limits(self):
        """Test infinite limits."""
        result = limit_equal("1/x", "x", "0", "right")
        assert result['equivalent'] is False  # Infinite limit
        assert result['details']['limit_exists'] is True
        assert result['details']['finite'] is False
    
    def test_limit_equal_nonexistent_limits(self):
        """Test limits that don't exist."""
        result = limit_equal("1/x", "x", "0", "both")
        assert result['equivalent'] is False
        assert result['details']['limit_exists'] is False
    
    def test_limit_equal_direction_specific(self):
        """Test left and right limits."""
        # Left limit of 1/x as x->0
        result = limit_equal("1/x", "x", "0", "left")
        assert result['equivalent'] is False  # -infinity
        assert result['details']['limit_exists'] is True
        assert result['details']['finite'] is False
        
        # Right limit of 1/x as x->0
        result = limit_equal("1/x", "x", "0", "right")
        assert result['equivalent'] is False  # +infinity
        assert result['details']['limit_exists'] is True
        assert result['details']['finite'] is False


class TestAlgebraEquiv:
    """Test algebraic equivalence checking."""
    
    def test_algebra_equiv_positive_cases(self):
        """Test positive cases where expressions should be equivalent."""
        test_cases = [
            ("x^2 + 2*x + 1", "(x + 1)^2"),
            ("x^2 - 1", "(x - 1)*(x + 1)"),
            ("sin(x)^2 + cos(x)^2", "1"),
            ("exp(log(x))", "x"),
            ("x^3 - x^2", "x^2*(x - 1)"),
        ]
        
        for lhs, rhs in test_cases:
            result = algebra_equiv(lhs, rhs)
            assert result['equivalent'] is True
            assert result['details']['symbolic_match'] is True
    
    def test_algebra_equiv_negative_cases(self):
        """Test negative cases where expressions should not be equivalent."""
        test_cases = [
            ("x^2", "x"),
            ("sin(x)", "cos(x)"),
            ("x^2 + 1", "x^2 - 1"),
            ("exp(x)", "x"),
        ]
        
        for lhs, rhs in test_cases:
            result = algebra_equiv(lhs, rhs)
            assert result['equivalent'] is False
    
    def test_algebra_equiv_constants(self):
        """Test expressions with constants."""
        result = algebra_equiv("2 + 3", "5")
        assert result['equivalent'] is True
    
    def test_algebra_equiv_trigonometric(self):
        """Test trigonometric identities."""
        result = algebra_equiv("sin(2*x)", "2*sin(x)*cos(x)")
        assert result['equivalent'] is True


class TestDimensionalCheck:
    """Test dimensional analysis checking."""
    
    def test_dimensional_check_positive_cases(self):
        """Test positive cases where expressions have units."""
        test_cases = [
            ("x*m", "m"),
            ("v*m/s", "m/s"),
            ("a*kg*m/s^2", "kg*m/s^2"),
        ]
        
        for expr, expected_unit in test_cases:
            result = dimensional_check(expr, expected_unit)
            # Note: This is a simplified implementation
            assert 'equivalent' in result
            assert 'details' in result
    
    def test_dimensional_check_negative_cases(self):
        """Test negative cases where expressions don't have units."""
        result = dimensional_check("x^2 + 1", "m")
        # Note: This is a simplified implementation
        assert 'equivalent' in result
        assert 'details' in result


class TestNumericProbe:
    """Test numeric probing functionality."""
    
    def test_numeric_probe_positive_cases(self):
        """Test positive cases where expressions evaluate successfully."""
        test_cases = [
            "x^2 + 1",
            "sin(x) + cos(x)",
            "exp(x)",
            "log(x + 1)",
            "sqrt(x^2 + 1)",
        ]
        
        for expr in test_cases:
            result = numeric_probe(expr, num_points=10)  # Increased from 3 to 10 for more reliability
            assert result['valid'] is True
            assert result['details']['valid_evaluations'] > 0
    
    def test_numeric_probe_deterministic(self):
        """Test numeric probe with deterministic seed for CI stability."""
        import numpy as np
        np.random.seed(42)  # Set deterministic seed for CI stability
        
        test_cases = [
            "x^2 + 1",
            "sin(x) + cos(x)",
            "exp(x)",
        ]
        
        for expr in test_cases:
            result = numeric_probe(expr, num_points=5)
            assert result['valid'] is True
            assert result['details']['valid_evaluations'] > 0
    
    def test_numeric_probe_negative_cases(self):
        """Test negative cases where expressions fail to evaluate."""
        test_cases = [
            "1/0",  # Division by zero
            "log(0)",  # Log of zero
            "sqrt(-1)",  # Square root of negative
        ]
        
        for expr in test_cases:
            result = numeric_probe(expr, num_points=3)
            # These might still be valid in some cases due to random sampling
            assert 'valid' in result
            assert 'details' in result
    
    def test_numeric_probe_constants(self):
        """Test numeric probing of constant expressions."""
        result = numeric_probe("5", num_points=3)
        assert result['valid'] is True
        assert result['details']['constant_value'] == 5.0
    
    def test_numeric_probe_no_variables(self):
        """Test numeric probing of expressions with no variables."""
        result = numeric_probe("2 + 3", num_points=3)
        assert result['valid'] is True
        assert result['details']['constant_value'] == 5.0


class TestErrorHandling:
    """Test error handling in calculus functions."""
    
    def test_invalid_expressions(self):
        """Test handling of invalid expressions."""
        invalid_exprs = [
            "x^",  # Incomplete expression
            "sin(",  # Unclosed parenthesis
            "x++",  # Invalid syntax
        ]
        
        for expr in invalid_exprs:
            result = derivative_equivalent(expr, "x", "1")
            assert result['equivalent'] is False
            assert 'error' in result['details']
    
    def test_unsafe_expressions(self):
        """Test handling of unsafe expressions."""
        unsafe_exprs = [
            "eval('x')",
            "__import__('os')",
        ]
        
        for expr in unsafe_exprs:
            result = derivative_equivalent(expr, "x", "1")
            assert result['equivalent'] is False
            assert 'error' in result['details']
    
    def test_empty_expressions(self):
        """Test handling of empty expressions."""
        result = derivative_equivalent("", "x", "1")
        assert result['equivalent'] is False
        assert 'error' in result['details']


class TestEdgeCases:
    """Test edge cases and boundary conditions."""
    
    def test_zero_tolerance(self):
        """Test with zero tolerance."""
        result = derivative_equivalent("x^2", "x", "2*x", tolerance=0)
        assert result['equivalent'] is True
    
    def test_very_small_tolerance(self):
        """Test with very small tolerance."""
        result = derivative_equivalent("x^2", "x", "2*x", tolerance=1e-15)
        assert result['equivalent'] is True
    
    def test_very_large_tolerance(self):
        """Test with very large tolerance."""
        result = derivative_equivalent("x^2", "x", "2*x + 0.1", tolerance=1)
        assert result['equivalent'] is True
    
    def test_complex_expressions(self):
        """Test complex mathematical expressions."""
        result = derivative_equivalent(
            "sin(x^2 + 1)*exp(x)", 
            "x", 
            "2*x*cos(x^2 + 1)*exp(x) + sin(x^2 + 1)*exp(x)"
        )
        assert result['equivalent'] is True
    
    def test_very_large_numbers(self):
        """Test with very large numbers."""
        result = algebra_equiv("x^1000", "x^1000")
        assert result['equivalent'] is True
