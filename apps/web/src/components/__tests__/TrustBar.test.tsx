import { render, screen } from '@testing-library/react';
import { TrustBar } from '../TrustBar';

describe('TrustBar', () => {
  it('renders with correct width based on score', () => {
    const { container } = render(<TrustBar score={0.75} />);
    
    const fill = container.querySelector('.trust-fill');
    expect(fill).toHaveStyle('width: 75%');
  });

  it('renders with 0% width for score of 0', () => {
    const { container } = render(<TrustBar score={0} />);
    
    const fill = container.querySelector('.trust-fill');
    expect(fill).toHaveStyle('width: 0%');
  });

  it('renders with 100% width for score of 1', () => {
    const { container } = render(<TrustBar score={1} />);
    
    const fill = container.querySelector('.trust-fill');
    expect(fill).toHaveStyle('width: 100%');
  });

  it('applies correct color class for high score', () => {
    const { container } = render(<TrustBar score={0.95} />);
    
    const fill = container.querySelector('.trust-fill');
    expect(fill).toHaveClass('bg-success-500');
  });

  it('applies correct color class for medium score', () => {
    const { container } = render(<TrustBar score={0.8} />);
    
    const fill = container.querySelector('.trust-fill');
    expect(fill).toHaveClass('bg-warning-500');
  });

  it('applies correct color class for low score', () => {
    const { container } = render(<TrustBar score={0.5} />);
    
    const fill = container.querySelector('.trust-fill');
    expect(fill).toHaveClass('bg-error-500');
  });

  it('has correct ARIA attributes', () => {
    render(<TrustBar score={0.75} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(progressBar).toHaveAttribute('aria-label', 'Trust score: 75%');
  });

  it('applies custom className when provided', () => {
    const { container } = render(<TrustBar score={0.5} className="custom-class" />);
    
    const trustBar = container.querySelector('.trust-bar');
    expect(trustBar).toHaveClass('custom-class');
  });
});
