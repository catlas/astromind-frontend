import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrl } from '../utils/auth';
import { FALLBACK_LIMITS, FALLBACK_PRICES, FALLBACK_SIGNUP_GIFT, FALLBACK_TOPUPS, formatEur } from '../utils/money';
import AstroChart from '../components/AstroChart';
import { sampleChart, sampleExcerpt, sampleMeta } from '../data/sampleReading';

// Снимката на нощното небе (Unsplash) е отгоре; ако не се зареди, остава нощното небе от CSS (само картинки в списъка, цветът е отделно)
const SKY_FALLBACK = [
  'radial-gradient(1.5px 1.5px at 18% 22%, rgba(255,255,255,.9), transparent)',
  'radial-gradient(1px 1px at 72% 18%, rgba(255,255,255,.8), transparent)',
  'radial-gradient(1.5px 1.5px at 40% 64%, rgba(255,255,255,.7), transparent)',
  'radial-gradient(1px 1px at 86% 58%, rgba(255,255,255,.8), transparent)',
  'radial-gradient(1px 1px at 12% 82%, rgba(255,255,255,.7), transparent)',
  'radial-gradient(ellipse at 28% 18%, rgba(124,58,237,.55), transparent 55%)',
  'radial-gradient(ellipse at 82% 72%, rgba(37,99,235,.35), transparent 50%)',
].join(', ');
const SKY_BACKGROUND = `url('https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2000&auto=format&fit=crop'), ${SKY_FALLBACK}`;

