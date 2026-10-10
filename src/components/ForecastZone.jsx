import React, { useState } from 'react';
import { zoneList } from '../utils/forecastZone';

// Един ред под датата на прогнозата: „Часова зона на прогнозата: Europe/Sofia · Промени“. Рождените данни са отделна основа
// и не се променят оттук; зоната определя само в коя местна дата и час се чете прогнозата.
// birthZone (по избор) е зоната на мястото на раждане, предложена като бърз избор.
export default function ForecastZone({ zone, onChange, birthZone = '' }) {
  const [editing, setEditing] = useState(false);
  const options = zoneList([zone, birthZone]);

  return (
    <div className="text-xs text-gray-400 space-y-2">
      <p>
        Часова зона на прогнозата: <span className="text-gray-200">{zone}</span>
        {' · '}
        <button type="button" onClick={() => setEditing((value) => !value)} aria-expanded={editing}
          className="underline text-purple-300 hover:text-purple-200">
          {editing ? 'Готово' : 'Промени'}
        </button>
      </p>
      {editing && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="forecast-zone-select">Часова зона на прогнозата</label>
          <select id="forecast-zone-select" value={zone} onChange={(e) => onChange(e.target.value)}
            className="max-w-full px-3 py-1.5 bg-slate-700/50 border border-purple-800/30 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500">
            {options.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          {birthZone && birthZone !== zone && (
            <button type="button" onClick={() => onChange(birthZone)} className="underline text-purple-300 hover:text-purple-200">
              Като мястото на раждане ({birthZone})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
