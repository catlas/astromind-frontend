import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifySession } from '../utils/auth';
import { api, apiErrorMessage } from '../utils/api';

const EVENT_LABELS = {
  register: 'Регистрации',
  login: 'Входове',
  email_verified: 'Потвърдени имейли',
  analysis_completed: 'Завършени анализи',
  analysis_failed: 'Неуспешни анализи',
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

const ERROR_LABELS = {
  unknown: 'неизвестна причина',
  interrupted: 'прекъснат от рестарт',
  deadline: 'отнело твърде дълго',
  text_check: 'проверката на текста отказа',
  ai_unavailable: 'AI не отговаря',
  budget: 'дневен или месечен AI бюджет',
};

const card = 'bg-[#201428] rounded-xl border border-[#302240]';
const fmtEur = (v) => `${Number(v || 0).toFixed(2).replace('.', ',')} €`;
const fmtSec = (v) => (v >= 60 ? `${Math.floor(v / 60)} мин ${Math.round(v % 60)} с` : `${Math.round(v)} с`);

const Stat = ({ label, value, hint, tone }) => (
  <div className={`${card} p-4`}>
    <p className="text-xs text-[#d4c8ed]">{label}</p>
    <p className={`text-2xl font-bold ${tone || ''}`}>{value}</p>
    {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
  </div>
);

// Колони по дни; серии: [{ key, color, label, values }] се трупат една върху друга
const BarChart = ({ title, labels, series, format = (v) => v }) => {
  const totals = labels.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] || 0), 0));
  const max = Math.max(1, ...totals);
  const w = 100 / labels.length;
  return (
    <div className={`${card} p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-sm font-semibold">{title}</p>
        <div className="flex gap-3 text-[11px] text-slate-400">
          {series.map((s) => <span key={s.key} className="flex items-center gap-1"><i className="inline-block w-2 h-2 rounded-sm" style={{ background: s.color }} />{s.label}</span>)}
        </div>
      </div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-32">
        {labels.map((label, i) => {
          let y = 40;
          return (
            <g key={label}>
              <title>{`${label}: ${series.map((s) => `${s.label} ${format(s.values[i] || 0)}`).join(', ')}`}</title>
              <rect x={i * w} y={0} width={w} height={40} fill="transparent" />
              {series.map((s) => {
                const h = ((s.values[i] || 0) / max) * 38;
                y -= h;
                return h > 0 ? <rect key={s.key} x={i * w + w * 0.12} y={y} width={w * 0.76} height={h} fill={s.color} rx="0.3" /> : null;
              })}
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
        <span>{labels[0]?.slice(5)}</span><span>най-много за ден: {format(max)}</span><span>{labels[labels.length - 1]?.slice(5)}</span>
      </div>
    </div>
  );
};

const toCsv = (columns, rows) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [columns.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
};

const DataViewer = () => {
  const [tables, setTables] = useState([]);
  const [table, setTable] = useState('users');
  const [offset, setOffset] = useState(0);
  const [userId, setUserId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const limit = 50;

  useEffect(() => { api.get('/admin/data').then((r) => setTables(r.data)).catch(() => {}); }, []);
  const load = useCallback(async () => {
    try {
      const r = await api.get(`/admin/data/${table}`, { params: { limit, offset, user_id: userId || 0 } });
      setResult(r.data);
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err, 'Данните не могат да се заредят.'));
    }
  }, [table, offset, userId]);
  useEffect(() => { load(); }, [load]);

  const download = () => {
    if (!result) return;
    const blob = new Blob(['﻿' + toCsv(result.columns, result.rows)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${table}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <select value={table} onChange={(e) => { setTable(e.target.value); setOffset(0); }} className="bg-[#201428] border border-[#302240] rounded-lg px-3 py-2 text-sm">
          {tables.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <input value={userId} onChange={(e) => { setUserId(e.target.value.replace(/\D/g, '')); setOffset(0); }} placeholder="№ на потребител (по избор)"
          className="bg-[#201428] border border-[#302240] rounded-lg px-3 py-2 text-sm w-52" />
        <button onClick={load} className="text-sm bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full">Обнови</button>
        <button onClick={download} className="text-sm bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full">Изтегли CSV (тази страница)</button>
        {result && <span className="text-xs text-slate-400">{result.total} реда · показани {result.offset + 1}–{Math.min(result.offset + limit, result.total)}</span>}
      </div>
      <p className="text-xs text-slate-500">Само за четене. Паролите, текстовете на анализите, въпросите и рождените данни не се показват.</p>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {result && (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-xs">
            <thead className="text-left text-slate-400 border-b border-[#302240]">
              <tr>{result.columns.map((c) => <th key={c} className="px-3 py-2 whitespace-nowrap font-medium">{c}</th>)}</tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i} className="border-b border-[#302240]/60 hover:bg-white/5">
                  {row.map((cell, j) => <td key={j} className="px-3 py-1.5 whitespace-nowrap max-w-xs truncate" title={String(cell ?? '')}>{cell === null || cell === undefined ? '—' : String(cell)}</td>)}
                </tr>
              ))}
              {result.rows.length === 0 && <tr><td className="px-3 py-4 text-slate-400" colSpan={result.columns.length}>Няма записи.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {result && (
        <div className="flex gap-3">
          <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} className="text-sm bg-white/5 hover:bg-white/10 disabled:opacity-40 px-4 py-2 rounded-full">← По-нови</button>
          <button disabled={offset + limit >= result.total} onClick={() => setOffset(offset + limit)} className="text-sm bg-white/5 hover:bg-white/10 disabled:opacity-40 px-4 py-2 rounded-full">По-стари →</button>
        </div>
      )}
    </section>
  );
};

const Admin = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('overview');
  const [ov, setOv] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [error, setError] = useState('');
  const [loadedAt, setLoadedAt] = useState(null);

  const load = useCallback(async () => {
    const user = await verifySession(navigate);
    if (!user) return;
    try {
      const [a, b] = await Promise.all([api.get('/admin/overview', { params: { days } }), api.get('/admin/metrics', { params: { days } })]);
      setOv(a.data);
      setFunnel(b.data);
      setError('');
      setLoadedAt(new Date());
    } catch (err) {
      setError(apiErrorMessage(err, 'Статистиката не може да се зареди.'));
    }
  }, [navigate, days]);
  useEffect(() => { load(); }, [load]);

  const s = ov?.summary;
  const budget = ov?.ai_budget;
  const tabClass = (id) => `px-4 py-2 rounded-full text-sm ${tab === id ? 'bg-[#5211d4] text-white' : 'bg-white/5 hover:bg-white/10 text-slate-300'}`;
  const events = useMemo(() => Object.entries(funnel?.events || {}).sort((a, b) => b[1] - a[1]), [funnel]);

  return (
    <div className="min-h-screen bg-[#161022] text-white p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Табло на собственика</h1>
            <p className="text-xs text-slate-400 mt-1">{loadedAt ? `Обновено в ${loadedAt.toLocaleTimeString('bg-BG')}` : 'Зареждане…'} · времената са UTC</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-[#201428] border border-[#302240] rounded-lg px-3 py-2 text-sm">
              {[7, 14, 30, 90, 365].map((d) => <option key={d} value={d}>Последните {d} дни</option>)}
            </select>
            <button onClick={load} className="text-sm bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full">Обнови</button>
            <button onClick={() => navigate('/dashboard')} className="text-sm bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full">Табло</button>
          </div>
        </div>

        <div className="flex gap-2">
          <button className={tabClass('overview')} onClick={() => setTab('overview')}>Преглед</button>
          <button className={tabClass('data')} onClick={() => setTab('data')}>Данни</button>
        </div>

        {error && <p className="text-red-400">{error}</p>}

        {tab === 'data' && <DataViewer />}

        {tab === 'overview' && ov && s && (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Всички потребители" value={ov.totals.users} hint={`${ov.totals.verified_users} с потвърден имейл`} />
              <Stat label={`Нови (${days} дни)`} value={s.registered} hint={`${s.verified} потвърдени`} />
              <Stat label="Активни потребители" value={s.active_users} hint="направили поне един анализ" />
              <Stat label="Анализи сега" value={`${ov.totals.running_now} / ${ov.totals.queued_now}`} hint="работят / чакат на опашка" />
              <Stat label="Успешни анализи" value={s.analyses_ok} tone="text-green-300" />
              <Stat label="Неуспешни анализи" value={s.analyses_failed} tone={s.analyses_failed ? 'text-red-300' : ''} hint={`${s.failure_rate}% от завършилите`} />
              <Stat label="Средно време на анализ" value={fmtSec(s.avg_seconds)} hint={`най-дълъг: ${fmtSec(s.max_seconds)}`} />
              <Stat label="Всички отчети" value={ov.totals.reports} />
              <Stat label={`AI разход (${days} дни)`} value={fmtEur(s.ai_cost_eur)} hint="приблизителен" />
              <Stat label="AI днес / месец" value={`${fmtEur((budget?.today_cents || 0) / 100)} / ${fmtEur((budget?.month_cents || 0) / 100)}`}
                hint={`тавани: ${fmtEur((budget?.daily_budget_cents || 0) / 100)} / ${fmtEur((budget?.monthly_budget_cents || 0) / 100)}`} />
              <Stat label="Състояние на AI бюджета" value={budget?.state === 'ok' ? 'Нормално' : budget?.state} tone={budget?.state === 'ok' ? 'text-green-300' : 'text-red-300'}
                hint={budget?.emergency_stop ? 'аварийно спиране: ВКЛЮЧЕНО' : 'без аварийно спиране'} />
              <Stat label="Приходи (нето)" value={fmtEur(s.revenue_eur)} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BarChart title="Регистрации по дни" labels={ov.labels} series={[
                { key: 'v', color: '#34d399', label: 'потвърдени', values: ov.series.verified },
                { key: 'r', color: '#7c5dfa', label: 'непотвърдени', values: ov.series.registered.map((v, i) => Math.max(0, v - ov.series.verified[i])) },
              ]} />
              <BarChart title="Анализи по дни" labels={ov.labels} series={[
                { key: 'ok', color: '#34d399', label: 'успешни', values: ov.series.ok },
                { key: 'f', color: '#f87171', label: 'неуспешни', values: ov.series.failed },
                { key: 'c', color: '#94a3b8', label: 'отказани', values: ov.series.cancelled },
              ]} />
              <BarChart title="Активни потребители и входове" labels={ov.labels} series={[
                { key: 'a', color: '#60a5fa', label: 'активни (анализ)', values: ov.series.active },
              ]} />
              <BarChart title="AI разход по дни (€)" labels={ov.labels} format={(v) => Number(v).toFixed(2)} series={[
                { key: 'e', color: '#fbbf24', label: 'евро', values: ov.ai_cost_eur },
              ]} />
              <BarChart title="Входове по дни" labels={ov.labels} series={[{ key: 'l', color: '#a78bfa', label: 'входове', values: ov.series.logins }]} />
              <BarChart title="AI заявки по дни" labels={ov.labels} series={[{ key: 'c', color: '#f472b6', label: 'заявки', values: ov.ai_calls }]} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={`${card} p-4`}>
                <h2 className="text-lg font-bold mb-3">Причини за неуспешни анализи</h2>
                {ov.errors.length === 0 && <p className="text-sm text-slate-400">Няма неуспешни анализи за периода.</p>}
                {ov.errors.map(([code, count]) => (
                  <div key={code} className="flex justify-between text-sm py-1 border-b border-[#302240]/60"><span>{ERROR_LABELS[code] || code}</span><b>{count}</b></div>
                ))}
              </div>
              <div className={`${card} p-4`}>
                <h2 className="text-lg font-bold mb-3">Какви анализи се правят</h2>
                {ov.kinds.length === 0 && <p className="text-sm text-slate-400">Още няма успешни анализи за периода.</p>}
                {ov.kinds.map(([code, count]) => (
                  <div key={code} className="flex justify-between text-sm py-1 border-b border-[#302240]/60"><span>{code}</span><b>{count}</b></div>
                ))}
              </div>
            </section>

            {funnel && (
              <section>
                <h2 className="text-xl font-bold mb-3">Фуния (нови потребители за периода)</h2>
                <div className="space-y-2">
                  {funnel.funnel.map((step) => (
                    <div key={step.step} className={`${card} p-3`}>
                      <div className="flex justify-between text-sm mb-2"><span>{step.step}</span><span className="text-[#d4c8ed]">{step.users} · {step.rate}%</span></div>
                      <div className="h-2 rounded bg-white/5"><div className="h-2 rounded bg-[#7c5dfa]" style={{ width: `${Math.min(100, step.rate)}%` }} /></div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-bold mb-3">Събития</h2>
              <div className={`${card} divide-y divide-[#302240]`}>
                {events.map(([name, count]) => (
                  <div key={name} className="flex justify-between px-4 py-2 text-sm"><span>{EVENT_LABELS[name] || name}</span><span className="font-bold">{count}</span></div>
                ))}
                {events.length === 0 && <p className="px-4 py-3 text-sm text-[#d4c8ed]">Още няма събития.</p>}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
