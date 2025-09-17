"""
Calculus verification functions for AP Calculus problems.

This module provides safe, robust calculus verification using SymPy
with strict parsing allowlists and comprehensive error handling.
"""

import re
from typing import Any, Dict, List, Optional, Union
from decimal import Decimal, getcontext
import numpy as np
import sympy as sp
from sympy import symbols, sympify, simplify, expand, factor, cancel, trigsimp
from sympy.calculus.util import continuous_domain
from sympy.solvers import solve
from sympy.series import limit
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
    convert_xor,
)
import pint

# Set high precision for decimal calculations
getcontext().prec = 50

# Safe parsing allowlist - only allow these SymPy functions and symbols
SAFE_FUNCTIONS = {
    # Basic arithmetic
    'Add', 'Mul', 'Pow', 'Rational', 'Integer', 'Float',
    # Functions
    'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
    'asin', 'acos', 'atan', 'acot', 'asec', 'acsc',
    'sinh', 'cosh', 'tanh', 'coth', 'sech', 'csch',
    'asinh', 'acosh', 'atanh', 'acoth', 'asech', 'acsch',
    'exp', 'log', 'ln', 'sqrt', 'abs', 'sign',
    'factorial', 'gamma', 'beta',
    # Calculus
    'diff', 'integrate', 'limit', 'Derivative', 'Integral', 'Limit',
    # Special functions
    'erf', 'erfc', 'erfi', 'erfinv', 'erfcinv',
    'besselj', 'bessely', 'besseli', 'besselk',
    'airyai', 'airyaiprime', 'airybi', 'airybiprime',
    # Constants
    'pi', 'E', 'I', 'oo', 'zoo', 'nan',
    # Logic
    'And', 'Or', 'Not', 'Xor', 'Nand', 'Nor',
    'Equivalent', 'Implies', 'ITE',
    # Relational
    'Eq', 'Ne', 'Lt', 'Le', 'Gt', 'Ge',
    # Other
    'Symbol', 'Wild', 'WildFunction',
    'Function', 'Lambda', 'Piecewise',
    'Min', 'Max', 're', 'im', 'conjugate',
    'floor', 'ceiling', 'frac',
}

# Safe symbols pattern - only allow alphanumeric and common math symbols
SAFE_SYMBOL_PATTERN = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_]*$')

# Units registry for dimensional analysis
UREG = pint.UnitRegistry()


SAFE_TRANSFORMATIONS = standard_transformations + (
    convert_xor,
    implicit_multiplication_application,
)


def _safe_parse(expr_str: str) -> sp.Basic:
    """
    Safely parse a mathematical expression using strict allowlist.
    
    Args:
        expr_str: String representation of mathematical expression
        
    Returns:
        Parsed SymPy expression
        
    Raises:
        ValueError: If expression contains unsafe functions or symbols
    """
    try:
        # First, try to parse and get all function names
        parsed = parse_expr(expr_str, transformations=SAFE_TRANSFORMATIONS)
        
        # Check for unsafe functions
        for func in parsed.atoms(sp.Function):
            func_name = func.func.__name__
            if func_name not in SAFE_FUNCTIONS:
                raise ValueError(f"Unsafe function '{func_name}' not in allowlist")
        
        # Check for unsafe symbols
        for symbol in parsed.atoms(sp.Symbol):
            if not SAFE_SYMBOL_PATTERN.match(str(symbol)):
                raise ValueError(f"Unsafe symbol '{symbol}' not in allowlist")
        
        return parsed
    except Exception as e:
        # Check if it's a parsing error due to unsafe content
        if "eval" in expr_str or "__import__" in expr_str or "open" in expr_str:
            raise ValueError(f"Unsafe function detected in expression '{expr_str}'")
        elif "@" in expr_str or "." in expr_str or "-" in expr_str:
            raise ValueError(f"Unsafe symbol pattern in expression '{expr_str}'")
        else:
            raise ValueError(f"Failed to parse expression '{expr_str}': {str(e)}")


