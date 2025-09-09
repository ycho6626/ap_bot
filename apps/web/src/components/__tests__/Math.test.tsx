import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Math, InlineMath, DisplayMath, MathBlock } from '../katex/Math';

describe('Math Components', () => {
  describe('Math', () => {
    it('should render inline math correctly', () => {
      const { container } = render(<Math content="x^2 + y^2 = z^2" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render display math correctly', () => {
      const { container } = render(<Math content="\\int_0^1 x^2 dx" displayMode={true} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle empty content', () => {
      const { container } = render(<Math content="" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<Math content="x^2" className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('InlineMath', () => {
    it('should render inline math with correct props', () => {
      const { container } = render(<InlineMath content="x^2" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<InlineMath content="x^2" className="inline-math" />);
      expect(container.firstChild).toHaveClass('inline-math');
    });
  });

  describe('DisplayMath', () => {
    it('should render display math with correct props', () => {
      const { container } = render(<DisplayMath content="\\int_0^1 x^2 dx" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<DisplayMath content="\\int_0^1 x^2 dx" className="display-math" />);
      expect(container.firstChild).toHaveClass('display-math');
    });
  });

  describe('MathBlock', () => {
    it('should render math block with correct props', () => {
      const { container } = render(<MathBlock content="\\int_0^1 x^2 dx" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<MathBlock content="\\int_0^1 x^2 dx" className="math-block" />);
      expect(container.firstChild).toHaveClass('math-block');
    });
  });
});
