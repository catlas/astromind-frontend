import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Map as MapIcon, MapPin } from 'lucide-react';
import { bulgarianCities } from '../utils/bulgarianCities';
import { apiErrorMessage, geocodePlace } from '../utils/api';
import { OTHER, findListCity } from '../utils/birthPlace';

// Общият модул за място на раждане. Ползва се в „Профили“ и в „Генерирай хороскоп“
// (за човека и за партньора). Състоянието е при родителя (виж emptyPlace в utils/birthPlace):
//   <BirthPlaceSelect>  падащо меню с градове + „Друг“ (град, държава и търсене: AI нормализира името, а координатите
//                       идват от GeoNames; място извън базата е „непроверено“)
//   <BirthCoordinates>  ширина и дължина, винаги видими и редактируеми
// Двата компонента са отделни, за да могат да стоят на различни места във формата.

const VARIANTS = {
  profile: {
    label: 'block text-sm font-medium text-[#a69db9] mb-1.5',
    input: 'w-full px-3 py-2.5 rounded-lg bg-[#131118] border border-slate-700 text-white text-sm placeholder-slate-500 focus:border-[#5211d4] focus:outline-none transition-colors',
    button: 'bg-[#5211d4] hover:bg-[#5211d4]/90 w-full justify-center',
    hint: 'text-xs text-[#a69db9]',
    cityGrid: 'grid grid-cols-1 gap-3',
    coordGap: 'gap-3',
    icons: false,
  },
  purple: {
    label: 'block text-sm font-medium mb-2 text-gray-300',
    input: 'w-full px-4 py-2 bg-slate-700/50 border border-purple-800/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white',
    button: 'bg-purple-600 hover:bg-purple-700',
    hint: 'text-xs text-gray-400',
    cityGrid: 'grid grid-cols-1 sm:grid-cols-2 gap-3',
    coordGap: 'gap-4',
    icons: true,
  },
  pink: {
    label: 'block text-sm font-medium mb-2 text-gray-300',
    input: 'w-full px-4 py-2 bg-slate-700/50 border border-pink-800/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-white',
    button: 'bg-pink-600 hover:bg-pink-700',
    hint: 'text-xs text-gray-400',
    cityGrid: 'grid grid-cols-1 sm:grid-cols-2 gap-3',
    coordGap: 'gap-4',
    icons: true,
  },
};

