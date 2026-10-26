import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BirthDataForm, { birthPayload, emptyBirthForm, inputClass } from '../components/BirthDataForm';
import { BigThreeCard } from './Welcome';
import { getApiBaseUrl } from '../utils/auth';

const errorText = (err, fallback) => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return 'Проверете данните: полетата трябва да са попълнени правилно.';
  if (err?.code === 'ECONNABORTED') return 'Времето за изчакване изтече. Опитайте отново.';
  return fallback;
};

// Нов ред: 1) данни за раждане и съгласие с условията, 2) безплатният преглед и едва тогава имейл и парола, 3) потвърждение на имейла
const Start = () => {
  const navigate = useNavigate();
  const api = axios.create({ baseURL: getApiBaseUrl(), timeout: 90000 });
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyBirthForm);
  const [accepted, setAccepted] = useState(false);
  const [insight, setInsight] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resendMsg, setResendMsg] = useState('');

  const preview = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.gender) { setError('Изберете пол.'); return; }
    if (!accepted) { setError('Моля, приемете Общите условия и Политиката за поверителност.'); return; }
    setBusy(true);
    try {
      const r = await api.post('/public/preview', birthPayload(form));
      setInsight(r.data);
      setStep(2);
      window.scrollTo?.(0, 0);
    } catch (err) {
      setError(errorText(err, 'Не успяхме да изчислим прегледа. Проверете данните и опитайте отново.'));
    } finally {
      setBusy(false);
    }
  };

  const register = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/register', { email, password, full_name: form.name.trim(), accept_terms: accepted, profile: birthPayload(form) });
      setStep(3);
    } catch (err) {
      setError(errorText(err, 'Регистрацията не успя. Опитайте отново.'));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setResendMsg('');
    try {
      const r = await api.post('/resend-verification-public', { email });
      setResendMsg(r.data?.message || 'Изпратихме ново писмо.');
    } catch (err) {
      setResendMsg(errorText(err, 'Не успяхме да изпратим писмо. Опитайте след малко.'));
    }
  };

  return (
    <div className="min-h-screen bg-[#161022] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#a78bfa]">nightlight_round</span>
            <span className="font-bold">AstroMind</span>
          </button>
          <div className="flex gap-2" aria-label={`Стъпка ${step} от 3`}>
            {[1, 2, 3].map((n) => <span key={n} className={`h-2 w-8 rounded-full ${step >= n ? 'bg-[#7c5dfa]' : 'bg-white/10'}`} />)}
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={preview} className="bg-[#1f1c27] rounded-3xl border border-white/10 p-8 md:p-10 space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Безплатен анализ</h1>
              <p className="text-slate-300">Въведете данните за раждане и след минута ще видите първото си лично прозрение. Без регистрация и без карта.</p>
            </div>
            <BirthDataForm form={form} setForm={setForm} />
            <label className="flex items-start gap-3 text-sm text-slate-300">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="accent-purple-600 mt-1" />
              <span>
                Приемам <a href="#/legal/terms" target="_blank" rel="noreferrer" className="text-[#a78bfa] underline">Общите условия</a> и{' '}
                <a href="#/legal/privacy" target="_blank" rel="noreferrer" className="text-[#a78bfa] underline">Политиката за поверителност</a>.
              </span>
            </label>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <button disabled={busy} className="px-6 py-3 rounded-xl bg-[#5211d4] hover:bg-[#5211d4]/90 font-bold disabled:opacity-50">
                {busy ? 'Изчисляване…' : 'Покажи моето прозрение'}
              </button>
              <button type="button" onClick={() => navigate('/')} className="px-6 py-3 rounded-xl text-slate-400 hover:text-white">Назад</button>
            </div>
          </form>
        )}

        {step === 2 && insight && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Вашата „Голяма тройка“</h1>
              <p className="text-slate-400">Трите най-важни точки във вашата карта: същност, емоции и първо впечатление.</p>
            </div>
            <BigThreeCard insight={insight} />
            <form onSubmit={register} className="bg-gradient-to-r from-[#5211d4]/30 to-[#7c5dfa]/10 rounded-2xl border border-[#7c5dfa]/30 p-6 space-y-4">
              <div>
                <p className="font-bold text-lg">Запазете резултата и продължете към пълния анализ</p>
                <p className="text-sm text-slate-300">Въведете имейл и парола. Ще изпратим писмо за потвърждение; след него влизате направо в таблото, а данните ви вече са там.</p>
              </div>
              <input type="email" required className={inputClass} placeholder="Имейл" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input type="password" required minLength={10} className={inputClass} placeholder="Парола (поне 10 символа)" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex flex-wrap gap-3">
                <button disabled={busy} className="px-6 py-3 rounded-xl bg-[#5211d4] hover:bg-[#5211d4]/90 font-bold disabled:opacity-50">
                  {busy ? 'Създаване…' : 'Запази и изпрати потвърждение'}
                </button>
                <button type="button" onClick={() => { setStep(1); setError(''); }} className="px-4 py-3 rounded-xl text-slate-300 hover:text-white">Промени данните</button>
              </div>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="bg-[#1f1c27] rounded-3xl border border-white/10 p-8 md:p-10 space-y-5 text-center">
            <span className="material-symbols-outlined text-[#a78bfa]" style={{ fontSize: '48px' }}>mark_email_unread</span>
            <h1 className="text-3xl font-bold">Потвърдете имейла си</h1>
            <p className="text-slate-300">Изпратихме писмо на <b className="text-white">{email}</b>. Натиснете линка в него и ще влезете направо в таблото. Ако не го виждате, проверете в „Спам“.</p>
            <div className="flex flex-col items-center gap-3">
              <button onClick={resend} className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 font-medium">Изпрати писмото отново</button>
              {resendMsg && <p className="text-sm text-slate-300">{resendMsg}</p>}
              <button onClick={() => navigate('/')} className="text-sm text-slate-400 hover:text-white">Към началната страница</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Start;
