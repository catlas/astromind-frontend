import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifySession, clearSessionAndRedirect } from '../utils/auth';

const relationOptions = [
  { value: 'self', label: 'Аз' },
  { value: 'friend', label: 'Приятел' },
  { value: 'spouse', label: 'Съпруг/а' },
  { value: 'child', label: 'Дете' },
  { value: 'relative', label: 'Роднина' },
  { value: 'partner', label: 'Партньор' },
];

const genderOptions = [
  { value: 'male', label: 'Мъж' },
  { value: 'female', label: 'Жена' },
  { value: 'other', label: 'Друг' },
];

const mockProfiles = [
  {
    id: 1,
    name: 'NE',
    relation: 'self',
    relationLabel: 'Аз',
    gender: 'female',
    birth_date: '1994-04-20',
    birth_time: '12:30',
    unknown_time: false,
    birth_place: 'София',
    lat: 42.6977,
    lon: 23.3219,
    is_primary: true,
  },
  {
    id: 2,
    name: 'MI',
    relation: 'partner',
    relationLabel: 'Партньор',
    gender: 'male',
    birth_date: '1990-08-15',
    birth_time: '08:00',
    unknown_time: false,
    birth_place: 'Пловдив',
    lat: 42.1354,
    lon: 24.7453,
    is_primary: false,
  },
  {
    id: 3,
    name: 'GP',
    relation: 'friend',
    relationLabel: 'Приятел',
    gender: 'other',
    birth_date: '1992-11-03',
    birth_time: null,
    unknown_time: true,
    birth_place: 'Варна',
    lat: 43.2141,
    lon: 27.9147,
    is_primary: false,
  },
];

