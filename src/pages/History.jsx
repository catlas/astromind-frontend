import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifySession, clearSessionAndRedirect } from '../utils/auth';

// Load history from localStorage
const loadHistory = () => {
  try {
    const raw = localStorage.getItem('astro_history');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Save history to localStorage
const saveHistory = (items) => {
  localStorage.setItem('astro_history', JSON.stringify(items));
};

// Initial demo data (only if no data exists)
const getDemoData = () => [
  { id: 1, type: 'career', label: 'Кариерна прогноза 2024', profile: 'Evgeni (Ти)', date: '2025-11-20', status: 'completed', coins: 2, content: 'Вашата кариера през 2024 е под влиянието на Сатурн в Риби...' },
  { id: 2, type: 'synastry', label: 'Синастрия: Съвместимост', profile: 'Evgeni & Партньор', date: '2025-11-18', status: 'completed', coins: 3, content: 'Съвместимостта между двамата показва силна венера-марс връзка...' },
  { id: 3, type: 'natal', label: 'Дълбок анализ на натална карта', profile: 'Evgeni (Ти)', date: '2025-11-15', status: 'completed', coins: 1, content: 'Вашата натална карта разкрива силен Скорпион Асцендент...' },
  { id: 4, type: 'daily', label: 'Дневен аспект — 14 ноември', profile: 'Evgeni (Ти)', date: '2025-11-14', status: 'completed', coins: 0, content: 'Днес Луната във Водолей подкрепя иновациите...' },
  { id: 5, type: 'monthly', label: 'Месечен анализ — ноември', profile: 'Evgeni (Ти)', date: '2025-11-01', status: 'completed', coins: 2, content: 'Ноември носи трансформация във вашата 10-та къща...' },
  { id: 6, type: 'question', label: 'Конкретен въпрос', profile: 'Evgeni (Ти)', date: '2025-10-28', status: 'completed', coins: 1, content: 'Отговорът на вашия въпрос се крие в 7-мия дом...' },
  { id: 7, type: 'yearly', label: 'Годишен доклад 2025', profile: 'Evgeni (Ти)', date: '2025-01-15', status: 'completed', coins: 4, content: '2025 е година на разширение с Юпитер в Близнаци...' },
  { id: 8, type: 'karmic', label: 'Кармичен анализ', profile: 'Партньор', date: '2025-09-10', status: 'completed', coins: 3, content: 'Кармичният ви път е свързан с лечение и служба...' },
  { id: 9, type: 'daily', label: 'Дневен аспект — 5 септември', profile: 'Evgeni (Ти)', date: '2025-09-05', status: 'pending', coins: 0, content: 'Предстои обработка...' },
  { id: 10, type: 'natal', label: 'Натална карта (Lite)', profile: 'Приятел', date: '2025-08-20', status: 'completed', coins: 0, content: 'Основен анализ на натална карта...' },
];

export default function History() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Load history from localStorage or demo data
  const [history, setHistory] = useState(() => {
    const existing = loadHistory();
    if (existing.length > 0) return existing;
    const demo = getDemoData();
    saveHistory(demo);
    return demo;
  });

  const [filterType, setFilterType] = useState('all');
  const [filterProfile, setFilterProfile] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  useEffect(() => {
    let isMounted = true;
    const loadUser = async () => {
      const sessionUser = await verifySession(navigate);
      if (isMounted && sessionUser) setUser(sessionUser);
    };
    loadUser();
    return () => { isMounted = false; };
  }, [navigate]);

  const typeIcons = {
    natal: 'account_circle', daily: 'wb_sunny', question: 'help',
    monthly: 'calendar_month', synastry: 'favorite', yearly: 'event',
    career: 'work', karmic: 'auto_awesome'
  };
  const typeColors = {
    natal: '#a78bfa', daily: '#fbbf24', question: '#f87171',
    monthly: '#60a5fa', synastry: '#f472b6', yearly: '#34d399',
    career: '#a3e635', karmic: '#c084fc'
  };
  const typeLabels = {
    natal: 'Натална карта', daily: 'Дневен аспект', question: 'Конкретен въпрос',
    monthly: 'Месечен анализ', synastry: 'Синастрия', yearly: 'Годишен доклад',
    career: 'Кариерна прогноза', karmic: 'Кармичен анализ'
  };

  const filteredHistory = history.filter(item => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (filterProfile !== 'all' && item.profile !== filterProfile) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.label.toLowerCase().includes(q) && !item.profile.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const profileOptions = ['all', ...new Set(history.map(h => h.profile))];

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
          <button className={sidebarButtonClass(false)}>
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm font-medium">Настройки</span>
          </button>
          <button onClick={() => navigate('/buy-coins')} className={sidebarButtonClass(false)}>
            <span className="material-symbols-outlined">credit_card</span>
            <span className="text-sm font-medium">Монети</span>
          </button>
        </div>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer" onClick={() => clearSessionAndRedirect(navigate)}>
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-700"></div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-white">{user.full_name || 'Потребител'}</p>
              <p className="text-xs text-[#d4c8ed]">Безплатен план</p>
            </div>
          </div>
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
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-white">
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
              <button className={sidebarButtonClass(false)}>
                <span className="material-symbols-outlined">settings</span>
                <span className="text-sm font-medium">Настройки</span>
              </button>
              <button onClick={() => { navigate('/buy-coins'); setIsSidebarOpen(false); }} className={sidebarButtonClass(false)}>
                <span className="material-symbols-outlined">credit_card</span>
                <span className="text-sm font-medium">Монети</span>
              </button>
            </div>
            <div className="p-4 border-t border-slate-800">
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-700"></div>
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-white">{user.full_name || 'Потребител'}</p>
                  <p className="text-xs text-[#d4c8ed]">Безплатен план</p>
                </div>
              </div>
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
                <span className="text-xs">Изразходвани монети</span>
              </div>
              <p className="text-2xl font-bold text-white">{filteredHistory.reduce((sum, h) => sum + h.coins, 0)}</p>
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
              {profileOptions.map(opt => (
                <option key={opt} value={opt}>{opt === 'all' ? 'Всички профили' : opt}</option>
              ))}
            </select>
            <button
              onClick={() => { setFilterType('all'); setFilterProfile('all'); setSearchQuery(''); }}
              className="px-3 py-2 text-sm text-[#d4c8ed] hover:text-white transition-colors"
            >
              Изчисти
            </button>
          </div>

          {/* Table */}
          <div className="bg-[#201428] rounded-xl border border-[#302240] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#302240]">
                  <th className="text-left px-4 py-3 text-xs text-[#d4c8ed] font-medium">Тип отчет</th>
                  <th className="text-left px-4 py-3 text-xs text-[#d4c8ed] font-medium">Профил</th>
                  <th className="text-left px-4 py-3 text-xs text-[#d4c8ed] font-medium">Дата</th>
                  <th className="text-left px-4 py-3 text-xs text-[#d4c8ed] font-medium">Монети</th>
                  <th className="text-left px-4 py-3 text-xs text-[#d4c8ed] font-medium">Статус</th>
                  <th className="text-left px-4 py-3 text-xs text-[#d4c8ed] font-medium w-24">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-12 text-center text-[#d4c8ed]">
                      <span className="material-symbols-outlined text-4xl mb-2 block">search_off</span>
                      Няма намерени отчети
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
                            <p className="text-xs text-[#b8aed0]">{typeLabels[item.type] || item.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white">{item.profile}</td>
                      <td className="px-4 py-3 text-sm text-[#d4c8ed]">{item.date}</td>
                      <td className="px-4 py-3 text-sm text-white">{item.coins} {item.coins === 1 ? 'монета' : 'монети'}</td>
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
                          <button
                            onClick={() => setViewingItem(item)}
                            className="p-1.5 rounded-lg text-[#d4c8ed] hover:text-white hover:bg-white/10 transition-colors"
                            title="Преглед"
                          >
                            <span className="material-symbols-outlined text-lg">visibility</span>
                          </button>
                          <button
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
        </div>
      </div>

      {/* View Report Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#201428] rounded-xl border border-[#302240] w-full max-w-2xl max-h-[80vh] overflow-y-auto">
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
              <button onClick={() => setViewingItem(null)} className="p-2 text-[#d4c8ed] hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <div className="bg-[#161022] rounded-lg p-4 border border-[#302240]">
                <p className="text-white leading-relaxed">{viewingItem.content || 'Няма съдържание'}</p>
              </div>
            </div>
            <div className="p-6 border-t border-[#302240] flex justify-end gap-3">
              <button
                onClick={() => setViewingItem(null)}
                className="px-4 py-2 rounded-lg text-[#d4c8ed] hover:text-white transition-colors"
              >
                Затвори
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([viewingItem.content || ''], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${viewingItem.label}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 rounded-lg bg-[#5211d4] text-white hover:bg-[#6b2ce0] transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Изтегли
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
                  onClick={() => {
                    const updated = history.filter(h => h.id !== deleteConfirm.id);
                    setHistory(updated);
                    saveHistory(updated);
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
