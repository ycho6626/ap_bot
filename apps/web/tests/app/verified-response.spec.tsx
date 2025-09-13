import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CoachPage from '../../src/app/coach/page';
import { examVariantStorage } from '../../src/lib/storage';
import { coach } from '../../src/lib/api.bridge';

// Mock the API bridge
vi.mock('../../src/lib/api.bridge', () => ({
  coach: vi.fn(),
}));

// Mock the storage utilities
vi.mock('../../src/lib/storage', () => ({
  examVariantStorage: {
    get: vi.fn(),
    set: vi.fn(),
    getVariant: vi.fn(),
    setVariant: vi.fn(),
  },
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the Math component
vi.mock('../../src/components/katex/Math', () => ({
  Math: ({ content }: { content: string }) => <span data-testid='math-content'>{content}</span>,
}));

// Mock other components
vi.mock('../../src/components/VerifiedBadge', () => ({
  VerifiedBadge: ({ verified }: { verified: boolean }) => (
    <span data-testid='verified-badge'>{verified ? 'Verified' : 'Not Verified'}</span>
  ),
}));

vi.mock('../../src/components/TrustMeter', () => ({
  TrustMeter: ({ score }: { score: number }) => (
    <div data-testid='trust-meter' style={{ width: `${score * 100}%` }} />
  ),
}));

vi.mock('../../src/components/CitationsSidebar', () => ({
  CitationsSidebar: ({ sources, onClose }: { sources: any[]; onClose: () => void }) => (
    <div data-testid='citations-sidebar'>
      <button onClick={onClose} data-testid='close-citations'>
        Close
      </button>
      <div data-testid='sources-count'>Sources: {sources.length}</div>
      {sources.map((source, index) => (
        <a
          key={index}
          href={`/lessons/${source.id}`}
          target='_blank'
          rel='noopener noreferrer'
          data-testid={`source-link-${index}`}
        >
          {source.title}
        </a>
      ))}
    </div>
  ),
}));

vi.mock('../../src/components/ExamVariantSelector', () => ({
  ExamVariantSelector: ({
    value,
    onChange,
  }: {
    value: 'calc_ab' | 'calc_bc';
    onChange: (value: 'calc_ab' | 'calc_bc') => void;
  }) => (
    <div data-testid='exam-variant-selector'>
      <button
        data-testid='variant-ab'
        onClick={() => onChange('calc_ab')}
        className={value === 'calc_ab' ? 'selected' : ''}
      >
        AB
      </button>
      <button
        data-testid='variant-bc'
        onClick={() => onChange('calc_bc')}
        className={value === 'calc_bc' ? 'selected' : ''}
      >
        BC
      </button>
    </div>
  ),
}));

describe('Verified Response Rendering', () => {
  const mockCoach = vi.mocked(coach);
  const mockExamVariantStorage = vi.mocked(examVariantStorage);

  beforeEach(() => {
    vi.clearAllMocks();
    mockExamVariantStorage.get.mockReturnValue('calc_ab');
    mockExamVariantStorage.set.mockImplementation(() => {});
  });

  it('should render verified badge and trust meter for verified response', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      answer: 'The derivative of x² is 2x',
      verified: true,
      trustScore: 0.95,
      confidence: 0.98,
      sources: [
        {
          type: 'canonical' as const,
          id: 'derivative-rules',
          title: 'Derivative Rules',
          snippet: 'The derivative of x^n is nx^(n-1)',
          score: 0.95,
        },
      ],
      suggestions: ['Try asking about the chain rule'],
      metadata: {
        examVariant: 'calc_ab' as const,
        processingTime: 100,
        retryCount: 0,
      },
    };

    mockCoach.mockResolvedValue(mockResponse);

    render(<CoachPage />);

    // Submit a question
    const input = screen.getByPlaceholderText('Ask a AP Calculus AB question...');
    await user.type(input, 'What is the derivative of x²?');

    const submitButton = screen.getByRole('button', { name: '' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('verified-badge')).toHaveTextContent('Verified');
      expect(screen.getByTestId('trust-meter')).toBeInTheDocument();
    });
  });

  it('should render not verified badge for unverified response', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      answer: 'I am not sure about this answer',
      verified: false,
      trustScore: 0.45,
      confidence: 0.5,
      sources: [],
      suggestions: ['Try rephrasing your question'],
      metadata: {
        examVariant: 'calc_ab' as const,
        processingTime: 100,
        retryCount: 0,
      },
    };

    mockCoach.mockResolvedValue(mockResponse);

    render(<CoachPage />);

    // Submit a question
    const input = screen.getByPlaceholderText('Ask a AP Calculus AB question...');
    await user.type(input, 'What is the meaning of life?');

    const submitButton = screen.getByRole('button', { name: '' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('verified-badge')).toHaveTextContent('Not Verified');
      expect(screen.getByTestId('trust-meter')).toBeInTheDocument();
    });
  });

  it('should toggle citations drawer and verify links render correctly', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      answer: 'The derivative of x² is 2x',
      verified: true,
      trustScore: 0.95,
      confidence: 0.98,
      sources: [
        {
          type: 'canonical' as const,
          id: 'derivative-rules',
          title: 'Derivative Rules',
          snippet: 'The derivative of x^n is nx^(n-1)',
          score: 0.95,
        },
        {
          type: 'retrieval' as const,
          id: 'integration-basics',
          title: 'Integration Basics',
          snippet: 'Integration is the reverse of differentiation',
          score: 0.87,
        },
      ],
      suggestions: ['Try asking about the chain rule'],
      metadata: {
        examVariant: 'calc_ab' as const,
        processingTime: 100,
        retryCount: 0,
      },
    };

    mockCoach.mockResolvedValue(mockResponse);

    render(<CoachPage />);

    // Submit a question
    const input = screen.getByPlaceholderText('Ask a AP Calculus AB question...');
    await user.type(input, 'What is the derivative of x²?');

    const submitButton = screen.getByRole('button', { name: '' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('verified-badge')).toHaveTextContent('Verified');
    });

    // Click citations button
    const citationsButton = screen.getByText('Citations');
    await user.click(citationsButton);

    // Verify citations drawer is open
    await waitFor(() => {
      expect(screen.getByTestId('citations-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('sources-count')).toHaveTextContent('Sources: 2');
    });

    // Verify external links have correct attributes
    const sourceLinks = screen.getAllByTestId(/source-link-/);
    expect(sourceLinks).toHaveLength(2);

    sourceLinks.forEach(link => {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    // Test closing citations drawer
    const closeButton = screen.getByTestId('close-citations');
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('citations-sidebar')).not.toBeInTheDocument();
    });
  });

  it('should display trust score percentage correctly', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      answer: 'The derivative of x² is 2x',
      verified: true,
      trustScore: 0.87,
      confidence: 0.9,
      sources: [],
      suggestions: [],
      metadata: {
        examVariant: 'calc_ab' as const,
        processingTime: 100,
        retryCount: 0,
      },
    };

    mockCoach.mockResolvedValue(mockResponse);

    render(<CoachPage />);

    // Submit a question
    const input = screen.getByPlaceholderText('Ask a AP Calculus AB question...');
    await user.type(input, 'What is the derivative of x²?');

    const submitButton = screen.getByRole('button', { name: '' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('87%')).toBeInTheDocument();
      expect(screen.getByTestId('trust-meter')).toHaveStyle('width: 87%');
    });
  });
});
