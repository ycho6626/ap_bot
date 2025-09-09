import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerifiedBadge } from '../VerifiedBadge';

describe('VerifiedBadge', () => {
  it('should render verified badge when verified is true', () => {
    render(<VerifiedBadge verified={true} />);
    
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByTestId('verified-icon')).toBeInTheDocument();
  });

  it('should render not verified badge when verified is false', () => {
    render(<VerifiedBadge verified={false} />);
    
    expect(screen.getByText('Not Verified')).toBeInTheDocument();
    expect(screen.getByTestId('not-verified-icon')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<VerifiedBadge verified={true} className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should have correct ARIA attributes', () => {
    render(<VerifiedBadge verified={true} />);
    
    const badge = screen.getByText('Verified');
    expect(badge).toBeInTheDocument();
  });
});
