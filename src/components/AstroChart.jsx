import React from 'react';
import { polarToCartesian } from '../utils/astroMath';

// Символи за зодиакалните знаци
const ZODIAC_SIGNS = [
  { symbol: '♈', name: 'Aries', start: 0 },
  { symbol: '♉', name: 'Taurus', start: 30 },
  { symbol: '♊', name: 'Gemini', start: 60 },
  { symbol: '♋', name: 'Cancer', start: 90 },
  { symbol: '♌', name: 'Leo', start: 120 },
  { symbol: '♍', name: 'Virgo', start: 150 },
  { symbol: '♎', name: 'Libra', start: 180 },
  { symbol: '♏', name: 'Scorpio', start: 210 },
  { symbol: '♐', name: 'Sagittarius', start: 240 },
  { symbol: '♑', name: 'Capricorn', start: 270 },
  { symbol: '♒', name: 'Aquarius', start: 300 },
  { symbol: '♓', name: 'Pisces', start: 330 },
];

// Символи за планетите
const PLANET_SYMBOLS = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
  Node: '☊',
  Chiron: '⚷',
};

const PLANET_NAMES = {
  Sun: 'Слънце',
  Moon: 'Луна',
  Mercury: 'Меркурий',
  Venus: 'Венера',
  Mars: 'Марс',
  Jupiter: 'Юпитер',
  Saturn: 'Сатурн',
  Uranus: 'Уран',
  Neptune: 'Нептун',
  Pluto: 'Плутон',
  Node: 'Възходящ Възел',
  Chiron: 'Хирон',
};

// Планетите близо една до друга се разместват по кръга, за да не се застъпват символите; истинската позиция остава
// отбелязана с чертичка на вътрешния пръстен. Връща { име: показван ъгъл }.
const MIN_GAP = 9;
export const spreadLongitudes = (longitudes, minGap = MIN_GAP) => {
  const items = Object.entries(longitudes)
    .map(([name, lon]) => ({ name, lon: ((lon % 360) + 360) % 360 }))
    .sort((x, y) => x.lon - y.lon);
  const n = items.length;
  if (n < 2) return Object.fromEntries(items.map((i) => [i.name, i.lon]));

  // Започваме след най-голямата празнина, за да не се чупи групата около 0°
  let start = 0;
  let widest = -1;
  items.forEach((item, i) => {
    const gap = (items[(i + 1) % n].lon - item.lon + 360) % 360 || 360;
    if (gap > widest) { widest = gap; start = (i + 1) % n; }
  });
  const ordered = [...items.slice(start), ...items.slice(0, start)];
  let offset = 0;
  ordered.forEach((item, k) => {
    if (k > 0 && item.lon + offset < ordered[k - 1].unwrapped) offset += 360;
    item.unwrapped = item.lon + offset;
  });

  const shown = ordered.map((item) => item.unwrapped);
  const forward = () => { for (let k = 1; k < n; k += 1) shown[k] = Math.max(shown[k], shown[k - 1] + minGap); };
  for (let pass = 0; pass < 30; pass += 1) {
    forward();
    let changed = false;
    let k = 0;
    while (k < n) {
      let j = k;
      while (j + 1 < n && shown[j + 1] - shown[j] <= minGap + 1e-9) j += 1;
      if (j > k) {
        let sumTrue = 0;
        let sumShown = 0;
        for (let i = k; i <= j; i += 1) { sumTrue += ordered[i].unwrapped; sumShown += shown[i]; }
        const delta = (sumTrue - sumShown) / (j - k + 1);       // групата се центрира около истинските позиции
        if (Math.abs(delta) > 0.01) {
          for (let i = k; i <= j; i += 1) shown[i] += delta;
          changed = true;
        }
      }
      k = j + 1;
    }
    if (!changed) break;
  }
  forward();
  return Object.fromEntries(ordered.map((item, k) => [item.name, ((shown[k] % 360) + 360) % 360]));
};

