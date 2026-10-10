import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Loader2, Sparkles, Calendar, Clock, MessageSquare, User, TrendingUp, Heart, Activity, Infinity } from 'lucide-react';
import AstroChart from '../components/AstroChart';
import DownloadPDFButton from '../components/DownloadPDFButton';
import ChartSummary from '../components/ChartSummary';
import { BirthPlaceSelect, BirthCoordinates } from '../components/BirthPlace';
import { emptyPlace, normalizePlace, placeFromParts, placeFromProfile, placeLabel } from '../utils/birthPlace';
import { clearSessionAndRedirect, getApiBaseUrl, verifySession } from '../utils/auth';
import { api, fetchProfiles, migrateLocalData, upsertProfile } from '../utils/api';
import { accessLabel, availableFor, balanceOf, formatEur, periodMonths, quoteFor, withBalance } from '../utils/money';
import DOMPurify from 'dompurify';

// Менюто на мобилната странична лента (на компютър бутоните са изписани директно по-долу)
const NAV_ITEMS = [
  { path: '/dashboard', icon: 'dashboard', label: 'Табло' },
  { path: '/generate-report', icon: 'auto_awesome', label: 'Генерирай хороскоп' },
  { path: '/profiles', icon: 'groups', label: 'Профили' },
  { path: '/history', icon: 'history', label: 'История' },
  { path: '/settings', icon: 'settings', label: 'Настройки', separated: true },
  { path: '/balance', icon: 'credit_card', label: 'Баланс' },
];

// Горна граница на периода на прогнозата (календарни месеци). Сървърът я праща в /billing/config;
// тези стойности се ползват, докато конфигурацията не е заредена.
const FALLBACK_LIMITS = { forecast_max_months_single: 3, forecast_max_months_pair: 2 };
// Проверката на готовия текст (Фаза 10) може да добави една втора AI заявка към всеки месец
const STREAM_IDLE_TIMEOUT_MS = 480000; // 8 минути без нито едно събитие от сървъра
const REQUEST_TIMEOUT_MS = 480000;     // обикновена заявка (натален анализ или анализ за дата): 8 минути

