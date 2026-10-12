import React from 'react';

// Истински тристъпков блок „Как работи“: номерата са в самия списък, не само за украса
export const HowItWorks = ({ steps, title = 'Как работи', id, compact = false }) => (
  <section id={id} aria-label={title} className={compact ? 'mb-8' : 'mb-12'}>
    <h3 className={`${compact ? 'text-base' : 'text-xl'} font-bold text-white mb-4`}>{title}</h3>
    <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 list-none p-0 m-0">
      {steps.map((step, index) => (
        <li key={step.title} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-[#13111C] p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5211d4] text-white text-sm font-bold" aria-hidden="true">{index + 1}</span>
            <span className="material-symbols-outlined text-[#5211d4]" aria-hidden="true" style={{ fontSize: '20px' }}>{step.icon}</span>
          </div>
          <h4 className="text-white text-sm font-bold leading-snug">{step.title}</h4>
          <p className="text-slate-400 text-xs leading-relaxed">{step.text}</p>
        </li>
      ))}
    </ol>
  </section>
);

export default HowItWorks;
