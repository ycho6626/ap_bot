import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LessonsPage from '../../src/app/lessons/page';
import { examVariantStorage, searchHistoryStorage } from '../../src/lib/storage';
import { searchKB } from '../../src/lib/api.bridge';

// Mock the API bridge
vi.mock('../../src/lib/api.bridge', () => ({
  searchKB: vi.fn(),
}));

// Mock the storage utilities
vi.mock('../../src/lib/storage', () => ({
  examVariantStorage: {
    get: vi.fn(),
    set: vi.fn(),
    getVariant: vi.fn(),
    setVariant: vi.fn(),
  },
  searchHistoryStorage: {
    get: vi.fn(),
    add: vi.fn(),
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
  Math: ({ content }: { content: string }) => <span data-testid="math-content">{content}</span>,
}));

// Mock the ExamVariantSelector component
vi.mock('../../src/components/ExamVariantSelector', () => ({
  ExamVariantSelector: ({ 
    value, 
    onChange 
  }: { 
    value: 'calc_ab' | 'calc_bc', 
    onChange: (value: 'calc_ab' | 'calc_bc') => void 
  }) => (
    <div data-testid="exam-variant-selector">
      <button 
        data-testid="variant-ab" 
        onClick={() => onChange('calc_ab')}
        className={value === 'calc_ab' ? 'selected' : ''}
      >
        AB
      </button>
      <button 
        data-testid="variant-bc" 
        onClick={() => onChange('calc_bc')}
        className={value === 'calc_bc' ? 'selected' : ''}
      >
        BC
      </button>
    </div>
  ),
}));

describe('LessonsPage - AB/BC Variant Persistence', () => {
  const mockSearchKB = vi.mocked(searchKB);
  const mockExamVariantStorage = vi.mocked(examVariantStorage);
  const mockSearchHistoryStorage = vi.mocked(searchHistoryStorage);

  beforeEach(() => {
    vi.clearAllMocks();
    mockExamVariantStorage.get.mockReturnValue('calc_ab');
    mockExamVariantStorage.set.mockImplementation(() => {});
    mockSearchHistoryStorage.get.mockReturnValue([]);
    mockSearchHistoryStorage.add.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load saved variant from storage on mount', async () => {
    mockExamVariantStorage.get.mockReturnValue('calc_bc');

    render(<LessonsPage />);

    await waitFor(() => {
      expect(mockExamVariantStorage.get).toHaveBeenCalled();
    });

    // Check that BC variant is selected
    const bcButton = screen.getByTestId('variant-bc');
    expect(bcButton).toHaveClass('selected');
  });

  it('should save variant to storage when changed', async () => {
    const user = userEvent.setup();
    render(<LessonsPage />);

    // Click BC variant
    const bcButton = screen.getByTestId('variant-bc');
    await user.click(bcButton);

    expect(mockExamVariantStorage.set).toHaveBeenCalledWith('calc_bc');
  });

  it('should include selected variant in searchKB API calls', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      results: [
        {
          document: {
            id: 'doc1',
            content: 'Test content',
            subject: 'calc',
            exam_variant: 'calc_bc',
            partition: 'public',
            topic: 'derivatives',
            subtopic: 'power_rule',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          },
          score: 0.9,
          snippet: 'Test snippet',
          provenance: {
            source: 'test',
            partition: 'public',
            topic: 'derivatives',
            subtopic: 'power_rule',
          },
        }
      ],
      metadata: {
        query: 'derivatives',
        examVariant: 'calc_bc',
        totalResults: 1,
        maxScore: 0.9,
        searchTime: 100,
      },
    };

    mockSearchKB.mockResolvedValue(mockResponse);

    render(<LessonsPage />);

    // Switch to BC variant
    const bcButton = screen.getByTestId('variant-bc');
    await user.click(bcButton);

    // Perform a search
    const searchInput = screen.getByPlaceholderText('Search AP Calculus BC lessons...');
    await user.type(searchInput, 'derivatives');

    await waitFor(() => {
      expect(mockSearchKB).toHaveBeenCalledWith('derivatives', 'calc_bc');
    });
  });

  it('should persist variant selection across page reloads', async () => {
    // Simulate page reload by re-rendering with different storage value
    mockExamVariantStorage.get.mockReturnValue('calc_bc');
    
    const { rerender } = render(<LessonsPage />);
    
    // Simulate page reload - storage returns BC variant
    mockExamVariantStorage.get.mockReturnValue('calc_bc');
    rerender(<LessonsPage />);

    await waitFor(() => {
      expect(mockExamVariantStorage.get).toHaveBeenCalled();
    });

    // BC should still be selected
    const bcButton = screen.getByTestId('variant-bc');
    expect(bcButton).toHaveClass('selected');
  });

  it('should handle variant changes during search', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      results: [],
      metadata: {
        query: 'test',
        examVariant: 'calc_ab',
        totalResults: 0,
        maxScore: 0,
        searchTime: 50,
      },
    };

    mockSearchKB.mockResolvedValue(mockResponse);

    render(<LessonsPage />);

    // Start with AB variant
    const abButton = screen.getByTestId('variant-ab');
    expect(abButton).toHaveClass('selected');

    // Perform a search with AB variant
    const searchInput = screen.getByPlaceholderText('Search AP Calculus AB lessons...');
    await user.type(searchInput, 'test');

    await waitFor(() => {
      expect(mockSearchKB).toHaveBeenCalledWith('test', 'calc_ab');
    });

    // Switch to BC variant
    const bcButton = screen.getByTestId('variant-bc');
    await user.click(bcButton);

    // Clear and search again
    await user.clear(searchInput);
    await user.type(searchInput, 'test2');

    await waitFor(() => {
      expect(mockSearchKB).toHaveBeenCalledWith('test2', 'calc_bc');
    });
  });

  it('should load search history from storage on mount', async () => {
    const mockHistory = ['derivatives', 'integrals', 'limits'];
    mockSearchHistoryStorage.get.mockReturnValue(mockHistory);

    render(<LessonsPage />);

    await waitFor(() => {
      expect(mockSearchHistoryStorage.get).toHaveBeenCalled();
    });

    // Check that history items are displayed
    expect(screen.getByText('derivatives')).toBeInTheDocument();
    expect(screen.getByText('integrals')).toBeInTheDocument();
    expect(screen.getByText('limits')).toBeInTheDocument();
  });

  it('should add search queries to history with correct variant', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      results: [],
      metadata: {
        query: 'test',
        examVariant: 'calc_bc',
        totalResults: 0,
        maxScore: 0,
        searchTime: 50,
      },
    };

    mockSearchKB.mockResolvedValue(mockResponse);

    render(<LessonsPage />);

    // Switch to BC variant
    const bcButton = screen.getByTestId('variant-bc');
    await user.click(bcButton);

    // Perform a search
    const searchInput = screen.getByPlaceholderText('Search AP Calculus BC lessons...');
    await user.type(searchInput, 'test query');

    await waitFor(() => {
      expect(mockSearchHistoryStorage.add).toHaveBeenCalledWith('test query');
    });
  });
});
