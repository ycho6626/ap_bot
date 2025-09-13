import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  CitationsSidebar: ({
    sources,
    isOpen,
    onClose,
  }: {
    sources: any[];
    isOpen: boolean;
    onClose: () => void;
  }) => (isOpen ? <div data-testid='citations-sidebar'>Citations: {sources.length}</div> : null),
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

describe('CoachPage - AB/BC Variant Persistence', () => {
  const mockCoach = vi.mocked(coach);
  const mockExamVariantStorage = vi.mocked(examVariantStorage);

  beforeEach(() => {
    vi.clearAllMocks();
    mockExamVariantStorage.get.mockReturnValue('calc_ab');
    mockExamVariantStorage.set.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load saved variant from storage on mount', async () => {
    mockExamVariantStorage.get.mockReturnValue('calc_bc');

    render(<CoachPage />);

    await waitFor(() => {
      expect(mockExamVariantStorage.get).toHaveBeenCalled();
    });

    // Check that BC variant is selected
    const bcButton = screen.getByTestId('variant-bc');
    expect(bcButton).toHaveClass('selected');
  });

  it('should save variant to storage when changed', async () => {
    const user = userEvent.setup();
    render(<CoachPage />);

    // Click BC variant
    const bcButton = screen.getByTestId('variant-bc');
    await user.click(bcButton);

    expect(mockExamVariantStorage.set).toHaveBeenCalledWith('calc_bc');
  });

  it('should include selected variant in coach API calls', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      answer: 'Test answer',
      verified: true,
      trustScore: 0.8,
      confidence: 0.9,
      sources: [],
      metadata: {
        examVariant: 'calc_bc',
        processingTime: 100,
        retryCount: 0,
      },
    };

    mockCoach.mockResolvedValue(mockResponse);

    render(<CoachPage />);

    // Switch to BC variant
    const bcButton = screen.getByTestId('variant-bc');
    await user.click(bcButton);

    // Submit a question
    const input = screen.getByPlaceholderText('Ask a AP Calculus BC question...');
    await user.type(input, 'What is the derivative of x²?');

    const submitButton = screen.getByRole('button', { name: '' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCoach).toHaveBeenCalledWith('What is the derivative of x²?', 'calc_bc');
    });
  });

  it('should persist variant selection across page reloads', async () => {
    // Simulate page reload by re-rendering with different storage value
    mockExamVariantStorage.get.mockReturnValue('calc_bc');

    const { rerender } = render(<CoachPage />);

    // Simulate page reload - storage returns BC variant
    mockExamVariantStorage.get.mockReturnValue('calc_bc');
    rerender(<CoachPage />);

    await waitFor(() => {
      expect(mockExamVariantStorage.get).toHaveBeenCalled();
    });

    // BC should still be selected
    const bcButton = screen.getByTestId('variant-bc');
    expect(bcButton).toHaveClass('selected');
  });

  it('should handle variant changes during API calls', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      answer: 'Test answer',
      verified: true,
      trustScore: 0.8,
      confidence: 0.9,
      sources: [],
      metadata: {
        examVariant: 'calc_ab',
        processingTime: 100,
        retryCount: 0,
      },
    };

    mockCoach.mockResolvedValue(mockResponse);

    render(<CoachPage />);

    // Start with AB variant
    const abButton = screen.getByTestId('variant-ab');
    expect(abButton).toHaveClass('selected');

    // Submit a question with AB variant
    const input = screen.getByPlaceholderText('Ask a AP Calculus AB question...');
    await user.type(input, 'What is the integral of x?');

    const submitButton = screen.getByRole('button', { name: '' });
    await user.click(submitButton);

    // Switch to BC variant while loading
    const bcButton = screen.getByTestId('variant-bc');
    await user.click(bcButton);

    await waitFor(() => {
      expect(mockCoach).toHaveBeenCalledWith('What is the integral of x?', 'calc_ab');
    });

    // Next question should use BC variant
    await user.clear(input);
    await user.type(input, 'What is the derivative of sin(x)?');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCoach).toHaveBeenCalledWith('What is the derivative of sin(x)?', 'calc_bc');
    });
  });
});
