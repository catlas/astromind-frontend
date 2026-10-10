// Часова зона на прогнозата: датата и часът на прогнозата са местни за избрана зона, не UTC (toISOString) и не часът на
// браузъра, смесен с датата в UTC. Зоната по подразбиране е тази на устройството и винаги е видима и сменяема.

export const DEFAULT_ZONE = 'Europe/Sofia';

const FALLBACK_ZONES = [
  'Europe/Sofia', 'Europe/Athens', 'Europe/Bucharest', 'Europe/Istanbul', 'Europe/Belgrade', 'Europe/Vienna', 'Europe/Berlin',
  'Europe/Paris', 'Europe/Rome', 'Europe/Madrid', 'Europe/London', 'Europe/Lisbon', 'Europe/Moscow', 'Europe/Kyiv',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto', 'Asia/Dubai',
  'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney', 'UTC',
];

export const isZone = (zone) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
};

export const browserZone = () => {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && isZone(zone) ? zone : DEFAULT_ZONE;
  } catch {
    return DEFAULT_ZONE;
  }
};

export const zoneList = (extra = []) => {
  let all = FALLBACK_ZONES;
  try {
    if (typeof Intl.supportedValuesOf === 'function') all = Intl.supportedValuesOf('timeZone');
  } catch { /* остава резервният списък */ }
  const set = new Set([...extra.filter(Boolean), ...all]);
  if (!set.has('UTC')) set.add('UTC');
  return [...set];
};

// Датата ("YYYY-MM-DD") и часът ("HH:MM") в дадената зона в даден момент
export const nowInZone = (zone, now = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: isZone(zone) ? zone : DEFAULT_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value || '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
};
