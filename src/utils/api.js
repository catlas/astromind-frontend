import axios from 'axios';
import { getApiBaseUrl } from './auth';

// Axios инстанция с токена на текущия потребител
export const api = axios.create({ timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  config.baseURL = getApiBaseUrl();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Съобщението за грешка от бекенда (detail), ако е текст
export const apiErrorMessage = (err, fallback = 'Възникна грешка. Опитайте отново.') => {
  const detail = err?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
};

export const storeSession = (token, user) => {
  if (token) localStorage.setItem('token', token);
  if (user) localStorage.setItem('user', JSON.stringify(user));
};

// ---------------------------------------------------------------------------
// Еднократно пренасяне на профили и история от браузъра към сървъра
// ---------------------------------------------------------------------------

const LEGACY_DEMO_CONTENT = new Set([
  'Вашата кариера през 2024 е под влиянието на Сатурн в Риби...',
  'Съвместимостта между двамата показва силна венера-марс връзка...',
  'Вашата натална карта разкрива силен Скорпион Асцендент...',
  'Днес Луната във Водолей подкрепя иновациите...',
  'Ноември носи трансформация във вашата 10-та къща...',
  'Отговорът на вашия въпрос се крие в 7-мия дом...',
  '2025 е година на разширение с Юпитер в Близнаци...',
  'Кармичният ви път е свързан с лечение и служба...',
  'Предстои обработка...',
  'Основен анализ на натална карта...',
]);

const readLocalProfiles = () => {
  const items = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('astro_profile_')) continue;
    try {
      const data = JSON.parse(localStorage.getItem(key)) || {};
      const { date, time, lat, lon, selectedCity, question, ...settings } = data;
      if (!date) continue;
      items.push({
        key,
        profile: {
          name: key.replace('astro_profile_', ''),
          relation: data.partnerData && data.enablePartner ? 'partner' : 'self',
          birth_date: date,
          birth_time: time || '',
          unknown_time: !time,
          birth_place: selectedCity || '',
          lat: lat === '' || lat == null ? null : Number(lat),
          lon: lon === '' || lon == null ? null : Number(lon),
          settings: { ...settings, selectedCity: selectedCity || '' },
        },
      });
    } catch {
      // повреден запис: пропускаме го
    }
  }
  return items;
};

let migrationPromise = null;

export const migrateLocalData = () => {
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    const profiles = readLocalProfiles();
    let history = [];
    try {
      history = (JSON.parse(localStorage.getItem('astro_history') || '[]') || [])
        .filter((h) => h && h.content && !LEGACY_DEMO_CONTENT.has(h.content));
    } catch {
      history = [];
    }

    if (profiles.length) {
      await api.post('/profiles/import', { profiles: profiles.map((p) => p.profile) });
      profiles.forEach((p) => localStorage.removeItem(p.key));
    }
    if (history.length) {
      await api.post('/reports/import', { reports: history });
    }
    localStorage.removeItem('astro_history');
  })().catch((err) => {
    // При грешка данните остават в браузъра и опитваме пак следващия път
    console.error('Пренасянето на локалните данни не успя:', err);
    migrationPromise = null;
  });
  return migrationPromise;
};

// ---------------------------------------------------------------------------
// Профили и отчети
// ---------------------------------------------------------------------------

export const fetchProfiles = async () => (await api.get('/profiles')).data;
export const upsertProfile = async (profile) => (await api.put('/profiles/upsert', profile)).data;
export const fetchReports = async (limit = 200) => (await api.get('/reports', { params: { limit } })).data;
export const fetchReport = async (id) => (await api.get(`/reports/${id}`)).data;
export const deleteReport = async (id) => (await api.delete(`/reports/${id}`)).data;

export const REPORT_TYPE_LABELS = {
  general: 'Общ анализ',
  health: 'Здраве',
  career: 'Кариера',
  money: 'Пари и успех',
  love: 'Любов',
  karmic: 'Карма и род',
};

export const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`);
  return d.toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
