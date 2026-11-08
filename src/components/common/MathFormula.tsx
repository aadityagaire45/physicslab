import { memo, useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { cn } from '@/utils/cn';

interface MathFormulaProps {
  latex: string;
  /** Render as a centred display equation rather than inline. */
  display?: boolean;
  className?: string;
}

/**
 * Renders LaTeX with KaTeX. Rendering is synchronous and memoised; invalid
 * input is shown in red rather than throwing.
 */
export const MathFormula = memo(function MathFormula({ latex, display = false, className }: MathFormulaProps) {
  const html = useMemo(
    () =>
      katex.renderToString(latex, {
        displayMode: display,
        throwOnError: false,
        strict: 'ignore',
        output: 'htmlAndMathml',
      }),
    [latex, display],
  );

  const Tag = display ? 'div' : 'span';
  return <Tag className={cn(display && 'text-fg', className)} dangerouslySetInnerHTML={{ __html: html }} />;
});
