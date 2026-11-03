import React, { useMemo, useState } from 'react';
import ReportText from './ReportText';
import { savedReportView, shortReport } from '../utils/reportView';

// Показва отчета в изгледа от настройките на профила (кратък по подразбиране) и бутон за смяна само за този отчет.
export default function ReportViewer({ text, toc = false, className = '' }) {
  const setting = savedReportView();
  const [override, setOverride] = useState(null);
  const view = useMemo(() => shortReport(text), [text]);
  const mode = override || setting;
  if (!view.shortened) return <ReportText text={text} toc={toc} className={className} />;
  const showFull = mode === 'full';
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-xs text-slate-300">
        <span>{showFull ? 'Пълен изглед: с картите за позиции и аспекти.' : 'Кратък изглед: обобщението. Пълният текст е в DOCX.'}</span>
        <button type="button" onClick={() => setOverride(showFull ? 'short' : 'full')} className="px-3 py-1 rounded-md bg-purple-600/80 hover:bg-purple-600 text-white font-medium">
          {showFull ? 'Покажи кратък вариант' : 'Покажи пълния анализ'}
        </button>
      </div>
      <ReportText text={showFull ? text : view.text} toc={toc} className={className} />
    </div>
  );
}
