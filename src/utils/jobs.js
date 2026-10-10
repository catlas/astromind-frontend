import { api } from './api';

// Задачи за анализ (Фаза 11). Генерацията върви на сървъра независимо от браузъра: екранът създава задача,
// чете състоянието и събитията на задачата и може да бъде затворен. Запомненият номер на задача позволява
// връщане към същия анализ след обновяване на страницата или излизане от нея.

// Етапите, които екранът показва (сървърът праща още queued и finishing)
export const STAGE_STEPS = [
  { id: 'calculating', label: 'Изчисляване' },
  { id: 'analyzing', label: 'Анализ' },
  { id: 'checking', label: 'Проверка' },
  { id: 'done', label: 'Готово' },
];

export const STAGE_MESSAGES = {
  queued: 'Анализът чака ред…',
  calculating: 'Изчисляване на картата…',
  analyzing: 'Анализ…',
  checking: 'Проверка на текста спрямо фактите…',
  finishing: 'Записване на отчета…',
};

export const isActive = (job) => !!job && (job.status === 'queued' || job.status === 'running');

// Ключът за идемпотентност: един и същ ключ връща същата задача, затова двоен клик не прави втори анализ
export const newKey = () => {
  try {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  } catch {
    // старите браузъри ползват резервния вариант
  }
  return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
};

export const createJob = async (payload, key) =>
  (await api.post('/jobs', payload, { headers: { 'Idempotency-Key': key } })).data;

export const fetchJob = async (id, after = 0) => (await api.get(`/jobs/${id}`, { params: { after } })).data.job;

export const cancelJob = async (id) => (await api.post(`/jobs/${id}/cancel`)).data;

export const fetchJobLimits = async () => (await api.get('/jobs/limits')).data;

export const fetchJobs = async (params = {}) => (await api.get('/jobs', { params })).data.jobs;

const storageKey = (userId) => `astro_active_job_${userId}`;

export const rememberJob = (userId, jobId) => {
  try {
    localStorage.setItem(storageKey(userId), String(jobId));
  } catch {
    // без localStorage задачата продължава на сървъра, но екранът не я възстановява
  }
};

export const forgetJob = (userId) => {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // няма какво да се изтрие
  }
};

export const recallJob = (userId) => {
  try {
    const value = localStorage.getItem(storageKey(userId));
    return value ? Number(value) : null;
  } catch {
    return null;
  }
};

// „след около 12 мин“ за ограничение, което изтича след seconds секунди
export const waitText = (seconds) => {
  const minutes = Math.max(1, Math.ceil((Number(seconds) || 0) / 60));
  return `след около ${minutes} ${minutes === 1 ? 'минута' : 'минути'}`;
};
