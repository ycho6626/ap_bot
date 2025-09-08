import { render, screen } from '@testing-library/react';
import { VerifiedBadge } from '../VerifiedBadge';

describe('VerifiedBadge', () => {
  it('renders verified badge when verified is true', () => {
    render(<VerifiedBadge verified={true} />);
    
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('renders not verified badge when verified is false', () => {
    render(<VerifiedBadge verified={false} />);
    
    expect(screen.getByText('Not Verified')).toBeInTheDocument();
  });

  it('applies correct CSS classes for verified state', () => {
    const { container } = render(<VerifiedBadge verified={true} />);
    
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('verified-badge', 'bg-success-100', 'text-success-800');
  });

  it('applies correct CSS classes for not verified state', () => {
    const { container } = render(<VerifiedBadge verified={false} />);
    
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('verified-badge', 'bg-warning-100', 'text-warning-800');
  });

  it('applies custom className when provided', () => {
    const { container } = render(<VerifiedBadge verified={true} className="custom-class" />);
    
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('custom-class');
  });
});
