import { bulgarianCities } from './bulgarianCities';

// Стойността на „Друг“ в падащото меню за град
export const OTHER = '__other';

// Мястото на раждане във форма:
//   mode 'list'  - град от списъка (city е името му или '' при непосочен град)
//   mode 'other' - друго място: city и country са свободен текст
// lat и lon са низове, защото идват от полета за въвеждане
export const emptyPlace = () => ({ mode: 'list', city: '', country: '', lat: '', lon: '' });

export const findListCity = (name) => bulgarianCities.find((c) => c.name === name) || null;

const toStr = (n) => (n === null || n === undefined ? '' : String(n));

// Запазено място (напр. от profile.settings) → безопасна стойност: всички полета са низове,
// за да не счупят .trim() и полетата за въвеждане
export const normalizePlace = (raw) => {
  const p = raw && typeof raw === 'object' ? raw : {};
  return {
    mode: p.mode === 'other' ? 'other' : 'list',
    city: toStr(p.city),
    country: toStr(p.country),
    lat: toStr(p.lat),
    lon: toStr(p.lon),
  };
};

// Текстът, който се записва в профила и се показва в отчетите
export const placeLabel = (place) => {
  if (!place) return '';
  if (place.mode === 'other') {
    return [place.city, place.country].map((t) => t.trim()).filter(Boolean).join(', ');
  }
  return place.city || '';
};

// Етикет на място („Пловдив“ или „Град, Държава“) + координати → стойност за формата.
// Записаните координати са с предимство пред тези от списъка, защото потребителят
// може да ги е коригирал.
export const placeFromParts = (rawLabel, rawLat, rawLon) => {
  const label = (rawLabel || '').trim();
  const lat = toStr(rawLat);
  const lon = toStr(rawLon);

  const listed = findListCity(label);
  if (listed) {
    return { mode: 'list', city: listed.name, country: '', lat: lat || String(listed.lat), lon: lon || String(listed.lon) };
  }
  if (!label && !lat && !lon) return emptyPlace();

  // „Град, Държава“: държавата е след последната запетая
  const cut = label.lastIndexOf(',');
  return {
    mode: 'other',
    city: cut === -1 ? label : label.slice(0, cut).trim(),
    country: cut === -1 ? '' : label.slice(cut + 1).trim(),
    lat,
    lon,
  };
};

// Профил от сървъра → стойност за формата
export const placeFromProfile = (profile) =>
  placeFromParts(profile?.birth_place, profile?.lat, profile?.lon);

// Проверява координатите и връща { lat, lon } като числа или { error } на български
export const parseCoordinates = (place) => {
  const toNumber = (text) => {
    const t = String(text ?? '').trim();
    return t === '' ? NaN : Number(t);
  };
  const lat = toNumber(place?.lat);
  const lon = toNumber(place?.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { error: 'Ширината (Lat) трябва да е число между -90 и 90.' };
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    return { error: 'Дължината (Lon) трябва да е число между -180 и 180.' };
  }
  return { lat, lon };
};