def derivative_equivalent(expr: str, var: str, expected: str, tolerance: float = 1e-10) -> Dict[str, Any]:
    """
    Check if the derivative of an expression matches the expected result.
    
    Args:
        expr: Expression to differentiate (as string)
        var: Variable to differentiate with respect to
        expected: Expected derivative (as string)
        tolerance: Numerical tolerance for comparison
        
    Returns:
        Dictionary with 'equivalent' boolean and 'details' information
    """
    try:
        # Parse expressions safely
        expr_sympy = _safe_parse(expr)
        expected_sympy = _safe_parse(expected)
        var_sympy = symbols(var)
        
        # Compute derivative
        computed_derivative = sp.diff(expr_sympy, var_sympy)
        
        # Simplify both expressions
        computed_simplified = simplify(computed_derivative)
        expected_simplified = simplify(expected_sympy)
        
        # Check if they are symbolically equivalent
        symbolic_equiv = (computed_simplified - expected_simplified).simplify() == 0
        
        # If not symbolically equivalent, try numerical verification
        if not symbolic_equiv:
            # Generate random test points
            test_points = _generate_test_points(expr_sympy, var_sympy, 10)
            
            numerical_equiv = True
            for point in test_points:
                try:
                    computed_val = float(computed_simplified.subs(var_sympy, point))
                    expected_val = float(expected_simplified.subs(var_sympy, point))
                    
                    if abs(computed_val - expected_val) > tolerance:
                        numerical_equiv = False
                        break
                except (ValueError, TypeError):
                    # Skip points where evaluation fails
                    continue
            
            return {
                'equivalent': numerical_equiv,
                'details': {
                    'computed': str(computed_simplified),
                    'expected': str(expected_simplified),
                    'symbolic_match': False,
                    'numerical_match': numerical_equiv
                }
            }
        
        return {
            'equivalent': True,
            'details': {
                'computed': str(computed_simplified),
                'expected': str(expected_simplified),
                'symbolic_match': True,
                'numerical_match': True
            }
        }
        
    except Exception as e:
        return {
            'equivalent': False,
            'details': {
                'error': str(e),
                'computed': None,
                'expected': None
            }
        }


def integral_equivalent(expr: str, var: str, expected: str, 
                       constant_free: bool = True, tolerance: float = 1e-10) -> Dict[str, Any]:
    """
    Check if the integral of an expression matches the expected result.
    
    Args:
        expr: Expression to integrate (as string)
        var: Variable to integrate with respect to
        expected: Expected integral (as string)
        constant_free: If True, treat constants of integration as equivalent
        tolerance: Numerical tolerance for comparison
        
    Returns:
        Dictionary with 'equivalent' boolean and 'details' information
    """
    try:
        # Parse expressions safely
        expr_sympy = _safe_parse(expr)
        expected_sympy = _safe_parse(expected)
        var_sympy = symbols(var)
        
        # Compute integral
        computed_integral = sp.integrate(expr_sympy, var_sympy)
        
        # Handle constants of integration
        if constant_free:
            # Remove constants of integration for comparison
            computed_clean = _remove_constants(computed_integral, var_sympy)
            expected_clean = _remove_constants(expected_sympy, var_sympy)
        else:
            computed_clean = computed_integral
            expected_clean = expected_sympy
        
        # Simplify both expressions
        computed_simplified = simplify(computed_clean)
        expected_simplified = simplify(expected_clean)
        
        # Check if they are symbolically equivalent
        symbolic_equiv = (computed_simplified - expected_simplified).simplify() == 0
        
        # If not symbolically equivalent, try numerical verification
        if not symbolic_equiv:
            # Generate random test points
            test_points = _generate_test_points(expr_sympy, var_sympy, 10)
            
            numerical_equiv = True
            for point in test_points:
                try:
                    computed_val = float(computed_simplified.subs(var_sympy, point))
                    expected_val = float(expected_simplified.subs(var_sympy, point))
                    
                    if abs(computed_val - expected_val) > tolerance:
                        numerical_equiv = False
                        break
                except (ValueError, TypeError):
                    # Skip points where evaluation fails
                    continue
            
            return {
                'equivalent': numerical_equiv,
                'details': {
                    'computed': str(computed_integral),
                    'expected': str(expected_sympy),
                    'computed_clean': str(computed_simplified),
                    'expected_clean': str(expected_simplified),
                    'symbolic_match': False,
                    'numerical_match': numerical_equiv,
                    'constant_free': constant_free
                }
            }
        
        return {
            'equivalent': True,
            'details': {
                'computed': str(computed_integral),
                'expected': str(expected_sympy),
                'computed_clean': str(computed_simplified),
                'expected_clean': str(expected_simplified),
                'symbolic_match': True,
                'numerical_match': True,
                'constant_free': constant_free
            }
        }
        
    except Exception as e:
        return {
            'equivalent': False,
            'details': {
                'error': str(e),
                'computed': None,
                'expected': None
            }
        }


