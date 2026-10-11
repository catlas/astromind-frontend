import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifySession } from '../utils/auth';
import { api, apiErrorMessage, formatDate } from '../utils/api';
import { FALLBACK_PRICES, balanceOf, formatEur, formatSignedEur, giftOf, paidOf } from '../utils/money';

const REASON_LABELS = {
  signup_gift: 'Подарък при регистрация',
  signup_bonus: 'Подарък при регистрация',
  legacy_gift_topup: 'Подарък за съществуващите акаунти',
  job_refund: 'Върната сума',
  opening_balance: 'Начален баланс',
  purchase: 'Зареждане на баланс',
  analysis: 'Анализ',
  refund: 'Възстановена сума',
  admin: 'Корекция',
};

// Откъде е сумата в едно движение: подарък или внесени средства
const sourceNote = (t) => {
  const delta = Number(t.delta) || 0;
  const gift = Number(t.delta_gift) || 0;
  const paid = delta - gift;
  if (delta === 0) return '';
  if (paid === 0) return delta < 0 ? 'от подаръка' : 'подарък';
  if (gift === 0) return delta < 0 ? 'от внесените средства' : 'внесени средства';
  return delta < 0
    ? `${formatEur(Math.abs(gift))} от подаръка и ${formatEur(Math.abs(paid))} от внесените средства`
    : `${formatEur(Math.abs(gift))} подарък и ${formatEur(Math.abs(paid))} внесени средства`;
};

