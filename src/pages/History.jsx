import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReportText from '../components/ReportText';
import ReportExport from '../components/ReportExport';
import { filterGroups, filterItems, profileOptions } from '../utils/historyFilters';
import { verifySession, clearSessionAndRedirect } from '../utils/auth';
import { api, deleteReport, fetchReport, fetchReports, formatDate, migrateLocalData, REPORT_TYPE_LABELS } from '../utils/api';
import { accessLabel, balanceOf, formatEur } from '../utils/money';
import { fetchJobs, hideFailedJobs, hideJob, isActive, rememberJob } from '../utils/jobs';

export default function History() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Историята идва от сървъра
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [timeline, setTimeline] = useState(null);
  const [timelineError, setTimelineError] = useState('');
  const [jobs, setJobs] = useState([]);   // анализи в процес и неуспешни от последното денонощие (Фаза 11)
  const [hideError, setHideError] = useState('');

  const loadJobs = async () => {
    try {
      setJobs(await fetchJobs({ limit: 10 }));
    } catch {
      // без задачите историята пак работи
    }
  };

  // „Скрий“: неуспешният запис изчезва от История (сървърът го пази скрит); списъкът се чете наново, за да се покажат следващите
  const hideOne = async (job) => {
    setHideError('');
    try {
      await hideJob(job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      loadJobs();
    } catch {
      setHideError('Записът не беше скрит. Опитайте отново.');
    }
  };

  const hideAllFailed = async () => {
    setHideError('');
    try {
      await hideFailedJobs();
      setJobs((prev) => prev.filter((j) => isActive(j) || j.status === 'succeeded'));
      loadJobs();
    } catch {
      setHideError('Записите не бяха скрити. Опитайте отново.');
    }
  };

  const loadReports = async () => {
    try {
      await migrateLocalData();
      const items = await fetchReports(500);
      setHistory(items.map((r) => ({ ...r, date: formatDate(r.created_at) })));
    } catch (err) {
      console.error('Грешка при зареждане на историята:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openReport = async (item) => {
    setViewingItem({ ...item, content: '' });
    setViewLoading(true);
    try {
      const full = await fetchReport(item.id);
      setViewingItem({ ...item, content: full.content });
    } catch {
      setViewingItem({ ...item, content: 'Отчетът не можа да бъде зареден.', failed: true });
    } finally {
      setViewLoading(false);
    }
  };

  const [filterType, setFilterType] = useState('all');
  const [filterProfile, setFilterProfile] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  useEffect(() => {
    let isMounted = true;
    const loadUser = async () => {
      const sessionUser = await verifySession(navigate);
      if (isMounted && sessionUser) {
        setUser(sessionUser);
        loadReports();
        loadJobs();
      }
    };
    loadUser();
    return () => { isMounted = false; };
  }, [navigate]);

  // Докато има анализ в процес, го следим: щом приключи, отчетът се появява в списъка
  const hasActiveJob = jobs.some(isActive);
  useEffect(() => {
    if (!user || !hasActiveJob) return undefined;
    const timer = setInterval(async () => {
      try {
        const latest = await fetchJobs({ limit: 10 });
        setJobs(latest);
        if (!latest.some(isActive)) loadReports();
      } catch {
        // следващият опит е след 5 секунди
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [user, hasActiveJob]);

  // Линк от генератора („Отвори в История“): отваря готовия отчет веднъж
  useEffect(() => {
    const id = location.state?.openReportId;
    if (!id || history.length === 0) return;
    const item = history.find((r) => r.id === id);
    if (item) openReport({ ...item, date: formatDate(item.created_at) });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, history.length]);

  // Втори ред за отчет: вид анализ (натален, за дата, за период), моментът или периодът и вторият човек
  const MODE_LABELS = { natal: 'Натален', snapshot: 'За дата', period: 'За период' };
  const modeLine = (r) => [MODE_LABELS[r.mode], r.when, r.partner ? `с ${r.partner}` : ''].filter(Boolean).join(' · ');

  const DAY_MS = 24 * 60 * 60 * 1000;
  const visibleJobs = jobs
    .filter((j) => isActive(j) || (j.status !== 'succeeded' && Date.now() - new Date(`${j.created_at}Z`).getTime() < DAY_MS))
    .slice(0, 5);
  const jobTitle = (j) => {
    const sm = j.summary || {};
    const base = REPORT_TYPE_LABELS[sm.report_type] || 'Анализ';
    return `${base}${sm.is_dynamic ? ' (прогноза за период)' : ''}${sm.partner_name ? ` с ${sm.partner_name}` : ''}${sm.name ? ` — ${sm.name}` : ''}`;
  };
  const openGenerator = (j) => {
    if (isActive(j) && user) rememberJob(user.id, j.id);
    // „Нов опит“ носи номера на задачата: генераторът възстановява нейните входни данни
    navigate('/generate-report', isActive(j) ? undefined : { state: { restoreJobId: j.id } });
  };

  // Времевата линия се зарежда веднъж (без филтри) и се филтрира с ТОВА ПРАВИЛО, с което се филтрира и таблицата (utils/historyFilters):
  // така една комбинация тема + профил + текст дава еднакво множество отчети в двата изгледа. Грешката не е „няма отчети“.
  useEffect(() => {
    if (viewMode !== 'timeline' || !user) return;
    setTimeline(null);
    setTimelineError('');
    api.get('/timeline')
      .then((r) => setTimeline(r.data))
      .catch(() => setTimelineError('Времевата линия не можа да се зареди. Опитайте отново.'));
  }, [viewMode, user, history.length]);

  // Смяна на филтър: връщане на първа страница
  useEffect(() => { setCurrentPage(1); }, [filterType, filterProfile, searchQuery]);

  const typeIcons = {
    general: 'auto_awesome', health: 'favorite_border', career: 'work',
    money: 'payments', love: 'favorite', karmic: 'all_inclusive'
  };
  const typeColors = {
    general: '#a78bfa', health: '#34d399', career: '#a3e635',
    money: '#fbbf24', love: '#f472b6', karmic: '#c084fc'
  };
  const typeLabels = REPORT_TYPE_LABELS;

  const filters = { type: filterType, profile: filterProfile, query: searchQuery };
  const filteredHistory = filterItems(history, filters);
  const timelineGroups = timeline ? filterGroups(timeline.groups, filters) : [];

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const profileChoices = profileOptions(history);

  if (!user) return null;

  const sidebarButtonClass = (isActive) =>
    `flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
      isActive
        ? 'bg-[#5211d4] text-white shadow-lg shadow-[#5211d4]/25'
        : 'text-[#d4c8ed] hover:bg-white/5'
    }`;

  return (
    <div className="flex h-screen w-full bg-[#161022] overflow-hidden">
      {/* Mobile Menu Button */}
      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#201428] rounded-lg border border-[#302240]">
        <span className="material-symbols-outlined">{isSidebarOpen ? 'close' : 'menu'}</span>
      </button>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-[#131118]">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-[#5211d4]/20 p-2 rounded-full">
            <span className="material-symbols-outlined text-[#5211d4]" style={{ fontSize: '28px' }}>nightlight_round</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight text-white">AstroMind</h1>
            <p className="text-[#d4c8ed] text-xs font-medium">Cosmic Insights</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 px-4 py-4 grow">
          <button onClick={() => navigate('/dashboard')} className={sidebarButtonClass(false)}>
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-sm font-medium">Табло</span>
          </button>
          <button onClick={() => navigate('/generate-report')} className={sidebarButtonClass(false)}>
            <span className="material-symbols-outlined">auto_awesome</span>
            <span className="text-sm font-medium">Генерирай хороскоп</span>
          </button>
          <button onClick={() => navigate('/profiles')} className={sidebarButtonClass(false)}>
            <span className="material-symbols-outlined">groups</span>
            <span className="text-sm font-medium">Профили</span>
          </button>
          <button className={sidebarButtonClass(true)}>
            <span className="material-symbols-outlined">history</span>
            <span className="text-sm font-medium">История</span>
          </button>
          <div className="h-px bg-slate-800 my-2"></div>
          <button onClick={() => navigate('/settings')} className={sidebarButtonClass(false)}>
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm font-medium">Настройки</span>
          </button>
          <button onClick={() => navigate('/balance')} className={sidebarButtonClass(false)}>
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
          <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-[#131118] border-r border-slate-800 z-40 md:hidden flex flex-col">
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-[#5211d4]/20 p-2 rounded-full">
                  <span className="material-symbols-outlined text-[#5211d4]" style={{ fontSize: '28px' }}>nightlight_round</span>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-lg font-bold leading-tight text-white">AstroMind</h1>
                  <p className="text-[#d4c8ed] text-xs font-medium">Cosmic Insights</p>
                </div>
              </div>
              <button aria-label="Затвори" onClick={() => setIsSidebarOpen(false)} className="p-2 text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-2 px-4 py-4 grow">
              <button onClick={() => { navigate('/dashboard'); setIsSidebarOpen(false); }} className={sidebarButtonClass(false)}>
                <span className="material-symbols-outlined">dashboard</span>
                <span className="text-sm font-medium">Табло</span>
              </button>
              <button onClick={() => { navigate('/generate-report'); setIsSidebarOpen(false); }} className={sidebarButtonClass(false)}>
                <span className="material-symbols-outlined">auto_awesome</span>
                <span className="text-sm font-medium">Генерирай хороскоп</span>
              </button>
              <button onClick={() => { navigate('/profiles'); setIsSidebarOpen(false); }} className={sidebarButtonClass(false)}>
                <span className="material-symbols-outlined">groups</span>
                <span className="text-sm font-medium">Профили</span>
              </button>
              <button className={sidebarButtonClass(true)}>
                <span className="material-symbols-outlined">history</span>
                <span className="text-sm font-medium">История</span>
              </button>
              <div className="h-px bg-slate-800 my-2"></div>
              <button onClick={() => { navigate('/settings'); setIsSidebarOpen(false); }} className={sidebarButtonClass(false)}>
                <span className="material-symbols-outlined">settings</span>
                <span className="text-sm font-medium">Настройки</span>
              </button>
              <button onClick={() => { navigate('/balance'); setIsSidebarOpen(false); }} className={sidebarButtonClass(false)}>
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
                    <button onClick={() => { navigate('/settings'); setUserMenuOpen(false); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/5 transition-all text-left">
                      <span className="material-symbols-outlined text-[#5211d4]" style={{ fontSize: '18px' }}>manage_accounts</span>
                      Редактирай профила
                    </button>
                    <button onClick={() => { navigate('/balance'); setUserMenuOpen(false); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/5 transition-all text-left">
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
        </>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 h-full overflow-y-auto">
        <div className="p-6 lg:p-10 w-full max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl lg:text-[32px] font-bold leading-tight tracking-tight text-white mb-2">
              История на четенията
            </h1>
            <p className="text-[#d4c8ed] text-base">Преглед на всички генерирани анализи и отчети</p>
          </div>

          {visibleJobs.length > 0 && (
            <div className="mb-6 space-y-2">
              {visibleJobs.filter((j) => !isActive(j)).length > 1 && (
                <div className="flex justify-end">
                  <button type="button" onClick={hideAllFailed} className="text-xs text-[#d4c8ed] underline hover:text-white" data-testid="hide-all-failed">
                    Скрий всички неуспешни
                  </button>
                </div>
              )}
              {hideError && <p className="text-xs text-[#f87171]" role="alert">{hideError}</p>}
              {visibleJobs.map((j) => (
                <div key={j.id} className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm ${isActive(j) ? 'border-[#7c5dfa]/40 bg-[#7c5dfa]/10' : 'border-[#f87171]/30 bg-[#f87171]/10'}`}>
                  <span className="material-symbols-outlined">{isActive(j) ? 'hourglass_top' : 'error'}</span>
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-white font-medium">{jobTitle(j)}</p>
                    <p className="text-xs text-[#d4c8ed]">
                      {isActive(j)
                        ? 'Анализът се изпълнява на сървъра. Ще се появи в списъка, когато е готов.'
                        : j.status === 'cancelled'
                          ? 'Отказан. Сумата е върната в баланса.'
                          : (j.error?.message || 'Не успя. Сумата е върната в баланса.')}
                    </p>
                  </div>
                  <button onClick={() => openGenerator(j)} className="px-3 py-1.5 rounded-lg bg-[#5211d4] hover:bg-[#5211d4]/90 text-white text-xs font-bold">
                    {isActive(j) ? 'Отвори' : 'Нов опит'}
                  </button>
                  {!isActive(j) && (
                    <button onClick={() => hideOne(j)} aria-label="Скрий този запис от История" title="Скрий този запис от История"
                      className="px-3 py-1.5 rounded-lg border border-[#d4c8ed]/40 text-[#d4c8ed] hover:bg-white/10 text-xs font-bold" data-testid="hide-job">
                      Скрий
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#201428] rounded-xl p-4 border border-[#302240]">
              <div className="flex items-center gap-2 text-[#d4c8ed] mb-2">
                <span className="material-symbols-outlined">receipt_long</span>
                <span className="text-xs">Всички отчети</span>
              </div>
              <p className="text-2xl font-bold text-white">{filteredHistory.length}</p>
            </div>
            <div className="bg-[#201428] rounded-xl p-4 border border-[#302240]">
              <div className="flex items-center gap-2 text-[#d4c8ed] mb-2">
                <span className="material-symbols-outlined">check_circle</span>
                <span className="text-xs">Завършени</span>
              </div>
              <p className="text-2xl font-bold text-white">{filteredHistory.filter(h => h.status === 'completed').length}</p>
            </div>
            <div className="bg-[#201428] rounded-xl p-4 border border-[#302240]">
              <div className="flex items-center gap-2 text-[#d4c8ed] mb-2">
                <span className="material-symbols-outlined">token</span>
                <span className="text-xs">Изразходвано</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatEur(filteredHistory.reduce((sum, h) => sum + (h.cost_cents || 0), 0))}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#b8aed0]">search</span>
              <input
                type="text"
                placeholder="Търсене по име или профил..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#201428] border border-[#302240] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-[#6d6194] focus:outline-none focus:border-[#7c5dfa]"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#201428] border border-[#302240] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7c5dfa]"
            >
              <option value="all">Всички типове</option>
              {Object.entries(typeLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select
              value={filterProfile}
              onChange={(e) => setFilterProfile(e.target.value)}
              className="bg-[#201428] border border-[#302240] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7c5dfa]"
            >
              <option value="all">Всички профили</option>
              {profileChoices.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={() => { setFilterType('all'); setFilterProfile('all'); setSearchQuery(''); }}
              className="px-3 py-2 text-sm text-[#d4c8ed] hover:text-white transition-colors"
            >
              Изчисти
            </button>
          </div>

          {/* Изглед: таблица или времева линия */}
          <div className="flex gap-2 mb-4">
            {[['table', 'Таблица', 'table_rows'], ['timeline', 'Времева линия', 'timeline']].map(([id, label, icon]) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${viewMode === id ? 'bg-[#5211d4] border-[#5211d4] text-white' : 'border-[#302240] text-[#d4c8ed] hover:bg-white/5'}`}
              >
                <span className="material-symbols-outlined text-[18px]">{icon}</span>{label}
              </button>
            ))}
          </div>

          {viewMode === 'timeline' ? (
            <div className="relative pl-6">
              <div className="absolute left-2 top-1 bottom-1 w-px bg-[#302240]" />
              {timelineError ? (
                <p className="text-sm text-red-300" role="alert">{timelineError}</p>
              ) : !timeline ? (
                <p className="text-sm text-[#d4c8ed]">Зареждане…</p>
              ) : timelineGroups.length === 0 ? (
                <p className="text-sm text-[#d4c8ed]">
                  {timeline.groups.length === 0 ? 'Още няма отчети за времевата линия.' : 'Няма отчети за избраните филтри.'}
                </p>
              ) : timelineGroups.map((g) => (
                <div key={g.month} className="mb-8">
                  <div className="flex items-center gap-2 mb-3 -ml-6">
                    <span className="w-4 h-4 rounded-full bg-[#7c5dfa] border-4 border-[#161022]" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">{g.label} <span className="font-normal text-[#b8aed0]">· {g.reports.length}</span></h3>
                  </div>
                  <div className="space-y-2">
                    {g.reports.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => openReport({ ...r, date: formatDate(r.created_at) })}
                        className="w-full text-left bg-[#201428] rounded-xl border border-[#302240] px-4 py-3 hover:border-[#7c5dfa] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined" style={{ color: typeColors[r.type] || '#a69db9' }}>{typeIcons[r.type] || 'auto_awesome'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{r.label}</p>
                            {modeLine(r) && <p className="text-xs text-[#d4c8ed] truncate">{modeLine(r)}</p>}
                            <p className="text-xs text-[#b8aed0]">
                              {r.legacy && (
                                <span
                                  title="Записан преди запазването на изчисленията: износът е възстановен от входните данни, без гаранция за същите числа"
                                  className="mr-2 rounded border border-[#6b5a8a] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[#d4c8ed]"
                                >
                                  Стар отчет
                                </span>
                              )}
                              {formatDate(r.created_at)}{r.profile ? ` · ${r.profile}` : ''}
                              {r.covers ? ` · обхваща ${formatDate(r.covers.from)} – ${formatDate(r.covers.to)}` : ''}
                            </p>
                          </div>
                          {r.memory_used && (
                            <span title="В анализа е използвана AI паметта" className="material-symbols-outlined text-[#a78bfa] text-[18px]">psychology</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <>
          {/* Table */}
          <div className="bg-[#201428] rounded-xl border border-[#302240] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#302240]">
                  <th className="text-left px-4 py-3 text-xs text-[#d4c8ed] font-medium">Тип отчет</th>
                  <th className="text-left px-4 py-3 text-xs text-[#d4c8ed] font-medium">Профил</th>
                  <th className="text-left px-4 py-3 text-xs text-[#d4c8ed] font-medium">Дата</th>
                  <th className="text-left px-4 py-3 text-xs text-[#d4c8ed] font-medium">Цена</th>
                  <th className="text-left px-4 py-3 text-xs text-[#d4c8ed] font-medium">Статус</th>
                  <th className="text-left px-4 py-3 text-xs text-[#d4c8ed] font-medium w-24">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-[#d4c8ed]">
                      <span className="material-symbols-outlined text-4xl mb-2 block">{history.length === 0 ? 'history' : 'search_off'}</span>
                      {historyLoading ? 'Зареждане…' : history.length === 0 ? 'Още нямате запазени отчети. Всеки нов анализ се запазва тук автоматично.' : 'Няма намерени отчети'}
                    </td>
                  </tr>
                ) : (
                  paginatedHistory.map((item) => (
                    <tr key={item.id} className="border-b border-[#302240]/50 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined" style={{ color: typeColors[item.type] || '#a69db9' }}>
                            {typeIcons[item.type] || 'auto_awesome'}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-white">{item.label}</p>
                            <p className="text-xs text-[#b8aed0]">
                              {item.legacy && (
                                <span
                                  title="Записан преди запазването на изчисленията: износът е възстановен от входните данни, без гаранция за същите числа"
                                  className="mr-2 rounded border border-[#6b5a8a] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[#d4c8ed]"
                                >
                                  Стар отчет
                                </span>
                              )}
                              {[typeLabels[item.type] || item.type, modeLine(item)].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white">{item.profile}</td>
                      <td className="px-4 py-3 text-sm text-[#d4c8ed]">{item.date}</td>
                      <td className="px-4 py-3 text-sm text-white">{item.cost_cents > 0 ? formatEur(item.cost_cents) : 'Безплатно'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                            item.status === 'completed' ? 'bg-[#34d399]/20 text-[#34d399]' :
                            item.status === 'pending' ? 'bg-[#fbbf24]/20 text-[#fbbf24]' :
                            'bg-[#f87171]/20 text-[#f87171]'
                          }`}>
                            <span className="material-symbols-outlined text-xs">
                              {item.status === 'completed' ? 'check_circle' : item.status === 'pending' ? 'pending' : 'error'}
                            </span>
                            {item.status === 'completed' ? 'Завършен' : item.status === 'pending' ? 'В процес' : 'Грешка'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button aria-label="Преглед на отчета"
                            onClick={() => openReport(item)}
                            className="p-1.5 rounded-lg text-[#d4c8ed] hover:text-white hover:bg-white/10 transition-colors"
                            title="Преглед"
                          >
                            <span className="material-symbols-outlined text-lg">visibility</span>
                          </button>
                          <button aria-label="Изтрий отчета"
                            onClick={() => setDeleteConfirm(item)}
                            className="p-1.5 rounded-lg text-[#d4c8ed] hover:text-[#f87171] hover:bg-[#f87171]/10 transition-colors"
                            title="Изтрий"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-[#d4c8ed]">
                Показване {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredHistory.length)} от {filteredHistory.length} отчета
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-[#201428] border border-[#302240] disabled:opacity-30 hover:bg-white/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                      currentPage === page
                        ? 'bg-[#7c5dfa] text-white'
                        : 'bg-[#201428] border border-[#302240] text-[#d4c8ed] hover:bg-white/5'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-[#201428] border border-[#302240] disabled:opacity-30 hover:bg-white/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </div>

      {/* View Report Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#201428] rounded-xl border border-[#302240] w-full max-w-3xl max-h-[88vh] overflow-y-auto">
            <div className="p-6 border-b border-[#302240] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined" style={{ color: typeColors[viewingItem.type] || '#d4c8ed' }}>
                  {typeIcons[viewingItem.type] || 'auto_awesome'}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">{viewingItem.label}</h3>
                  <p className="text-sm text-[#d4c8ed]">{viewingItem.date} • {viewingItem.profile}</p>
                </div>
              </div>
              <button aria-label="Затвори" onClick={() => setViewingItem(null)} className="p-2 text-[#d4c8ed] hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <div className="bg-[#161022] rounded-lg p-4 border border-[#302240]">
                {viewLoading ? (
                  <p className="text-[#d4c8ed]">Зареждане…</p>
                ) : (
                  <ReportText text={viewingItem.content} toc />
                )}
              </div>
            </div>
            {viewingItem.legacy && !viewingItem.failed && (
              <p className="px-6 pt-4 text-xs text-[#d4c8ed]" data-testid="legacy-note">
                Стар отчет: записан е преди запазването на изчисленията. Износът му е възстановен от входните данни, без гаранция, че числата са същите като при генерирането.
              </p>
            )}
            <div className="p-6 border-t border-[#302240] flex flex-wrap items-start justify-between gap-3">
              {!viewLoading && !viewingItem.failed ? <ReportExport reportId={viewingItem.id} /> : <span />}
              <button
                onClick={() => setViewingItem(null)}
                className="px-4 py-2 rounded-lg text-[#d4c8ed] hover:text-white transition-colors"
              >
                Затвори
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#201428] rounded-xl border border-[#302240] w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-[#f87171] text-3xl">warning</span>
                <h3 className="text-lg font-bold text-white">Изтриване на отчет</h3>
              </div>
              <p className="text-[#d4c8ed] mb-6">
                Сигурни ли сте, че искате да изтриете "{deleteConfirm.label}"? Това действие не може да бъде отменено.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-lg text-[#d4c8ed] hover:text-white transition-colors"
                >
                  Отказ
                </button>
                <button
                  onClick={async () => {
                    try {
                      await deleteReport(deleteConfirm.id);
                      setHistory(history.filter(h => h.id !== deleteConfirm.id));
                    } catch (err) {
                      alert('Отчетът не беше изтрит. Опитайте отново.');
                    }
                    setDeleteConfirm(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#f87171] text-white hover:bg-[#ef4444] transition-colors"
                >
                  Изтрий
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
