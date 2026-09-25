import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifySession } from '../utils/auth';
import { api, apiErrorMessage } from '../utils/api';
import { bulgarianCities } from '../utils/bulgarianCities';

const inputClass = 'w-full bg-[#0B0616] border border-white/10 p-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5211d4]';

const ELEMENT_COLORS = { fire: '#f87171', earth: '#a3e635', air: '#60a5fa', water: '#818cf8' };

export const BigThreeCard = ({ insight }) => {
  if (!insight) return null;
  const items = [insight.sun, insight.moon, insight.ascendant].filter(Boolean);
  const maxCount = Math.max(1, ...insight.elements.map((e) => e.count));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((it) => (
          <div key={it.title} className="bg-[#1f1c27] rounded-2xl border border-white/10 p-5">
            <p className="text-xs uppercase tracking-wider text-[#a69db9]">{it.title}</p>
            <p className="text-2xl font-bold text-white mb-2">{it.sign_bg}</p>
            <p className="text-sm text-slate-300 leading-relaxed">{it.text}</p>
          </div>
        ))}
      </div>
      <div className="bg-[#1f1c27] rounded-2xl border border-white/10 p-5">
        <p className="text-xs uppercase tracking-wider text-[#a69db9] mb-3">Баланс на елементите</p>
        <div className="space-y-2">
          {insight.elements.map((e) => (
            <div key={e.id} className="flex items-center gap-3 text-sm">
              <span className="w-16 text-slate-300">{e.name}</span>
              <div className="flex-1 h-2 rounded bg-white/5">
                <div className="h-2 rounded" style={{ width: `${(e.count / maxCount) * 100}%`, backgroundColor: ELEMENT_COLORS[e.id] }} />
              </div>
              <span className="w-4 text-right text-slate-400">{e.count}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-300 mt-4">
          <b className="text-white">Преобладава {insight.dominant_element.name.toLowerCase()}.</b> {insight.dominant_element.text}
        </p>
      </div>
      {insight.note && <p className="text-xs text-yellow-200/80">{insight.note}</p>}
    </div>
  );
};

const Welcome = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', birth_date: '', birth_time: '', unknown_time: false, city: 'София', lat: '42.6977', lon: '23.3219' });
  const [insight, setInsight] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const sessionUser = await verifySession(navigate);
      if (!isMounted || !sessionUser) return;
      setUser(sessionUser);
      setForm((f) => ({ ...f, name: sessionUser.full_name || '' }));
      api.post('/events', { name: 'onboarding_started' }).catch(() => {});
    })();
    return () => { isMounted = false; };
  }, [navigate]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const chooseCity = (name) => {
    const city = bulgarianCities.find((c) => c.name === name);
    setForm((f) => ({ ...f, city: name, lat: city ? String(city.lat) : f.lat, lon: city ? String(city.lon) : f.lon }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const r = await api.post('/onboarding', {
        name: form.name.trim(),
        birth_date: form.birth_date,
        birth_time: form.unknown_time ? '' : form.birth_time,
        unknown_time: form.unknown_time,
        birth_place: form.city === '__other' ? '' : form.city,
        lat: Number(form.lat),
        lon: Number(form.lon),
      });
      setInsight(r.data);
      const stored = { ...user, onboarding_completed: true };
      localStorage.setItem('user', JSON.stringify(stored));
      setStep(3);
    } catch (err) {
      setError(apiErrorMessage(err, 'Данните не бяха запазени. Проверете ги и опитайте отново.'));
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    try { await api.post('/onboarding/skip'); } catch { /* не е критично */ }
    navigate('/dashboard');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#161022] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#a78bfa]">nightlight_round</span>
            <span className="font-bold">AstroMind</span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <span key={n} className={`h-2 w-8 rounded-full ${step >= n ? 'bg-[#7c5dfa]' : 'bg-white/10'}`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="bg-[#1f1c27] rounded-3xl border border-white/10 p-8 md:p-10 space-y-6">
            <h1 className="text-3xl md:text-4xl font-bold">Добре дошли, {user.full_name?.split(' ')[0] || 'приятелю'}!</h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              AstroMind използва астрологията като инструмент за себепознание. За да започнем, ни трябват датата,
              часът и мястото на вашето раждане. След минута ще видите първото си лично прозрение — безплатно.
            </p>
            <ul className="space-y-2 text-slate-300">
              <li className="flex gap-2"><span className="material-symbols-outlined text-[#a78bfa]">lock</span> Данните ви се пазят в профила ви и можете да ги изтриете по всяко време.</li>
              <li className="flex gap-2"><span className="material-symbols-outlined text-[#a78bfa]">token</span> Получавате бонус монети за първия си подробен AI анализ.</li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setStep(2)} className="px-6 py-3 rounded-xl bg-[#5211d4] hover:bg-[#5211d4]/90 font-bold">Да започнем</button>
              <button onClick={skip} className="px-6 py-3 rounded-xl text-slate-400 hover:text-white">По-късно</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={submit} className="bg-[#1f1c27] rounded-3xl border border-white/10 p-8 md:p-10 space-y-5">
            <h2 className="text-2xl font-bold">Вашите данни за раждане</h2>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Име</label>
              <input className={inputClass} value={form.name} onChange={(e) => setField('name', e.target.value)} required maxLength={100} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Дата на раждане</label>
                <input type="date" className={inputClass} value={form.birth_date} onChange={(e) => setField('birth_date', e.target.value)} required max={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Час на раждане</label>
                <input type="time" className={inputClass} value={form.birth_time} onChange={(e) => setField('birth_time', e.target.value)} disabled={form.unknown_time} required={!form.unknown_time} />
                <label className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                  <input type="checkbox" checked={form.unknown_time} onChange={(e) => setField('unknown_time', e.target.checked)} className="accent-purple-600" />
                  Не знам точния час
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Място на раждане</label>
              <select className={inputClass} value={form.city} onChange={(e) => chooseCity(e.target.value)}>
                {bulgarianCities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                <option value="__other">Друго място (въведи координати)</option>
              </select>
              {form.city === '__other' && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <input className={inputClass} placeholder="Ширина, напр. 51.5074" value={form.lat} onChange={(e) => setField('lat', e.target.value)} required />
                  <input className={inputClass} placeholder="Дължина, напр. -0.1278" value={form.lon} onChange={(e) => setField('lon', e.target.value)} required />
                </div>
              )}
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <button disabled={saving} className="px-6 py-3 rounded-xl bg-[#5211d4] hover:bg-[#5211d4]/90 font-bold disabled:opacity-50">
                {saving ? 'Изчисляване…' : 'Покажи моето прозрение'}
              </button>
              <button type="button" onClick={() => setStep(1)} className="px-6 py-3 rounded-xl text-slate-400 hover:text-white">Назад</button>
            </div>
          </form>
        )}

        {step === 3 && insight && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Вашата „Голяма тройка“</h2>
              <p className="text-slate-400">Трите най-важни точки във вашата карта: същност, емоции и първо впечатление.</p>
            </div>
            <BigThreeCard insight={insight} />
            <div className="bg-gradient-to-r from-[#5211d4]/30 to-[#7c5dfa]/10 rounded-2xl border border-[#7c5dfa]/30 p-6 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[220px]">
                <p className="font-bold text-lg">Искате ли да видите цялата картина?</p>
                <p className="text-sm text-slate-300">Подробният AI анализ свързва всички планети, домове и аспекти в личен разказ.</p>
              </div>
              <button onClick={() => navigate(`/generate-report?profile=${encodeURIComponent(insight.profile.name)}`)} className="px-6 py-3 rounded-xl bg-[#5211d4] hover:bg-[#5211d4]/90 font-bold">
                Пълен анализ
              </button>
              <button onClick={() => navigate('/dashboard')} className="px-4 py-3 rounded-xl text-slate-300 hover:text-white">Към таблото</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Welcome;
