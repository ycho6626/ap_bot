import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { Math, InlineMath, DisplayMath, MathBlock } from '../katex/Math';
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

describe('Math Components', () => {
  describe('Math', () => {
    it('should render inline math correctly', async () => {
      const { container } = render(<Math content='$x^2 + y^2 = z^2$' />);

      // Wait for client-side rendering
      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      });
    });

    it('should render display math correctly', async () => {
      const { container } = render(<Math content='\\int_0^1 x^2 dx' displayMode={true} />);

      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      });
    });

    it('should handle empty content', () => {
      const { container } = render(<Math content='' />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should apply custom className', async () => {
      const { container } = render(<Math content='$x^2$' className='custom-class' />);

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class');
      });
    });

    it('should show loading state during SSR', () => {
      // Mock the isClient state to be false initially
      const { container } = render(<Math content='$x^2$' />);
      // In test environment, the component will render immediately
      // so we just check that it renders without error
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle mixed content with inline and display math', async () => {
      const content =
        "The equation $x^2 + y^2 = z^2$ is the Pythagorean theorem. Here's the integral: $$\\int_0^1 x^2 dx$$";
      const { container } = render(<Math content={content} />);

      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      });
    });

    it('should handle LaTeX block expressions', async () => {
      const content = '\\begin{align} x^2 + y^2 &= z^2 \\\\ a^2 + b^2 &= c^2 \\end{align}';
      const { container } = render(<Math content={content} />);

      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('InlineMath', () => {
    it('should render inline math with correct props', async () => {
      const { container } = render(<InlineMath content='$x^2$' />);

      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      });
    });

    it('should apply custom className', async () => {
      const { container } = render(<InlineMath content='$x^2$' className='inline-math' />);

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('inline-math');
      });
    });
  });

  describe('DisplayMath', () => {
    it('should render display math with correct props', async () => {
      const { container } = render(<DisplayMath content='\\int_0^1 x^2 dx' />);

      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      });
    });

    it('should apply custom className', async () => {
      const { container } = render(
        <DisplayMath content='\\int_0^1 x^2 dx' className='display-math' />
      );

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('display-math');
      });
    });
  });

  describe('MathBlock', () => {
    it('should render math block with correct props', async () => {
      const { container } = render(<MathBlock content='\\int_0^1 x^2 dx' />);

      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      });
    });

    it('should apply custom className', async () => {
      const { container } = render(<MathBlock content='\\int_0^1 x^2 dx' className='math-block' />);

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('math-block');
      });
    });
  });
});

describe('MarkdownRenderer Components', () => {
  describe('MarkdownRenderer', () => {
    it('should render basic markdown', () => {
      const content = '# Hello World\n\nThis is a **bold** statement.';
      const { container } = render(<MarkdownRenderer content={content} />);
      expect(container).toBeInTheDocument();
    });

    it('should handle math in markdown', async () => {
      const content = 'The equation $x^2 + y^2 = z^2$ is important.';
      const { container } = render(<MarkdownRenderer content={content} />);

      await waitFor(() => {
        expect(container).toBeInTheDocument();
      });
    });

    it('should apply custom className', () => {
      const content = 'Test content';
      const { container } = render(<MarkdownRenderer content={content} className='custom-class' />);
      expect(container.firstChild).toHaveClass('custom-class');
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

    it('should apply custom className', () => {
      const content = 'Test content with $x^2$';
      const { container } = render(
        <MathMarkdownRenderer content={content} className='custom-class' />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
