import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifySession } from '../utils/auth';
import { api, apiErrorMessage } from '../utils/api';
import BirthDataForm, { birthPayload, emptyBirthForm } from '../components/BirthDataForm';
import { formatEur, giftOf } from '../utils/money';

const ELEMENT_COLORS = { fire: '#f87171', earth: '#a3e635', air: '#60a5fa', water: '#818cf8' };

const ELEMENT_INFO = {
  fire: { icon: 'local_fire_department', signs: 'Овен, Лъв, Стрелец', gist: 'енергия, инициатива, вдъхновение' },
  earth: { icon: 'landscape', signs: 'Телец, Дева, Козирог', gist: 'практичност, стабилност, резултати' },
  air: { icon: 'air', signs: 'Близнаци, Везни, Водолей', gist: 'мисъл, общуване, идеи' },
  water: { icon: 'water_drop', signs: 'Рак, Скорпион, Риби', gist: 'чувства, интуиция, близост' },
};

const levelOf = (count) => (count >= 3 ? 'силен' : count >= 1 ? 'умерен' : 'липсва');

export const ElementBalance = ({ insight }) => {
  const elements = insight.elements || [];
  const total = Math.max(1, elements.reduce((sum, e) => sum + e.count, 0));
  const missing = elements.filter((e) => e.count === 0).map((e) => e.name.toLowerCase());
  return (
    <div className="bg-[#1f1c27] rounded-2xl border border-white/10 p-5">
      <p className="text-xs uppercase tracking-wider text-[#a69db9] mb-1">Баланс на елементите</p>
      <p className="text-sm text-slate-400 mb-4">Колко от основните небесни тела попадат в знаци от всеки от четирите елемента.</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {elements.map((e) => {
          const info = ELEMENT_INFO[e.id] || {};
          const percent = Math.round((e.count / total) * 100);
          return (
            <div key={e.id} className="rounded-xl bg-[#161022] border border-white/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="material-symbols-outlined" style={{ color: ELEMENT_COLORS[e.id], fontSize: '26px' }}>{info.icon}</span>
                <span className="text-xs text-slate-400">{levelOf(e.count)}</span>
              </div>
              <p className="font-bold text-white">{e.name}</p>
              <p className="text-2xl font-extrabold text-white leading-tight">{e.count}<span className="text-sm font-normal text-slate-400"> от {total} · {percent}%</span></p>
              <div className="h-2 rounded bg-white/5 my-2">
                <div className="h-2 rounded" style={{ width: `${percent}%`, backgroundColor: ELEMENT_COLORS[e.id] }} />
              </div>
              <p className="text-xs text-slate-400">{info.gist}</p>
              <p className="text-[11px] text-slate-500 mt-1">{info.signs}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-sm text-slate-300 space-y-2">
        <p>
          {insight.balanced ? (
            <b className="text-white">{insight.balance_text}</b>
          ) : (
            <><b className="text-white">Преобладава {insight.dominant_element.name.toLowerCase()}.</b> {insight.dominant_element.text}</>
          )}
        </p>
        {missing.length > 0 && (
          <p>Липсва {missing.join(' и ')}: това не е недостатък, а зона, която ще развиваш по-съзнателно, и често я търсиш чрез хората около себе си.</p>
        )}
        <p className="text-xs text-slate-500">
          Какво показва графиката: {insight.method || 'броят е по знаците на седемте основни тела.'} Колкото повече тела в един елемент, толкова повече този начин на
          действие и преживяване оцветява характера ти. Това е тенденция, а не присъда: цялата карта (аспекти, домове) я допълва и променя.
        </p>
      </div>
    </div>
  );
};

export const BigThreeCard = ({ insight }) => {
  if (!insight) return null;
  const items = [insight.sun, insight.moon, insight.ascendant].filter(Boolean);
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
      <ElementBalance insight={insight} />
      {insight.note && <p className="text-xs text-yellow-200/80">{insight.note}</p>}
    </div>
  );
};

const Welcome = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyBirthForm);
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

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (!form.gender) {
        setError('Изберете пол.');
        setSaving(false);
        return;
      }
      const r = await api.post('/onboarding', birthPayload(form));
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
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-[#a78bfa]">card_giftcard</span>
                {giftOf(user) > 0
                  ? `В баланса ви има ${formatEur(giftOf(user))} подарък за основните анализи.`
                  : 'Основните анализи се плащат от баланса ви.'}
              </li>
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
            <BirthDataForm form={form} setForm={setForm} />
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
