import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CitationsSidebar } from '../CitationsSidebar';

const mockSources = [
  {
    type: 'canonical' as const,
    id: 'source-1',
    title: 'Derivative Rules',
    snippet: 'The derivative of x^n is nx^(n-1)',
    score: 0.95
  },
  {
    type: 'retrieval' as const,
    id: 'source-2',
    title: 'Integration Techniques',
    snippet: 'Integration by parts formula...',
    score: 0.87
  }
];

const mockSuggestions = [
  'Try asking about the chain rule',
  'Learn more about definite integrals'
];

describe('CitationsSidebar', () => {
  it('should render sources with correct information', () => {
    render(
      <CitationsSidebar
        sources={mockSources}
        suggestions={mockSuggestions}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Sources & Citations')).toBeInTheDocument();
    expect(screen.getByText('Sources Used')).toBeInTheDocument();
    expect(screen.getByText('Derivative Rules')).toBeInTheDocument();
    expect(screen.getByText('Integration Techniques')).toBeInTheDocument();
  });

  it('should render source type badges correctly', () => {
    render(
      <CitationsSidebar
        sources={mockSources}
        suggestions={[]}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Canonical Solution')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Base')).toBeInTheDocument();
  });

  it('should render source scores correctly', () => {
    render(
      <CitationsSidebar
        sources={mockSources}
        suggestions={[]}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('95% match')).toBeInTheDocument();
    expect(screen.getByText('87% match')).toBeInTheDocument();
  });

  it('should render suggestions when provided', () => {
    render(
      <CitationsSidebar
        sources={[]}
        suggestions={mockSuggestions}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Suggestions')).toBeInTheDocument();
    expect(screen.getByText('Try asking about the chain rule')).toBeInTheDocument();
    expect(screen.getByText('Learn more about definite integrals')).toBeInTheDocument();
  });

  it('should render external links with correct attributes', () => {
    render(
      <CitationsSidebar
        sources={mockSources}
        suggestions={[]}
        onClose={vi.fn()}
      />
    );

    const links = screen.getAllByText('View Source');
    expect(links).toHaveLength(2);
    
    links.forEach(link => {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('should call onClose when close button is clicked', () => {
    const mockOnClose = vi.fn();
    render(
      <CitationsSidebar
        sources={[]}
        suggestions={[]}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByLabelText('Close citations sidebar');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should render empty state when no sources or suggestions', () => {
    render(
      <CitationsSidebar
        sources={[]}
        suggestions={[]}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('No sources or suggestions available for this response.')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CitationsSidebar
        sources={[]}
        suggestions={[]}
        onClose={vi.fn()}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
