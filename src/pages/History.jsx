import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifySession, clearSessionAndRedirect } from '../utils/auth';

export default function History() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadUser = async () => {
      const sessionUser = await verifySession(navigate);
      if (isMounted && sessionUser) setUser(sessionUser);
    };
    loadUser();
    return () => { isMounted = false; };
  }, [navigate]);

  if (!user) return null;

  const sidebarButtonClass = (isActive) =>
    `flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
      isActive
        ? 'bg-[#5211d4] text-white shadow-lg shadow-[#5211d4]/25'
        : 'text-[#a69db9] hover:bg-white/5'
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
            <p className="text-[#a69db9] text-xs font-medium">Cosmic Insights</p>
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
              <p className="text-xs text-[#a69db9]">Безплатен план</p>
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
                  <p className="text-[#a69db9] text-xs font-medium">Cosmic Insights</p>
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
                  <p className="text-xs text-[#a69db9]">Безплатен план</p>
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
            <p className="text-[#a69db9] text-base">Преглед на всички генерирани анализи и отчети</p>
          </div>

          <div className="bg-[#201428] rounded-xl p-12 border border-[#302240] text-center">
            <span className="material-symbols-outlined text-6xl text-[#6d6194] mb-4 block">history</span>
            <h2 className="text-xl font-bold text-white mb-2">История — Coming soon</h2>
            <p className="text-[#a69db9]">Тук ще виждаш всички свои астрологични анализи и отчети.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
