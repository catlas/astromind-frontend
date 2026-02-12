import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifySession } from '../utils/auth';

const BuyCoins = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

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

  const pricingTiers = [
    { name: 'Начинаещ', coins: 50, price: '9.99', description: 'Перфектен за 5-6 детайлни анализа', icon: 'star' },
    { name: 'Популярен', coins: 150, price: '24.99', description: 'Най-добрата стойност за редовни потребители', icon: 'auto_awesome', recommended: true },
    { name: 'Експерт', coins: 500, price: '69.99', description: 'За професионалисти и сериозни изследователи', icon: 'workspace_premium' }
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#161022] text-white font-display">
      {/* Header / Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10 max-w-7xl mx-auto">
        <div onClick={() => navigate('/dashboard')} className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-purple-400 bg-clip-text text-transparent cursor-pointer">
          AstroMind
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400">Баланс: <span className="text-purple-400 font-bold">{user.coins} монети</span></span>
          <button onClick={() => navigate('/dashboard')} className="text-sm bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-colors">
            Обратно към Таблото
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Увеличи своите космически възможности</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Всяка монета отключва дълбоки AI анализи, прогнози за бъдещето и персонализирани съвети от твоя личен астролог.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingTiers.map((tier, index) => (
            <div key={index} className={`relative bg-[#1f1c27] p-8 rounded-3xl border ${tier.recommended ? 'border-purple-500 shadow-2xl shadow-purple-500/20 scale-105' : 'border-white/10'} flex flex-col`}>
              {tier.recommended && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                  Препоръчано
                </span>
              )}
              
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-purple-400 text-3xl">{tier.icon}</span>
                <h3 className="text-xl font-bold">{tier.name}</h3>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-extrabold">{tier.price} лв.</span>
                <p className="text-slate-400 text-sm mt-2">{tier.description}</p>
              </div>

              <div className="text-3xl font-bold text-purple-400 mb-8">
                {tier.coins} <span className="text-sm text-slate-400 font-normal">Монети</span>
              </div>

              <button className={`w-full py-4 rounded-xl font-bold transition-all ${tier.recommended ? 'bg-purple-600 hover:bg-purple-700' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}>
                Купи сега
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section - от твоя дизайн */}
        <section className="mt-32 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Често задавани въпроси</h2>
          <div className="space-y-4">
            <div className="bg-[#1f1c27] p-6 rounded-2xl border border-white/10">
              <h4 className="font-bold mb-2">За какво се използват AstroМонетите?</h4>
              <p className="text-slate-400 text-sm">Всяка генерация на AI доклад изразходва определен брой монети. По-сложните анализи (като годишни прогнози) изискват повече ресурс.</p>
            </div>
            <div className="bg-[#1f1c27] p-6 rounded-2xl border border-white/10">
              <h4 className="font-bold mb-2">Имат ли срок на годност?</h4>
              <p className="text-slate-400 text-sm">Не, твоите монети остават в портфейла ти завинаги, докато не решиш да ги използваш.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default BuyCoins;

