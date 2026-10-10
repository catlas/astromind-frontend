import React, { useState } from 'react';
import { Check, Copy, FileText, Loader2 } from 'lucide-react';
import { api, apiErrorMessage } from '../utils/api';

// Износ на ЗАПАЗЕН отчет (Фаза 13): DOCX и Markdown идват от сървъра за този отчет, без AI и без такса. Показва се само
// за запазен отчет (reportId), затова незавършен анализ не се изнася.
const blobError = async (err, fallback) => {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try { return apiErrorMessage({ response: { data: JSON.parse(await data.text()) } }, fallback); } catch { return fallback; }
  }
  return apiErrorMessage(err, fallback);
};

const nameFrom = (response, fallback) => {
  const match = /filename="([^"]+)"/.exec(response.headers?.['content-disposition'] || '');
  return match ? match[1] : fallback;
};

export default function ReportExport({ reportId, className = '' }) {
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null);

  if (!reportId) return null;

  const fetchExport = (format) => api.get(`/reports/${reportId}/export`, { params: { format }, responseType: 'blob', timeout: 60000 });

  const download = async (format) => {
    setBusy(format);
    setMessage(null);
    try {
      const response = await fetchExport(format);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = nameFrom(response, `AstroMind-${reportId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      api.post('/events', { name: 'report_downloaded' }).catch(() => {});
    } catch (err) {
      setMessage({ ok: false, text: await blobError(err, 'Файлът не можа да се създаде. Опитайте отново.') });
    } finally {
      setBusy('');
    }
  };

  const copy = async () => {
    setBusy('copy');
    setMessage(null);
    try {
      const response = await fetchExport('md');
      await navigator.clipboard.writeText(await response.data.text());
      setMessage({ ok: true, text: 'Копирано като Markdown.' });
    } catch (err) {
      setMessage({ ok: false, text: await blobError(err, 'Копирането не успя. Изтеглете Markdown файла.') });
    } finally {
      setBusy('');
    }
  };

  const button = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={Boolean(busy)} onClick={() => download('docx')} className={`${button} bg-purple-600 hover:bg-purple-700 text-white`}>
          {busy === 'docx' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Изтегли DOCX
        </button>
        <button type="button" disabled={Boolean(busy)} onClick={() => download('md')} className={`${button} bg-slate-700 hover:bg-slate-600 text-white`}>
          {busy === 'md' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Изтегли Markdown
        </button>
        <button type="button" disabled={Boolean(busy)} onClick={copy} className={`${button} bg-slate-800 hover:bg-slate-700 text-slate-200`}>
          {busy === 'copy' ? <Loader2 className="w-4 h-4 animate-spin" /> : message?.ok ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Копирай
        </button>
      </div>
      {message && <p role="status" className={`mt-2 text-xs ${message.ok ? 'text-green-400' : 'text-red-300'}`}>{message.text}</p>}
    </div>
  );
}
