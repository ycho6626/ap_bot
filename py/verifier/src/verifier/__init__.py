"""
AP Calculus Verifier Package

A FastAPI service for verifying calculus problems with CAS and units checking.
"""

from .calculus import (
    derivative_equivalent,
    integral_equivalent,
    limit_equal,
    algebra_equiv,
    dimensional_check,
    numeric_probe
)

__version__ = "0.1.0"
__all__ = [
    "derivative_equivalent",
    "integral_equivalent", 
    "limit_equal",
    "algebra_equiv",
    "dimensional_check",
    "numeric_probe"
]
