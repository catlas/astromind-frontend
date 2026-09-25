import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifySession } from '../utils/auth';
import { api, apiErrorMessage, formatDate } from '../utils/api';

const formatEur = (cents) => (cents / 100).toFixed(2).replace('.', ',');

const REASON_LABELS = {
  signup_bonus: 'Бонус при регистрация',
  opening_balance: 'Начален баланс',
  purchase: 'Покупка',
  analysis: 'Анализ',
  refund: 'Възстановена сума',
  admin: 'Корекция',
};

const BuyCoins = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [user, setUser] = useState(null);
  const [config, setConfig] = useState(null);
  const [history, setHistory] = useState(null);
  const [consent, setConsent] = useState(false);
  const [buying, setBuying] = useState(null);
  const [message, setMessage] = useState(null);
  const status = params.get('status');

  const refresh = async () => {
    try {
      const [me, tx] = await Promise.all([api.get('/me'), api.get('/billing/transactions')]);
      setUser(me.data);
      localStorage.setItem('user', JSON.stringify(me.data));
      setHistory(tx.data);
    } catch (err) {
      console.error('Грешка при зареждане на баланса:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const sessionUser = await verifySession(navigate);
      if (!isMounted || !sessionUser) return;
      setUser(sessionUser);
      try {
        const cfg = await api.get('/billing/config');
        if (isMounted) setConfig(cfg.data);
      } catch {
        if (isMounted) setConfig({ payments_enabled: false, packages: [], costs: {} });
      }
      refresh();
    };
    load();
    return () => { isMounted = false; };
  }, [navigate]);

  // След плащане webhook-ът добавя монетите за секунди; проверяваме няколко пъти
  useEffect(() => {
    if (status !== 'success') return undefined;
    setMessage({ ok: true, text: 'Плащането е успешно. Монетите ще се появят в баланса до минута.' });
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      refresh();
      if (tries >= 6) clearInterval(timer);
    }, 5000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status === 'cancel') setMessage({ ok: false, text: 'Плащането е отказано. Не е изтеглена сума.' });
  }, [status]);

  const buy = async (pkg) => {
    if (!consent) {
      setMessage({ ok: false, text: 'Моля, отбележете съгласието за дигитално съдържание преди покупка.' });
      return;
    }
    setBuying(pkg.id);
    setMessage(null);
    try {
      const response = await api.post('/billing/checkout', { package_id: pkg.id, accept_immediate_delivery: true });
      window.location.href = response.data.url;
    } catch (err) {
      setMessage({ ok: false, text: apiErrorMessage(err, 'Плащането не може да започне. Опитайте отново.') });
      setBuying(null);
    }
  };

  if (!user) return null;
  const packages = config?.packages || [];
  const costs = config?.costs || {};
  const paymentsOn = !!config?.payments_enabled;

  return (
    <div className="min-h-screen bg-[#161022] text-white font-display">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10 max-w-7xl mx-auto">
        <div onClick={() => navigate('/dashboard')} className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-purple-400 bg-clip-text text-transparent cursor-pointer">
          AstroMind
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400">Баланс: <span className="text-purple-400 font-bold">{user.coins ?? 0} монети</span></span>
          <button onClick={() => navigate('/dashboard')} className="text-sm bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-colors">
            Обратно към Таблото
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Увеличи своите космически възможности</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Монетите се използват за AI анализи. Анализ струва {costs.analysis ?? 8} монети
            {costs.partner_extra ? ` (+${costs.partner_extra} със синастрия)` : ''}, а прогнозата — {costs.forecast_month ?? 5} монети на месец.
          </p>
        </div>

        {message && (
          <div className={`max-w-3xl mx-auto mb-8 px-4 py-3 rounded-xl text-sm ${message.ok ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
            {message.text}
          </div>
        )}

        {!paymentsOn && config && (
          <div className="max-w-3xl mx-auto mb-8 px-4 py-3 rounded-xl text-sm bg-yellow-500/10 border border-yellow-500/20 text-yellow-200">
            Онлайн плащанията се активират скоро. Дотогава анализите са безплатни.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {packages.map((tier) => (
            <div key={tier.id} className={`relative bg-[#1f1c27] p-8 rounded-3xl border ${tier.recommended ? 'border-purple-500 shadow-2xl shadow-purple-500/20 md:scale-105' : 'border-white/10'} flex flex-col`}>
              {tier.recommended && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                  Препоръчано
                </span>
              )}
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-purple-400 text-3xl">{tier.icon || 'star'}</span>
                <h3 className="text-xl font-bold">{tier.name || `${tier.coins} монети`}</h3>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">{formatEur(tier.amount_cents)} €</span>
                <p className="text-slate-400 text-sm mt-2">{tier.description}</p>
                <p className="text-slate-500 text-xs mt-1">Цената е с включен ДДС, когато е приложимо.</p>
              </div>
              <div className="text-3xl font-bold text-purple-400 mb-8">
                {tier.coins} <span className="text-sm text-slate-400 font-normal">Монети</span>
              </div>
              <button
                onClick={() => buy(tier)}
                disabled={!paymentsOn || buying !== null}
                className={`mt-auto w-full py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${tier.recommended ? 'bg-purple-600 hover:bg-purple-700' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}
              >
                {buying === tier.id ? 'Пренасочване…' : paymentsOn ? 'Купи сега' : 'Скоро'}
              </button>
            </div>
          ))}
        </div>

        {paymentsOn && (
          <label className="max-w-3xl mx-auto mt-10 flex items-start gap-3 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 accent-purple-600" />
            <span>
              Съгласен съм доставката на дигиталното съдържание (монетите) да започне веднага след плащането и разбирам,
              че с това губя правото си на отказ от договора в 14-дневен срок. Прочетох{' '}
              <a href="#/legal/terms" className="text-purple-400 underline">Общите условия</a> и{' '}
              <a href="#/legal/refunds" className="text-purple-400 underline">Политиката за връщане</a>.
            </span>
          </label>
        )}

        {history && (history.transactions.length > 0 || history.purchases.length > 0) && (
          <section className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Движение на монетите</h2>
            <div className="bg-[#1f1c27] rounded-2xl border border-white/10 divide-y divide-white/5">
              {history.transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <p className="text-white">{REASON_LABELS[t.reason] || t.reason}</p>
                    <p className="text-slate-500 text-xs">{t.description || ''} · {formatDate(t.created_at)}</p>
                  </div>
                  <span className={t.delta >= 0 ? 'text-green-400 font-bold' : 'text-slate-300 font-bold'}>
                    {t.delta >= 0 ? '+' : ''}{t.delta}
                  </span>
                </div>
              ))}
            </div>
            {history.purchases.some((p) => p.receipt_url) && (
              <div className="mt-6">
                <h3 className="font-bold mb-3">Разписки</h3>
                <ul className="space-y-2 text-sm">
                  {history.purchases.filter((p) => p.receipt_url).map((p) => (
                    <li key={p.id}>
                      <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="text-purple-400 underline">
                        {p.coins} монети · {formatEur(p.amount_cents)} € · {formatDate(p.paid_at)}
                      </a>
                      {p.status === 'refunded' && <span className="ml-2 text-slate-500">(възстановена)</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <section className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Често задавани въпроси</h2>
          <div className="space-y-4">
            <div className="bg-[#1f1c27] p-6 rounded-2xl border border-white/10">
              <h4 className="font-bold mb-2">Кога се изразходват монети?</h4>
              <p className="text-slate-400 text-sm">Само при успешно генериран анализ. Ако анализът не успее, монетите остават в баланса ви.</p>
            </div>
            <div className="bg-[#1f1c27] p-6 rounded-2xl border border-white/10">
              <h4 className="font-bold mb-2">Имат ли срок на годност?</h4>
              <p className="text-slate-400 text-sm">Не, монетите остават в портфейла ви, докато не решите да ги използвате.</p>
            </div>
            <div className="bg-[#1f1c27] p-6 rounded-2xl border border-white/10">
              <h4 className="font-bold mb-2">Как се плаща?</h4>
              <p className="text-slate-400 text-sm">С карта през Stripe. Данните на картата не минават през AstroMind. Разписката идва на имейла ви.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default BuyCoins;