const Balance = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [user, setUser] = useState(null);
  const [config, setConfig] = useState(null);
  const [configFailed, setConfigFailed] = useState(false);
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
        if (isMounted) setConfigFailed(true);
      }
      refresh();
      api.post('/events', { name: 'pricing_viewed' }).catch(() => {});
    };
    load();
    return () => { isMounted = false; };
  }, [navigate]);

  // След плащане webhook-ът добавя сумата за секунди; проверяваме няколко пъти
  useEffect(() => {
    if (status !== 'success') return undefined;
    setMessage({ ok: true, text: 'Плащането е успешно. Балансът ще се обнови до минута.' });
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
      setMessage({ ok: false, text: 'Моля, отбележете съгласието за дигитално съдържание преди зареждането.' });
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
  const topups = config?.topups || [];
  const prices = { ...FALLBACK_PRICES, ...(config?.prices || {}) };
  const limits = config?.limits || {};
  const paymentsOn = !!config?.payments_enabled;
  const enforced = !!config?.balance_enforced;
  const signupGift = Number(config?.signup_gift_cents) || 0;
  const paid = paidOf(user);
  const gift = giftOf(user);
  const limitsNote = limits.forecast_max_months_single && limits.forecast_max_months_pair
    ? ` (до ${limits.forecast_max_months_single} месеца за един човек и до ${limits.forecast_max_months_pair} за двама)`
    : '';

  return (
    <div className="min-h-screen bg-[#161022] text-white font-display">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10 max-w-7xl mx-auto">
        <div onClick={() => navigate('/dashboard')} className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-purple-400 bg-clip-text text-transparent cursor-pointer">
          AstroMind
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400">Баланс: <span className="text-purple-400 font-bold">{formatEur(balanceOf(user))}</span></span>
          <button onClick={() => navigate('/dashboard')} className="text-sm bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-colors">
            Обратно към Таблото
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Баланс и цени</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Плащате само за анализите, които правите — без абонамент. Всички цени са в евро.
          </p>
        </div>

        {message && (
          <div className={`max-w-3xl mx-auto mb-8 px-4 py-3 rounded-xl text-sm ${message.ok ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
            {message.text}
          </div>
        )}

        {configFailed && (
          <div className="max-w-3xl mx-auto mb-8 px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/20 text-red-300">
            Не успяхме да заредим цените и пакетите. Опреснете страницата след малко.
          </div>
        )}

        {config && paymentsOn && config.payments_mode === 'test' && (
          <div className="max-w-3xl mx-auto mb-8 px-4 py-3 rounded-xl text-sm bg-blue-500/10 border border-blue-500/30 text-blue-100" role="status">
            <b>Тестов режим на плащанията.</b> Не се взема истинска сума. На страницата за плащане ползвайте тестовата карта 4242 4242 4242 4242 с произволна бъдеща дата и произволен CVC.
          </div>
        )}

        {config && !enforced && (
          <div className="max-w-3xl mx-auto mb-8 px-4 py-3 rounded-xl text-sm bg-yellow-500/10 border border-yellow-500/20 text-yellow-200">
            Засега анализите са безплатни — от баланса не се взема нищо. Цените по-долу ще важат, когато стартира таксуването.
          </div>
        )}

        {config && enforced && !paymentsOn && (
          <div className="max-w-3xl mx-auto mb-8 px-4 py-3 rounded-xl text-sm bg-yellow-500/10 border border-yellow-500/20 text-yellow-200">
            Зареждането на баланс още не е достъпно. Дотогава подаръкът може да се използва за основните анализи.
          </div>
        )}

        {config && enforced && paymentsOn && paid === 0 && (
          <div className="max-w-3xl mx-auto mb-8 px-4 py-3 rounded-xl text-sm bg-purple-500/10 border border-purple-500/30 text-purple-100">
            Анализът за двама и прогнозите за период са премиум услуги: плащат се само от внесени средства и се отключват след първото зареждане. Подаръкът важи за основните анализи.
          </div>
        )}

        <section className="max-w-3xl mx-auto mb-14 bg-[#1f1c27] rounded-3xl border border-white/10 p-8">
          <p className="text-sm font-medium uppercase tracking-wider text-slate-400 mb-2">Наличен баланс</p>
          <p className="text-5xl font-extrabold tracking-tight mb-6">{formatEur(balanceOf(user))}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[#161022] border border-white/5 p-4">
              <p className="text-sm text-slate-400">Внесени средства</p>
              <p className="text-2xl font-bold text-purple-300">{formatEur(paid)}</p>
              <p className="text-xs text-slate-500 mt-1">За всички услуги, включително премиум.</p>
            </div>
            <div className="rounded-2xl bg-[#161022] border border-white/5 p-4">
              <p className="text-sm text-slate-400">Подарък</p>
              <p className="text-2xl font-bold text-yellow-300">{formatEur(gift)}</p>
              <p className="text-xs text-slate-500 mt-1">Само за основните анализи; ползва се първи.</p>
            </div>
          </div>
        </section>

        {config && (
          <section className="max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl font-bold mb-6">Цени</h2>
            <div className="bg-[#1f1c27] rounded-2xl border border-white/10 divide-y divide-white/5">
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-semibold">Основен анализ</p>
                  <p className="text-slate-400 text-sm">Натална карта или анализ за дата — за един човек</p>
                  <p className="text-xs text-slate-500 mt-1">Плаща се първо от подаръка, после от внесените средства.</p>
                </div>
                <p className="text-xl font-bold whitespace-nowrap">{formatEur(prices.basic_analysis)}</p>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-semibold">Анализ за двама <span className="ml-2 text-[10px] uppercase tracking-wider bg-purple-600/30 text-purple-200 px-2 py-0.5 rounded-full">Премиум</span></p>
                  <p className="text-slate-400 text-sm">Съвместимост и синастрия между двама души</p>
                  <p className="text-xs text-slate-500 mt-1">Плаща се само от внесени средства.</p>
                </div>
                <p className="text-xl font-bold whitespace-nowrap">{formatEur(prices.pair_analysis)}</p>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-semibold">Прогноза за период <span className="ml-2 text-[10px] uppercase tracking-wider bg-purple-600/30 text-purple-200 px-2 py-0.5 rounded-full">Премиум</span></p>
                  <p className="text-slate-400 text-sm">
                    Подробен анализ за всеки календарен месец от периода, с общ преглед{limitsNote}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    За двама души: още {formatEur(prices.forecast_partner_extra)} към цената на прогнозата. Плаща се само от внесени средства.
                  </p>
                </div>
                <p className="text-xl font-bold whitespace-nowrap">{formatEur(prices.forecast_month)}<span className="text-sm font-normal text-slate-400"> / месец</span></p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">От баланса се взема само при успешно генериран анализ. Цените са с включен ДДС, когато е приложимо.</p>
          </section>
        )}

        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">Зареди баланс</h2>
          <p className="text-slate-400">Заредената сума се добавя към внесените средства и отключва премиум услугите.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {topups.map((tier) => {
            const bonus = Number(tier.bonus_cents) || 0;
            return (
              <div key={tier.id} className={`relative bg-[#1f1c27] p-8 rounded-3xl border ${tier.recommended ? 'border-purple-500 shadow-2xl shadow-purple-500/20 md:scale-105' : 'border-white/10'} flex flex-col`}>
                {tier.recommended && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                    Препоръчано
                  </span>
                )}
                <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-purple-400 text-3xl">account_balance_wallet</span>
                  <h3 className="text-xl font-bold">Зареждане {tier.name || formatEur(tier.amount_cents)}</h3>
                </div>
                <div className="mb-6">
                  <p className="text-slate-400 text-sm mb-1">Получавате в баланса</p>
                  <span className="text-4xl font-extrabold">{formatEur(tier.credit_cents)}</span>
                  {bonus > 0 && (
                    <p className="mt-2 inline-block text-xs font-bold bg-green-500/15 text-green-300 border border-green-500/30 px-2 py-1 rounded-lg">
                      Общо {formatEur(tier.credit_cents)} = {formatEur(tier.amount_cents)} зареждане + {formatEur(bonus)} бонус
                    </p>
                  )}
                  <p className="text-slate-400 text-sm mt-3">Плащате {formatEur(tier.amount_cents)}</p>
                  <p className="text-slate-500 text-xs mt-1">Цената е с включен ДДС, когато е приложимо.</p>
                </div>
                <button
                  onClick={() => buy(tier)}
                  disabled={!paymentsOn || buying !== null}
                  className={`mt-auto w-full py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${tier.recommended ? 'bg-purple-600 hover:bg-purple-700' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}
                >
                  {buying === tier.id ? 'Пренасочване…' : paymentsOn ? `Зареди ${formatEur(tier.amount_cents)}` : 'Скоро'}
                </button>
              </div>
            );
          })}
        </div>

        {paymentsOn && (
          <label className="max-w-3xl mx-auto mt-10 flex items-start gap-3 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 accent-purple-600" />
            <span>
              Съгласен съм заредената сума да бъде добавена към баланса ми веднага след плащането (дигитално съдържание) и разбирам,
              че с това губя правото си на отказ от договора в 14-дневен срок. Прочетох{' '}
              <a href="#/legal/terms" className="text-purple-400 underline">Общите условия</a> и{' '}
              <a href="#/legal/refunds" className="text-purple-400 underline">Политиката за връщане</a>.
            </span>
          </label>
        )}

        {history && (history.transactions.length > 0 || history.purchases.length > 0) && (
          <section className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Движение по баланса</h2>
            <div className="bg-[#1f1c27] rounded-2xl border border-white/10 divide-y divide-white/5">
              {history.transactions.map((t) => {
                const note = sourceNote(t);
                return (
                  <div key={t.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="text-white">{REASON_LABELS[t.reason] || t.reason}</p>
                      <p className="text-slate-500 text-xs">
                        {[t.description, formatDate(t.created_at), note].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <span className={`whitespace-nowrap ${t.delta >= 0 ? 'text-green-400 font-bold' : 'text-slate-300 font-bold'}`}>
                      {formatSignedEur(t.delta)}
                    </span>
                  </div>
                );
              })}
            </div>
            {history.purchases.some((p) => p.receipt_url) && (
              <div className="mt-6">
                <h3 className="font-bold mb-3">Разписки</h3>
                <ul className="space-y-2 text-sm">
                  {history.purchases.filter((p) => p.receipt_url).map((p) => (
                    <li key={p.id}>
                      <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="text-purple-400 underline">
                        Зареждане {formatEur(p.credit_cents)} · платено {formatEur(p.amount_cents)} · {formatDate(p.paid_at)}
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
              <h4 className="font-bold mb-2">Кога се взема сума от баланса?</h4>
              <p className="text-slate-400 text-sm">Само при успешно генериран анализ. Ако анализът не успее, от баланса не се взема нищо.</p>
            </div>
            <div className="bg-[#1f1c27] p-6 rounded-2xl border border-white/10">
              <h4 className="font-bold mb-2">Какво е подаръкът и къде важи?</h4>
              <p className="text-slate-400 text-sm">
                Подаръкът{signupGift > 0 ? ` (${formatEur(signupGift)} при регистрация)` : ''} се използва само за основните анализи — за един човек.
                Анализът за двама и прогнозите за период са премиум услуги: плащат се само от внесени средства
                и затова се отключват след първото зареждане.
              </p>
            </div>
            <div className="bg-[#1f1c27] p-6 rounded-2xl border border-white/10">
              <h4 className="font-bold mb-2">Има ли срок на годност?</h4>
              <p className="text-slate-400 text-sm">Не, балансът остава в акаунта ви, докато не го използвате.</p>
            </div>
            <div className="bg-[#1f1c27] p-6 rounded-2xl border border-white/10">
              <h4 className="font-bold mb-2">Как се плаща?</h4>
              <p className="text-slate-400 text-sm">С карта през Stripe. Данните на картата не минават през AstroMind. Разписката идва на имейла ви.</p>
            </div>
            <div className="bg-[#1f1c27] p-6 rounded-2xl border border-white/10">
              <h4 className="font-bold mb-2">Мога ли да си върна парите?</h4>
              <p className="text-slate-400 text-sm">
                Условията са в <a href="#/legal/refunds" className="text-purple-400 underline">Политиката за връщане</a>.
                Подаръкът и бонусът към пакетите не се връщат в пари. Бонусът към пакета се влива в баланса и може да плаща и премиум
                услуги; подаръкът при регистрация е отделен и покрива само основните анализи.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Balance;
