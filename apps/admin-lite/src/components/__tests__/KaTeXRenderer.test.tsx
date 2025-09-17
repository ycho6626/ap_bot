import { render } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { KaTeXRenderer } from '../KaTeXRenderer';

// Mock react-katex
vi.mock('react-katex', () => ({
  InlineMath: ({ math }: { math: string }) => <span data-testid='inline-math'>{math}</span>,
  BlockMath: ({ math }: { math: string }) => <div data-testid='block-math'>{math}</div>,
}));

describe('KaTeXRenderer', () => {
  it('should render plain text without math', () => {
    const { container } = render(<KaTeXRenderer content='This is plain text' />);

    expect(container.textContent).toBe('This is plain text');
  });

  it('should render inline math expressions', () => {
    const { getAllByTestId } = render(<KaTeXRenderer content='The derivative of $x^2$ is $2x$' />);

    const inlineMathElements = getAllByTestId('inline-math');
    expect(inlineMathElements).toHaveLength(2);
    expect(inlineMathElements[0]).toHaveTextContent('x^2');
    expect(inlineMathElements[1]).toHaveTextContent('2x');
  });

  it('should render block math expressions', () => {
    const { getByTestId } = render(
      <KaTeXRenderer content='Here is a formula: $$\\int x^2 dx = \\frac{x^3}{3} + C$$' />
    );

    expect(getByTestId('block-math')).toHaveTextContent('\\\\int x^2 dx = \\\\frac{x^3}{3} + C');
  });

  it('should render mixed content with both inline and block math', () => {
    const { getAllByTestId, getByTestId, container } = render(
      <KaTeXRenderer content='The derivative of $x^2$ is $2x$. Here is the integral: $$\\int 2x dx = x^2 + C$$' />
    );

    const inlineMathElements = getAllByTestId('inline-math');
    expect(inlineMathElements[0]).toHaveTextContent('x^2');
    expect(inlineMathElements[1]).toHaveTextContent('2x');
    expect(getByTestId('block-math')).toHaveTextContent('\\\\int 2x dx = x^2 + C');
    expect(container.textContent).toContain('The derivative of');
    expect(container.textContent).toContain('is');
    expect(container.textContent).toContain('Here is the integral:');
  });

  it('should handle malformed math gracefully', () => {
    const { container } = render(<KaTeXRenderer content='This has bad math: $\\invalid{math}$' />);

    // Should fall back to showing the raw math (escaped)
    expect(container.textContent).toContain('\\\\invalid{math}');
  });

  it('should apply custom className', () => {
    const { container } = render(<KaTeXRenderer content='Test content' className='custom-class' />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
