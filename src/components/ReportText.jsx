import React, { useId, useMemo } from 'react';
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
  const uid = useId().replace(/:/g, '');               // уникален за всеки показан отчет: заглавията не се дублират между месеци и отчети
  const blocks = useMemo(() => parseReport(text), [text]);
  const headings = useMemo(() => (toc ? outline(blocks, `r${uid}`) : []), [blocks, toc, uid]);

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
        const id = `r${uid}-${index}`;
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
          case 'table': {
            const [head, ...body] = block.header ? block.rows : [null, ...block.rows];
            const width = Math.max(...block.rows.map((row) => row.length));
            const cell = (row, c) => (c < row.length ? row[c] : '');
            return (
              <div key={index} className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                  {head && (
                    <thead>
                      <tr>{Array.from({ length: width }, (_, c) => (
                        <th key={c} scope="col" className="border border-slate-700 bg-slate-800/60 px-3 py-2 text-left font-semibold text-white"><Inline text={cell(head, c)} /></th>
                      ))}</tr>
                    </thead>
                  )}
                  <tbody>
                    {body.map((row, r) => (
                      <tr key={r}>{Array.from({ length: width }, (_, c) => (
                        <td key={c} className="border border-slate-700 px-3 py-2 align-top"><Inline text={cell(row, c)} /></td>
                      ))}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          default:
            return <p key={index}><Inline text={block.items[0]} /></p>;
        }
      })}
    </div>
  );
}
