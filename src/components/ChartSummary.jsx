import React from 'react';
import { CheckCircle2 } from 'lucide-react';

// Български имена на планетите
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

// Български имена на знаците
const SIGN_NAMES = {
  'Aries': 'Овен',
  'Taurus': 'Телец',
  'Gemini': 'Близнаци',
  'Cancer': 'Рак',
  'Leo': 'Лъв',
  'Virgo': 'Дева',
  'Libra': 'Везни',
  'Scorpio': 'Скорпион',
  'Sagittarius': 'Стрелец',
  'Capricorn': 'Козирог',
  'Aquarius': 'Водолей',
  'Pisces': 'Риби',
};

// Аспект имена
const ASPECT_NAMES = {
  'conjunction': 'съвпад',
  'sextile': 'секстил',
  'square': 'квадратура',
  'trine': 'тригон',
  'opposition': 'опозиция',
};

/**
 * Компонент за показване на обобщена информация за наталната карта
 */
export default function ChartSummary({ natalChart, natalAspects = null }) {
  if (!natalChart || !natalChart.planets || !natalChart.houses) {
    return null;
  }

  // Групиране на планети по домове (използваме house полето, ако е налично)
  const planetsByHouse = {};

  Object.entries(natalChart.planets).forEach(([planetName, planetData]) => {
    if (!planetData || planetData.longitude === null || planetData.longitude === undefined) {
      return;
    }

    // Използваме house полето, ако е налично, иначе изчисляваме
    const houseNum = planetData.house !== undefined && planetData.house !== null 
      ? planetData.house 
      : _getPlanetHouse(planetData.longitude, natalChart.houses);
    
    if (!planetsByHouse[houseNum]) {
      planetsByHouse[houseNum] = [];
    }
    planetsByHouse[houseNum].push(planetName);
  });

  // Добавяне на ASC и MC ако има
  if (natalChart.angles) {
    if (natalChart.angles.Ascendant !== null && natalChart.angles.Ascendant !== undefined) {
      // ASC е в 1-ви дом по дефиниция
      if (!planetsByHouse[1]) {
        planetsByHouse[1] = [];
      }
    }
    if (natalChart.angles.MC !== null && natalChart.angles.MC !== undefined) {
      // MC е в 10-ти дом по дефиниция
      if (!planetsByHouse[10]) {
        planetsByHouse[10] = [];
      }
    }
  }

  return (
    <div className="bg-slate-800/70 backdrop-blur-sm rounded-lg p-6 border border-purple-800/30 space-y-6">
      <h3 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5" />
        Обобщена информация за картата
      </h3>

      {/* 1. Планетарни позиции */}
      <div className="space-y-2">
        <h4 className="text-base font-semibold text-green-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          1. ПЛАНЕТАРНИ ПОЗИЦИИ
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {Object.entries(natalChart.planets).map(([planetName, planetData]) => {
            if (!planetData || !planetData.formatted_pos) return null;
            
            // Извличаме знака от formatted_pos и го превеждаме на български
            const formattedPos = planetData.formatted_pos;
            // Парсираме formatted_pos (формат може да е "23°02' Aries" или "Aries 23°02'")
            let translatedPos = formattedPos;
            
            // Опитваме се да намерим и заменим английския знак с български
            Object.entries(SIGN_NAMES).forEach(([engSign, bgSign]) => {
              // Заменяме знака на английски с български (case-insensitive)
              const regex = new RegExp(engSign, 'gi');
              translatedPos = translatedPos.replace(regex, bgSign);
            });
            
            return (
              <div key={planetName} className="flex items-center justify-between py-1 px-3 bg-slate-700/30 rounded">
                <span className="font-medium">{PLANET_NAMES[planetName] || planetName}:</span>
                <span className="text-purple-300">{translatedPos}</span>
              </div>
            );
          })}
          {/* Добавяне на ASC */}
          {natalChart.angles && natalChart.angles.Ascendant !== null && natalChart.angles.Ascendant !== undefined && (
            <div className="flex items-center justify-between py-1 px-3 bg-slate-700/30 rounded">
              <span className="font-medium">Асцендент:</span>
              <span className="text-purple-300">
                {(() => {
                  const ascFormatted = natalChart.angles.Ascendant_formatted || _formatAngle(natalChart.angles.Ascendant);
                  let translatedAsc = ascFormatted;
                  // Превеждаме знака в Ascendant_formatted на български
                  Object.entries(SIGN_NAMES).forEach(([engSign, bgSign]) => {
                    const regex = new RegExp(engSign, 'gi');
                    translatedAsc = translatedAsc.replace(regex, bgSign);
                  });
                  return translatedAsc;
                })()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Домове */}
      <div className="space-y-2">
        <h4 className="text-base font-semibold text-green-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          2. ДОМОВЕ
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((houseNum) => {
            const planets = planetsByHouse[houseNum] || [];
            if (planets.length === 0 && houseNum !== 1 && houseNum !== 10) return null;

            return (
              <div key={houseNum} className="py-1 px-3 bg-slate-700/30 rounded">
                <div className="font-medium text-blue-300">
                  {houseNum}-{_getHouseSuffix(houseNum)} дом:
                </div>
                <div className="text-purple-300 mt-1">
                  {planets.length > 0 ? (
                    planets.map((p) => PLANET_NAMES[p] || p).join(', ')
                  ) : (
                    <span className="text-gray-500 italic">празен</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Аспекти */}
      {natalAspects && natalAspects.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-base font-semibold text-green-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            3. АСПЕКТИ
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {natalAspects.map((aspect, idx) => {
              const planet1Name = PLANET_NAMES[aspect.planet1] || aspect.planet1;
              const planet2Name = PLANET_NAMES[aspect.planet2] || aspect.planet2;
              const aspectName = ASPECT_NAMES[aspect.aspect] || aspect.aspect;
              
              return (
                <div key={idx} className="py-1 px-3 bg-slate-700/30 rounded">
                  <span className="font-medium">{planet1Name}</span>
                  <span className="mx-2 text-purple-300">–</span>
                  <span className="font-medium">{planet2Name}</span>
                  <span className="ml-2 text-purple-300">{aspectName}</span>
                  {aspect.orb !== undefined && (
                    <span className="ml-2 text-xs text-gray-400">(орб: {aspect.orb.toFixed(2)}°)</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Помощна функция за определяне на дома на планета
 */
function _getPlanetHouse(longitude, houses) {
  // Нормализиране на longitude
  longitude = longitude % 360;
  if (longitude < 0) longitude += 360;

  // Създаване на списък с домове и техните куспиди
  const houseList = [];
  for (let i = 1; i <= 12; i++) {
    const houseKey = `House${i}`;
    if (houses[houseKey] !== null && houses[houseKey] !== undefined) {
      let cusp = houses[houseKey] % 360;
      if (cusp < 0) cusp += 360;
      houseList.push({ houseNum: i, cusp });
    }
  }

  if (houseList.length === 0) return 1;

  // Сортиране по куспид
  houseList.sort((a, b) => a.cusp - b.cusp);

  // Обработка на wrap-around (добавяне на първия дом +360°)
  const wrappedHouses = [...houseList, { houseNum: houseList[0].houseNum, cusp: houseList[0].cusp + 360 }];

  // Намиране на правилния дом
  for (let i = 0; i < wrappedHouses.length - 1; i++) {
    const currentCusp = wrappedHouses[i].cusp;
    const nextCusp = wrappedHouses[i + 1].cusp;
    
    if (currentCusp <= longitude && longitude < nextCusp) {
      return wrappedHouses[i].houseNum;
    }
  }

  return 1; // Fallback
}

/**
 * Помощна функция за форматиране на ъгъл
 */
function _formatAngle(angle) {
  const degrees = Math.floor(angle);
  const minutes = Math.floor((angle - degrees) * 60);
  return `${degrees}°${minutes.toString().padStart(2, '0')}'`;
}

/**
 * Помощна функция за суфикс на дом
 */
function _getHouseSuffix(num) {
  if (num === 1) return 'ви';
  if (num === 2) return 'ри';
  if (num === 3) return 'ти';
  if (num >= 4 && num <= 10) return 'ти';
  if (num === 11) return 'и';
  if (num === 12) return 'ти';
  return 'ти';
}

