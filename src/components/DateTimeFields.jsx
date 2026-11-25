import React, { useEffect, useRef, useState } from 'react';

// Дата и час с цифри (25.11.2026): на телефона излиза цифровата клавиатура вместо календара/колелцата.
// Пишат се само цифри: „15021990“ → „15.02.1990“, „2015“ → „20:15“. Навън полето подава същото като досега:
// дата YYYY-MM-DD и час HH:MM (или празно, докато не е пълно и вярно), чрез onChange({ target: { name, value } }).

const pad = (n) => String(n).padStart(2, '0');

export const isoToBg = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
};

export const formatDateDigits = (raw) => {
  const d = String(raw || '').replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
};

export const formatTimeDigits = (raw) => {
  const d = String(raw || '').replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
};

// „15.02.1990“ → { iso: '1990-02-15' } или { error } за пълна, но невъзможна дата; { iso: '' } докато не е пълна
export const parseBgDate = (text, { min, max } = {}) => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text || '');
  if (!m) return { iso: '' };
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1800 || month < 1 || month > 12 || date.getUTCDate() !== day || date.getUTCMonth() !== month - 1) {
    return { iso: '', error: 'Няма такава дата.' };
  }
  const iso = `${year}-${pad(month)}-${pad(day)}`;
  if (min && iso < min) return { iso: '', error: `Датата трябва да е от ${isoToBg(min)} нататък.` };
  if (max && iso > max) return { iso: '', error: `Датата трябва да е до ${isoToBg(max)}.` };
  return { iso };
};

export const parseTime = (text) => {
  const m = /^(\d{2}):(\d{2})$/.exec(text || '');
  if (!m) return { value: '' };
  const [h, min] = [Number(m[1]), Number(m[2])];
  if (h > 23 || min > 59) return { value: '', error: 'Часът е от 00:00 до 23:59.' };
  return { value: `${pad(h)}:${pad(min)}` };
};

const pickerSupported = () => {
  try { return typeof window !== 'undefined' && 'showPicker' in HTMLInputElement.prototype; } catch { return false; }
};

const useSyncedText = (value, toText) => {
  const [text, setText] = useState(toText(value));
  const emitted = useRef(value);
  useEffect(() => {
    if (value !== emitted.current) {            // стойността е сменена отвън (профил, възстановяване): показва се
      emitted.current = value;
      setText(toText(value));
    }
  }, [value, toText]);
  return [text, setText, emitted];
};

const trimTime = (v) => String(v || '').slice(0, 5);

export const DateField = ({ name, value, onChange, required, disabled, min, max, className = '', id, placeholder = 'ДД.ММ.ГГГГ' }) => {
  const [text, setText, emitted] = useSyncedText(value || '', isoToBg);
  const [error, setError] = useState('');
  const input = useRef(null);
  const picker = useRef(null);

  const emit = (iso) => {
    emitted.current = iso;
    if (iso !== (value || '')) onChange?.({ target: { name, value: iso } });
  };
  const handle = (raw) => {
    const formatted = formatDateDigits(raw);
    setText(formatted);
    const parsed = parseBgDate(formatted, { min, max });
    setError(parsed.error || '');
    input.current?.setCustomValidity(parsed.error || (formatted && !parsed.iso ? 'Въведете дата като ДД.ММ.ГГГГ.' : ''));
    emit(parsed.iso);
  };

  return (
    <div>
      <div className="relative">
        <input ref={input} id={id} name={name} type="text" inputMode="numeric" autoComplete="off" placeholder={placeholder} maxLength={10}
          value={text} onChange={(e) => handle(e.target.value)} required={required} disabled={disabled}
          aria-invalid={error ? 'true' : undefined} className={`${className} pr-10`} />
        {pickerSupported() && !disabled && (
          <>
            <button type="button" tabIndex={-1} aria-label="Избери от календара" onClick={() => { try { picker.current?.showPicker(); } catch { picker.current?.focus(); } }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>calendar_month</span>
            </button>
            <input ref={picker} type="date" tabIndex={-1} aria-hidden="true" value={value || ''} min={min} max={max}
              onChange={(e) => handle(isoToBg(e.target.value).replace(/\D/g, ''))}
              className="absolute right-2 bottom-0 w-0 h-0 opacity-0 pointer-events-none" />
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-400" role="alert">{error}</p>}
    </div>
  );
};

export const TimeField = ({ name, value, onChange, required, disabled, className = '', id, placeholder = 'ЧЧ:ММ' }) => {
  const [text, setText, emitted] = useSyncedText(trimTime(value), trimTime);
  const [error, setError] = useState('');
  const input = useRef(null);

  const handle = (raw) => {
    const formatted = formatTimeDigits(raw);
    setText(formatted);
    const parsed = parseTime(formatted);
    setError(parsed.error || '');
    input.current?.setCustomValidity(parsed.error || (formatted && !parsed.value ? 'Въведете час като ЧЧ:ММ.' : ''));
    emitted.current = parsed.value;
    if (parsed.value !== trimTime(value)) onChange?.({ target: { name, value: parsed.value } });
  };

  return (
    <div>
      <input ref={input} id={id} name={name} type="text" inputMode="numeric" autoComplete="off" placeholder={placeholder} maxLength={5}
        value={disabled ? '' : text} onChange={(e) => handle(e.target.value)} required={required} disabled={disabled}
        aria-invalid={error ? 'true' : undefined} className={className} />
      {error && <p className="mt-1 text-xs text-red-400" role="alert">{error}</p>}
    </div>
  );
};
