import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ReviewPage from '../page';
import { createMockJwtToken } from '@ap/shared/auth';

// Mock the API
vi.mock('@/lib/api', () => ({
  ReviewApi: {
    getCases: vi.fn(),
    resolveCase: vi.fn(),
  },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock the components
vi.mock('@/components/ReviewCaseList', () => ({
  ReviewCaseList: ({ cases, loading, onCaseSelect }: any) => (
    <div data-testid='review-case-list'>
      {loading ? 'Loading...' : `Found ${cases.length} cases`}
      {cases.map((case_: any) => (
        <div key={case_.id} onClick={() => onCaseSelect(case_)}>
          {case_.question}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/ReviewCaseDetail', () => ({
  ReviewCaseDetail: ({ case_, onResolve }: any) => (
    <div data-testid='review-case-detail'>
      <div>{case_.question}</div>
      <button onClick={() => onResolve(case_.id, 'approve')}>Approve</button>
      <button onClick={() => onResolve(case_.id, 'reject')}>Reject</button>
    </div>
  ),
}));

vi.mock('@/components/ReviewFilters', () => ({
  ReviewFilters: ({ filters, onFiltersChange }: any) => (
    <div data-testid='review-filters'>
      <select value={filters.status} onChange={e => onFiltersChange({ status: e.target.value })}>
        <option value='pending'>Pending</option>
        <option value='approved'>Approved</option>
      </select>
    </div>
  ),
}));

describe('ReviewPage', () => {
  const mockCases = [
    {
      id: '1',
      question: 'What is the derivative of x²?',
      answer: '2x',
      examVariant: 'calc_ab' as const,
      trustScore: 0.95,
      confidence: 0.9,
      sources: [],
      metadata: {
        examVariant: 'calc_ab',
        processingTime: 1000,
        retryCount: 0,
      },
      status: 'pending' as const,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
    {
      id: '2',
      question: 'Find the integral of 2x',
      answer: 'x² + C',
      examVariant: 'calc_ab' as const,
      trustScore: 0.88,
      confidence: 0.85,
      sources: [],
      metadata: {
        examVariant: 'calc_ab',
        processingTime: 1200,
        retryCount: 0,
      },
      status: 'pending' as const,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock successful API responses
    const { ReviewApi } = await import('@/lib/api');
    vi.mocked(ReviewApi.getCases).mockResolvedValue({
      cases: mockCases,
      pagination: {
        total: 2,
        limit: 20,
        offset: 0,
        hasMore: false,
      },
    });
    vi.mocked(ReviewApi.resolveCase).mockResolvedValue({
      id: '1',
      status: 'approved',
      message: 'Case resolved successfully',
    });
  });

  it('should show teacher sign-in required when no JWT token', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    render(<ReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('Teacher sign-in required')).toBeInTheDocument();
    });
  });

  it('should show access denied for insufficient role', async () => {
    const token = createMockJwtToken({ role: 'public' });
    mockLocalStorage.getItem.mockReturnValue(token);

    render(<ReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('Access denied. Required role: teacher')).toBeInTheDocument();
    });
  });

  it('should render review interface with valid teacher token', async () => {
    const token = createMockJwtToken({ role: 'teacher' });
    mockLocalStorage.getItem.mockReturnValue(token);

    render(<ReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Review Cases')).toBeInTheDocument();
      expect(screen.getByTestId('review-case-list')).toBeInTheDocument();
      expect(screen.getByTestId('review-filters')).toBeInTheDocument();
    });

    // Should show cases
    expect(screen.getByText('Found 2 cases')).toBeInTheDocument();
    expect(screen.getByText('What is the derivative of x²?')).toBeInTheDocument();
    expect(screen.getByText('Find the integral of 2x')).toBeInTheDocument();
  });

  it('should handle case selection and resolution', async () => {
    const token = createMockJwtToken({ role: 'teacher' });
    mockLocalStorage.getItem.mockReturnValue(token);

    render(<ReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Found 2 cases')).toBeInTheDocument();
    });

    // Click on first case
    const firstCase = screen.getByText('What is the derivative of x²?');
    firstCase.click();

    // Should show case detail
    await waitFor(() => {
      expect(screen.getByTestId('review-case-detail')).toBeInTheDocument();
    });

    // Click approve button
    const approveButton = screen.getByText('Approve');
    approveButton.click();

    // Should call resolveCase API
    const { ReviewApi } = await import('@/lib/api');
    expect(vi.mocked(ReviewApi.resolveCase)).toHaveBeenCalledWith({
      caseId: '1',
      action: 'approve',
    });
  });

  it('should handle API errors gracefully', async () => {
    const token = createMockJwtToken({ role: 'teacher' });
    mockLocalStorage.getItem.mockReturnValue(token);

    const { ReviewApi } = await import('@/lib/api');
    vi.mocked(ReviewApi.getCases).mockRejectedValue(new Error('API Error'));

    render(<ReviewPage />);

    await waitFor(() => {
      expect(screen.getByText('Review Cases')).toBeInTheDocument();
    });

    // Should still render the interface even if API fails
    expect(screen.getByTestId('review-case-list')).toBeInTheDocument();
  });
});
