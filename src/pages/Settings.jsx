import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifySession, clearSessionAndRedirect, getApiBaseUrl } from '../utils/auth';
import axios from 'axios';

const TABS = [
  { id: 'account', label: 'Акаунт', icon: 'manage_accounts' },
  { id: 'preferences', label: 'Предпочитания', icon: 'tune' },
  { id: 'notifications', label: 'Известия', icon: 'notifications' },
  { id: 'privacy', label: 'Поверителност', icon: 'shield' },
  { id: 'subscription', label: 'Абонамент', icon: 'workspace_premium' },
];

const sidebarButtonClass = (isActive) =>
  `flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
    isActive
      ? 'bg-[#5211d4] text-white shadow-lg shadow-[#5211d4]/25'
      : 'text-[#a69db9] hover:bg-white/5'
  }`;

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
      checked ? 'bg-[#5211d4]' : 'bg-slate-700'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const SectionCard = ({ title, description, icon, children }) => (
  <div className="bg-[#1f1c27] rounded-2xl border border-slate-800/50 overflow-hidden">
    <div className="px-6 py-5 border-b border-slate-800/50 flex items-center gap-3">
      <div className="bg-[#5211d4]/15 p-2 rounded-lg">
        <span className="material-symbols-outlined text-[#5211d4]" style={{ fontSize: '20px' }}>{icon}</span>
      </div>
      <div>
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        {description && <p className="text-[#a69db9] text-xs mt-0.5">{description}</p>}
      </div>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const InputField = ({ label, type = 'text', value, onChange, placeholder, disabled, hint }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-slate-300">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full bg-[#161022] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#5211d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    />
    {hint && <p className="text-xs text-[#a69db9]">{hint}</p>}
  </div>
);

const SettingsRow = ({ label, description, children }) => (
  <div className="flex items-center justify-between gap-4 py-4 border-b border-slate-800/50 last:border-0">
    <div>
      <p className="text-sm font-medium text-white">{label}</p>
      {description && <p className="text-xs text-[#a69db9] mt-0.5">{description}</p>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('account');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Account form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [accountMsg, setAccountMsg] = useState(null);
  const [passwordMsg, setPasswordMsg] = useState(null);

  // Preferences
  const [timezone, setTimezone] = useState(() => localStorage.getItem('astro_timezone') || 'Europe/Sofia');
  const [zodiacSystem, setZodiacSystem] = useState(() => localStorage.getItem('astro_zodiac') || 'tropical');
  const [language, setLanguage] = useState(() => localStorage.getItem('astro_language') || 'bg');
  const [prefSaved, setPrefSaved] = useState(false);

  // Notifications
  const [notifReport, setNotifReport] = useState(() => localStorage.getItem('astro_notif_report') !== 'false');
  const [notifDaily, setNotifDaily] = useState(() => localStorage.getItem('astro_notif_daily') === 'true');
  const [notifPromo, setNotifPromo] = useState(() => localStorage.getItem('astro_notif_promo') !== 'false');

  // Privacy
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadUser = async () => {
      const sessionUser = await verifySession(navigate);
      if (isMounted && sessionUser) {
        setUser(sessionUser);
        setFullName(sessionUser.full_name || '');
        setEmail(sessionUser.email || '');
      }
    };
    loadUser();
    return () => { isMounted = false; };
  }, [navigate]);

  const showMsg = (setter, msg, isError = false) => {
    setter({ text: msg, error: isError });
    setTimeout(() => setter(null), 4000);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setAccountSaving(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiBaseUrl();
      const response = await axios.patch(
        `${apiUrl}/me`,
        { full_name: fullName, email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = response.data;
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      showMsg(setAccountMsg, 'Промените са запазени успешно.');
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Грешка при запазване.';
      showMsg(setAccountMsg, detail, true);
    } finally {
      setAccountSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showMsg(setPasswordMsg, 'Паролите не съвпадат.', true);
      return;
    }
    if (newPassword.length < 6) {
      showMsg(setPasswordMsg, 'Паролата трябва да е поне 6 символа.', true);
      return;
    }
    setPasswordSaving(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiBaseUrl();
      await axios.post(
        `${apiUrl}/change-password`,
        { current_password: currentPassword, new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showMsg(setPasswordMsg, 'Паролата е сменена успешно.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Грешка при смяна на паролата.';
      showMsg(setPasswordMsg, detail, true);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSavePreferences = () => {
    localStorage.setItem('astro_timezone', timezone);
    localStorage.setItem('astro_zodiac', zodiacSystem);
    localStorage.setItem('astro_language', language);
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 3000);
  };

  const handleNotifChange = (key, value) => {
    localStorage.setItem(key, String(value));
    if (key === 'astro_notif_report') setNotifReport(value);
    if (key === 'astro_notif_daily') setNotifDaily(value);
    if (key === 'astro_notif_promo') setNotifPromo(value);
  };

  const handleExportData = () => {
    const data = {
      user: { full_name: user?.full_name, email: user?.email, coins: user?.coins },
      profiles: Object.keys(localStorage)
        .filter(k => k.startsWith('astro_profile_'))
        .reduce((acc, k) => { acc[k] = JSON.parse(localStorage.getItem(k)); return acc; }, {}),
      history: JSON.parse(localStorage.getItem('astro_history') || '[]'),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `astromind-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'ИЗТРИЙ') return;
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiBaseUrl();
      await axios.delete(`${apiUrl}/me`, { headers: { Authorization: `Bearer ${token}` } });
      clearSessionAndRedirect(navigate);
    } catch (err) {
      alert(err?.response?.data?.detail || 'Грешка при изтриване на акаунта.');
    }
  };

  if (!user) return null;

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderSidebar = (mobile = false) => (
    <>
      <div className="p-6 flex items-center gap-3">
        <div className="bg-[#5211d4]/20 p-2 rounded-full">
          <span className="material-symbols-outlined text-[#5211d4]" style={{ fontSize: '28px' }}>nightlight_round</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold leading-tight text-white">AstroMind</h1>
          <p className="text-[#a69db9] text-xs font-medium">Cosmic Insights</p>
        </div>
        {mobile && (
          <button onClick={() => setIsSidebarOpen(false)} className="ml-auto p-2 text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 px-4 py-4 grow">
        <button onClick={() => { navigate('/dashboard'); if (mobile) setIsSidebarOpen(false); }} className={sidebarButtonClass(false)}>
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-sm font-medium">Табло</span>
        </button>
        <button onClick={() => { navigate('/generate-report'); if (mobile) setIsSidebarOpen(false); }} className={sidebarButtonClass(false)}>
          <span className="material-symbols-outlined">auto_awesome</span>
          <span className="text-sm font-medium">Генерирай хороскоп</span>
        </button>
        <button onClick={() => { navigate('/profiles'); if (mobile) setIsSidebarOpen(false); }} className={sidebarButtonClass(false)}>
          <span className="material-symbols-outlined">groups</span>
          <span className="text-sm font-medium">Профили</span>
        </button>
        <button onClick={() => { navigate('/history'); if (mobile) setIsSidebarOpen(false); }} className={sidebarButtonClass(false)}>
          <span className="material-symbols-outlined">history</span>
          <span className="text-sm font-medium">История</span>
        </button>
        <div className="h-px bg-slate-800 my-2" />
        <button className={sidebarButtonClass(true)}>
          <span className="material-symbols-outlined">settings</span>
          <span className="text-sm font-medium">Настройки</span>
        </button>
        <button onClick={() => { navigate('/buy-coins'); if (mobile) setIsSidebarOpen(false); }} className={sidebarButtonClass(false)}>
          <span className="material-symbols-outlined">credit_card</span>
          <span className="text-sm font-medium">Монети</span>
        </button>
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer" onClick={() => clearSessionAndRedirect(navigate)}>
          <div className="w-8 h-8 rounded-full bg-[#5211d4]/30 border border-[#5211d4]/40 flex items-center justify-center">
            <span className="text-xs font-bold text-[#5211d4]">{getInitials(user.full_name)}</span>
          </div>
          <div className="flex flex-col">
            <p className="text-sm font-medium text-white">{user.full_name || 'Потребител'}</p>
            <p className="text-xs text-[#a69db9]">Безплатен план</p>
          </div>
        </div>
      </div>
    </>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <div className="flex flex-col gap-6">
            <SectionCard title="Лична информация" description="Промени своите данни за акаунта" icon="person">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-[#5211d4]/20 border-2 border-[#5211d4]/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-[#5211d4]">{getInitials(user.full_name)}</span>
                </div>
                <div>
                  <p className="text-white font-semibold">{user.full_name || 'Потребител'}</p>
                  <p className="text-[#a69db9] text-sm">{user.email}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-yellow-400" style={{ fontSize: '14px' }}>token</span>
                    <span className="text-yellow-400 text-xs font-medium">{user.coins || 0} монети</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveAccount} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label="Пълно име"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Иван Иванов"
                  />
                  <InputField
                    label="Имейл адрес"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ivan@example.com"
                  />
                </div>
                {accountMsg && (
                  <div className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${accountMsg.error ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-green-500/10 border border-green-500/20 text-green-400'}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{accountMsg.error ? 'error' : 'check_circle'}</span>
                    {accountMsg.text}
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={accountSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#5211d4] hover:bg-[#5211d4]/90 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-60 shadow-lg shadow-[#5211d4]/20"
                  >
                    {accountSaving ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>progress_activity</span> : <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>save</span>}
                    Запази промените
                  </button>
                </div>
              </form>
            </SectionCard>

            <SectionCard title="Промяна на парола" description="За по-голяма сигурност използвай уникална парола" icon="lock">
              <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                <InputField
                  label="Текуща парола"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label="Нова парола"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    hint="Минимум 6 символа"
                  />
                  <InputField
                    label="Потвърди новата парола"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                {passwordMsg && (
                  <div className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${passwordMsg.error ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-green-500/10 border border-green-500/20 text-green-400'}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{passwordMsg.error ? 'error' : 'check_circle'}</span>
                    {passwordMsg.text}
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#5211d4] hover:bg-[#5211d4]/90 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-40 shadow-lg shadow-[#5211d4]/20"
                  >
                    {passwordSaving ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>progress_activity</span> : <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>key</span>}
                    Смени паролата
                  </button>
                </div>
              </form>
            </SectionCard>
          </div>
        );

      case 'preferences':
        return (
          <div className="flex flex-col gap-6">
            <SectionCard title="Астрологични настройки" description="Персонализирай изчисленията и интерпретациите" icon="public">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-300">Зодиакална система</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'tropical', label: 'Тропическа', desc: 'Западна астрология (по-разпространена)' },
                      { value: 'sidereal', label: 'Сидерална', desc: 'Ведическа / Jyotish астрология' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setZodiacSystem(opt.value)}
                        className={`p-4 rounded-xl border text-left transition-all ${zodiacSystem === opt.value ? 'border-[#5211d4] bg-[#5211d4]/10' : 'border-slate-700 hover:border-slate-600'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${zodiacSystem === opt.value ? 'border-[#5211d4] bg-[#5211d4]' : 'border-slate-600'}`} />
                          <span className="text-sm font-semibold text-white">{opt.label}</span>
                        </div>
                        <p className="text-xs text-[#a69db9] pl-5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-300">Часова зона</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-[#161022] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#5211d4] transition-colors"
                  >
                    <option value="Europe/Sofia">Europe/Sofia (UTC+2/+3)</option>
                    <option value="Europe/London">Europe/London (UTC+0/+1)</option>
                    <option value="Europe/Berlin">Europe/Berlin (UTC+1/+2)</option>
                    <option value="America/New_York">America/New_York (UTC-5/-4)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (UTC-8/-7)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                    <option value="UTC">UTC</option>
                  </select>
                  <p className="text-xs text-[#a69db9]">Използва се за точни астрологични изчисления</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-300">Език на интерфейса</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'bg', label: '🇧🇬 Български' },
                      { value: 'en', label: '🇬🇧 English', soon: true },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => !opt.soon && setLanguage(opt.value)}
                        disabled={opt.soon}
                        className={`p-3 rounded-xl border text-sm font-medium transition-all flex items-center gap-2 ${language === opt.value ? 'border-[#5211d4] bg-[#5211d4]/10 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {opt.label}
                        {opt.soon && <span className="ml-auto text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">Скоро</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>

            <div className="flex justify-end">
              <button
                onClick={handleSavePreferences}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#5211d4] hover:bg-[#5211d4]/90 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-[#5211d4]/20"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>save</span>
                {prefSaved ? 'Запазено ✓' : 'Запази предпочитания'}
              </button>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="flex flex-col gap-6">
            <SectionCard title="Email известия" description="Управлявай кои известия получаваш по имейл" icon="email">
              <SettingsRow
                label="Завършен отчет"
                description="Получи имейл когато твоят AI анализ е готов"
              >
                <Toggle checked={notifReport} onChange={(v) => handleNotifChange('astro_notif_report', v)} />
              </SettingsRow>
              <SettingsRow
                label="Дневен хороскоп"
                description="Ежедневен кратък хороскоп изпратен на имейла ти"
              >
                <Toggle checked={notifDaily} onChange={(v) => handleNotifChange('astro_notif_daily', v)} />
              </SettingsRow>
              <SettingsRow
                label="Промоционални оферти"
                description="Специални оферти за монети и нови функции"
              >
                <Toggle checked={notifPromo} onChange={(v) => handleNotifChange('astro_notif_promo', v)} />
              </SettingsRow>
            </SectionCard>

            <div className="bg-[#5211d4]/5 border border-[#5211d4]/20 rounded-2xl p-5 flex items-start gap-3">
              <span className="material-symbols-outlined text-[#5211d4] flex-shrink-0" style={{ fontSize: '20px' }}>info</span>
              <p className="text-sm text-[#a69db9] leading-relaxed">
                Известията се изпращат на адрес <span className="text-white font-medium">{user.email}</span>. За промяна на имейл адреса отиди в секция <button onClick={() => setActiveTab('account')} className="text-[#5211d4] hover:underline font-medium">Акаунт</button>.
              </p>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="flex flex-col gap-6">
            <SectionCard title="Твоите данни" description="Изтегли или управлявай личните си данни" icon="folder_open">
              <SettingsRow
                label="Изтегли данните ми"
                description="Получи JSON файл с всички твои профили, история и настройки"
              >
                <button
                  onClick={handleExportData}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-slate-700 hover:border-slate-600 text-slate-300 text-sm rounded-xl transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                  Изтегли JSON
                </button>
              </SettingsRow>
            </SectionCard>

            <SectionCard title="Опасна зона" description="Тези действия са необратими" icon="warning">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">Изход от акаунта</p>
                    <p className="text-xs text-[#a69db9] mt-0.5">Излез от текущата сесия на всички устройства</p>
                  </div>
                  <button
                    onClick={() => clearSessionAndRedirect(navigate)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-slate-700 text-slate-300 text-sm rounded-xl transition-all flex-shrink-0"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
                    Изход
                  </button>
                </div>

                <div className="h-px bg-slate-800" />

                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-medium text-red-400">Изтрий акаунта</p>
                    <p className="text-xs text-[#a69db9] mt-0.5">Всички данни, профили и история ще бъдат изтрити безвъзвратно</p>
                  </div>
                  {!deleteConfirm ? (
                    <button
                      onClick={() => setDeleteConfirm(true)}
                      className="self-start flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm rounded-xl transition-all"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete_forever</span>
                      Изтрий акаунта
                    </button>
                  ) : (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex flex-col gap-3">
                      <p className="text-sm text-red-300">
                        Напиши <span className="font-bold font-mono bg-red-500/10 px-1.5 py-0.5 rounded">ИЗТРИЙ</span> за потвърждение:
                      </p>
                      <input
                        type="text"
                        value={deleteInput}
                        onChange={(e) => setDeleteInput(e.target.value)}
                        placeholder="ИЗТРИЙ"
                        className="bg-[#161022] border border-red-500/30 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleteInput !== 'ИЗТРИЙ'}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete_forever</span>
                          Потвърди изтриването
                        </button>
                        <button
                          onClick={() => { setDeleteConfirm(false); setDeleteInput(''); }}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 text-sm rounded-xl transition-all"
                        >
                          Отказ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>
        );

      case 'subscription':
        return (
          <div className="flex flex-col gap-6">
            <SectionCard title="Текущ план" description="Преглед на твоя абонамент и баланс" icon="workspace_premium">
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#161022] border border-slate-700 mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-700/50">
                    <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '24px' }}>star</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Безплатен план</p>
                    <p className="text-xs text-[#a69db9]">10 монети при регистрация</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-700/50 text-slate-400 border border-slate-600">
                  Активен
                </span>
              </div>

              <div className="flex items-center gap-3 mb-5">
                <span className="material-symbols-outlined text-yellow-400" style={{ fontSize: '28px' }}>token</span>
                <div>
                  <p className="text-2xl font-bold text-white">{user.coins || 0} <span className="text-sm font-normal text-[#a69db9]">AstroМонети</span></p>
                  <p className="text-xs text-[#a69db9]">Достатъчно за ~{Math.floor((user.coins || 0) / 2)} детайлни анализа</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Дневен хороскоп', cost: '0', icon: 'wb_sunny' },
                  { label: 'Натална карта', cost: '1', icon: 'account_circle' },
                  { label: 'Пълен анализ', cost: '2-4', icon: 'auto_awesome' },
                ].map(item => (
                  <div key={item.label} className="bg-[#161022] border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#a69db9]" style={{ fontSize: '18px' }}>{item.icon}</span>
                    <div>
                      <p className="text-xs text-[#a69db9]">{item.label}</p>
                      <p className="text-sm font-bold text-white">{item.cost} <span className="font-normal text-[#a69db9]">монети</span></p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/buy-coins')}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#5211d4] hover:bg-[#5211d4]/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-[#5211d4]/20"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>credit_card</span>
                Купи монети
              </button>
            </SectionCard>

            <SectionCard title="История на плащанията" description="Твоите последни транзакции" icon="receipt_long">
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-slate-600" style={{ fontSize: '24px' }}>receipt_long</span>
                </div>
                <p className="text-slate-500 text-sm">Все още няма транзакции</p>
              </div>
            </SectionCard>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#161022] overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-[#131118]">
        {renderSidebar(false)}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-[#131118] border-r border-slate-800 z-40 md:hidden flex flex-col">
            {renderSidebar(true)}
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

        <div className="p-6 lg:p-10 w-full max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-[32px] font-bold leading-tight tracking-tight text-white mb-2">
              Настройки
            </h1>
            <p className="text-[#a69db9] text-base">Управлявай своя акаунт, предпочитания и поверителност</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 bg-[#131118] p-1 rounded-xl border border-slate-800 mb-8 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-[#5211d4] text-white shadow-lg shadow-[#5211d4]/20'
                    : 'text-[#a69db9] hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
