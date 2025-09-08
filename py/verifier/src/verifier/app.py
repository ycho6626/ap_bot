"""
FastAPI application for AP Calculus verifier service.

Provides endpoints for calculus verification including derivatives, integrals,
limits, algebra equivalence, dimensional analysis, and numeric probing.
"""

from typing import Dict, Any, Union
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import uvicorn

from .calculus import (
    derivative_equivalent,
    integral_equivalent,
    limit_equal,
    algebra_equiv,
    dimensional_check,
    numeric_probe
)

# Create FastAPI app
app = FastAPI(
    title="AP Calculus Verifier",
    description="Verification service for AP Calculus problems with CAS and units checking",
    version="0.1.0"
)


# Pydantic models for request/response
class DerivativeRequest(BaseModel):
    expr: str = Field(..., description="Expression to differentiate")
    var: str = Field(..., description="Variable to differentiate with respect to")
    expected: str = Field(..., description="Expected derivative")
    tolerance: float = Field(default=1e-10, description="Numerical tolerance for comparison")


class IntegralRequest(BaseModel):
    expr: str = Field(..., description="Expression to integrate")
    var: str = Field(..., description="Variable to integrate with respect to")
    expected: str = Field(..., description="Expected integral")
    constant_free: bool = Field(default=True, description="Treat constants of integration as equivalent")
    tolerance: float = Field(default=1e-10, description="Numerical tolerance for comparison")


class LimitRequest(BaseModel):
    expr: str = Field(..., description="Expression to take limit of")
    var: str = Field(..., description="Variable approaching the limit point")
    to: Union[str, float] = Field(..., description="Limit point")
    direction: str = Field(default="both", description="Direction: 'left', 'right', or 'both'")
    tolerance: float = Field(default=1e-10, description="Numerical tolerance for comparison")


class AlgebraRequest(BaseModel):
    lhs: str = Field(..., description="Left-hand side expression")
    rhs: str = Field(..., description="Right-hand side expression")
    tolerance: float = Field(default=1e-10, description="Numerical tolerance for comparison")


class DimensionalRequest(BaseModel):
    expr: str = Field(..., description="Expression to check")
    expected_unit: str = Field(..., description="Expected unit (e.g., 'm/s', 'kg*m/s^2')")


class NumericProbeRequest(BaseModel):
    expr: str = Field(..., description="Expression to probe")
    num_points: int = Field(default=5, description="Number of random points to test")


# Health check endpoint
@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "service": "ap-verifier"}


# Calculus verification endpoints
@app.post("/calc/derivative")
async def verify_derivative(request: DerivativeRequest) -> Dict[str, Any]:
    """
    Verify if the derivative of an expression matches the expected result.
    
    Args:
        request: Derivative verification request
        
    Returns:
        Verification result with equivalent boolean and details
    """
    try:
        result = derivative_equivalent(
            expr=request.expr,
            var=request.var,
            expected=request.expected,
            tolerance=request.tolerance
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Derivative verification failed: {str(e)}")


@app.post("/calc/integral")
async def verify_integral(request: IntegralRequest) -> Dict[str, Any]:
    """
    Verify if the integral of an expression matches the expected result.
    
    Args:
        request: Integral verification request
        
    Returns:
        Verification result with equivalent boolean and details
    """
    try:
        result = integral_equivalent(
            expr=request.expr,
            var=request.var,
            expected=request.expected,
            constant_free=request.constant_free,
            tolerance=request.tolerance
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Integral verification failed: {str(e)}")


@app.post("/calc/limit")
async def verify_limit(request: LimitRequest) -> Dict[str, Any]:
    """
    Verify if the limit of an expression exists and is finite.
    
    Args:
        request: Limit verification request
        
    Returns:
        Verification result with equivalent boolean and details
    """
    try:
        result = limit_equal(
            expr=request.expr,
            var=request.var,
            to=request.to,
            direction=request.direction,
            tolerance=request.tolerance
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Limit verification failed: {str(e)}")


@app.post("/calc/algebra")
async def verify_algebra(request: AlgebraRequest) -> Dict[str, Any]:
    """
    Verify if two algebraic expressions are equivalent.
    
    Args:
        request: Algebra verification request
        
    Returns:
        Verification result with equivalent boolean and details
    """
    try:
        result = algebra_equiv(
            lhs=request.lhs,
            rhs=request.rhs,
            tolerance=request.tolerance
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Algebra verification failed: {str(e)}")


@app.post("/calc/dimensional")
async def verify_dimensional(request: DimensionalRequest) -> Dict[str, Any]:
    """
    Verify if an expression has the expected dimensional units.
    
    Args:
        request: Dimensional verification request
        
    Returns:
        Verification result with equivalent boolean and details
    """
    try:
        result = dimensional_check(
            expr=request.expr,
            expected_unit=request.expected_unit
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Dimensional verification failed: {str(e)}")


@app.post("/calc/numeric-probe")
async def verify_numeric_probe(request: NumericProbeRequest) -> Dict[str, Any]:
    """
    Perform numeric probes on an expression to check for sanity.
    
    Args:
        request: Numeric probe request
        
    Returns:
        Verification result with valid boolean and details
    """
    try:
        result = numeric_probe(
            expr=request.expr,
            num_points=request.num_points
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Numeric probe failed: {str(e)}")


# Root endpoint
@app.get("/")
async def root() -> Dict[str, str]:
    """Root endpoint with service information."""
    return {
        "service": "AP Calculus Verifier",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
