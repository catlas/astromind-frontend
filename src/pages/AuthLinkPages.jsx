import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrl } from '../utils/auth';

const Shell = ({ title, children }) => (
  <div className="min-h-screen w-full bg-[#0B0616] flex items-center justify-center p-4 text-white">
    <div className="w-full max-w-md bg-[#161022] border border-white/10 rounded-2xl p-8 shadow-2xl">
      <div className="flex items-center gap-2 mb-6">
        <span className="material-symbols-outlined text-[#a78bfa]">nightlight_round</span>
        <span className="font-bold">AstroMind</span>
      </div>
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      {children}
    </div>
  </div>
);

const errorText = (err, fallback) => {
  const detail = err?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
};

export const ResetPassword = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setStatus({ error: true, text: 'Паролите не съвпадат.' });
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${getApiBaseUrl()}/reset-password`, { token, new_password: password });
      setStatus({ error: false, text: 'Паролата е сменена. Сега можете да влезете с новата парола.' });
    } catch (err) {
      setStatus({ error: true, text: errorText(err, 'Паролата не беше сменена.') });
    } finally {
      setLoading(false);
    }
  };

  const done = status && !status.error;
  return (
    <Shell title="Нова парола">
      {!token ? (
        <p className="text-red-400">Линкът е непълен. Поискайте нов от „Забравена парола“.</p>
      ) : done ? null : (
        <form onSubmit={submit} className="space-y-4">
          <input type="password" autoComplete="new-password" required minLength={10} placeholder="Нова парола"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#0B0616] border border-white/10 p-3 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5211d4]" />
          <input type="password" autoComplete="new-password" required placeholder="Повторете паролата"
            value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="w-full bg-[#0B0616] border border-white/10 p-3 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5211d4]" />
          <p className="text-xs text-gray-400">Поне 10 символа, с поне една буква и една цифра.</p>
          <button disabled={loading} className="w-full bg-[#5211d4] hover:bg-[#5211d4]/90 py-3 rounded-lg font-bold disabled:opacity-50">
            {loading ? 'Запазване…' : 'Запази новата парола'}
          </button>
        </form>
      )}
      {status && <p className={`mt-4 text-sm ${status.error ? 'text-red-400' : 'text-green-400'}`}>{status.text}</p>}
      <button onClick={() => navigate('/')} className="mt-6 text-sm text-[#a78bfa] hover:text-white">Към входа</button>
    </Shell>
  );
};

export const VerifyEmail = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState({ loading: true });
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    if (!token) {
      setStatus({ error: true, text: 'Линкът е непълен.' });
      return;
    }
    axios.post(`${getApiBaseUrl()}/verify-email`, { token })
      .then(() => {
        try {
          const user = JSON.parse(localStorage.getItem('user') || 'null');
          if (user) localStorage.setItem('user', JSON.stringify({ ...user, email_verified: true }));
        } catch { /* няма запазен потребител */ }
        setStatus({ error: false, text: 'Имейлът ви е потвърден. Благодарим!' });
      })
      .catch((err) => setStatus({ error: true, text: errorText(err, 'Имейлът не беше потвърден.') }));
  }, [token]);

  return (
    <Shell title="Потвърждение на имейл">
      {status.loading ? (
        <p className="text-gray-300">Проверяваме линка…</p>
      ) : (
        <p className={status.error ? 'text-red-400' : 'text-green-400'}>{status.text}</p>
      )}
      <button onClick={() => navigate(localStorage.getItem('token') ? '/dashboard' : '/')} className="mt-6 text-sm text-[#a78bfa] hover:text-white">
        Продължи
      </button>
    </Shell>
  );
};
