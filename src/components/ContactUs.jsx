import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrl } from '../utils/auth';

const inputClass = 'w-full bg-[#0B0616] border border-white/10 p-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5211d4]';
const HIDDEN_ON = ['/admin', '/admin-login', '/unsubscribe'];

// „Контакт с нас“: връзка долу вдясно на всяка страница и форма с име, имейл и текст; писмото отива при собственика
export default function ContactUs() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '', website: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    if (!open) return;
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (user) setForm((f) => ({ ...f, name: f.name || user.full_name || '', email: f.email || user.email || '' }));
    } catch { /* няма запазен потребител */ }
  }, [open]);

  if (HIDDEN_ON.includes(pathname)) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const close = () => { setOpen(false); setError(''); setDone(''); };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await axios.post(`${getApiBaseUrl()}/contact`, form, { timeout: 90000 });
      setDone(r.data?.message || 'Благодарим! Съобщението е изпратено.');
      setForm((f) => ({ ...f, message: '' }));
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Съобщението не беше изпратено. Проверете данните и опитайте отново.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-[#1f1c27]/95 border border-white/15 text-sm text-slate-200 hover:text-white hover:border-[#7c5dfa] shadow-lg backdrop-blur">
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>mail</span> Контакт с нас
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" role="dialog" aria-modal="true" aria-label="Контакт с нас" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <form onSubmit={submit} className="w-full max-w-lg bg-[#1f1c27] rounded-2xl border border-white/10 p-6 space-y-4 max-h-[90vh] overflow-y-auto text-white">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Контакт с нас</h2>
              <button type="button" onClick={close} aria-label="Затвори" className="text-slate-400 hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            {done ? (
              <div className="space-y-4">
                <p className="text-green-400">{done}</p>
                <button type="button" onClick={close} className="px-5 py-2 rounded-lg bg-[#5211d4] hover:bg-[#5211d4]/90 font-bold">Затвори</button>
              </div>
            ) : (
              <>
                <input className={inputClass} placeholder="Име" value={form.name} onChange={(e) => set('name', e.target.value)} required maxLength={100} autoComplete="name" />
                <input className={inputClass} type="email" placeholder="Вашият имейл (за отговор)" value={form.email} onChange={(e) => set('email', e.target.value)} required maxLength={254} autoComplete="email" />
                <textarea className={`${inputClass} min-h-[140px]`} placeholder="Вашето съобщение" value={form.message} onChange={(e) => set('message', e.target.value)} required minLength={10} maxLength={3000} />
                <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" name="website" value={form.website} onChange={(e) => set('website', e.target.value)} />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <div className="flex gap-3">
                  <button disabled={busy} className="px-5 py-2 rounded-lg bg-[#5211d4] hover:bg-[#5211d4]/90 font-bold disabled:opacity-50">{busy ? 'Изпращане…' : 'Изпрати'}</button>
                  <button type="button" onClick={close} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white">Отказ</button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </>
  );
}
