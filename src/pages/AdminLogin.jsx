import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrl } from '../utils/auth';

// Отделен вход за собственика: потребител и парола от настройките на сървъра (ADMIN_USERNAME, ADMIN_PASSWORD), без акаунт в сайта
const AdminLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await axios.post(`${getApiBaseUrl()}/admin/login`, { username, password }, { timeout: 90000 });
      sessionStorage.setItem('adminToken', r.data.token);
      navigate('/admin');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Входът не успя. Опитайте отново.');
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full bg-[#0B0616] border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#5211d4]';
  return (
    <div className="min-h-screen bg-[#161022] text-white flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-[#1f1c27] rounded-3xl border border-white/10 p-8 space-y-4">
        <h1 className="text-2xl font-bold">Вход за собственика</h1>
        <input className={input} placeholder="Потребител" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input className={input} type="password" placeholder="Парола" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={busy} className="w-full py-3 rounded-xl bg-[#5211d4] hover:bg-[#5211d4]/90 font-bold disabled:opacity-50">{busy ? 'Влизане…' : 'Вход'}</button>
      </form>
    </div>
  );
};

export default AdminLogin;
