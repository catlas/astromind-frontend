import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSessionAndRedirect, verifySession } from '../utils/auth';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const sessionUser = await verifySession(navigate);
      if (isMounted && sessionUser) {
        setUser(sessionUser);
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleLogout = () => {
    clearSessionAndRedirect(navigate);
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
            className="flex items-center gap-3 px-3 py-3 rounded-lg bg-[#5211d4] text-white shadow-lg shadow-[#5211d4]/25 transition-all"
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-sm font-medium">Табло</span>
          </button>
              <button 
                onClick={() => navigate('/generate-report')}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#a69db9] hover:bg-white/5 transition-all"
              >
                <span className="material-symbols-outlined">auto_awesome</span>
                <span className="text-sm font-medium">Генерирай хороскоп</span>
              </button>
          <button className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#a69db9] hover:bg-white/5 transition-all">
            <span className="material-symbols-outlined">groups</span>
            <span className="text-sm font-medium">Профили</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#a69db9] hover:bg-white/5 transition-all">
            <span className="material-symbols-outlined">history</span>
            <span className="text-sm font-medium">История</span>
          </button>
          <div className="h-px bg-slate-800 my-2"></div>
          <button className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#a69db9] hover:bg-white/5 transition-all">
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm font-medium">Настройки</span>
          </button>
          <button 
            onClick={() => navigate('/buy-coins')}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#a69db9] hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined">credit_card</span>
            <span className="text-sm font-medium">Монети</span>
          </button>
        </div>
        
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-700"></div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-white">{user.full_name || 'Потребител'}</p>
              <p className="text-xs text-[#a69db9]">Безплатен план</p>
            </div>
          </div>
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
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex flex-col gap-2 px-4 py-4 grow">
              <button 
                onClick={() => { navigate('/dashboard'); setIsSidebarOpen(false); }}
                className="flex items-center gap-3 px-3 py-3 rounded-lg bg-[#5211d4] text-white shadow-lg shadow-[#5211d4]/25 transition-all"
              >
                <span className="material-symbols-outlined">dashboard</span>
                <span className="text-sm font-medium">Табло</span>
              </button>
              <button 
                onClick={() => { navigate('/generate-report'); setIsSidebarOpen(false); }}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#a69db9] hover:bg-white/5 transition-all"
              >
                <span className="material-symbols-outlined">auto_awesome</span>
                <span className="text-sm font-medium">Генерирай хороскоп</span>
              </button>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#a69db9] hover:bg-white/5 transition-all"
              >
                <span className="material-symbols-outlined">groups</span>
                <span className="text-sm font-medium">Профили</span>
              </button>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#a69db9] hover:bg-white/5 transition-all"
              >
                <span className="material-symbols-outlined">history</span>
                <span className="text-sm font-medium">История</span>
              </button>
              <div className="h-px bg-slate-800 my-2"></div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#a69db9] hover:bg-white/5 transition-all"
              >
                <span className="material-symbols-outlined">settings</span>
                <span className="text-sm font-medium">Настройки</span>
              </button>
              <button 
                onClick={() => { navigate('/buy-coins'); setIsSidebarOpen(false); }}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#a69db9] hover:bg-white/5 transition-all"
              >
                <span className="material-symbols-outlined">credit_card</span>
                <span className="text-sm font-medium">Монети</span>
              </button>
            </div>
            
            <div className="p-4 border-t border-slate-800">
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-700"></div>
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-white">{user.full_name || 'Потребител'}</p>
                  <p className="text-xs text-[#a69db9]">Безплатен план</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 h-full overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-[#131118] border-b border-slate-800 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#5211d4]">nightlight_round</span>
            <span className="font-bold text-white">AstroMind</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-white"
          >
            <span className="material-symbols-outlined">{isSidebarOpen ? 'close' : 'menu'}</span>
          </button>
        </div>

        <div className="p-6 lg:p-10 w-full max-w-7xl mx-auto space-y-8">
          {/* Welcome Header */}
          <div>
            <h1 className="text-3xl lg:text-[32px] font-bold leading-tight tracking-tight text-white mb-2">
              Добре дошъл отново, {user.full_name?.split(' ')[0] || 'Потребител'}
            </h1>
            <p className="text-[#a69db9] text-base">
              Твоите космически прозрения те очакват. Звездите са подредени за размисъл днес.
            </p>
          </div>

          {/* Balance Card */}
          <div className="w-full">
            <div className="flex flex-col items-stretch justify-start rounded-2xl overflow-hidden lg:flex-row lg:items-center bg-[#1f1c27] shadow-sm border border-slate-800/50">
              <div 
                className="relative w-full lg:w-2/5 h-48 lg:h-auto self-stretch bg-center bg-no-repeat bg-cover"
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2000&auto=format&fit=crop')"
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#1f1c27]"></div>
              </div>
              <div className="flex w-full grow flex-col justify-center gap-4 p-6 lg:p-8">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-[#5211d4]">token</span>
                    <p className="text-[#a69db9] text-sm font-medium uppercase tracking-wider">Баланс</p>
                  </div>
                  <p className="text-4xl font-bold text-white tracking-tight mb-2">{user.coins || 10} AstroМонети</p>
                  <p className="text-[#a69db9] text-base">
                    Имаш достатъчно баланс за <span className="text-[#5211d4] font-bold">4 подробни четения</span> или 2 отчета за синастрия.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button 
                    onClick={() => navigate('/generate-report')}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl h-10 px-6 bg-[#5211d4] hover:bg-[#5211d4]/90 transition-all text-white text-sm font-bold shadow-lg shadow-[#5211d4]/20 animate-pulse"
                  >
                    <span className="material-symbols-outlined text-lg">auto_awesome</span>
                    Генерирай хороскоп
                  </button>
                  <button className="flex cursor-pointer items-center justify-center rounded-lg h-10 px-6 border border-white/10 hover:bg-white/5 transition-colors text-slate-400 text-sm font-medium">
                    Виж транзакции
                  </button>
                  <button 
                    onClick={() => navigate('/buy-coins')}
                    className="flex cursor-pointer items-center justify-center rounded-lg h-10 px-6 bg-[#5211d4] hover:bg-[#5211d4]/90 transition-colors text-white text-sm font-bold shadow-lg shadow-[#5211d4]/20"
                  >
                    Зареди портфейл
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Твоят кръг */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white tracking-tight">Твоят кръг</h2>
                <button className="text-sm text-[#5211d4] font-medium hover:text-[#5211d4]/80">Виж всички</button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* User Profile Card */}
                <div className="group p-4 rounded-xl bg-[#1f1c27] border border-slate-800/50 hover:border-[#5211d4]/50 transition-all shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-700 border-2 border-[#5211d4]"></div>
                      <div>
                        <h3 className="font-bold text-white">{user.full_name || 'Потребител'} (Ти)</h3>
                        <p className="text-xs text-[#a69db9]">—</p>
                      </div>
                    </div>
                    <button className="text-slate-400 hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[20px]">more_vert</span>
                    </button>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <div className="px-2 py-1 rounded bg-white/5 text-xs font-medium text-slate-300 flex items-center gap-1">
                      <span className="text-orange-400">☀</span> —
                    </div>
                    <div className="px-2 py-1 rounded bg-white/5 text-xs font-medium text-slate-300 flex items-center gap-1">
                      <span className="text-blue-300">☾</span> —
                    </div>
                    <div className="px-2 py-1 rounded bg-white/5 text-xs font-medium text-slate-300 flex items-center gap-1">
                      <span className="text-gray-400">↑</span> —
                    </div>
                  </div>
                  <button className="w-full py-2 rounded-lg border border-[#5211d4]/30 text-[#5211d4] hover:bg-[#5211d4] hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 group-hover:bg-[#5211d4] group-hover:text-white">
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span> Ново четене
                  </button>
                </div>

                {/* Partner Profile Card */}
                <div className="group p-4 rounded-xl bg-[#1f1c27] border border-slate-800/50 hover:border-[#5211d4]/50 transition-all shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-700"></div>
                      <div>
                        <h3 className="font-bold text-white">Партньор</h3>
                        <p className="text-xs text-[#a69db9]">—</p>
                      </div>
                    </div>
                    <button className="text-slate-400 hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[20px]">more_vert</span>
                    </button>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <div className="px-2 py-1 rounded bg-white/5 text-xs font-medium text-slate-300 flex items-center gap-1">
                      <span className="text-orange-400">☀</span> —
                    </div>
                    <div className="px-2 py-1 rounded bg-white/5 text-xs font-medium text-slate-300 flex items-center gap-1">
                      <span className="text-blue-300">☾</span> —
                    </div>
                  </div>
                  <button className="w-full py-2 rounded-lg border border-white/10 text-slate-300 hover:border-[#5211d4] hover:text-[#5211d4] text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span> Ново четене
                  </button>
                </div>

                {/* Add Profile Button */}
                <button className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-[#5211d4] hover:bg-white/5 transition-all group min-h-[180px]">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-[#5211d4]/20 transition-colors">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-[#5211d4]">add</span>
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-[#5211d4]">Добави нов профил</span>
                </button>
              </div>
            </div>

            {/* Right Column - Дневен транзит */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white tracking-tight">Дневен транзит</h2>
              </div>
              <div className="p-5 rounded-xl bg-gradient-to-br from-[#2a2438] to-[#161022] border border-slate-800 relative overflow-hidden h-full min-h-[300px] flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#5211d4]/20 blur-[60px] rounded-full pointer-events-none"></div>
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🪐</span>
                    <span className="text-white font-bold text-lg">Сатурн ретрограден</span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed mb-4">
                    Днес настъпва момент на пауза. Влиянието на Сатурн те приканва да преразгледаш дългосрочните си цели. Не бързай с нови договори.
                  </p>
                </div>
                <div className="mt-auto pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-slate-400">Настроение</span>
                    <span className="text-white font-medium">Замислен</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Цвят на късмета</span>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-indigo-900 border border-white/20"></div>
                      <span className="text-white font-medium">Индиго</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* History Section */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white tracking-tight">История на отчети</h2>
              <div className="flex gap-2">
                <button className="p-2 text-slate-400 hover:text-[#5211d4] transition-colors">
                  <span className="material-symbols-outlined">filter_list</span>
                </button>
                <button className="p-2 text-slate-400 hover:text-[#5211d4] transition-colors">
                  <span className="material-symbols-outlined">sort</span>
                </button>
              </div>
            </div>
            <div className="w-full overflow-hidden rounded-xl border border-slate-800 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-slate-300">Тип отчет</th>
                      <th className="px-6 py-4 font-semibold text-slate-300">Профил</th>
                      <th className="px-6 py-4 font-semibold text-slate-300">Дата</th>
                      <th className="px-6 py-4 font-semibold text-slate-300">Статус</th>
                      <th className="px-6 py-4 font-semibold text-slate-300 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-[#131118]">
                    <tr className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-[#5211d4]/10 text-[#5211d4]">
                            <span className="material-symbols-outlined text-[20px]">work</span>
                          </div>
                          <span className="font-medium text-white">Кариерна прогноза 2024</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{user.full_name || 'Потребител'} (Ти)</td>
                      <td className="px-6 py-4 text-slate-400">—</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400">
                          Завършен
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-[#5211d4] hover:text-[#5211d4]/80 font-medium text-sm inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[18px]">download</span> PDF
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500">
                            <span className="material-symbols-outlined text-[20px]">favorite</span>
                          </div>
                          <span className="font-medium text-white">Синастрия: Съвместимост</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{user.full_name || 'Потребител'} & Партньор</td>
                      <td className="px-6 py-4 text-slate-400">—</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400">
                          Завършен
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-[#5211d4] hover:text-[#5211d4]/80 font-medium text-sm inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[18px]">download</span> PDF
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                            <span className="material-symbols-outlined text-[20px]">person_search</span>
                          </div>
                          <span className="font-medium text-white">Дълбок анализ на натална карта</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{user.full_name || 'Потребител'} (Ти)</td>
                      <td className="px-6 py-4 text-slate-400">—</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400">
                          Завършен
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-[#5211d4] hover:text-[#5211d4]/80 font-medium text-sm inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[18px]">download</span> PDF
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-center mt-2">
              <button className="text-sm text-slate-400 hover:text-[#5211d4] transition-colors">Виж пълна история</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
