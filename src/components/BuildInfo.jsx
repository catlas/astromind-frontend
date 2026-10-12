import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getApiBaseUrl } from '../utils/auth';

// Кое издание работи: commit на сайта (вграден при build) и на сървъра (GET /version). Без тайни, само версии.
// eslint-disable-next-line no-undef
export const FRONTEND_COMMIT = typeof __BUILD_COMMIT__ === 'string' ? __BUILD_COMMIT__ : '';

export const shortCommit = (value) => (value ? String(value).slice(0, 7) : 'неизвестно');

export const BuildInfo = () => {
  const [server, setServer] = useState(null);
  useEffect(() => {
    let alive = true;
    axios.get(`${getApiBaseUrl()}/version`, { timeout: 8000 })
      .then((res) => { if (alive) setServer(res.data); })
      .catch(() => { if (alive) setServer({}); });
    return () => { alive = false; };
  }, []);
  const versions = server?.versions;
  return (
    <p className="text-[11px] text-slate-500 leading-relaxed" data-testid="build-info">
      Издание: сайт {shortCommit(FRONTEND_COMMIT)} · сървър {server ? shortCommit(server.commit) : '…'}
      {versions ? ` · правила: календар ${versions.calendar}, проверка ${versions.checker}, факти ${versions.factpack}` : ''}
    </p>
  );
};

export default BuildInfo;
