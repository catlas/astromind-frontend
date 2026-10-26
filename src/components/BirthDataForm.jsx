import React from 'react';
import { bulgarianCities } from '../utils/bulgarianCities';

export const inputClass = 'w-full bg-[#0B0616] border border-white/10 p-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5211d4]';

export const emptyBirthForm = { name: '', gender: '', birth_date: '', birth_time: '', unknown_time: false, city: 'София', lat: '42.6977', lon: '23.3219' };

// Полетата за първия профил (име, пол, дата, час, място). Полът е задължителен: „Мъж“ или „Жена“.
const BirthDataForm = ({ form, setForm }) => {
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const chooseCity = (name) => {
    const city = bulgarianCities.find((c) => c.name === name);
    setForm((f) => ({ ...f, city: name, lat: city ? String(city.lat) : f.lat, lon: city ? String(city.lon) : f.lon }));
  };
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm text-slate-300 mb-1">Име</label>
        <input className={inputClass} value={form.name} onChange={(e) => setField('name', e.target.value)} required maxLength={100} />
      </div>
      <div>
        <label className="block text-sm text-slate-300 mb-1">Пол</label>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Пол">
          {[{ value: 'female', label: 'Жена' }, { value: 'male', label: 'Мъж' }].map((opt) => (
            <button type="button" key={opt.value} role="radio" aria-checked={form.gender === opt.value} onClick={() => setField('gender', opt.value)}
              className={`p-3 rounded-lg border text-sm font-medium ${form.gender === opt.value ? 'border-[#7c5dfa] bg-[#5211d4]/30 text-white' : 'border-white/10 bg-[#0B0616] text-slate-300 hover:border-white/30'}`}>
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-1">Нужен е, за да се обръщаме към вас правилно в текстовете.</p>
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
    </div>
  );
};

// Данните във вида, който чакат /public/preview, /register и /onboarding
export const birthPayload = (form) => ({
  name: form.name.trim(),
  gender: form.gender,
  birth_date: form.birth_date,
  birth_time: form.unknown_time ? null : form.birth_time,
  unknown_time: form.unknown_time,
  birth_place: form.city === '__other' ? null : form.city,
  lat: Number(form.lat),
  lon: Number(form.lon),
});

export default BirthDataForm;
