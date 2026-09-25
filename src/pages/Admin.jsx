import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifySession } from '../utils/auth';
import { api, apiErrorMessage } from '../utils/api';

const EVENT_LABELS = {
  register: 'Регистрации',
  login: 'Входове',
  email_verified: 'Потвърдени имейли',
  analysis_completed: 'Завършени анализи',
  checkout_started: 'Започнати плащания',
  purchase_completed: 'Успешни плащания',
  pricing_viewed: 'Прегледи на цените',
  report_form_opened: 'Отваряния на формата за анализ',
  report_downloaded: 'Изтеглени отчети',
  onboarding_started: 'Започнат onboarding',
  onboarding_completed: 'Завършен onboarding',
  crisis_detected: 'Разпознати кризисни въпроси',
  ai_output_flagged: 'AI отговори с флаг',
};

const Admin = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const user = await verifySession(navigate);
      if (!user || !isMounted) return;
      try {
        const r = await api.get('/admin/metrics', { params: { days } });
        if (isMounted) { setData(r.data); setError(''); }
      } catch (err) {
        if (isMounted) setError(apiErrorMessage(err, 'Статистиката не може да се зареди.'));
      }
    })();
    return () => { isMounted = false; };
  }, [navigate, days]);

  return (
    <div className="min-h-screen bg-[#161022] text-white p-6 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Статистика</h1>
          <div className="flex items-center gap-3">
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}
              className="bg-[#201428] border border-[#302240] rounded-lg px-3 py-2 text-sm">
              {[7, 30, 90, 365].map((d) => <option key={d} value={d}>Последните {d} дни</option>)}
            </select>
            <button onClick={() => navigate('/dashboard')} className="text-sm bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full">Табло</button>
          </div>
        </div>

        {error && <p className="text-red-400">{error}</p>}

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-[#201428] rounded-xl p-4 border border-[#302240]">
                <p className="text-xs text-[#d4c8ed]">Приходи (нето)</p>
                <p className="text-2xl font-bold">{data.revenue_eur.toFixed(2).replace('.', ',')} €</p>
              </div>
              <div className="bg-[#201428] rounded-xl p-4 border border-[#302240]">
                <p className="text-xs text-[#d4c8ed]">Всички потребители</p>
                <p className="text-2xl font-bold">{data.totals.users}</p>
              </div>
              <div className="bg-[#201428] rounded-xl p-4 border border-[#302240]">
                <p className="text-xs text-[#d4c8ed]">Всички отчети</p>
                <p className="text-2xl font-bold">{data.totals.reports}</p>
              </div>
            </div>

            <section>
              <h2 className="text-xl font-bold mb-3">Фуния (нови потребители за периода)</h2>
              <div className="space-y-2">
                {data.funnel.map((step) => (
                  <div key={step.step} className="bg-[#201428] rounded-xl border border-[#302240] p-3">
                    <div className="flex justify-between text-sm mb-2">
                      <span>{step.step}</span>
                      <span className="text-[#d4c8ed]">{step.users} · {step.rate}%</span>
                    </div>
                    <div className="h-2 rounded bg-white/5">
                      <div className="h-2 rounded bg-[#7c5dfa]" style={{ width: `${Math.min(100, step.rate)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Събития</h2>
              <div className="bg-[#201428] rounded-xl border border-[#302240] divide-y divide-[#302240]">
                {Object.entries(data.events).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                  <div key={name} className="flex justify-between px-4 py-2 text-sm">
                    <span>{EVENT_LABELS[name] || name}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
                {Object.keys(data.events).length === 0 && <p className="px-4 py-3 text-sm text-[#d4c8ed]">Още няма събития.</p>}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