// Карта на услуга: иконата и бележката „Основен“ / „Премиум“ следват цените (премиум се плаща само от внесени средства)
const ServiceCard = ({ icon, tone, premium, title, children }) => (
  <div className="group relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#13111C] p-6 hover:border-[#5211d4]/50 hover:shadow-[0_0_20px_rgba(82,17,212,0.15)] transition-all duration-300">
    <div className={`absolute top-4 right-4 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${premium ? 'bg-[#5211d4]/20 text-[#5211d4] border border-[#5211d4]/20' : 'bg-white/10 text-slate-300'}`}>
      {premium ? 'Премиум' : 'Основен'}
    </div>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${tone}`}>
      <span className="material-symbols-outlined text-2xl">{icon}</span>
    </div>
    <div>
      <h4 className="text-white text-lg font-bold mb-2">{title}</h4>
      <p className="text-slate-400 text-sm leading-relaxed">{children}</p>
    </div>
  </div>
);

const Home = () => {
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [pricing, setPricing] = useState(null); // цени и пакети от сървъра; до зареждането (студен старт) важат стойностите по подразбиране

  const limits = pricing?.limits || FALLBACK_LIMITS;

  // С HashRouter линкове като #features биха сменили маршрута; вместо това скролваме до секцията
  useEffect(() => {
    const onClick = (e) => {
      const link = e.target.closest?.('a[href^="#"]');
      const href = link?.getAttribute('href') || '';
      if (!link || href.startsWith('#/') || href === '#') return;
      const target = document.getElementById(href.slice(1));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    let alive = true;
    axios.get(`${getApiBaseUrl()}/billing/config`, { timeout: 20000 })
      .then((r) => { if (alive) setPricing(r.data); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const handleForgot = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const response = await axios.post(`${getApiBaseUrl()}/forgot-password`, { email });
      setForgotMsg(response.data?.message || 'Проверете пощата си.');
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setForgotMsg(typeof detail === 'string' ? detail : 'Заявката не успя. Опитайте отново.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const endpoint = isLogin ? '/login' : '/register';
    const data = isLogin ? { email, password } : { email, password, full_name: fullName, accept_terms: acceptTerms };
    
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
        navigate(response.data.user?.onboarding_completed === false ? '/welcome' : '/dashboard');
      } else {
        alert('Успешна регистрация! Изпратихме ви писмо за потвърждение на имейла. Сега влезте в профила си.');
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
        const detail = error.response.data?.detail;
        errorMessage = (typeof detail === 'string' ? detail : null)
          || error.response.data?.message
          || `Грешка: ${error.response.status}`;
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
              Твоят личен<br/>
              AI астролог.<br/>
              <span className="text-[#5211d4] block">Точен.</span>
              <span className="text-[#5211d4] block">Ясен.</span>
              <span className="text-white">На български.</span>
            </h1>
            
            <p className="text-slate-400 text-lg font-normal leading-relaxed max-w-[540px] mb-8">
              Позициите, домовете и аспектите се изчисляват по астрономически данни, а AI ги обяснява на български. Готовият
              текст се сверява с изчислените факти. За себепознание и размисъл: не е терапия и не е медицински, правен или финансов съвет.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-8">
              <button 
                onClick={() => { setShowAuth(true); setIsLogin(false); }}
                className="flex h-12 min-w-[180px] items-center justify-center rounded-lg bg-[#5211d4] hover:bg-[#5211d4]/90 px-6 text-white text-base font-bold transition-all shadow-[0_0_20px_rgba(82,17,212,0.4)]"
              >
                Безплатен Анализ
              </button>
              <a href="#example" className="flex h-12 min-w-[160px] items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 px-6 text-white text-base font-medium transition-all">
                Примерен Прочит
              </a>
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
                backgroundImage: SKY_BACKGROUND,
                backgroundColor: '#0B0616'
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
                    <span className="text-[#5211d4] text-xs font-bold uppercase tracking-wide">Откъс от реален анализ</span>
                    <p className="text-white text-base leading-relaxed font-medium">
                      „{sampleExcerpt[0]}“
                    </p>
                    <span className="text-slate-500 text-xs">{sampleMeta.who}, {sampleMeta.born}</span>
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
              <h2 className="text-[#5211d4] font-bold tracking-wider uppercase text-sm">Какво е различното</h2>
              <h3 className="text-white tracking-tight text-3xl font-bold leading-tight md:text-4xl max-w-[720px]">
                Изчисленията са точни, обясненията са от AI
              </h3>
              <p className="text-slate-400 text-base font-normal leading-normal max-w-[640px]">
                Астрология за себепознание и размисъл, а не за предсказване на съдбата. Числата идват от програма, не от езиков модел.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                ['pie_chart', 'Изчислени карти', 'Позиции на планетите, домове и аспекти по ефемериди Swiss Ephemeris, с историческата часова зона на мястото. Час, който не съществува или се повтаря (смяна на времето), не се поправя тихо: питаме ви. Без известен час няма Асцендент и домове.'],
                ['fact_check', 'Сверен текст', 'Готовият анализ се сверява с изчислените факти: дом, знак, аспект, дата. При несъответствие текстът се поправя, а ако и тогава не е верен, не се записва и не се таксува.'],
                ['groups', 'Анализ с друг човек', 'Приятел, близък, дете, колега или партньор: вие избирате какви са отношенията и анализът не предполага романтика, ако не сте я посочили.'],
              ].map(([icon, title, text]) => (
                <div key={title} className="group flex flex-col gap-4 rounded-xl border border-white/5 bg-[#13111C] p-6 hover:border-[#5211d4]/50 transition-colors duration-300">
                  <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-[#5211d4] group-hover:bg-[#5211d4] group-hover:text-white transition-colors duration-300">
                    <span className="material-symbols-outlined text-2xl">{icon}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h4 className="text-white text-xl font-bold leading-tight">{title}</h4>
                    <p className="text-slate-400 text-sm font-normal leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Реален пример: карта, изчислена от двигателя, и откъс от анализ, генериран от приложението */}
      <section className="relative px-6 py-16 lg:px-40 flex justify-center bg-[#0B0616]" id="example">
        <div className="flex flex-col max-w-[1200px] flex-1 gap-8">
          <div className="text-center flex flex-col items-center gap-3">
            <h2 className="text-[#5211d4] font-bold tracking-wider uppercase text-sm">Примерен прочит</h2>
            <h3 className="text-white text-3xl font-bold md:text-4xl max-w-[760px]">Така изглеждат картата и текстът</h3>
            <p className="text-slate-400 max-w-[720px] text-sm">
              Картата е изчислена от AstroMind за тестов профил ({sampleMeta.born}), а текстът е откъс от анализ, генериран от
              приложението на {sampleMeta.generated} и сверен с изчислените данни. Въпросът беше: „{sampleMeta.question}“. Не е истински
              човек, а резултатът за вас ще е различен.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="rounded-2xl border border-white/10 bg-[#13111C] p-4 overflow-x-auto">
              <AstroChart data={sampleChart} />
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#13111C] p-6 flex flex-col gap-4 text-slate-300 leading-relaxed text-sm">
              <h4 className="text-white font-bold text-lg">Личностни черти</h4>
              {sampleExcerpt.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              <p className="text-xs text-slate-500">Откъсът е съкратен. Пълният анализ има още раздели и конкретна първа стъпка.</p>
              <button
                onClick={() => { setShowAuth(true); setIsLogin(false); }}
                className="self-start mt-2 px-5 py-2.5 rounded-lg bg-[#5211d4] hover:bg-[#5211d4]/90 text-white text-sm font-bold transition-all"
              >
                Направете свой анализ
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Услуги: само това, което приложението наистина прави */}
      <section className="relative px-6 py-16 lg:px-40 flex justify-center bg-[#0B0616] overflow-hidden" id="how-it-works">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#5211d4]/5 to-transparent pointer-events-none"></div>
        <div className="flex flex-col max-w-[1200px] flex-1 relative z-10">
          <div className="flex flex-col gap-4 text-center items-center mb-16">
            <h2 className="text-[#5211d4] font-bold tracking-wider uppercase text-sm">Услуги</h2>
            <h3 className="text-white tracking-tight text-3xl font-bold leading-tight md:text-4xl max-w-[800px]">
              Какво можете да поискате
            </h3>
            <p className="text-slate-400 text-base font-normal leading-normal max-w-[700px]">
              Започвате с подарък при регистрация. Основните анализи се плащат от подаръка или от баланса, а премиум услугите само от внесени средства.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <ServiceCard icon="person" tone="bg-blue-500/10 text-blue-400" title="Натална карта по тема">
              Карта и текст по една тема: общ анализ, здраве, кариера, пари, любов или карма и род. Здравето не е диагноза, а парите не са инвестиционен съвет.
            </ServiceCard>
            <ServiceCard icon="event" tone="bg-orange-500/10 text-orange-400" title="Анализ за избрана дата">
              Транзитите към вашата карта за дата и час по ваш избор, с аспектите към натала и домовете на транзитните планети.
            </ServiceCard>
            <ServiceCard icon="chat_bubble" tone="bg-[#5211d4]/10 text-[#5211d4]" title="Конкретен въпрос">
              До {1500} знака въпрос към същия анализ. Отговорът е свързан с изчислените данни, а не с общи фрази.
            </ServiceCard>
            <ServiceCard icon="groups" tone="bg-pink-500/10 text-pink-400" premium title="Анализ с друг човек">
              Синастрия и взаимодействие между вас и приятел, близък, дете, колега или партньор. Типът отношения е ваш избор и важи за целия анализ.
            </ServiceCard>
            <ServiceCard icon="calendar_month" tone="bg-green-500/10 text-green-400" premium title="Прогноза за период">
              Точен календар на събитията месец по месец и общ преглед на периода
              {limits.forecast_max_months_single && limits.forecast_max_months_pair
                ? `: до ${limits.forecast_max_months_single} месеца за един човек и до ${limits.forecast_max_months_pair} за двама.`
                : '.'}
            </ServiceCard>
            <ServiceCard icon="history" tone="bg-purple-500/10 text-purple-400" title="Профили и история">
              Профили за вас и близките ви, всеки анализ в Историята и изтегляне като DOCX или Markdown без нова такса. Непознат час на раждане също се поддържа.
            </ServiceCard>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative px-6 py-16 lg:px-40 flex justify-center bg-[#0B0616]" id="pricing">
        <div className="flex flex-col max-w-[1000px] flex-1">
          <div className="text-center mb-12">
            <h2 className="text-white text-3xl md:text-4xl font-bold mb-4">
              Започнете с подарък. Плащайте само за това, което ползвате.
            </h2>
            <p className="text-slate-400">Без абонамент: предплатен баланс в евро, от който се взема само при успешен анализ.</p>
            {pricing && !pricing.balance_enforced && (
              <p className="text-yellow-200/90 text-sm mt-4">
                Засега всички анализи са безплатни. Цените по-долу ще важат от старта на таксуването.
              </p>
            )}
          </div>
          {(() => {
            const prices = { ...FALLBACK_PRICES, ...(pricing?.prices || {}) };
            const eur = formatEur;
            const gift = pricing ? Number(pricing.signup_gift_cents) || 0 : FALLBACK_SIGNUP_GIFT;
            const limits = pricing?.limits || FALLBACK_LIMITS;
            const topups = pricing?.topups || FALLBACK_TOPUPS;
            const packs = topups
              .map((t) => (t.credit_cents > t.amount_cents ? `${formatEur(t.amount_cents)} → ${formatEur(t.credit_cents)}` : formatEur(t.amount_cents)))
              .join(' · ');
            const goToBalance = () => {
              if (localStorage.getItem('token')) navigate('/balance');
              else { setShowAuth(true); setIsLogin(false); }
            };
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Основни анализи */}
                <div className="flex flex-col p-8 rounded-2xl border border-white/5 bg-[#13111C] h-full">
                  <div className="mb-4">
                    <h3 className="text-white text-2xl font-bold">Основни анализи</h3>
                    <p className="text-slate-400 text-sm mt-1">За един човек</p>
                  </div>
                  <div className="text-3xl font-bold text-white mb-6">
                    {eur(prices.basic_analysis)}
                    <span className="text-sm font-normal text-slate-400"> / анализ</span>
                    {gift > 0 && (
                      <span className="text-sm font-normal text-slate-400 block mt-1">
                        {formatEur(gift)} подарък при регистрация, без карта
                      </span>
                    )}
                  </div>
                  <ul className="flex flex-col gap-4 mb-8 flex-1">
                    <li className="flex items-center gap-3 text-slate-300 text-sm">
                      <span className="material-symbols-outlined text-slate-500 text-lg">check</span>
                      Натална карта и анализ за избрана дата
                    </li>
                    <li className="flex items-center gap-3 text-slate-300 text-sm">
                      <span className="material-symbols-outlined text-slate-500 text-lg">check</span>
                      Общ анализ, здраве, кариера, пари, любов, карма
                    </li>
                    <li className="flex items-center gap-3 text-slate-300 text-sm">
                      <span className="material-symbols-outlined text-slate-500 text-lg">check</span>
                      Подаръкът се харчи първи, после внесените средства
                    </li>
                    <li className="flex items-center gap-3 text-slate-300 text-sm">
                      <span className="material-symbols-outlined text-slate-500 text-lg">check</span>
                      Неуспешен анализ не се таксува
                    </li>
                  </ul>
                  <button
                    onClick={() => { setShowAuth(true); setIsLogin(false); }}
                    className="w-full py-3 rounded-lg border border-[#2e2839] bg-transparent text-white font-bold hover:bg-white/5 transition-all"
                  >
                    Започнете безплатно
                  </button>
                </div>

                {/* Премиум услуги */}
                <div className="relative flex flex-col p-8 rounded-2xl border border-[#5211d4] bg-[#13111C] h-full shadow-[0_0_30px_rgba(82,17,212,0.15)]">
                  <div className="absolute -top-3 right-8 bg-[#5211d4] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Премиум
                  </div>
                  <div className="mb-4">
                    <h3 className="text-white text-2xl font-bold">Двойки и прогнози</h3>
                    <p className="text-slate-400 text-sm mt-1">Отключват се след първото зареждане на баланса</p>
                  </div>
                  <div className="text-3xl font-bold text-white mb-6">
                    {eur(prices.pair_analysis)}
                    <span className="text-sm font-normal text-slate-400"> / анализ за двама</span>
                    <span className="text-sm font-normal text-slate-400 block mt-1">
                      Прогноза за период: {eur(prices.forecast_month)} на месец
                    </span>
                  </div>
                  <ul className="flex flex-col gap-4 mb-8 flex-1">
                    <li className="flex items-center gap-3 text-white text-sm font-medium">
                      <span className="material-symbols-outlined text-[#5211d4] text-lg">check</span>
                      Съвместимост и синастрия между двама души
                    </li>
                    <li className="flex items-center gap-3 text-white text-sm font-medium">
                      <span className="material-symbols-outlined text-[#5211d4] text-lg">check</span>
                      <span>
                        Прогноза по месеци с общ преглед на периода
                        {limits.forecast_max_months_single && limits.forecast_max_months_pair
                          ? ` (до ${limits.forecast_max_months_single} месеца за един човек, до ${limits.forecast_max_months_pair} за двама; за двама +${eur(prices.forecast_partner_extra)} към цената)`
                          : ''}
                      </span>
                    </li>
                    <li className="flex items-center gap-3 text-white text-sm font-medium">
                      <span className="material-symbols-outlined text-[#5211d4] text-lg">check</span>
                      Плащат се само от внесени средства, не от подаръка
                    </li>
                    {packs && (
                      <li className="flex items-center gap-3 text-white text-sm font-medium">
                        <span className="material-symbols-outlined text-[#5211d4] text-lg">check</span>
                        Зареждане: {packs}
                      </li>
                    )}
                    {pricing && (
                      <li className="flex items-center gap-3 text-white text-sm font-medium">
                        <span className="material-symbols-outlined text-[#5211d4] text-lg">check</span>
                        {pricing.payments_enabled ? 'Плащане с карта през Stripe' : 'Зареждането с карта се активира скоро'}
                      </li>
                    )}
                  </ul>
                  <button
                    onClick={goToBalance}
                    className="w-full py-3 rounded-lg bg-[#5211d4] text-white font-bold hover:bg-[#5211d4]/90 transition-all shadow-lg"
                  >
                    Зареди баланс
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Ограничения и данни: честно какво се случва с данните и какво не е AstroMind */}
      <section className="relative px-6 py-16 lg:px-40 flex justify-center bg-[#0B0616] border-t border-[#2e2839]" id="limits">
        <div className="flex flex-col max-w-[1200px] flex-1">
          <h2 className="text-white text-2xl font-bold mb-8 px-4">Честно за ограниченията и данните</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-[#1f1c27] border border-[#2e2839] text-slate-300 text-sm leading-relaxed space-y-3">
              <h3 className="text-white font-bold text-base">Какво не е AstroMind</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Не е терапия, диагноза, медицински, правен или финансов съвет. При криза или здравословен проблем потърсете специалист.</li>
                <li>Не предсказва бъдещето. Астрологията е рамка за размисъл, а не доказана наука.</li>
                <li>AI може да сгреши. Позициите, домовете и аспектите са изчислени и текстът се сверява с тях, но тълкуването е негово.</li>
                <li>Мястото на раждане е точка на населено място, не точен адрес. Без час на раждане няма Асцендент и домове.</li>
              </ul>
            </div>
            <div className="p-6 rounded-xl bg-[#1f1c27] border border-[#2e2839] text-slate-300 text-sm leading-relaxed space-y-3">
              <h3 className="text-white font-bold text-base">Кой получава какви данни</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><b>AI доставчик</b> (Ollama Cloud, при отказ Together AI): данните на картата, въпросът ви и включените бележки от паметта. Без имейл и парола.</li>
                <li><b>Хостинг и база данни</b> (Render, Франкфурт): акаунтът, профилите и анализите ви.</li>
                <li><b>Плащане</b> (Stripe, когато е включено): картата не стига до нас.</li>
                <li><b>Google Fonts</b>: шрифтовете се зареждат от Google, който вижда адреса ви.</li>
                <li>Местата се търсят в вградена база (GeoNames), без заявка към трети страни.</li>
              </ul>
              <p>Подробности: <a href="#/legal/privacy" className="underline text-purple-300">Политика за поверителност</a>. Профилите и анализите се изтриват от Настройки.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0b090f] text-white py-12 px-6 lg:px-40 border-t border-[#2e2839]">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between gap-10">
          <div className="flex flex-col gap-4 max-w-[320px]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#5211d4] text-2xl">auto_awesome</span>
              <h2 className="text-lg font-bold">AstroMind</h2>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Астрологични карти и анализи на български за себепознание. Изчисленията са точни, а обясненията са от AI.
            </p>
          </div>
          <div className="flex gap-10 md:gap-20 flex-wrap">
            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider">Продукт</h3>
              <a href="#features" className="text-slate-500 hover:text-[#5211d4] text-sm transition-colors">Какво е различното</a>
              <a href="#example" className="text-slate-500 hover:text-[#5211d4] text-sm transition-colors">Примерен прочит</a>
              <a href="#pricing" className="text-slate-500 hover:text-[#5211d4] text-sm transition-colors">Цени</a>
              <a href="#limits" className="text-slate-500 hover:text-[#5211d4] text-sm transition-colors">Ограничения и данни</a>
            </div>
            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider">Правни</h3>
              <a href="#/legal/privacy" className="text-slate-500 hover:text-[#5211d4] text-sm transition-colors">Политика за поверителност</a>
              <a href="#/legal/terms" className="text-slate-500 hover:text-[#5211d4] text-sm transition-colors">Общи условия</a>
              <a href="#/legal/refunds" className="text-slate-500 hover:text-[#5211d4] text-sm transition-colors">Политика за връщане</a>
              <a href="#/legal/cookies" className="text-slate-500 hover:text-[#5211d4] text-sm transition-colors">Бисквитки</a>
            </div>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto mt-12 pt-8 border-t border-[#2e2839] text-center md:text-left space-y-2">
          <p className="text-slate-600 text-xs">
            © {new Date().getFullYear()} AstroMind. Съдържанието е за самоанализ и не е медицински, правен или финансов съвет.
          </p>
          <p className="text-slate-600 text-xs">
            Данни за местата: <a href="https://www.geonames.org" target="_blank" rel="noopener noreferrer" className="underline">GeoNames</a> (CC BY 4.0).
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1f1c27] p-8 rounded-2xl max-w-md w-full border border-white/10">
            {forgotMode ? (
              <>
                <h2 className="text-2xl font-bold mb-2">Забравена парола</h2>
                <p className="text-sm text-gray-400 mb-6">Въведете имейла си и ще ви изпратим линк за нова парола.</p>
                <form onSubmit={handleForgot} className="space-y-4">
                  <input
                    type="email"
                    placeholder="Имейл"
                    className="w-full bg-[#0B0616] border border-white/10 p-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5211d4]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <button type="submit" disabled={authLoading} className="w-full bg-[#5211d4] hover:bg-[#5211d4]/90 py-3 rounded-lg font-bold disabled:opacity-50">
                    {authLoading ? 'Изпращане…' : 'Изпрати линк'}
                  </button>
                </form>
                {forgotMsg && <p className="mt-4 text-sm text-green-400">{forgotMsg}</p>}
                <div className="mt-4 text-center">
                  <button onClick={() => { setForgotMode(false); setForgotMsg(''); }} className="text-[#5211d4] hover:text-[#5211d4]/80 text-sm">
                    Обратно към входа
                  </button>
                </div>
              </>
            ) : (
            <>
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
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                minLength={isLogin ? undefined : 10}
                required
              />
              {!isLogin && (
                <p className="text-xs text-gray-400 -mt-1">
                  Поне 10 символа, с поне една буква и една цифра.
                </p>
              )}
              {!isLogin && (
                <label className="flex items-start gap-2 text-xs text-gray-300">
                  <input type="checkbox" required checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 accent-purple-600" />
                  <span>
                    Навършил/а съм 18 години и приемам{' '}
                    <a href="#/legal/terms" target="_blank" rel="noopener noreferrer" className="text-purple-300 underline">Общите условия</a> и{' '}
                    <a href="#/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-300 underline">Политиката за поверителност</a>.
                  </span>
                </label>
              )}
              {isLogin && (
                <div className="text-right -mt-1">
                  <button type="button" onClick={() => { setForgotMode(true); setForgotMsg(''); }} className="text-xs text-gray-400 hover:text-white">
                    Забравена парола?
                  </button>
                </div>
              )}
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
            </>
            )}
            <button 
              onClick={() => { setShowAuth(false); setForgotMode(false); setForgotMsg(''); setEmail(''); setPassword(''); setFullName(''); }} 
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
