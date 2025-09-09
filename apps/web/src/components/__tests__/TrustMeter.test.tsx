import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrustMeter } from '../TrustMeter';

describe('TrustMeter', () => {
  it('should render trust meter with correct percentage', () => {
    render(<TrustMeter score={0.85} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '85');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(progressBar).toHaveAttribute('aria-label', 'Trust score: 85%');
  });

  it('should render with correct width style', () => {
    render(<TrustMeter score={0.75} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle('width: 75%');
  });

  it('should handle edge cases', () => {
    const { rerender } = render(<TrustMeter score={0} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    
    rerender(<TrustMeter score={1} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    
    rerender(<TrustMeter score={0.999} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('should apply custom className', () => {
    const { container } = render(<TrustMeter score={0.5} className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should round scores correctly', () => {
    render(<TrustMeter score={0.854} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '85');
  });
});
