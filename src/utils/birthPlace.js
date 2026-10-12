import { bulgarianCities } from './bulgarianCities';

// Стойността на „Друг“ в падащото меню за град
export const OTHER = '__other';

// Мястото на раждане във форма:
//   mode 'list'  - град от списъка (city е името му или '' при непосочен град)
//   mode 'other' - друго място: city и country са свободен текст
// lat и lon са низове, защото идват от полета за въвеждане
//   meta     откъде са координатите, като ЕДНА стойност с точката (R07): null (няма избрана точка или е запазен профил),
//            { source: 'list' | 'geonames' | 'ai' | 'manual', verified, confirmed, geoname_id, canonical_city, country_code, timezone, data_version }
export const emptyPlace = () => ({ mode: 'list', city: '', country: '', lat: '', lon: '', meta: null });

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
    meta: p.meta && typeof p.meta === 'object' ? p.meta : null,
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
    return { mode: 'list', city: listed.name, country: '', lat: lat || String(listed.lat), lon: lon || String(listed.lon), meta: null };
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
    meta: null,
  };
};

// Профил от сървъра → стойност за формата
export const placeFromProfile = (profile) =>
  placeFromParts(profile?.birth_place, profile?.lat, profile?.lon);

// ---------------------------------------------------------------------------------------------------------------------
// Атомарен избор на място (R07): град, държава, координати, идентификатор, зона и източник са една стойност. Всяка промяна на
// града или държавата обезсилва избраната точка (координати и meta); резултат от търсене не се прилага към друг текст.
// ---------------------------------------------------------------------------------------------------------------------
export const AI_UNCONFIRMED = 'Координатите са предложени от AI и не са проверени. Потвърдете ги или ги въведете ръчно.';

// Промяна на града или държавата: старата точка (напр. Париж) не важи за новия текст (напр. Springfield)
export const editPlaceText = (place, field, value) => ({ ...place, [field]: value, lat: '', lon: '', meta: null });

// Ръчно въведена координата: ясно означена като ръчна и потвърдена от самото въвеждане
export const editCoordinate = (place, field, value) => ({
  ...place,
  [field]: value,
  meta: { source: 'manual', verified: false, confirmed: true },
});

// Град от списъка на България (проверен списък, зона Europe/Sofia)
export const selectListCity = (city) => ({
  mode: 'list', city: city.name, country: '', lat: String(city.lat), lon: String(city.lon),
  meta: { source: 'list', verified: true, confirmed: true, timezone: 'Europe/Sofia' },
});

const geonamesMeta = (found) => ({
  source: 'geonames', verified: true, confirmed: true, geoname_id: found.geoname_id ?? found.id ?? null,
  canonical_city: found.canonical_city || found.city || '', country_code: found.country_code || '',
  timezone: found.timezone || '', data_version: found.data_version || '',
});

// Отговор на /geocode: двусмислие или липса не оставят стара точка; GeoNames записва всичко заедно; AI е непотвърден
export const applyGeocodeResult = (place, found) => {
  if (!found || found.status === 'ambiguous') return { ...place, lat: '', lon: '', meta: null };
  if (found.verified) return { ...place, lat: String(found.lat), lon: String(found.lon), meta: geonamesMeta(found) };
  return { ...place, lat: String(found.lat), lon: String(found.lon), meta: { source: 'ai', verified: false, confirmed: false } };
};

// Избран кандидат от няколко места със същото име
export const choosePlace = (place, candidate) => ({
  ...place, lat: String(candidate.lat), lon: String(candidate.lon), meta: geonamesMeta({ ...candidate, canonical_city: candidate.city }),
});

export const confirmAiPlace = (place) => ({ ...place, meta: { ...(place.meta || {}), source: 'ai', confirmed: true } });

// null, когато мястото може да се изпрати; иначе съобщение на български
export const placeBlocker = (place) => {
  if (place?.mode === 'other' && place.meta?.source === 'ai' && !place.meta.confirmed) return AI_UNCONFIRMED;
  return null;
};

// Проверява координатите и връща { lat, lon } като числа или { error } на български
export const parseCoordinates = (place) => {
  const blocked = placeBlocker(place);
  if (blocked) return { error: blocked };
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