export const BirthPlaceSelect = ({ value, onChange, variant = 'profile', label = 'Място на раждане' }) => {
  const style = VARIANTS[variant] || VARIANTS.profile;
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState(null); // { tone: 'ok' | 'warn' | 'error', text } за резултата от търсенето
  const [choices, setChoices] = useState([]);    // няколко места със същото име: потребителят избира

  // Най-новата стойност, за да не презапишем промени, направени, докато търсим
  const latest = useRef(value);
  latest.current = value;

  // Отговор, който идва, след като модулът е затворен (напр. при смяна на профил), се игнорира
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const isOther = value.mode === 'other';
  const canSearch = isOther && value.city.trim() !== '' && value.country.trim() !== '';

  const handleSelect = (e) => {
    const next = e.target.value;
    setStatus(null);
    setChoices([]);
    if (next === OTHER) {
      // Координатите на предишния град не бива да останат за ново място
      onChange({ mode: 'other', city: '', country: '', lat: '', lon: '' });
      return;
    }
    const city = findListCity(next);
    if (city) {
      onChange({ mode: 'list', city: city.name, country: '', lat: String(city.lat), lon: String(city.lon) });
    } else {
      // „Изберете град...“: запазваме въведените координати
      onChange({ ...value, mode: 'list', city: '' });
    }
  };

  const handleText = (field) => (e) => {
    setStatus(null);
    setChoices([]);
    onChange({ ...value, [field]: e.target.value });
  };

  // Enter в полетата за град и държава търси координатите, а не изпраща цялата форма
  const handleEnter = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (canSearch && !searching) search();
  };

  const search = async () => {
    const city = value.city.trim();
    const country = value.country.trim();
    setSearching(true);
    setStatus(null);
    setChoices([]);
    try {
      const found = await geocodePlace(city, country);
      if (!alive.current) return;
      const current = latest.current;
      // Полетата са променени по време на търсенето: резултатът не важи за новия текст
      if (current.mode !== 'other' || current.city.trim() !== city || current.country.trim() !== country) return;
      if (found.status === 'ambiguous') {
        setChoices(found.candidates || []);
        setStatus({ tone: 'warn', text: found.message || 'Има няколко места с това име. Изберете вашето.' });
        return;
      }
      onChange({ ...current, lat: String(found.lat), lon: String(found.lon) });
      const name = [found.city, found.country].filter(Boolean).join(', ');
      setStatus(found.verified
        ? {
          tone: 'ok',
          text: `Проверено по GeoNames: ${name}${found.timezone ? `, зона ${found.timezone}` : ''} (${found.lat}, ${found.lon}). Данни за местата: GeoNames, CC BY 4.0.`,
        }
        : {
          tone: 'warn',
          text: `Непроверено: ${name} (${found.lat}, ${found.lon}). Мястото го няма в проверената база (под 15 000 жители), а координатите са от AI. Проверете ги и ги коригирайте.`,
        });
    } catch (err) {
      if (alive.current) {
        setStatus({ tone: 'error', text: apiErrorMessage(err, 'Не успяхме да намерим координатите. Въведете ги ръчно.') });
      }
    } finally {
      if (alive.current) setSearching(false);
    }
  };

  // Избор между няколко места със същото име
  const choose = (place) => {
    const current = latest.current;
    onChange({ ...current, lat: String(place.lat), lon: String(place.lon) });
    setChoices([]);
    setStatus({
      tone: 'ok',
      text: `Проверено по GeoNames: ${place.city} (${place.country_code}), зона ${place.timezone} (${place.lat}, ${place.lon}). Данни за местата: GeoNames, CC BY 4.0.`,
    });
  };

  return (
    <div>
      <label className={style.label}>
        {style.icons && <MapIcon className="w-4 h-4 inline mr-1" />}
        {label}
      </label>
      <select value={isOther ? OTHER : value.city} onChange={handleSelect} className={style.input}>
        <option value="">Изберете град...</option>
        {bulgarianCities.map((city) => (
          <option key={city.name} value={city.name}>
            {city.name}
          </option>
        ))}
        <option value={OTHER}>Друг...</option>
      </select>

      {isOther && (
        <div className="mt-3 space-y-3">
          <div className={style.cityGrid}>
            <input
              type="text"
              value={value.city}
              onChange={handleText('city')}
              onKeyDown={handleEnter}
              maxLength={80}
              placeholder="Град (напр. Виена)"
              aria-label="Град"
              className={style.input}
            />
            <input
              type="text"
              value={value.country}
              onChange={handleText('country')}
              onKeyDown={handleEnter}
              maxLength={80}
              placeholder="Държава (напр. Австрия)"
              aria-label="Държава"
              className={style.input}
            />
          </div>

          {canSearch && (
            <button
              type="button"
              onClick={search}
              disabled={searching}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${style.button}`}
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              {searching ? 'Търсене...' : 'Намери координатите'}
            </button>
          )}

          {status && (
            <p className={`text-xs ${status.tone === 'ok' ? 'text-green-400' : status.tone === 'warn' ? 'text-amber-300' : 'text-red-400'}`}>
              {status.text}
            </p>
          )}
          {choices.length > 0 && (
            <ul className="space-y-1" aria-label="Места със същото име">
              {choices.map((place) => (
                <li key={place.id}>
                  <button type="button" onClick={() => choose(place)}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200">
                    {place.city} · {place.country_code} · {Number(place.population).toLocaleString('bg-BG')} жители · {place.lat}, {place.lon}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className={style.hint}>Или въведете ширината и дължината ръчно.</p>
        </div>
      )}
    </div>
  );
};

export const BirthCoordinates = ({ value, onChange, variant = 'profile', required = false, names = {} }) => {
  const style = VARIANTS[variant] || VARIANTS.profile;

  const field = (key, text, min, max, placeholder) => (
    <div>
      <label className={style.label}>
        {style.icons && <MapPin className="w-4 h-4 inline mr-1" />}
        {text} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type="number"
        name={names[key]}
        value={value[key]}
        onChange={(e) => onChange({ ...value, [key]: e.target.value })}
        required={required}
        step="any"
        min={min}
        max={max}
        placeholder={placeholder}
        className={style.input}
      />
    </div>
  );

  return (
    <div className={`grid grid-cols-2 ${style.coordGap}`}>
      {field('lat', 'Ширина (Lat)', -90, 90, '42.6977')}
      {field('lon', 'Дължина (Lon)', -180, 180, '23.3219')}
    </div>
  );
};