export default function AstroChart({ data }) {
  if (!data || !data.planets || !data.houses) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Няма данни за показване
      </div>
    );
  }

  const centerX = 420;
  const centerY = 420;
  const outerRadius = 350;
  const innerRadius = 280;
  const planetRadius = outerRadius - 56;

  // Рисуване на зодиакалния кръг
  const renderZodiacRing = () => {
    return ZODIAC_SIGNS.map((sign, index) => {
      const angle = sign.start;
      const pos = polarToCartesian(centerX, centerY, outerRadius - 21, angle);
      return (
        <text
          key={sign.name}
          x={pos.x}
          y={pos.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-white text-3xl font-bold"
        >
          {sign.symbol}
        </text>
      );
    });
  };

  // Рисуване на линиите на къщите
  const renderHouseLines = () => {
    const houses = data.houses || {};
    return Object.entries(houses).map(([houseName, cusp]) => {
      if (cusp === null || cusp === undefined) return null;
      
      const pos = polarToCartesian(centerX, centerY, outerRadius, cusp);
      return (
        <line
          key={houseName}
          x1={centerX}
          y1={centerY}
          x2={pos.x}
          y2={pos.y}
          stroke="#4A5568"
          strokeWidth="1"
          opacity="0.6"
        />
      );
    });
  };

  // Рисуване на планетите
  const renderPlanets = () => {
    const planets = data.planets || {};
    const placed = Object.fromEntries(Object.entries(planets)
      .filter(([, d]) => d && d.longitude !== null && d.longitude !== undefined)
      .map(([name, d]) => [name, d.longitude]));
    const display = spreadLongitudes(placed);
    return Object.entries(planets).map(([planetName, planetData]) => {
      if (!planetData || planetData.longitude === null || planetData.longitude === undefined) {
        return null;
      }

      const longitude = planetData.longitude;
      const shownAt = display[planetName] ?? longitude;
      const pos = polarToCartesian(centerX, centerY, planetRadius, shownAt);
      const tickFrom = polarToCartesian(centerX, centerY, innerRadius, longitude);
      const tickTo = polarToCartesian(centerX, centerY, innerRadius + 12, longitude);
      const degreePos = polarToCartesian(centerX, centerY, planetRadius - 36, shownAt);
      const degree = `${Math.floor(longitude % 30)}°${planetData.speed < 0 ? '℞' : ''}`;
      const symbol = PLANET_SYMBOLS[planetName] || '•';
      const name = PLANET_NAMES[planetName] || planetName;
      const speed = planetData.speed ? planetData.speed.toFixed(2) : 'N/A';

      return (
        <g key={planetName}>
          <line x1={tickFrom.x} y1={tickFrom.y} x2={tickTo.x} y2={tickTo.y} stroke="#FBBF24" strokeWidth="2" />
          <text x={degreePos.x} y={degreePos.y} textAnchor="middle" dominantBaseline="middle"
            className="fill-slate-300 text-xs pointer-events-none">{degree}</text>
          <circle
            cx={pos.x}
            cy={pos.y}
            r="17"
            fill="#1A202C"
            stroke="#4A5568"
            strokeWidth="1.5"
            className="hover:stroke-blue-400 transition-colors"
          />
          <text
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-yellow-300 text-xl font-bold pointer-events-none"
          >
            {symbol}
          </text>
          <title>
            {name}: {longitude.toFixed(2)}° (скорост: {speed}°/ден)
          </title>
        </g>
      );
    });
  };

  // Рисуване на концентрични кръгове
  const renderCircles = () => {
    return (
      <>
        <circle
          cx={centerX}
          cy={centerY}
          r={outerRadius}
          fill="none"
          stroke="#2D3748"
          strokeWidth="3"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={innerRadius}
          fill="none"
          stroke="#2D3748"
          strokeWidth="1.5"
          opacity="0.5"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r="7"
          fill="#4A5568"
        />
      </>
    );
  };

  // Рисуване на ASC и MC линии
  const renderAngles = () => {
    const angles = data.angles || {};
    const asc = angles.Ascendant;
    const mc = angles.MC;

    const lines = [];
    
    if (asc !== null && asc !== undefined) {
      const ascPos = polarToCartesian(centerX, centerY, outerRadius, asc);
      lines.push(
        <line
          key="ASC"
          x1={centerX}
          y1={centerY}
          x2={ascPos.x}
          y2={ascPos.y}
          stroke="#60A5FA"
          strokeWidth="3"
          strokeDasharray="7,7"
        />
      );
      const ascLabelPos = polarToCartesian(centerX, centerY, outerRadius + 28, asc);
      lines.push(
        <text
          key="ASC-label"
          x={ascLabelPos.x}
          y={ascLabelPos.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-blue-400 text-base font-semibold"
        >
          ASC
        </text>
      );
    }

    if (mc !== null && mc !== undefined) {
      const mcPos = polarToCartesian(centerX, centerY, outerRadius, mc);
      lines.push(
        <line
          key="MC"
          x1={centerX}
          y1={centerY}
          x2={mcPos.x}
          y2={mcPos.y}
          stroke="#A78BFA"
          strokeWidth="3"
          strokeDasharray="7,7"
        />
      );
      const mcLabelPos = polarToCartesian(centerX, centerY, outerRadius + 28, mc);
      lines.push(
        <text
          key="MC-label"
          x={mcLabelPos.x}
          y={mcLabelPos.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-purple-400 text-base font-semibold"
        >
          MC
        </text>
      );
    }

    return lines;
  };

  return (
    <div className="flex items-center justify-center p-4 w-full" style={{ width: '100%', overflow: 'visible' }}>
      <svg
        viewBox="0 0 840 840"
        width="840"
        height="840"
        style={{ width: '100%', height: 'auto', maxWidth: 'none', minWidth: '560px', minHeight: '560px' }}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Фон */}
        <rect width="840" height="840" fill="#0F172A" />
        
        {/* Концентрични кръгове */}
        {renderCircles()}
        
        {/* Линии на къщите */}
        {renderHouseLines()}
        
        {/* Ъгли (ASC, MC) */}
        {renderAngles()}
        
        {/* Зодиакален пръстен */}
        {renderZodiacRing()}
        
        {/* Планети */}
        {renderPlanets()}
      </svg>
      {data.time_known === false && (
        <p className="sr-only">Часът на раждане е неизвестен: колелото е без домове, Асцендент и MC и без Луна.</p>
      )}
    </div>
  );
}


