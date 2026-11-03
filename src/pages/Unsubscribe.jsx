import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrl } from '../utils/auth';

// Линкът „Спри тези писма“ от дневното писмо: спира писмото без вход в сайта
const Unsubscribe = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState({ loading: true });
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    if (!token) { setStatus({ error: true, text: 'Линкът е непълен.' }); return; }
    axios.post(`${getApiBaseUrl()}/daily-transit/unsubscribe`, { token }, { timeout: 90000 })
      .then((r) => setStatus({ error: false, text: r.data?.message || 'Дневните писма са спрени.' }))
      .catch((err) => setStatus({ error: true, text: typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Не успяхме да спрем писмата. Опитайте от Настройки.' }));
  }, [token]);

  return (
    <div className="min-h-screen bg-[#161022] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1f1c27] rounded-3xl border border-white/10 p-8 space-y-4 text-center">
        <h1 className="text-2xl font-bold">Дневен транзит по имейл</h1>
        {status.loading ? <p className="text-gray-300">Спираме писмата…</p> : <p className={status.error ? 'text-red-400' : 'text-green-400'}>{status.text}</p>}
        <button onClick={() => navigate(localStorage.getItem('token') ? '/settings' : '/')} className="text-sm text-[#a78bfa] hover:text-white">Продължи</button>
      </div>
    </div>
  );
};

export default Unsubscribe;
