import React from 'react';

// Ориентировъчни лимити по план (20.10.2026). Цените още не са обявени; лимитите по план се прилагат при старта на таксуването.
export const PLAN_LIMITS = [
  { name: 'Безплатен', limit: '1 хороскоп на ден' },
  { name: 'Платен 10 €', limit: 'до 5 хороскопа на час и до 10 на ден' },
  { name: 'Платен 20 €', limit: 'до 20 хороскопа на час и до 60 на ден' },
];

const PlanLimits = () => (
  <div className="rounded-2xl bg-[#161022] border border-white/10 p-5">
    <p className="font-semibold text-white mb-3">Лимити по план</p>
    <ul className="space-y-2 text-sm">
      {PLAN_LIMITS.map((p) => (
        <li key={p.name} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-slate-200 font-medium">{p.name}</span>
          <span className="text-slate-400">{p.limit}</span>
        </li>
      ))}
    </ul>
    <p className="text-xs text-slate-500 mt-3">Цените и точните условия предстоят и ще бъдат обявени преди старта на таксуването.</p>
  </div>
);

export default PlanLimits;