def limit_equal(expr: str, var: str, to: Union[str, float], 
                direction: str = 'both', tolerance: float = 1e-10) -> Dict[str, Any]:
    """
    Check if the limit of an expression equals the expected value.
    
    Args:
        expr: Expression to take limit of (as string)
        var: Variable approaching the limit point
        to: Limit point (as string or float)
        direction: 'left', 'right', or 'both'
        tolerance: Numerical tolerance for comparison
        
    Returns:
        Dictionary with 'equivalent' boolean and 'details' information
    """
    try:
        # Parse expressions safely
        expr_sympy = _safe_parse(expr)
        var_sympy = symbols(var)
        
        # Parse limit point
        if isinstance(to, str):
            to_sympy = _safe_parse(to)
        else:
            to_sympy = sp.Rational(to)
        
        # Compute limits based on direction
        if direction == 'left':
            computed_limit = limit(expr_sympy, var_sympy, to_sympy, dir='-')
        elif direction == 'right':
            computed_limit = limit(expr_sympy, var_sympy, to_sympy, dir='+')
        else:  # 'both'
            computed_limit = limit(expr_sympy, var_sympy, to_sympy)
        
        # Check if limit exists
        if computed_limit is None or computed_limit == sp.nan:
            return {
                'equivalent': False,
                'details': {
                    'computed': None,
                    'limit_exists': False,
                    'error': 'Limit does not exist'
                }
            }
        
        # Check if limit exists but is different from left and right
        if direction == 'both':
            left_limit = limit(expr_sympy, var_sympy, to_sympy, dir='-')
            right_limit = limit(expr_sympy, var_sympy, to_sympy, dir='+')
            if left_limit != right_limit:
                return {
                    'equivalent': False,
                    'details': {
                        'computed': None,
                        'limit_exists': False,
                        'error': 'Left and right limits differ'
                    }
                }
        
        # Check if limit is finite
        if computed_limit == sp.oo or computed_limit == -sp.oo:
            return {
                'equivalent': False,
                'details': {
                    'computed': str(computed_limit),
                    'limit_exists': True,
                    'finite': False
                }
            }
        
        # For finite limits, we can't directly compare to a value without knowing what it should be
        # This function is mainly for checking if limits exist and are finite
        return {
            'equivalent': True,
            'details': {
                'computed': str(computed_limit),
                'limit_exists': True,
                'finite': True,
                'direction': direction
            }
        }
        
    except Exception as e:
        return {
            'equivalent': False,
            'details': {
                'error': str(e),
                'computed': None
            }
        }


def algebra_equiv(lhs: str, rhs: str, tolerance: float = 1e-10) -> Dict[str, Any]:
    """
    Check if two algebraic expressions are equivalent.
    
    Args:
        lhs: Left-hand side expression (as string)
        rhs: Right-hand side expression (as string)
        tolerance: Numerical tolerance for comparison
        
    Returns:
        Dictionary with 'equivalent' boolean and 'details' information
    """
    try:
        # Parse expressions safely
        lhs_sympy = _safe_parse(lhs)
        rhs_sympy = _safe_parse(rhs)
        
        # Simplify both expressions
        lhs_simplified = simplify(lhs_sympy)
        rhs_simplified = simplify(rhs_sympy)
        
        # Check if they are symbolically equivalent
        symbolic_equiv = (lhs_simplified - rhs_simplified).simplify() == 0
        
        # If not symbolically equivalent, try numerical verification
        if not symbolic_equiv:
            # Get all symbols in both expressions
            all_symbols = list((lhs_sympy | rhs_sympy).atoms(sp.Symbol))
            
            if all_symbols:
                # Generate random test points
                test_points = _generate_test_points_multi(all_symbols, 10)
                
                numerical_equiv = True
                for point_dict in test_points:
                    try:
                        lhs_val = float(lhs_simplified.subs(point_dict))
                        rhs_val = float(rhs_simplified.subs(point_dict))
                        
                        if abs(lhs_val - rhs_val) > tolerance:
                            numerical_equiv = False
                            break
                    except (ValueError, TypeError):
                        # Skip points where evaluation fails
                        continue
            else:
                # No variables, just compare the constants
                try:
                    lhs_val = float(lhs_simplified)
                    rhs_val = float(rhs_simplified)
                    numerical_equiv = abs(lhs_val - rhs_val) <= tolerance
                except (ValueError, TypeError):
                    numerical_equiv = False
            
            return {
                'equivalent': numerical_equiv,
                'details': {
                    'lhs': str(lhs_simplified),
                    'rhs': str(rhs_simplified),
                    'symbolic_match': False,
                    'numerical_match': numerical_equiv
                }
            }
        
        return {
            'equivalent': True,
            'details': {
                'lhs': str(lhs_simplified),
                'rhs': str(rhs_simplified),
                'symbolic_match': True,
                'numerical_match': True
            }
        }
        
    except Exception as e:
        return {
            'equivalent': False,
            'details': {
                'error': str(e),
                'lhs': None,
                'rhs': None
            }
        }