// Последният позволен ден за период, започващ на startIso (YYYY-MM-DD): краят на maxMonths-я календарен месец.
const maxEndDate = (startIso, maxMonths) => {
  const [y, m] = String(startIso || '').split('-').map(Number);
  if (!y || !m) return '';
  const last = new Date(y, m - 1 + maxMonths, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`;
};

const formatBgDate = (iso) => (iso ? iso.split('-').reverse().join('.') : '');

// Пол се праща към AI само ако е избран профил с посочен пол и името не е променяно
const knownGender = (profile, typedName) =>
  profile && profile.name === String(typedName || '').trim() && (profile.gender === 'male' || profile.gender === 'female')
    ? profile.gender
    : undefined;

const GenerateReport = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Профил: '' = ръчно въвеждане, иначе id на избран профил от „Профили“
  const [profileChoice, setProfileChoice] = useState('');
  const [name, setName] = useState('');
  const [birthPlace, setBirthPlace] = useState(emptyPlace());
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    question: '',
  });

  const [enableTransit, setEnableTransit] = useState(false);
  const [transitData, setTransitData] = useState({
    target_date: '',
    target_time: '',
  });
  const [isDynamic, setIsDynamic] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('general');

  const [enablePartner, setEnablePartner] = useState(false);
  // Партньор: '' = ръчно въвеждане, иначе id на избран профил
  const [partnerChoice, setPartnerChoice] = useState('');
  const [partnerData, setPartnerData] = useState({
    partner_name: '',
    partner_date: '',
    partner_time: '',
  });
  const [partnerPlace, setPartnerPlace] = useState(emptyPlace());

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [monthlyResults, setMonthlyResults] = useState([]); // For chunked PDF generation
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [searchParams] = useSearchParams();
  const [billingConfig, setBillingConfig] = useState(null);
  const [crisisHtml, setCrisisHtml] = useState('');
  const [needsBalance, setNeedsBalance] = useState(false); // сървърът отказа анализа заради недостиг на средства

  const updateBalance = (source) => {
    if (!source) return;
    setUser((prev) => {
      if (!prev) return prev;
      const next = withBalance(prev, source);
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  };

  const refreshSavedProfiles = async () => {
    try {
      await migrateLocalData();
      setSavedProfiles(await fetchProfiles());
    } catch (err) {
      console.error('Грешка при зареждане на профилите:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const sessionUser = await verifySession(navigate);
      if (isMounted && sessionUser) {
        setUser(sessionUser);
        refreshSavedProfiles();
        api.get('/billing/config').then((r) => setBillingConfig(r.data)).catch(() => {});
        api.post('/events', { name: 'report_form_opened' }).catch(() => {});
      }
    };

    loadUser();

    // Инициализация на транзитна дата с текущата дата
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    
    if (!transitData.target_date) {
      setTransitData(prev => ({
        ...prev,
        target_date: today,
        target_time: currentTime,
      }));
    }
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const selectedProfile = savedProfiles.find((p) => String(p.id) === profileChoice) || null;
  const partnerProfile = savedProfiles.find((p) => String(p.id) === partnerChoice) || null;

  // Горна граница на периода на прогнозата (календарни месеци), по настройките на сървъра
  const forecastLimits = { ...FALLBACK_LIMITS, ...(billingConfig?.limits || {}) };
  const forecastMaxMonths = enablePartner ? forecastLimits.forecast_max_months_pair : forecastLimits.forecast_max_months_single;
  const forecastStart = transitData.target_date || `${new Date().getFullYear()}-01-01`;
  const forecastMaxEnd = maxEndDate(forecastStart, forecastMaxMonths);
  const forecastWho = enablePartner ? 'за двама души' : 'за един човек';

  const emptyPartnerData = { partner_name: '', partner_date: '', partner_time: '' };

  // Избор на партньор от „Профили“: данните му се попълват и остават редактируеми
  const applyPartnerProfile = (profile) => {
    setPartnerChoice(String(profile.id));
    setPartnerData({
      partner_name: profile.name,
      partner_date: profile.birth_date || '',
      partner_time: profile.birth_time || '',
    });
    setPartnerPlace(placeFromProfile(profile));
  };

  // Партньорът от запазените настройки на профила. Ако името му съвпада с профил,
  // актуалните данни на този профил са с предимство пред запазения запис.
  const restorePartner = (settings) => {
    const saved = settings.partnerData || {};
    const matched = saved.partner_name ? savedProfiles.find((p) => p.name === saved.partner_name) : null;
    if (settings.enablePartner && matched) {
      applyPartnerProfile(matched);
      return;
    }
    setPartnerChoice('');
    setPartnerData({
      partner_name: saved.partner_name || '',
      partner_date: saved.partner_date || '',
      partner_time: saved.partner_time || '',
    });
    // Новият формат пази partnerPlace; старият - градът и координатите отделно
    setPartnerPlace(
      settings.partnerPlace
        ? normalizePlace(settings.partnerPlace)
        : placeFromParts(settings.selectedPartnerCity, saved.partner_lat, saved.partner_lon)
    );
  };

  // Избор на профил: данните за раждане идват от профила, а настройките на формата
  // (въпрос, транзити, партньор) - от profile.settings
  const applyProfile = (profile) => {
    const settings = profile.settings || {};
    setProfileChoice(String(profile.id));
    setName(profile.name);
    setFormData({
      date: profile.birth_date || '',
      time: profile.birth_time || '',
      question: settings.question || '',
    });
    setBirthPlace(placeFromProfile(profile));
    setEnableTransit(Boolean(settings.enableTransit));
    if (settings.transitData) setTransitData(settings.transitData);
    setEnablePartner(Boolean(settings.enablePartner));
    restorePartner(settings);
  };

  const handleProfileChange = (e) => {
    const value = e.target.value;
    setProfileChoice(value);
    if (!value) {
      // Ръчно въвеждане: започваме с празни данни за раждане
      setName('');
      setFormData((prev) => ({ ...prev, date: '', time: '' }));
      setBirthPlace(emptyPlace());
      return;
    }
    const profile = savedProfiles.find((p) => String(p.id) === value);
    if (profile) applyProfile(profile);
  };

  const handlePartnerProfileChange = (e) => {
    const value = e.target.value;
    setPartnerChoice(value);
    if (!value) {
      setPartnerData(emptyPartnerData);
      setPartnerPlace(emptyPlace());
      return;
    }
    const profile = savedProfiles.find((p) => String(p.id) === value);
    if (profile) applyPartnerProfile(profile);
  };

  // ?profile=Име идва от onboarding: профилът се избира веднага щом профилите се заредят
  const presetApplied = useRef(false);
  useEffect(() => {
    const preset = searchParams.get('profile');
    if (!preset || presetApplied.current || savedProfiles.length === 0) return;
    const profile = savedProfiles.find((p) => p.name === preset);
    if (profile) {
      presetApplied.current = true;
      applyProfile(profile);
    }
  }, [savedProfiles, searchParams]);

  // След успешен анализ запомняме настройките на формата към избрания профил.
  // Данните за раждане на съществуващ профил не се променят оттук (редактират се в „Профили“).
  // Ново име, въведено ръчно, се запазва като нов профил.
  const persistProfile = async (coords) => {
    const settings = {
      question: formData.question || '',
      transitData,
      enableTransit,
      partnerData,
      partnerPlace,
      enablePartner,
    };
    try {
      if (selectedProfile) {
        await upsertProfile({
          name: selectedProfile.name,
          relation: selectedProfile.relation,
          gender: selectedProfile.gender,
          birth_date: selectedProfile.birth_date,
          birth_time: selectedProfile.birth_time || '',
          unknown_time: Boolean(selectedProfile.unknown_time),
          birth_place: selectedProfile.birth_place || '',
          lat: selectedProfile.lat,
          lon: selectedProfile.lon,
          settings,
        });
      } else if (name.trim() && !savedProfiles.some((p) => p.name === name.trim())) {
        await upsertProfile({
          name: name.trim(),
          relation: 'self',
          gender: null,
          birth_date: formData.date,
          birth_time: formData.time || '',
          unknown_time: !formData.time,
          birth_place: placeLabel(birthPlace),
          lat: coords.lat,
          lon: coords.lon,
          settings,
        });
      } else {
        return;
      }
      refreshSavedProfiles();
    } catch (err) {
      console.error('Грешка при запазване на профил:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePartnerChange = (e) => {
    const { name, value } = e.target;
    setPartnerData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDynamicForecastStreaming = async (API_BASE_URL, requestData) => {
    const token = localStorage.getItem('token');
    return new Promise((resolve, reject) => {
      // AbortController: прекъсва само при пълно мълчание на сървъра. Времето се подновява с всяко получено събитие,
      // защото един месец с проверка и поправка на фактите може да трае няколко минути.
      const controller = new AbortController();
      let timeoutId = null;
      const armTimeout = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => controller.abort(), STREAM_IDLE_TIMEOUT_MS);
      };
      armTimeout();
      
      // Use fetch with ReadableStream for POST requests with SSE
      fetch(`${API_BASE_URL}/interpret-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(requestData),
        signal: controller.signal,
      })
      .then(response => {
        if (response.status === 401 || response.status === 403) {
          clearSessionAndRedirect(navigate);
          throw new Error('Сесията е изтекла. Моля влезте отново.');
        }
        if (!response.ok) {
          return response.json().catch(() => ({})).then(body => {
            const failure = new Error(typeof body.detail === 'string' ? body.detail : `HTTP error! status: ${response.status}`);
            failure.status = response.status;
            throw failure;
          });
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        let monthlyResultsTemp = [];
        let hasError = false;

        const processText = (text) => {
          buffer += text;
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6); // Remove 'data: ' prefix
              if (jsonStr.trim()) {
                try {
                  const data = JSON.parse(jsonStr);
                  handleSSEMessage(data, monthlyResultsTemp, resolve, reject);
                } catch (err) {
                  console.error('Error parsing SSE data:', err, jsonStr);
                }
              }
            }
          }
        };

        // Общият преглед на периода (когато е готов) е първи, после месеците
        const formatInterpretation = (items) => items.map((m, idx) => {
          const separator = idx > 0 ? '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' : '';
          return `${separator}## ${m.isOverview ? '🔭' : '📅'} ${m.month}\n\n${m.text}`;
        }).join('\n\n');

        const handleSSEMessage = (data, monthlyResultsTemp, resolve, reject) => {
          switch (data.type) {
            case 'start':
              setLoadingMessage(`Започва генериране на прогноза за ${data.total_months} месеца...`);
              // Set natal chart data with aspects immediately when stream starts
              setResult(prev => ({
                ...prev,
                natal_chart: data.natal_chart || null,
                partner_chart: data.partner_chart || null,
                transit_chart: data.transit_chart || null, // Add transit chart from start event
                natal_aspects: data.natal_aspects || null,
                partner_natal_aspects: data.partner_natal_aspects || null,
                interpretation: ''
              }));
              break;
              
            case 'month_start':
              setLoadingMessage(`Генериране на подробен месечен анализ за месец ${data.month}`);
              break;
              
              case 'month_complete':
              // Add monthly result immediately
              monthlyResultsTemp.push({
                month: data.month,
                text: data.text
              });
              
              // Update state with monthly results for PDF generation
              setMonthlyResults([...monthlyResultsTemp]);
              
              // Update result with accumulated months
              // Format with clean markdown for proper rendering in PDF
              setResult(prev => ({
                ...prev,
                interpretation: formatInterpretation(monthlyResultsTemp),
                natal_chart: prev?.natal_chart || null,
                partner_chart: prev?.partner_chart || null,
                transit_chart: prev?.transit_chart || null // Preserve transit_chart
              }));
              break;

            case 'overview_start':
              setLoadingMessage('Съставяне на общия преглед на периода...');
              break;

            case 'overview_complete':
              // Общият преглед идва след месеците, но се показва най-отгоре (и първи в PDF и DOCX)
              monthlyResultsTemp.unshift({
                month: data.title || 'Общ преглед на периода',
                text: data.text,
                isOverview: true
              });
              setMonthlyResults([...monthlyResultsTemp]);
              setResult(prev => ({
                ...prev,
                interpretation: formatInterpretation(monthlyResultsTemp),
                natal_chart: prev?.natal_chart || null,
                partner_chart: prev?.partner_chart || null,
                transit_chart: prev?.transit_chart || null
              }));
              break;
              
            case 'crisis':
              setCrisisHtml(data.html || '');
              setLoadingMessage('');
              clearTimeout(timeoutId);
              resolve();
              break;

            case 'complete':
              updateBalance(data);
              setLoadingMessage('');
              clearTimeout(timeoutId);
              resolve();
              break;
              
            case 'error':
              hasError = true;
              clearTimeout(timeoutId);
              if (data.code === 402) setNeedsBalance(true);
              setError(data.message || 'Грешка при генериране на прогноза');
              // Неуспешната прогноза не се записва и не се таксува: не оставяме недовършени месеци на екрана
              setMonthlyResults([]);
              setResult(prev => (prev ? { ...prev, interpretation: '' } : prev));
              reject(new Error(data.message));
              break;
          }
        };

        const pump = () => {
          reader.read()
            .then(({ done, value }) => {
              if (done) {
                if (!hasError) {
                  resolve();
                }
                return;
              }
              
              armTimeout();
              const text = decoder.decode(value, { stream: true });
              processText(text);
              pump();
            })
            .catch(err => {
              console.error('Stream reading error:', err);
              setError('Грешка при четене на данните');
              reject(err);
            });
        };

        pump();
      })
      .catch(error => {
        clearTimeout(timeoutId);
        console.error('Fetch error:', error);
        setError('Грешка при свързване със сървъра');
        reject(error);
      });
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingMessage('');
    setError(null);
    setNeedsBalance(false);
    setResult(null);
    setCrisisHtml('');

    try {
      // Валидация
      if (!formData.date || !formData.time || !birthPlace.lat || !birthPlace.lon) {
        throw new Error('Моля попълнете всички задължителни полета');
      }

      const lat = parseFloat(birthPlace.lat);
      const lon = parseFloat(birthPlace.lon);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        throw new Error('Географската ширина трябва да е между -90 и 90');
      }

      if (isNaN(lon) || lon < -180 || lon > 180) {
        throw new Error('Географската дължина трябва да е между -180 и 180');
      }

      if (isDynamic) {
        if (!endDate) {
          throw new Error('Изберете крайна дата на прогнозата');
        }
        if (endDate < forecastStart) {
          throw new Error('Крайната дата на прогнозата трябва да е след началната.');
        }
        if (forecastMaxEnd && endDate > forecastMaxEnd) {
          throw new Error(`Прогнозата може да обхваща най-много ${forecastMaxMonths} месеца ${forecastWho}. Крайната дата може да е най-късно ${formatBgDate(forecastMaxEnd)}.`);
        }
      }

      // Подготовка на данните за заявката
      const requestData = {
        name: name.trim() || undefined,
        date: formData.date,
        time: formData.time,
        lat: lat,
        lon: lon,
        question: formData.question || undefined,
        report_type: reportType,
      };
      const firstGender = knownGender(selectedProfile, name);
      if (firstGender) requestData.gender = firstGender;

      // Условна логика за Dynamic Forecast Mode
      if (isDynamic) {
        // Dynamic Forecast Mode - използваме date range
        requestData.is_dynamic = true;
        // Use the start date from transitData (Начална дата field) or default to 01.01 of current year
        const currentYear = new Date().getFullYear();
        requestData.target_date = transitData.target_date || `${currentYear}-01-01`;
        requestData.end_date = endDate;
      } else {
        // Стандартен режим - транзитни данни
        let targetDatePayload = null;
        let targetTimePayload = null;
        
        if (enableTransit) {
          // Ако checkbox е активиран, използваме предоставената дата или текущата дата/час
          const now = new Date();
          targetDatePayload = transitData.target_date || now.toISOString().split('T')[0];
          targetTimePayload = transitData.target_time || now.toTimeString().slice(0, 5);
          
          requestData.target_date = targetDatePayload;
          requestData.target_time = targetTimePayload;
        }
        // Ако checkbox НЕ е активиран, target_date и target_time остават undefined (не се изпращат)
      }

      // Добавяне на partner данни, ако са активирани
      if (enablePartner && partnerData.partner_date && partnerData.partner_time && partnerPlace.lat && partnerPlace.lon) {
        const partnerLat = parseFloat(partnerPlace.lat);
        const partnerLon = parseFloat(partnerPlace.lon);
        
        if (!isNaN(partnerLat) && !isNaN(partnerLon)) {
          requestData.partner_name = partnerData.partner_name.trim() || undefined;
          requestData.partner_date = partnerData.partner_date;
          requestData.partner_time = partnerData.partner_time;
          requestData.partner_lat = partnerLat;
          requestData.partner_lon = partnerLon;
          const secondGender = knownGender(partnerProfile, partnerData.partner_name);
          if (secondGender) requestData.partner_gender = secondGender;
        }
      }

      // Динамичен избор на URL:
      // - В production (hostname != localhost): използва Render.com API
      // - В development (localhost): използва локален сървър
      const API_BASE_URL = getApiBaseUrl();
      const token = localStorage.getItem('token');

      // Изпращане на заявка
      // Проверка дали е динамична прогноза - използваме streaming
      if (isDynamic) {
        // Use Server-Sent Events for streaming
        await handleDynamicForecastStreaming(API_BASE_URL, requestData);
      } else {
        // Standard request
        const response = await axios.post(`${API_BASE_URL}/interpret`, requestData, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          timeout: REQUEST_TIMEOUT_MS  // анализът с проверка и евентуална поправка на фактите може да трае няколко минути
        });

        if (response.data.crisis) {
          setCrisisHtml(response.data.interpretation);
        } else {
          setResult(response.data);
          updateBalance(response.data);
        }
      }
      
      // Запомняме настройките към профила (или запазваме нов профил) на сървъра
      persistProfile({ lat, lon });
    } catch (err) {
      console.error('Грешка:', err);

      if (err?.response?.status === 401 || err?.response?.status === 403) {
        clearSessionAndRedirect(navigate);
        return;
      }
      if ((err?.response?.status || err?.status) === 402) setNeedsBalance(true);

      // Извличане на съобщението за грешка, премахвайки префикси като "Неочаквана грешка: 400:"
      let errorMessage = err.response?.data?.detail || err.message || 'Възникна грешка при изчисляване на картата';
      
      // Премахване на префикси като "Неочаквана грешка: 400:" или "400:"
      errorMessage = errorMessage.replace(/^(Неочаквана грешка:\s*)?\d+:\s*/i, '').trim();
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex h-screen w-full bg-[#161022] overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-[#131118]">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-[#5211d4]/20 p-2 rounded-full">
            <span className="material-symbols-outlined text-[#5211d4]" style={{ fontSize: '28px' }}>nightlight_round</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight text-white">AstroMind</h1>
            <p className="text-[#a69db9] text-xs font-medium">Cosmic Insights</p>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 px-4 py-4 grow">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#a69db9] hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-sm font-medium">Табло</span>
          </button>
          <button 
            onClick={() => navigate('/generate-report')}
            className="flex items-center gap-3 px-3 py-3 rounded-lg bg-[#5211d4] text-white shadow-lg shadow-[#5211d4]/25 transition-all"
          >
            <span className="material-symbols-outlined">auto_awesome</span>
            <span className="text-sm font-medium">Генерирай хороскоп</span>
          </button>
          <button
            onClick={() => navigate('/profiles')}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#a69db9] hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined">groups</span>
            <span className="text-sm font-medium">Профили</span>
          </button>
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#a69db9] hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined">history</span>
            <span className="text-sm font-medium">История</span>
          </button>
          <div className="h-px bg-slate-800 my-2"></div>
          <button onClick={() => navigate('/settings')} className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#a69db9] hover:bg-white/5 transition-all">
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm font-medium">Настройки</span>
          </button>
          <button 
            onClick={() => navigate('/balance')}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#a69db9] hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined">credit_card</span>
            <span className="text-sm font-medium">Баланс</span>
          </button>
        </div>
        
        <div className="p-4 border-t border-slate-800 relative">
          {logoutConfirm && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#1f1c27] border border-slate-700 rounded-2xl p-4 shadow-2xl z-50">
              <p className="text-sm font-semibold text-white mb-1">Изход от акаунта?</p>
              <p className="text-xs text-[#a69db9] mb-3">Ще бъдеш пренасочен към началната страница.</p>
              <div className="flex gap-2">
                <button onClick={() => clearSessionAndRedirect(navigate)} className="flex-1 py-2 bg-[#5211d4] hover:bg-[#5211d4]/90 text-white text-xs font-bold rounded-xl transition-all">Да, изход</button>
                <button onClick={() => { setLogoutConfirm(false); setUserMenuOpen(false); }} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-slate-400 text-xs rounded-xl transition-all">Отказ</button>
              </div>
            </div>
          )}
          {userMenuOpen && !logoutConfirm && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#1f1c27] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl z-50">
              <div className="px-4 py-3 bg-[#5211d4]/10 border-b border-slate-700/50">
                <p className="text-xs text-[#a69db9]">Влязъл като</p>
                <p className="text-sm font-semibold text-white truncate">{user.email}</p>
              </div>
              <div className="p-2">
                <button onClick={() => { navigate('/settings'); setUserMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/5 transition-all text-left">
                  <span className="material-symbols-outlined text-[#5211d4]" style={{ fontSize: '18px' }}>manage_accounts</span>
                  Редактирай профила
                </button>
                <button onClick={() => { navigate('/balance'); setUserMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/5 transition-all text-left">
                  <span className="material-symbols-outlined text-yellow-400" style={{ fontSize: '18px' }}>token</span>
                  Баланс: {formatEur(balanceOf(user))}
                </button>
                <div className="h-px bg-slate-800 my-1" />
                <button onClick={() => setLogoutConfirm(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all text-left">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
                  Изход
                </button>
              </div>
            </div>
          )}
          <button className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all group" onClick={() => { setUserMenuOpen(o => !o); setLogoutConfirm(false); }}>
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a855f7] flex items-center justify-center shadow-lg shadow-[#7c3aed]/40">
                <span className="text-xs font-bold text-white">{user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '?'}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#131118] flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-yellow-400 flex items-center justify-center">
                  <span className="text-[6px] font-black text-yellow-900">✦</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-white truncate">{user.full_name || 'Потребител'}</p>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-yellow-400" style={{ fontSize: '11px' }}>token</span>
                <span className="text-[11px] text-yellow-400 font-medium">{formatEur(balanceOf(user))}</span>
                <span className="text-[#a69db9] text-[10px] mx-1">·</span>
                <span className="text-[11px] text-[#a69db9]">{accessLabel(user)}</span>
              </div>
            </div>
            <span className={`material-symbols-outlined text-slate-500 group-hover:text-slate-300 transition-all ${userMenuOpen ? 'rotate-180' : ''}`} style={{ fontSize: '18px' }}>expand_less</span>
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-[#131118] border-r border-slate-800 z-40 md:hidden flex flex-col">
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-[#5211d4]/20 p-2 rounded-full">
                  <span className="material-symbols-outlined text-[#5211d4]" style={{ fontSize: '28px' }}>nightlight_round</span>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-lg font-bold leading-tight text-white">AstroMind</h1>
                  <p className="text-[#a69db9] text-xs font-medium">Cosmic Insights</p>
                </div>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2 px-4 py-4 grow">
              {NAV_ITEMS.map((item) => (
                <React.Fragment key={item.path}>
                  {item.separated && <div className="h-px bg-slate-800 my-2"></div>}
                  <button
                    onClick={() => { navigate(item.path); setIsSidebarOpen(false); }}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                      item.path === '/generate-report'
                        ? 'bg-[#5211d4] text-white shadow-lg shadow-[#5211d4]/25'
                        : 'text-[#a69db9] hover:bg-white/5'
                    }`}
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                </React.Fragment>
              ))}
            </div>

            <div className="p-4 border-t border-slate-800">
              <p className="text-sm font-semibold text-white truncate">{user.full_name || 'Потребител'}</p>
              <p className="text-[11px] text-yellow-400 font-medium">{formatEur(balanceOf(user))}</p>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 h-full overflow-hidden bg-[#131118]">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-[#131118] border-b border-slate-800 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#5211d4]">nightlight_round</span>
            <span className="font-bold text-white">AstroMind</span>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
          <main className="container mx-auto px-4 py-8">
        <div id="report-content" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side: Form + Chart */}
          <div className="space-y-6">
            {/* Form */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-purple-800/30">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                Въвеждане на данни
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Profile Selector */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    <User className="w-4 h-4 inline mr-1" />
                    Профил
                  </label>
                  <select
                    value={selectedProfile ? profileChoice : ''}
                    onChange={handleProfileChange}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-purple-800/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                  >
                    <option value="">Ръчно въвеждане (без профил)</option>
                    {savedProfiles.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {!selectedProfile && (
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      placeholder="Име (по желание; ще се запази като нов профил)"
                      className="mt-2 w-full px-4 py-2 bg-slate-700/50 border border-purple-800/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                    />
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    {selectedProfile
                      ? 'Данните са от профила. Промените в полетата важат само за този анализ; профилът се редактира в „Профили“.'
                      : savedProfiles.length === 0
                        ? 'Още нямате профили. Създайте ги в „Профили“ или въведете данните ръчно.'
                        : 'Изберете профил или въведете данните ръчно.'}{' '}
                    <button type="button" onClick={() => navigate('/profiles')} className="underline text-purple-300 hover:text-purple-200">
                      Към Профили
                    </button>
                  </p>
                </div>

                {/* Birth place: град от списъка или „Друг“ (търсене с AI или ръчно) */}
                <BirthPlaceSelect key={`person-${profileChoice}`} value={birthPlace} onChange={setBirthPlace} variant="purple" label="Град на раждане" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Дата на раждане <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 bg-slate-700/50 border border-purple-800/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Час на раждане <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="time"
                      name="time"
                      value={formData.time}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 bg-slate-700/50 border border-purple-800/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                    />
                  </div>
                </div>

                {/* Ширина и дължина: попълват се от града или от AI и могат да се коригират */}
                <BirthCoordinates
                  value={birthPlace}
                  onChange={setBirthPlace}
                  variant="purple"
                  required
                  names={{ lat: 'lat', lon: 'lon' }}
                />

                {/* Dynamic Forecast Mode Section */}
                <div className="border-t border-blue-800/30 pt-4 bg-blue-950/10 rounded-lg p-4 border-2 border-blue-800/20">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="isDynamic"
                      checked={isDynamic}
                      onChange={(e) => {
                        setIsDynamic(e.target.checked);
                        if (e.target.checked) {
                          setEnableTransit(false); // Деактивиране на стандартния транзитен режим
                        }
                      }}
                      className="w-4 h-4 rounded bg-slate-700/50 border-blue-800/30 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="isDynamic" className="text-sm font-medium text-gray-300 flex items-center gap-2 cursor-pointer">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      📅 Динамична Прогноза (Период)
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 italic mb-4 ml-6">
                    Генерира месечен анализ за избран период с конкретни транзити и събития за всеки месец.
                  </p>
                  
                  {isDynamic && (
                    <div className="pl-6 border-l-2 border-blue-800/30 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-300">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Начална дата
                          </label>
                          <input
                            type="date"
                            value={transitData.target_date}
                            onChange={(e) => setTransitData(prev => ({ ...prev, target_date: e.target.value }))}
                            className="w-full px-4 py-2 bg-slate-700/50 border border-blue-800/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-300">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Крайна дата <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            required={isDynamic}
                            min={forecastStart}
                            max={forecastMaxEnd || undefined}
                            className="w-full px-4 py-2 bg-slate-700/50 border border-blue-800/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">
                        Периодът може да е най-много {forecastMaxMonths} месеца {forecastWho}: крайната дата е най-късно {formatBgDate(forecastMaxEnd)}.
                      </p>
                    </div>
                  )}
                </div>

                {/* Forecast Date Section (Standard Transit Mode) */}
                {!isDynamic && (
                  <div className="border-t border-purple-800/30 pt-4 bg-purple-950/10 rounded-lg p-4 border-2 border-purple-800/20">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id="enableTransit"
                        checked={enableTransit}
                        onChange={(e) => setEnableTransit(e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-700/50 border-purple-800/30 text-purple-600 focus:ring-purple-500"
                      />
                      <label htmlFor="enableTransit" className="text-sm font-medium text-gray-300 flex items-center gap-2 cursor-pointer">
                        <TrendingUp className="w-4 h-4 text-purple-400" />
                        Анализ на транзити (прогнозна дата)
                      </label>
                    </div>
                    <p className="text-xs text-gray-400 italic mb-4 ml-6">
                      Анализира транзитите към наталната карта за конкретна дата и час (моментен snapshot).
                    </p>

                    {enableTransit && (
                      <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-purple-800/30">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-300">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Прогнозна дата
                          </label>
                          <input
                            type="date"
                            value={transitData.target_date}
                            onChange={(e) => setTransitData(prev => ({ ...prev, target_date: e.target.value }))}
                            className="w-full px-4 py-2 bg-slate-700/50 border border-purple-800/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-300">
                            <Clock className="w-4 h-4 inline mr-1" />
                            Прогнозен час
                          </label>
                          <input
                            type="time"
                            value={transitData.target_time}
                            onChange={(e) => setTransitData(prev => ({ ...prev, target_time: e.target.value }))}
                            className="w-full px-4 py-2 bg-slate-700/50 border border-purple-800/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Partner/Relationship Section */}
                <div className="border-t border-pink-800/30 pt-4 bg-pink-950/10 rounded-lg p-4 border-2 border-pink-800/20">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="enablePartner"
                      checked={enablePartner}
                      onChange={(e) => setEnablePartner(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-700/50 border-pink-800/30 text-pink-600 focus:ring-pink-500"
                    />
                    <label htmlFor="enablePartner" className="text-sm font-medium text-gray-300 flex items-center gap-2 cursor-pointer">
                      <Heart className="w-4 h-4 text-pink-400" />
                      Добави партньор / Режим на съвместимост
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 italic mb-4 ml-6">
                    Активира анализ на съвместимост (synastry) или прогноза за връзка между двама души.
                  </p>

                  {enablePartner && (
                    <div className="space-y-4 pl-6 border-l-2 border-pink-800/30">
                      {/* Partner: избор от „Профили“ или ръчно въвеждане */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">
                          <User className="w-4 h-4 inline mr-1" />
                          Име на партньора
                        </label>
                        <select
                          value={partnerProfile ? partnerChoice : ''}
                          onChange={handlePartnerProfileChange}
                          className="w-full px-4 py-2 bg-slate-700/50 border border-pink-800/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-white"
                        >
                          <option value="">Ръчно въвеждане (без профил)</option>
                          {savedProfiles.map((p) => (
                            <option key={p.id} value={String(p.id)}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        {!partnerProfile && (
                          <input
                            type="text"
                            name="partner_name"
                            value={partnerData.partner_name}
                            onChange={handlePartnerChange}
                            maxLength={100}
                            placeholder="Име на партньора..."
                            className="mt-2 w-full px-4 py-2 bg-slate-700/50 border border-pink-800/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-white"
                          />
                        )}
                      </div>

                      {/* Partner city */}
                      <BirthPlaceSelect key={`partner-${partnerChoice}`} value={partnerPlace} onChange={setPartnerPlace} variant="pink" label="Град на раждане на партньора" />

                      {/* Partner Date and Time */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-300">
                            Дата на раждане <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="date"
                            name="partner_date"
                            value={partnerData.partner_date}
                            onChange={handlePartnerChange}
                            required={enablePartner}
                            className="w-full px-4 py-2 bg-slate-700/50 border border-pink-800/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-300">
                            Час на раждане <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="time"
                            name="partner_time"
                            value={partnerData.partner_time}
                            onChange={handlePartnerChange}
                            required={enablePartner}
                            className="w-full px-4 py-2 bg-slate-700/50 border border-pink-800/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-white"
                          />
                        </div>
                      </div>

                      {/* Partner Coordinates */}
                      <BirthCoordinates
                        value={partnerPlace}
                        onChange={setPartnerPlace}
                        variant="pink"
                        required
                        names={{ lat: 'partner_lat', lon: 'partner_lon' }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    Въпрос (опционално)
                  </label>
                  <textarea
                    name="question"
                    value={formData.question}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Задайте конкретен въпрос за интерпретация..."
                    className="w-full px-4 py-2 bg-slate-700/50 border border-purple-800/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white resize-none"
                  />
                </div>

                {/* Report Type Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Изберете тип на анализа</label>
                  <p className="text-xs text-gray-400 mb-3 italic">
                    {isDynamic || enableTransit 
                      ? "Филтрира прогнозата да се фокусира специфично върху избрания тип събития за избрания период."
                      : "Анализира потенциала от вашата натална карта относно избрания тип тема."}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { id: 'general', label: 'Общ Анализ', icon: '✨', description: 'Цялостен анализ на личността и потенциала.' },
                      { id: 'health', label: 'ЗДРАВЕ', icon: 'health', description: 'Анализ на физическото и психическото здраве, тонус и рискове.' },
                      { id: 'career', label: 'Кариера', icon: '💼', description: 'Анализ на професионалния потенциал и кариерни възможности.' },
                      { id: 'money', label: 'Пари и Успех', icon: '💰', description: 'Анализ на финансовия потенциал и материален успех.' },
                      { id: 'love', label: 'Любов', icon: '❤️', description: 'Анализ на любовния живот и партньорство.' },
                      { id: 'karmic', label: 'КАРМА И РОД', icon: 'karmic', description: 'Анализ на кармичните уроци, родовите модели (Майка/Баща) и ретроградните периоди.' },
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setReportType(type.id)}
                        className={`p-3 rounded-lg border transition-all flex flex-col items-center justify-center gap-2 text-center ${
                          reportType === type.id
                            ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:border-gray-500'
                        }`}
                      >
                        {type.icon === 'health' ? (
                          <Activity className="w-6 h-6" />
                        ) : type.icon === 'karmic' ? (
                          <Infinity className="w-6 h-6" />
                        ) : (
                          <span className="text-2xl">{type.icon}</span>
                        )}
                        <span className="text-xs font-bold uppercase tracking-wider break-words">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {billingConfig?.balance_enforced && (() => {
                  const months = isDynamic ? periodMonths(forecastStart, endDate || forecastStart) : 1;
                  const quote = quoteFor(billingConfig.prices, { dynamic: isDynamic, months, hasPartner: enablePartner });
                  const available = availableFor(user, quote.premium);
                  const enough = available >= quote.cents;
                  return (
                    <div className="text-center space-y-1">
                      <p className={`text-sm ${enough ? 'text-gray-300' : 'text-red-300'}`}>
                        Цена: <b>{formatEur(quote.cents)}</b>{isDynamic ? ' (прибл.)' : ''} · {quote.premium ? 'Внесени средства' : 'Баланс'}: <b>{formatEur(available)}</b>
                        {!enough && (
                          <button type="button" onClick={() => navigate('/balance')} className="ml-2 underline text-purple-300">Зареди баланс</button>
                        )}
                      </p>
                      {quote.premium && (
                        <p className="text-xs text-gray-400">
                          {enablePartner && !isDynamic ? 'Анализът за двама' : 'Прогнозата за период'} е премиум услуга: плаща се само от внесени средства, не от подаръка.
                        </p>
                      )}
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full font-bold py-3 px-4 rounded-lg shadow-lg transition-all flex justify-center items-center gap-2
                    ${loading 
                      ? 'bg-gray-600 cursor-not-allowed opacity-80' 
                      : enablePartner
                        ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white transform hover:scale-[1.02]'
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transform hover:scale-[1.02]'
                    }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <div className="flex flex-col items-center gap-2">
                        <span>
                          {loadingMessage || (isDynamic 
                            ? 'Генериране на подробен месечен анализ...' 
                            : 'ГЕНЕРИРАНЕ НА ПОДРОБЕН АНАЛИЗ')}
                        </span>
                        {loading && (
                          <span className="text-red-400 font-bold text-2xl animate-pulse">
                            Моля изчакайте!
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {enablePartner ? (
                        <>
                          <Heart className="w-5 h-5" />
                          Анализ на съвместимост
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Изчисли карта
                        </>
                      )}
                    </>
                  )}
                </button>
              </form>
            </div>

            {crisisHtml && (
              <div
                className="bg-indigo-950/60 border border-indigo-400/40 rounded-lg p-6 text-indigo-50 space-y-3 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(crisisHtml) }}
              />
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-200">{error}</p>
                {needsBalance && (
                  <button onClick={() => navigate('/balance')} className="mt-3 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold">
                    Зареди баланс
                  </button>
                )}
              </div>
            )}

            {/* Charts - Original Layout */}
            {result && (
              <div className="space-y-6">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-purple-800/30" style={{ overflow: 'visible' }}>
                  <h2 className="text-xl font-semibold mb-4">Натална карта</h2>
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <AstroChart data={result.natal_chart} />
                  </div>
                </div>

                {/* Chart Summary - обобщена информация */}
                <ChartSummary 
                  natalChart={result.natal_chart} 
                  natalAspects={result.natal_aspects || null}
                />
                
                {result.partner_chart && (
                  <>
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border-2 border-pink-800/30">
                      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-pink-400" />
                        Карта на партньора
                      </h2>
                      <AstroChart data={result.partner_chart} />
                    </div>
                    
                    {/* Chart Summary - обобщена информация за partner chart */}
                    <ChartSummary 
                      natalChart={result.partner_chart} 
                      natalAspects={result.partner_natal_aspects || null}
                    />
                  </>
                )}
                
                {result.transit_chart && (
                  <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-purple-800/30">
                    <h2 className="text-xl font-semibold mb-4">
                      Транзитна карта ({result.transit_chart.datetime_utc?.split('T')[0] || 'Няма дата'})
                    </h2>
                    <AstroChart data={result.transit_chart} />
                  </div>
                )}

                {/* Download PDF Button */}
                <DownloadPDFButton 
                  fileName={`Astrology_Report_${name || 'Chart'}_${new Date().toISOString().split('T')[0]}.pdf`}
                  userName={name.trim()}
                  birthCity={placeLabel(birthPlace)}
                  natalChart={result.natal_chart}
                  natalAspects={result.natal_aspects || null}
                  monthlyResults={monthlyResults}
                  staticInterpretation={result.interpretation || null}
                />
              </div>
            )}
          </div>

          {/* Right Side: AI Interpretation */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-purple-800/30 h-full">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              AI Интерпретация
            </h2>
            
            {loading && (
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
                <p className="text-gray-400">AI анализира картата...</p>
              </div>
            )}

            {!loading && !result && (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <p className="text-center">
                  Въведете данни и изчислете карта,<br />
                  за да видите AI интерпретация
                </p>
              </div>
            )}

            {result && result.interpretation && (
              <div className="prose prose-invert max-w-none">
                <div 
                  className="text-gray-200 leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(result.interpretation
                      .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-purple-400 mt-6 mb-3">$1</h2>')
                      .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold text-purple-300 mt-4 mb-2">$1</h3>')
                      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br />')
                    )
                  }}
                />
              </div>
            )}
          </div>
        </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default GenerateReport;
