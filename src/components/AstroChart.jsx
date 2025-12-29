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
    return Object.entries(planets).map(([planetName, planetData]) => {
      if (!planetData || planetData.longitude === null || planetData.longitude === undefined) {
        return null;
      }

      const longitude = planetData.longitude;
      const pos = polarToCartesian(centerX, centerY, planetRadius, longitude);
      const symbol = PLANET_SYMBOLS[planetName] || '•';
      const name = PLANET_NAMES[planetName] || planetName;
      const speed = planetData.speed ? planetData.speed.toFixed(2) : 'N/A';

      return (
        <g key={planetName}>
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
    </div>
  );
}