const Profiles = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [profiles, setProfiles] = useState(mockProfiles);
  const [editingId, setEditingId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    relation: 'self',
    gender: 'female',
    birth_date: '',
    birth_time: '',
    unknown_time: false,
    birth_place: '',
    lat: '',
    lon: '',
  });

  useEffect(() => {
    let isMounted = true;
    const loadUser = async () => {
      const sessionUser = await verifySession(navigate);
      if (isMounted && sessionUser) setUser(sessionUser);
    };
    loadUser();
    loadProfilesFromStorage();
    return () => { isMounted = false; };
  }, [navigate]);

  // Зареждане на профили от localStorage
  const loadProfilesFromStorage = () => {
    try {
      const items = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('astro_profile_')) {
          const data = JSON.parse(localStorage.getItem(key));
          const name = key.replace('astro_profile_', '');
          items.push({
            id: key,
            name: name,
            relation: data.partnerData ? 'partner' : 'self',
            relationLabel: data.partnerData ? 'Партньор' : 'Аз',
            gender: 'other',
            birth_date: data.date || '',
            birth_time: data.time || '',
            unknown_time: !data.time,
            birth_place: data.selectedCity || '',
            lat: data.lat || '',
            lon: data.lon || '',
            is_primary: items.length === 0,
          });
        }
      }
      if (items.length === 0) {
        setProfiles(mockProfiles);
      } else {
        setProfiles(items);
      }
    } catch (err) {
      console.error('Грешка при зареждане на профили:', err);
      setProfiles(mockProfiles);
    }
  };

  // Запазване на профил в localStorage
  const saveProfileToStorage = (profileData) => {
    try {
      const key = `astro_profile_${profileData.name}`;
      const existing = JSON.parse(localStorage.getItem(key) || '{}');
      const data = {
        ...existing,
        date: profileData.birth_date,
        time: profileData.unknown_time ? '' : profileData.birth_time,
        lat: profileData.lat,
        lon: profileData.lon,
        selectedCity: profileData.birth_place,
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.error('Грешка при запазване на профил:', err);
    }
  };

  // Изтриване на профил от localStorage
  const deleteProfileFromStorage = (profileName) => {
    try {
      const key = `astro_profile_${profileName}`;
      localStorage.removeItem(key);
    } catch (err) {
      console.error('Грешка при изтриване на профил:', err);
    }
  };

  const handleLogout = () => {
    clearSessionAndRedirect(navigate);
  };

  const handleEdit = (profile) => {
    setEditingId(profile.id);
    setForm({
      name: profile.name,
      relation: profile.relation,
      gender: profile.gender,
      birth_date: profile.birth_date,
      birth_time: profile.birth_time || '',
      unknown_time: profile.unknown_time,
      birth_place: profile.birth_place || '',
      lat: profile.lat || '',
      lon: profile.lon || '',
    });
  };

  const handleDelete = (id) => {
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      deleteProfileFromStorage(profile.name);
    }
    setProfiles(profiles.filter((p) => p.id !== id));
    if (editingId === id) {
      setEditingId(null);
      resetForm();
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: '',
      relation: 'self',
      gender: 'female',
      birth_date: '',
      birth_time: '',
      unknown_time: false,
      birth_place: '',
      lat: '',
      lon: '',
    });
  };

  const handleSave = () => {
    const relationLabel = relationOptions.find((r) => r.value === form.relation)?.label || '';

    if (editingId) {
      const oldProfile = profiles.find(p => p.id === editingId);
      if (oldProfile && oldProfile.name !== form.name) {
        deleteProfileFromStorage(oldProfile.name);
      }
      setProfiles(
        profiles.map((p) =>
          p.id === editingId
            ? { ...p, ...form, relationLabel }
            : p
        )
      );
    } else {
      const newProfile = {
        id: `astro_profile_${form.name}`,
        ...form,
        relationLabel,
        is_primary: profiles.length === 0,
      };
      setProfiles([...profiles, newProfile]);
    }
    
    saveProfileToStorage(form);
    resetForm();
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (!user) return null;

  // Avatar initials
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Avatar color based on relation
  const getAvatarColor = (relation) => {
    const colors = {
      self: '#5211d4',
      partner: '#e91e63',
      spouse: '#ff9800',
      child: '#4caf50',
      friend: '#00bcd4',
      relative: '#9c27b0',
    };
    return colors[relation] || '#607d8b';
  };

  const sidebarButtonClass = (isActive) =>
    `flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
      isActive
        ? 'bg-[#5211d4] text-white shadow-lg shadow-[#5211d4]/25'
        : 'text-[#a69db9] hover:bg-white/5'
    }`;

  return (
    <div className="flex h-screen w-full bg-[#161022] overflow-hidden">
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
          <button className={sidebarButtonClass(true)}>
            <span className="material-symbols-outlined">groups</span>
            <span className="text-sm font-medium">Профили</span>
          </button>
          <button onClick={() => navigate('/history')} className={sidebarButtonClass(false)}>
            <span className="material-symbols-outlined">history</span>
            <span className="text-sm font-medium">История</span>
          </button>
          <div className="h-px bg-slate-800 my-2"></div>
          <button onClick={() => navigate('/settings')} className={sidebarButtonClass(false)}>
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm font-medium">Настройки</span>
          </button>
          <button onClick={() => navigate('/buy-coins')} className={sidebarButtonClass(false)}>
            <span className="material-symbols-outlined">credit_card</span>
            <span className="text-sm font-medium">Монети</span>
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
                <button onClick={() => { navigate('/buy-coins'); setUserMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/5 transition-all text-left">
                  <span className="material-symbols-outlined text-yellow-400" style={{ fontSize: '18px' }}>token</span>
                  {user.coins || 0} монети в баланса
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
                <span className="text-[11px] text-yellow-400 font-medium">{user.coins || 0} монети</span>
                <span className="text-[#a69db9] text-[10px] mx-1">·</span>
                <span className="text-[11px] text-[#a69db9]">Безплатен</span>
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
              <button className={sidebarButtonClass(true)}>
                <span className="material-symbols-outlined">groups</span>
                <span className="text-sm font-medium">Профили</span>
              </button>
              <button onClick={() => { navigate('/history'); setIsSidebarOpen(false); }} className={sidebarButtonClass(false)}>
                <span className="material-symbols-outlined">history</span>
                <span className="text-sm font-medium">История</span>
              </button>
              <div className="h-px bg-slate-800 my-2"></div>
              <button onClick={() => { navigate('/settings'); setIsSidebarOpen(false); }} className={sidebarButtonClass(false)}>
                <span className="material-symbols-outlined">settings</span>
                <span className="text-sm font-medium">Настройки</span>
              </button>
              <button onClick={() => { navigate('/buy-coins'); setIsSidebarOpen(false); }} className={sidebarButtonClass(false)}>
                <span className="material-symbols-outlined">credit_card</span>
                <span className="text-sm font-medium">Монети</span>
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
                    <button onClick={() => { navigate('/buy-coins'); setUserMenuOpen(false); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/5 transition-all text-left">
                      <span className="material-symbols-outlined text-yellow-400" style={{ fontSize: '18px' }}>token</span>
                      {user.coins || 0} монети в баланса
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
                    <span className="text-[11px] text-yellow-400 font-medium">{user.coins || 0} монети</span>
                    <span className="text-[#a69db9] text-[10px] mx-1">·</span>
                    <span className="text-[11px] text-[#a69db9]">Безплатен</span>
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
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-[#131118] border-b border-slate-800 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#5211d4]">nightlight_round</span>
            <span className="font-bold text-white">AstroMind</span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-white">
            <span className="material-symbols-outlined">{isSidebarOpen ? 'close' : 'menu'}</span>
          </button>
        </div>

        <div className="p-6 lg:p-10 w-full max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-[32px] font-bold leading-tight tracking-tight text-white mb-2">
              Управление на профили
            </h1>
            <p className="text-[#a69db9] text-base">
              Създавай и управлявай астрологичните профили на себе си, близките и партньорите.
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left - Profile List */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Всички профили ({profiles.length})</h2>
                <button
                  onClick={resetForm}
                  className="text-sm text-[#5211d4] font-medium hover:text-[#5211d4]/80 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Нов профил
                </button>
              </div>

              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="group p-4 rounded-xl bg-[#1f1c27] border border-slate-800/50 hover:border-[#5211d4]/30 transition-all cursor-pointer"
                  onMouseEnter={() => setHoveredId(profile.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleEdit(profile)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm border-2"
                        style={{ backgroundColor: getAvatarColor(profile.relation), borderColor: getAvatarColor(profile.relation) }}
                      >
                        {getInitials(profile.name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white">{profile.name}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-[#a69db9]">
                            {profile.relationLabel}
                          </span>
                          {profile.is_primary && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#5211d4]/20 text-[#5211d4]">
                              Основен
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#a69db9] mt-0.5">
                          {profile.birth_place || '—'} • {profile.birth_date ? new Date(profile.birth_date).toLocaleDateString('bg-BG') : '—'}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 transition-opacity ${hoveredId === profile.id ? 'opacity-100' : 'opacity-0'}`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(profile); }}
                        className="p-2 text-slate-400 hover:text-[#5211d4] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(profile.id); }}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right - Profile Form */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <div className="p-6 rounded-xl bg-[#1f1c27] border border-slate-800/50">
                  <h3 className="text-lg font-bold text-white mb-6">
                    {editingId ? 'Редактиране на профил' : 'Нов профил'}
                  </h3>

                  {/* Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[#a69db9] mb-1.5">Име</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Напр. Ани"
                      className="w-full px-3 py-2.5 rounded-lg bg-[#131118] border border-slate-700 text-white text-sm placeholder-slate-500 focus:border-[#5211d4] focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Relation */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[#a69db9] mb-1.5">Връзка</label>
                    <div className="flex flex-wrap gap-2">
                      {relationOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleChange('relation', opt.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            form.relation === opt.value
                              ? 'bg-[#5211d4] text-white'
                              : 'bg-white/5 text-[#a69db9] hover:bg-white/10'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gender */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[#a69db9] mb-1.5">Пол</label>
                    <div className="flex flex-wrap gap-2">
                      {genderOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleChange('gender', opt.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            form.gender === opt.value
                              ? 'bg-[#5211d4] text-white'
                              : 'bg-white/5 text-[#a69db9] hover:bg-white/10'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Birth Date */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[#a69db9] mb-1.5">Дата на раждане</label>
                    <input
                      type="date"
                      value={form.birth_date}
                      onChange={(e) => handleChange('birth_date', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-[#131118] border border-slate-700 text-white text-sm focus:border-[#5211d4] focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Birth Time + Unknown */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-[#a69db9]">Час на раждане</label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.unknown_time}
                          onChange={(e) => handleChange('unknown_time', e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-slate-600 bg-[#131118] text-[#5211d4] focus:ring-[#5211d4]"
                        />
                        <span className="text-xs text-[#a69db9]">Непознат час</span>
                      </label>
                    </div>
                    <input
                      type="time"
                      value={form.birth_time}
                      onChange={(e) => handleChange('birth_time', e.target.value)}
                      disabled={form.unknown_time}
                      className={`w-full px-3 py-2.5 rounded-lg bg-[#131118] border border-slate-700 text-white text-sm focus:border-[#5211d4] focus:outline-none transition-colors ${
                        form.unknown_time ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  {/* Birth Place + GPS */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-[#a69db9] mb-1.5">Място на раждане</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.birth_place}
                        onChange={(e) => handleChange('birth_place', e.target.value)}
                        placeholder="Напр. София"
                        className="flex-1 px-3 py-2.5 rounded-lg bg-[#131118] border border-slate-700 text-white text-sm placeholder-slate-500 focus:border-[#5211d4] focus:outline-none transition-colors"
                      />
                      <button
                        onClick={() => { /* TODO: GPS */ }}
                        className="px-3 py-2.5 rounded-lg bg-white/5 border border-slate-700 text-[#a69db9] hover:text-[#5211d4] hover:border-[#5211d4] transition-all"
                        title="GPS координати"
                      >
                        <span className="material-symbols-outlined text-[18px]">my_location</span>
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleSave}
                      className="flex-1 py-2.5 rounded-lg bg-[#5211d4] hover:bg-[#5211d4]/90 transition-all text-white text-sm font-bold shadow-lg shadow-[#5211d4]/20 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      {editingId ? 'Запази промени' : 'Създай профил'}
                    </button>
                    {editingId && (
                      <button
                        onClick={resetForm}
                        className="px-4 py-2.5 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 text-sm font-medium transition-colors"
                      >
                        Отказ
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profiles;
