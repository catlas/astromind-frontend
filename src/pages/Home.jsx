import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Home = () => {
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const endpoint = isLogin ? '/login' : '/register';
    const data = isLogin ? { email, password } : { email, password, full_name: fullName };
    
    // Динамичен избор на URL:
    // - В production (hostname != localhost): използва Render.com API
    // - В development (localhost): използва локален сървър
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_URL = import.meta.env.VITE_API_URL || (isLocalhost ? 'http://localhost:8000' : 'https://astromind-api.onrender.com');
    
    try {
      const response = await axios.post(`${API_URL}${endpoint}`, data, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 90000,
      });
      
      if (isLogin) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/dashboard');
      } else {
        alert('Успешна регистрация! Сега влезте в профила си.');
        setIsLogin(true);
        setEmail('');
        setPassword('');
        setFullName('');
      }
    } catch (error) {
      console.error('Auth error:', error);
      let errorMessage = 'Възникна грешка';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Времето за изчакване изтече. Моля опитайте отново.';
      } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        errorMessage = `Грешка при свързване със сървъра. Проверете дали backend сървърът работи на ${API_URL}`;
      } else if (error.response) {
        // Сървърът отговори с грешка
        errorMessage = error.response.data?.detail || error.response.data?.message || `Грешка: ${error.response.status}`;
      } else if (error.request) {
        // Заявката беше изпратена, но няма отговор
        errorMessage = 'Няма отговор от сървъра. Проверете връзката.';
      } else {
        errorMessage = error.message || 'Възникна грешка';
      }
      
      alert(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0616] text-white font-display overflow-x-hidden antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/5 bg-[#0B0616]/80 backdrop-blur-md px-6 py-4 md:px-10 lg:px-20">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5211d4]">
            <span className="material-symbols-outlined text-3xl">auto_awesome</span>
          </div>
          <h2 className="text-white text-xl font-bold">AstroMind</h2>
        </div>
        
        <div className="hidden lg:flex flex-1 justify-end items-center gap-8">
          <div className="flex gap-8 mr-4">
            <a href="#features" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Функции</a>
            <a href="#how-it-works" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Как работи</a>
            <a href="#pricing" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Цени</a>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setShowAuth(true); setIsLogin(true); }}
              className="flex min-w-[80px] items-center justify-center rounded-md h-10 px-4 border border-white/20 bg-transparent hover:bg-white/5 text-white text-sm font-medium transition-all"
            >
              Вход
            </button>
            <button 
              onClick={() => { setShowAuth(true); setIsLogin(false); }}
              className="flex min-w-[84px] items-center justify-center rounded-md h-10 px-6 bg-[#5211d4] hover:bg-[#5211d4]/90 text-white text-sm font-bold transition-all shadow-[0_0_15px_rgba(82,17,212,0.3)]"
            >
              Регистрация
            </button>
          </div>
        </div>
        
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="lg:hidden text-white cursor-pointer p-2"
        >
          <span className="material-symbols-outlined">{isMenuOpen ? 'close' : 'menu'}</span>
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        >
          <div 
            className="bg-[#131118] border-r border-slate-800 w-64 h-full p-6 flex flex-col gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#5211d4]">auto_awesome</span>
                <h2 className="text-white text-lg font-bold">AstroMind</h2>
              </div>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="text-white p-2"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <nav className="flex flex-col gap-4">
              <a 
                href="#features" 
                className="text-slate-300 hover:text-white text-base font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Функции
              </a>
              <a 
                href="#how-it-works" 
                className="text-slate-300 hover:text-white text-base font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Как работи
              </a>
              <a 
                href="#pricing" 
                className="text-slate-300 hover:text-white text-base font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Цени
              </a>
            </nav>
            <div className="flex flex-col gap-3 mt-auto pt-6 border-t border-slate-800">
              <button 
                onClick={() => { setShowAuth(true); setIsLogin(true); setIsMenuOpen(false); }}
                className="w-full flex items-center justify-center rounded-md h-10 px-4 border border-white/20 bg-transparent hover:bg-white/5 text-white text-sm font-medium transition-all"
              >
                Вход
              </button>
              <button 
                onClick={() => { setShowAuth(true); setIsLogin(false); setIsMenuOpen(false); }}
                className="w-full flex items-center justify-center rounded-md h-10 px-6 bg-[#5211d4] hover:bg-[#5211d4]/90 text-white text-sm font-bold transition-all shadow-[0_0_15px_rgba(82,17,212,0.3)]"
              >
                Регистрация
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative px-6 py-12 md:py-20 lg:px-20 flex justify-center bg-[#0B0616] overflow-hidden min-h-[85vh] items-center">
        {/* Star background */}
        <div 
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(white, rgba(255,255,255,.2) 2px, transparent 3px),
              radial-gradient(white, rgba(255,255,255,.15) 1px, transparent 2px),
              radial-gradient(white, rgba(255,255,255,.1) 2px, transparent 3px)
            `,
            backgroundSize: '550px 550px, 350px 350px, 250px 250px',
            backgroundPosition: '0 0, 40px 60px, 130px 270px'
          }}
        ></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#1a122e] via-[#0B0616] to-[#0B0616] opacity-60 z-0"></div>
        
        <div className="w-full max-w-[1280px] relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col text-left items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5211d4]/10 border border-[#5211d4]/20 w-fit mb-6 backdrop-blur-sm">
              <span className="material-symbols-outlined text-[#5211d4] text-xs">auto_awesome</span>
              <span className="text-[#5211d4] text-[10px] font-bold tracking-widest uppercase">AI-базирана астрология</span>
            </div>
            
            <h1 className="text-white text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
              Твоят Личен AI<br/>
              Астролог.<br/>
              <span className="text-[#5211d4] block">Дълбок.</span>
              <span className="text-[#5211d4] block">Терапевтичен.</span>
              <span className="text-white">24/7.</span>
            </h1>
            
            <p className="text-slate-400 text-lg font-normal leading-relaxed max-w-[540px] mb-8">
              Разкодирайте психиката си със стратегически астрологичен анализ. Ние комбинираме древната мъдрост с напреднал AI, за да предоставим терапевтични насоки за вашето ежедневие.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-8">
              <button 
                onClick={() => { setShowAuth(true); setIsLogin(false); }}
                className="flex h-12 min-w-[180px] items-center justify-center rounded-lg bg-[#5211d4] hover:bg-[#5211d4]/90 px-6 text-white text-base font-bold transition-all shadow-[0_0_20px_rgba(82,17,212,0.4)]"
              >
                Безплатен Анализ
              </button>
              <button className="flex h-12 min-w-[160px] items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 px-6 text-white text-base font-medium transition-all">
                Примерен Прочит
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <span className="material-symbols-outlined text-sm">shield</span>
              <span>Не се изисква кредитна карта за основен анализ</span>
            </div>
          </div>
          
          {/* Hero Image/Chat Bubble - СНИМКАТА КАТО ФОН */}
          <div className="relative w-full h-full min-h-[400px] lg:min-h-[600px] rounded-2xl overflow-hidden bg-[#13111C] border border-white/5 shadow-2xl flex items-end">
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-60"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2000&auto=format&fit=crop')"
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0616] via-[#13111C]/80 to-[#13111C]/60 opacity-100"></div>
            <div className="relative w-full p-8 z-10">
              <div className="bg-[#1a1625]/80 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-lg">
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-full bg-[#5211d4] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(82,17,212,0.5)]">
                    <span className="material-symbols-outlined text-white text-2xl">auto_awesome</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[#5211d4] text-xs font-bold uppercase tracking-wide">AstroMind AI</span>
                    <p className="text-white text-base leading-relaxed font-medium">
                      "Въз основа на разположението на Меркурий, днешният ден е идеален за интроспективна комуникация. Искате ли да проучите как това влияе на вашите взаимоотношения?"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative px-6 py-12 lg:px-40 flex justify-center bg-[#0B0616]" id="features">
        <div className="flex flex-col max-w-[1200px] flex-1">
          <div className="flex flex-col gap-10 py-10">
            <div className="flex flex-col gap-4 text-center items-center">
              <h2 className="text-[#5211d4] font-bold tracking-wider uppercase text-sm">Космически Функции</h2>
              <h3 className="text-white tracking-tight text-3xl font-bold leading-tight md:text-4xl max-w-[720px]">
                Отключете древната мъдрост с модерни технологии
              </h3>
              <p className="text-slate-400 text-base font-normal leading-normal max-w-[600px]">
                Изживейте астрология, създадена за себепознание и психологическо прозрение, а не просто предсказване на съдбата.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="group flex flex-col gap-4 rounded-xl border border-white/5 bg-[#13111C] p-6 hover:border-[#5211d4]/50 transition-colors duration-300">
                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-[#5211d4] group-hover:bg-[#5211d4] group-hover:text-white transition-colors duration-300">
                  <span className="material-symbols-outlined text-2xl">pie_chart</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="text-white text-xl font-bold leading-tight">Прецизни Натални Карти</h4>
                  <p className="text-slate-400 text-sm font-normal leading-relaxed">
                    Детайлно картографиране на рождената ви карта отвъд слънчевия знак. Разберете своята Луна, Асцендент и планетни домове.
                  </p>
                </div>
              </div>
              
              <div className="group flex flex-col gap-4 rounded-xl border border-white/5 bg-[#13111C] p-6 hover:border-[#5211d4]/50 transition-colors duration-300">
                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-[#5211d4] group-hover:bg-[#5211d4] group-hover:text-white transition-colors duration-300">
                  <span className="material-symbols-outlined text-2xl">sunny</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="text-white text-xl font-bold leading-tight">Дневни Аспекти</h4>
                  <p className="text-slate-400 text-sm font-normal leading-relaxed">
                    Анализ в реално време на планетните движения, съобразен с контекста на вашата карта и житейски път.
                  </p>
                </div>
              </div>
              
              <div className="group flex flex-col gap-4 rounded-xl border border-white/5 bg-[#13111C] p-6 hover:border-[#5211d4]/50 transition-colors duration-300">
                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-[#5211d4] group-hover:bg-[#5211d4] group-hover:text-white transition-colors duration-300">
                  <span className="material-symbols-outlined text-2xl">psychology</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="text-white text-xl font-bold leading-tight">Психоаналитични Дълбочини</h4>
                  <p className="text-slate-400 text-sm font-normal leading-relaxed">
                    Терапевтичен диалог, използващ астрологията като рамка за личностно израстване и работа със сенките.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section - НОВА СЕКЦИЯ */}
      <section className="relative px-6 py-16 lg:px-40 flex justify-center bg-[#0B0616] overflow-hidden" id="how-it-works">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#5211d4]/5 to-transparent pointer-events-none"></div>
        <div className="flex flex-col max-w-[1200px] flex-1 relative z-10">
          <div className="flex flex-col gap-4 text-center items-center mb-16">
            <h2 className="text-[#5211d4] font-bold tracking-wider uppercase text-sm">Услуги и Функции</h2>
            <h3 className="text-white tracking-tight text-3xl font-bold leading-tight md:text-4xl max-w-[800px]">
              Отключете пълния потенциал на AstroMind
            </h3>
            <p className="text-slate-400 text-base font-normal leading-normal max-w-[700px]">
              Разгледайте нашите специализирани астрологични доклади. Стартирайте безплатно и надградете с AstroМонети за дълбоки, персонализирани прозрения.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Натална Карта (Lite) */}
            <div className="group relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#13111C] p-6 hover:border-[#5211d4]/50 hover:shadow-[0_0_20px_rgba(82,17,212,0.15)] transition-all duration-300">
              <div className="absolute top-4 right-4 px-2 py-1 rounded-md text-[10px] font-bold bg-white/10 text-slate-300 uppercase tracking-wide">Free</div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-2">
                <span className="material-symbols-outlined text-2xl">person</span>
              </div>
              <div>
                <h4 className="text-white text-lg font-bold mb-2">Натална Карта (Lite)</h4>
                <p className="text-slate-400 text-sm leading-relaxed">Вашият космически паспорт. Основни разположения и личностни черти за силен старт.</p>
              </div>
            </div>
            
            {/* Дневен Аспект */}
            <div className="group relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#13111C] p-6 hover:border-[#5211d4]/50 hover:shadow-[0_0_20px_rgba(82,17,212,0.15)] transition-all duration-300">
              <div className="absolute top-4 right-4 px-2 py-1 rounded-md text-[10px] font-bold bg-white/10 text-slate-300 uppercase tracking-wide">Free</div>
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 mb-2">
                <span className="material-symbols-outlined text-2xl">sunny</span>
              </div>
              <div>
                <h4 className="text-white text-lg font-bold mb-2">Дневен Аспект</h4>
                <p className="text-slate-400 text-sm leading-relaxed">Ежедневен компас. Разберете енергията на деня чрез транзитите към вашата карта.</p>
              </div>
            </div>
            
            {/* Конкретен Въпрос */}
            <div className="group relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#13111C] p-6 hover:border-[#5211d4]/50 hover:shadow-[0_0_20px_rgba(82,17,212,0.15)] transition-all duration-300">
              <div className="absolute top-4 right-4 px-2 py-1 rounded-md text-[10px] font-bold bg-[#5211d4]/20 text-[#5211d4] border border-[#5211d4]/20 uppercase tracking-wide flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">monetization_on</span> Premium
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#5211d4]/10 flex items-center justify-center text-[#5211d4] mb-2">
                <span className="material-symbols-outlined text-2xl">chat_bubble</span>
              </div>
              <div>
                <h4 className="text-white text-lg font-bold mb-2">Конкретен Въпрос</h4>
                <p className="text-slate-400 text-sm leading-relaxed">Имате дилема? Получете AI отговор, съобразен изцяло с вашата уникална астрология.</p>
              </div>
            </div>
            
            {/* Месечен Анализ */}
            <div className="group relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#13111C] p-6 hover:border-[#5211d4]/50 hover:shadow-[0_0_20px_rgba(82,17,212,0.15)] transition-all duration-300">
              <div className="absolute top-4 right-4 px-2 py-1 rounded-md text-[10px] font-bold bg-[#5211d4]/20 text-[#5211d4] border border-[#5211d4]/20 uppercase tracking-wide flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">monetization_on</span> Premium
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#5211d4]/10 flex items-center justify-center text-[#5211d4] mb-2">
                <span className="material-symbols-outlined text-2xl">calendar_month</span>
              </div>
              <div>
                <h4 className="text-white text-lg font-bold mb-2">Месечен Анализ</h4>
                <p className="text-slate-400 text-sm leading-relaxed">Стратегическо планиране. Ключови дати и теми за успех през предстоящия месец.</p>
              </div>
            </div>
            
            {/* Синастрия */}
            <div className="group relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#13111C] p-6 hover:border-[#5211d4]/50 hover:shadow-[0_0_20px_rgba(82,17,212,0.15)] transition-all duration-300">
              <div className="absolute top-4 right-4 px-2 py-1 rounded-md text-[10px] font-bold bg-[#5211d4]/20 text-[#5211d4] border border-[#5211d4]/20 uppercase tracking-wide flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">monetization_on</span> Premium
              </div>
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400 mb-2">
                <span className="material-symbols-outlined text-2xl">favorite</span>
              </div>
              <div>
                <h4 className="text-white text-lg font-bold mb-2">Синастрия</h4>
                <p className="text-slate-400 text-sm leading-relaxed">Любов и партньорство. Дълбок анализ на съвместимостта и динамиката във връзката.</p>
              </div>
            </div>
            
            {/* Годишен Доклад */}
            <div className="group relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#13111C] p-6 hover:border-[#5211d4]/50 hover:shadow-[0_0_20px_rgba(82,17,212,0.15)] transition-all duration-300">
              <div className="absolute top-4 right-4 px-2 py-1 rounded-md text-[10px] font-bold bg-[#5211d4]/20 text-[#5211d4] border border-[#5211d4]/20 uppercase tracking-wide flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">monetization_on</span> Premium
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 mb-2">
                <span className="material-symbols-outlined text-2xl">rocket_launch</span>
              </div>
              <div>
                <h4 className="text-white text-lg font-bold mb-2">Годишен Доклад</h4>
                <p className="text-slate-400 text-sm leading-relaxed">Голямата картина. Вашата соларна карта и пътна карта за следващите 12 месеца.</p>
              </div>
            </div>
            
            {/* Кариера и Пари */}
            <div className="group relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#13111C] p-6 hover:border-[#5211d4]/50 hover:shadow-[0_0_20px_rgba(82,17,212,0.15)] transition-all duration-300">
              <div className="absolute top-4 right-4 px-2 py-1 rounded-md text-[10px] font-bold bg-[#5211d4]/20 text-[#5211d4] border border-[#5211d4]/20 uppercase tracking-wide flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">monetization_on</span> Premium
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 mb-2">
                <span className="material-symbols-outlined text-2xl">work</span>
              </div>
              <div>
                <h4 className="text-white text-lg font-bold mb-2">Кариера и Пари</h4>
                <p className="text-slate-400 text-sm leading-relaxed">Професионален път. Открийте идеалната си кариера и финансови възможности според звездите.</p>
              </div>
            </div>
            
            {/* Кармичен Анализ */}
            <div className="group relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#13111C] p-6 hover:border-[#5211d4]/50 hover:shadow-[0_0_20px_rgba(82,17,212,0.15)] transition-all duration-300">
              <div className="absolute top-4 right-4 px-2 py-1 rounded-md text-[10px] font-bold bg-[#5211d4]/20 text-[#5211d4] border border-[#5211d4]/20 uppercase tracking-wide flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">monetization_on</span> Premium
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-2">
                <span className="material-symbols-outlined text-2xl">psychology</span>
              </div>
              <div>
                <h4 className="text-white text-lg font-bold mb-2">Кармичен Анализ</h4>
                <p className="text-slate-400 text-sm leading-relaxed">Пътуване в дълбините. Разкрийте минали животи, кармични възли и уроците, които душата ви е дошла да научи. Най-дълбокият ни анализ.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative px-6 py-16 lg:px-40 flex justify-center bg-[#0B0616]" id="pricing">
        <div className="flex flex-col max-w-[1000px] flex-1">
          <div className="text-center mb-12">
            <h2 className="text-white text-3xl md:text-4xl font-bold mb-4">
              Започнете безплатно. Потопете се дълбоко с AstroМонети.
            </h2>
            <p className="text-slate-400">Изберете пътя, който съвпада с вашето пътуване.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Free Tier */}
            <div className="flex flex-col p-8 rounded-2xl border border-white/5 bg-[#13111C] h-full">
              <div className="mb-4">
                <h3 className="text-white text-2xl font-bold">Звездоброец</h3>
                <p className="text-slate-400 text-sm mt-1">Основни ежедневни насоки</p>
              </div>
              <div className="text-3xl font-bold text-white mb-6">Безплатно</div>
              <ul className="flex flex-col gap-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <span className="material-symbols-outlined text-slate-500 text-lg">check</span>
                  Основен преглед на натална карта
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <span className="material-symbols-outlined text-slate-500 text-lg">check</span>
                  Дневен хороскоп
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <span className="material-symbols-outlined text-slate-500 text-lg">check</span>
                  Ограничени чат интеракции
                </li>
              </ul>
              <button className="w-full py-3 rounded-lg border border-[#2e2839] bg-transparent text-white font-bold hover:bg-white/5 transition-all">
                Започнете
              </button>
            </div>
            
            {/* Paid Tier */}
            <div className="relative flex flex-col p-8 rounded-2xl border border-[#5211d4] bg-[#13111C] h-full shadow-[0_0_30px_rgba(82,17,212,0.15)]">
              <div className="absolute -top-3 right-8 bg-[#5211d4] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Най-популярно
              </div>
              <div className="mb-4">
                <h3 className="text-white text-2xl font-bold">Космически Пътешественик</h3>
                <p className="text-slate-400 text-sm mt-1">Дълбок анализ & терапевтични сесии</p>
              </div>
              <div className="text-3xl font-bold text-white mb-6">
                AstroМонети
                <span className="text-sm font-normal text-slate-400 block mt-1">
                  Гъвкаво заплащане според употребата
                </span>
              </div>
              <ul className="flex flex-col gap-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-white text-sm font-medium">
                  <span className="material-symbols-outlined text-[#5211d4] text-lg">check</span>
                  Неограничен терапевтичен чат
                </li>
                <li className="flex items-center gap-3 text-white text-sm font-medium">
                  <span className="material-symbols-outlined text-[#5211d4] text-lg">check</span>
                  Доклади за синастрия във връзките
                </li>
                <li className="flex items-center gap-3 text-white text-sm font-medium">
                  <span className="material-symbols-outlined text-[#5211d4] text-lg">check</span>
                  Бъдещи транзитни прогнози (1 Година)
                </li>
                <li className="flex items-center gap-3 text-white text-sm font-medium">
                  <span className="material-symbols-outlined text-[#5211d4] text-lg">check</span>
                  Приоритетна AI обработка
                </li>
              </ul>
              <button 
                onClick={() => navigate('/buy-coins')}
                className="w-full py-3 rounded-lg bg-[#5211d4] text-white font-bold hover:bg-[#5211d4]/90 transition-all shadow-lg"
              >
                Вземете AstroМонети
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative px-6 py-16 lg:px-40 flex justify-center bg-[#0B0616] border-t border-[#2e2839]">
        <div className="flex flex-col max-w-[1200px] flex-1">
          <h2 className="text-white text-2xl font-bold mb-10 px-4">Доверие от търсещите</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-[#1f1c27] border border-[#2e2839]">
              <div className="flex items-center gap-1 text-yellow-500 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="material-symbols-outlined text-sm">star</span>
                ))}
              </div>
              <p className="text-slate-300 text-sm italic mb-6">
                "Използвала съм други астрологични приложения, но AstroMind се усеща като разговор с истински терапевт, който познава наталната ми карта. Точността е шокираща!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700"></div>
                <div>
                  <p className="text-white text-sm font-bold">Сара Дж.</p>
                  <p className="text-slate-500 text-xs">Скорпион Слънце</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 rounded-xl bg-[#1f1c27] border border-[#2e2839]">
              <div className="flex items-center gap-1 text-yellow-500 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="material-symbols-outlined text-sm">star</span>
                ))}
              </div>
              <p className="text-slate-300 text-sm italic mb-6">
                "Моделът с AstroМонети е страхотен, защото плащам само за дълбоките анализи, от които имам нужда. Дневните аспекти са точни и ми помагат да планирам работната седмица."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700"></div>
                <div>
                  <p className="text-white text-sm font-bold">Маркъс Т.</p>
                  <p className="text-slate-500 text-xs">Козирог Асцендент</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 rounded-xl bg-[#1f1c27] border border-[#2e2839]">
              <div className="flex items-center gap-1 text-yellow-500 mb-4">
                {[...Array(4)].map((_, i) => (
                  <span key={i} className="material-symbols-outlined text-sm">star</span>
                ))}
                <span className="material-symbols-outlined text-sm">star_half</span>
              </div>
              <p className="text-slate-300 text-sm italic mb-6">
                "Накрая приложение, което обяснява 'защо' зад астрологията. Образователно е и дълбоко успокояващо по време на тежки транзити."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700"></div>
                <div>
                  <p className="text-white text-sm font-bold">Елена Р.</p>
                  <p className="text-slate-500 text-xs">Близнаци Луна</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0b090f] text-white py-12 px-6 lg:px-40 border-t border-[#2e2839]">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between gap-10">
          <div className="flex flex-col gap-4 max-w-[300px]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#5211d4] text-2xl">auto_awesome</span>
              <h2 className="text-lg font-bold">AstroMind</h2>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Вашият личен AI Астролог, наличен 24/7. Разкодирайте психиката си и навигирайте живота с космическа стратегическа интелигентност.
            </p>
            <div className="flex gap-4 mt-2">
              <a href="#" className="text-slate-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">public</span>
              </a>
              <a href="#" className="text-slate-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">alternate_email</span>
              </a>
            </div>
          </div>
          
          <div className="flex gap-10 md:gap-20 flex-wrap">
            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider">Продукт</h3>
              <a href="#features" className="text-slate-500 hover:text-[#5211d4] text-sm transition-colors">Функции</a>
              <a href="#pricing" className="text-slate-500 hover:text-[#5211d4] text-sm transition-colors">Цени</a>
              <a href="/buy-coins" className="text-slate-500 hover:text-[#5211d4] text-sm transition-colors">AstroМонети</a>
            </div>
            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider">Компания</h3>
              <a href="#" className="text-slate-500 hover:text-[#5211d4] text-sm transition-colors">За нас</a>
              <a href="#" className="text-slate-500 hover:text-[#5211d4] text-sm transition-colors">Блог</a>
              <a href="#" className="text-slate-500 hover:text-[#5211d4] text-sm transition-colors">Контакти</a>
            </div>
            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider">Правни</h3>
              <a href="#" className="text-slate-500 hover:text-[#5211d4] text-sm transition-colors">Политика за поверителност</a>
              <a href="#" className="text-slate-500 hover:text-[#5211d4] text-sm transition-colors">Общи условия</a>
            </div>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto mt-12 pt-8 border-t border-[#2e2839] text-center md:text-left">
          <p className="text-slate-600 text-xs">
            © 2023 AstroMind AI. Всички права запазени. Само за развлекателни цели и самоанализ.
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1f1c27] p-8 rounded-2xl max-w-md w-full border border-white/10">
            <h2 className="text-2xl font-bold mb-6">{isLogin ? 'Добре дошли отново' : 'Създай акаунт'}</h2>
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <input 
                  type="text" 
                  placeholder="Име" 
                  className="w-full bg-[#0B0616] border border-white/10 p-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5211d4]"
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                />
              )}
              <input 
                type="email" 
                placeholder="Имейл" 
                className="w-full bg-[#0B0616] border border-white/10 p-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5211d4]"
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input 
                type="password" 
                placeholder="Парола" 
                className="w-full bg-[#0B0616] border border-white/10 p-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5211d4]"
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="submit"
                disabled={authLoading}
                className="w-full bg-[#5211d4] hover:bg-[#5211d4]/90 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Събуждане на сървъра...</span>
                  </>
                ) : (
                  <span>{isLogin ? 'Влез' : 'Регистрирай ме'}</span>
                )}
              </button>
            </form>
            <div className="mt-4 text-center">
              <button 
                onClick={() => { setIsLogin(!isLogin); setEmail(''); setPassword(''); setFullName(''); }} 
                className="text-[#5211d4] hover:text-[#5211d4]/80 text-sm"
              >
                {isLogin ? 'Нямаш акаунт? Регистрирай се' : 'Вече имаш акаунт? Влез'}
              </button>
            </div>
            <button 
              onClick={() => { setShowAuth(false); setEmail(''); setPassword(''); setFullName(''); }} 
              className="mt-4 text-slate-400 hover:text-slate-300 text-sm w-full"
            >
              Затвори
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