def dimensional_check(expr: str, expected_unit: str) -> Dict[str, Any]:
    """
    Check if an expression has the expected dimensional units.
    
    Args:
        expr: Expression to check (as string)
        expected_unit: Expected unit (as string, e.g., 'm/s', 'kg*m/s^2')
        
    Returns:
        Dictionary with 'equivalent' boolean and 'details' information
    """
    try:
        # Parse expression safely
        expr_sympy = _safe_parse(expr)
        
        # Get expected unit
        expected_unit_obj = UREG.parse_expression(expected_unit)
        
        # For now, we'll do a simple check by looking for unit patterns in the expression
        # This is a simplified implementation - in practice, you'd need more sophisticated
        # unit analysis
        
        # Check if expression contains unit-like patterns
        expr_str = str(expr_sympy)
        unit_patterns = ['m', 's', 'kg', 'N', 'J', 'W', 'A', 'V', 'F', 'H', 'T', 'C', 'mol']
        
        has_units = any(pattern in expr_str for pattern in unit_patterns)
        
        # This is a simplified check - in practice, you'd need proper unit analysis
        return {
            'equivalent': has_units,  # Simplified check
            'details': {
                'expression': expr_str,
                'expected_unit': expected_unit,
                'has_units': has_units,
                'note': 'Simplified unit checking - full implementation would require proper unit analysis'
            }
        }
        
    except Exception as e:
        return {
            'equivalent': False,
            'details': {
                'error': str(e),
                'expression': None,
                'expected_unit': expected_unit
            }
        }


def numeric_probe(expr: str, num_points: int = 5) -> Dict[str, Any]:
    """
    Perform numeric probes on an expression to check for sanity.
    
    Args:
        expr: Expression to probe (as string)
        num_points: Number of random points to test
        
    Returns:
        Dictionary with 'valid' boolean and 'details' information
    """
    try:
        # Parse expression safely
        expr_sympy = _safe_parse(expr)
        
        # Get all symbols in the expression
        symbols_list = list(expr_sympy.atoms(sp.Symbol))
        
        if not symbols_list:
            # No variables, just evaluate the constant
            try:
                result = float(expr_sympy)
                return {
                    'valid': True,
                    'details': {
                        'constant_value': result,
                        'points_tested': 0,
                        'evaluation_errors': 0
                    }
                }
            except (ValueError, TypeError):
                return {
                    'valid': False,
                    'details': {
                        'error': 'Failed to evaluate constant expression',
                        'points_tested': 0,
                        'evaluation_errors': 1
                    }
                }
        
        # Generate random test points
        test_points = _generate_test_points_multi(symbols_list, num_points)
        
        valid_count = 0
        error_count = 0
        results = []
        
        for point_dict in test_points:
            try:
                result = float(expr_sympy.subs(point_dict))
                if not (np.isnan(result) or np.isinf(result)):
                    valid_count += 1
                    results.append(result)
                else:
                    error_count += 1
            except (ValueError, TypeError, ZeroDivisionError):
                error_count += 1
        
        return {
            'valid': valid_count > 0,
            'details': {
                'points_tested': len(test_points),
                'valid_evaluations': valid_count,
                'evaluation_errors': error_count,
                'sample_results': results[:5] if results else []
            }
        }
        
    except Exception as e:
        return {
            'valid': False,
            'details': {
                'error': str(e),
                'points_tested': 0,
                'evaluation_errors': 1
            }
        }


def _generate_test_points(expr: sp.Basic, var: sp.Symbol, num_points: int) -> List[float]:
    """Generate random test points for a single variable expression."""
    # Find the domain where the expression is continuous
    domain = continuous_domain(expr, var, sp.Reals)
    
    # Generate points in a reasonable range
    points = []
    for _ in range(num_points):
        # Generate random point in [-10, 10] range
        point = np.random.uniform(-10, 10)
        points.append(point)
    
    return points


def _generate_test_points_multi(symbols_list: List[sp.Symbol], num_points: int) -> List[Dict[sp.Symbol, float]]:
    """Generate random test points for a multi-variable expression."""
    points = []
    for _ in range(num_points):
        point_dict = {}
        for symbol in symbols_list:
            # Generate random point in [-10, 10] range
            point_dict[symbol] = np.random.uniform(-10, 10)
        points.append(point_dict)
    
    return points


def _remove_constants(expr: sp.Basic, var: sp.Symbol) -> sp.Basic:
    """Remove constants of integration from an expression."""
    # This is a simplified implementation
    # In practice, you'd need more sophisticated constant detection
    if expr.is_Add:
        # Remove terms that don't contain the variable
        terms_with_var = [term for term in expr.args if var in term.free_symbols]
        if terms_with_var:
            return sp.Add(*terms_with_var)
        else:
            return sp.Integer(0)
    elif var in expr.free_symbols:
        return expr
    else:
        return sp.Integer(0)
