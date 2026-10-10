import React, { useMemo } from 'react';
import { inlineRuns, outline, parseReport } from '../utils/reportText';

// Безопасно показване на текста на отчета (Фаза 13): блокове и React елементи, без HTML. Един и същ компонент за новия
// резултат и за Историята. Заглавия, списъци, разделители и удебелен текст вместо суров Markdown. С toc показва съдържание.
const Inline = ({ text }) => (
  <>
    {inlineRuns(text).map((run, i) => {
      if (run.bold) return <strong key={i} className="font-semibold text-white">{run.text}</strong>;
      if (run.italic) return <em key={i}>{run.text}</em>;
      return <React.Fragment key={i}>{run.text}</React.Fragment>;
    })}
  </>
);

const HEADING_CLASS = {
  1: 'text-2xl font-bold text-purple-300 mt-8 mb-3',
  2: 'text-xl font-bold text-purple-300 mt-7 mb-2',
  3: 'text-lg font-semibold text-purple-200 mt-5 mb-2',
};

export default function ReportText({ text, toc = false, className = '' }) {
  const blocks = useMemo(() => parseReport(text), [text]);
  const headings = useMemo(() => (toc ? outline(blocks) : []), [blocks, toc]);

  if (!blocks.length) return <p className="text-slate-400">Няма съдържание.</p>;

  return (
    <div className={`text-slate-200 leading-relaxed space-y-3 ${className}`}>
      {headings.length >= 3 && (
        <nav aria-label="Съдържание" className="mb-4 rounded-lg border border-slate-700/60 bg-slate-900/40 p-3 text-sm">
          <p className="font-semibold text-slate-300 mb-1">Съдържание</p>
          <ol className="list-decimal pl-5 space-y-0.5">
            {headings.map((h) => (
              <li key={h.id}>
                <a href={`#${h.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="text-purple-300 hover:text-purple-200 underline-offset-2 hover:underline">{h.title}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      {blocks.map((block, index) => {
        const id = `r-${index}`;
        switch (block.kind) {
          case 'h': {
            const Tag = block.level <= 1 ? 'h2' : block.level === 2 ? 'h3' : 'h4';
            return <Tag key={index} id={id} className={HEADING_CLASS[Math.min(block.level, 3)]}><Inline text={block.items[0]} /></Tag>;
          }
          case 'ul':
            return (
              <ul key={index} className="list-disc pl-6 space-y-1">
                {block.items.map((item, i) => <li key={i}><Inline text={item} /></li>)}
              </ul>
            );
          case 'ol':
            return (
              <ol key={index} className="list-decimal pl-6 space-y-1">
                {block.items.map((item, i) => <li key={i}><Inline text={item} /></li>)}
              </ol>
            );
          case 'hr':
            return <hr key={index} className="border-slate-700 my-5" />;
          default:
            return <p key={index}><Inline text={block.items[0]} /></p>;
        }
      })}
    </div>
  );
}
