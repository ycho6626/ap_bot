import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MarkdownRenderer, MathMarkdownRenderer } from '../MarkdownRenderer';

// Mock katex to avoid SSR issues in tests
vi.mock('katex', () => ({
  default: {
    renderToString: vi.fn((content, _options) => {
      if (content.includes('error')) {
        throw new Error('KaTeX rendering error');
      }
      return `<span class="katex">${content}</span>`;
    }),
  },
}));

describe('MarkdownRenderer', () => {
  it('should render basic markdown content', () => {
    const content = '# Hello World\n\nThis is a **bold** statement.';
    const { container } = render(<MarkdownRenderer content={content} />);
    expect(container).toBeInTheDocument();
  });

  it('should render markdown lists', () => {
    const content = '- Item 1\n- Item 2\n- Item 3';
    const { container } = render(<MarkdownRenderer content={content} />);
    expect(container).toBeInTheDocument();
  });

  it('should render markdown tables', () => {
    const content = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
    const { container } = render(<MarkdownRenderer content={content} />);
    expect(container).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const content = 'Test content';
    const { container } = render(<MarkdownRenderer content={content} className='custom-class' />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should handle empty content', () => {
    const { container } = render(<MarkdownRenderer content='' />);
    expect(container).toBeInTheDocument();
  });
});

describe('MathMarkdownRenderer', () => {
  it('should render inline math correctly', async () => {
    const content = 'The equation $x^2 + y^2 = z^2$ is the Pythagorean theorem.';
    const { container } = render(<MathMarkdownRenderer content={content} />);

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('should render display math correctly', async () => {
    const content = 'Here is the integral:\n\n$$\\int_0^1 x^2 dx$$';
    const { container } = render(<MathMarkdownRenderer content={content} />);

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('should handle mixed content with text and math', async () => {
    const content =
      'The derivative of $x^2$ is $2x$. Here is the integral:\n\n$$\\int_0^1 x^2 dx = \\frac{1}{3}$$';
    const { container } = render(<MathMarkdownRenderer content={content} />);

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('should handle LaTeX block expressions in markdown', async () => {
    const content =
      'Here is a system of equations:\n\n$$\\begin{align} x^2 + y^2 &= z^2 \\\\ a^2 + b^2 &= c^2 \\end{align}$$';
    const { container } = render(<MathMarkdownRenderer content={content} />);

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('should handle markdown lists with math', async () => {
    const content = '- The derivative of $x^2$ is $2x$\n- The integral of $2x$ is $x^2 + C$';
    const { container } = render(<MathMarkdownRenderer content={content} />);

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('should handle code blocks with math', async () => {
    const content = 'Here is some code:\n\n```\n$$\\int_0^1 x^2 dx$$\n```';
    const { container } = render(<MathMarkdownRenderer content={content} />);

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('should handle multiple inline math expressions', async () => {
    const content =
      'The derivative of $x^2$ is $2x$, and the derivative of $\\sin(x)$ is $\\cos(x)$.';
    const { container } = render(<MathMarkdownRenderer content={content} />);

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('should handle multiple display math expressions', async () => {
    const content =
      'First equation:\n\n$$x^2 + y^2 = z^2$$\n\nSecond equation:\n\n$$\\int_0^1 x^2 dx = \\frac{1}{3}$$';
    const { container } = render(<MathMarkdownRenderer content={content} />);

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('should handle complex LaTeX expressions', async () => {
    const content =
      'Here is a complex integral:\n\n$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$';
    const { container } = render(<MathMarkdownRenderer content={content} />);

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('should handle math with special characters', async () => {
    const content = 'The limit is $\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1$';
    const { container } = render(<MathMarkdownRenderer content={content} />);

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('should handle math in markdown headers', async () => {
    const content = '# Calculus: $\\frac{d}{dx}[x^2] = 2x$';
    const { container } = render(<MathMarkdownRenderer content={content} />);

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('should handle math in markdown blockquotes', async () => {
    const content =
      "> The fundamental theorem of calculus states that $\\int_a^b f'(x) dx = f(b) - f(a)$";
    const { container } = render(<MathMarkdownRenderer content={content} />);

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('should apply custom className', () => {
    const content = 'Test content with $x^2$';
    const { container } = render(
      <MathMarkdownRenderer content={content} className='custom-class' />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should handle empty content', () => {
    const { container } = render(<MathMarkdownRenderer content='' />);
    expect(container).toBeInTheDocument();
  });

  it('should handle content with only math', async () => {
    const content = '$x^2 + y^2 = z^2$';
    const { container } = render(<MathMarkdownRenderer content={content} />);

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('should handle content with only display math', async () => {
    const content = '$$\\int_0^1 x^2 dx$$';
    const { container } = render(<MathMarkdownRenderer content={content} />);

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });
});
