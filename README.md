# Astrology Frontend

React + Vite frontend за астрологичното приложение.

## Инсталация

```bash
cd frontend
npm install
```

## Стартиране

```bash
npm run dev
```

Приложението ще се отвори на `http://localhost:5173`

## Структура

- `src/App.jsx` - Главен компонент с форма и показване на резултати
- `src/components/AstroChart.jsx` - SVG визуализация на астрологичната карта
- `src/utils/astroMath.js` - Математически помощни функции за координати

## Конфигурация

Vite е конфигуриран с proxy към backend на `http://127.0.0.1:8000`. 
Всички заявки към `/api/*` се пренасочват автоматично към backend сървъра.

# trigger deploy

## Заглавия за сигурност

API-то (`astromind-api`) слага заглавията само (виж `backend/http_security.py`). Статичният сайт (`astromind-web`) получава
политика за съдържанието (CSP) като `<meta>` при production build (виж `vite.config.js`), но `frame-ancestors` и HSTS не могат
да са в `<meta>`: те се слагат от хостинга. В Render: Static Site → **Settings → Headers** → добавете за път `/*`:

| Заглавие | Стойност |
| --- | --- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | `DENY` |
| `Content-Security-Policy` | `frame-ancestors 'none'` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |

Заглавие `Content-Security-Policy` от хостинга се комбинира със строгото `<meta>`: важи по-ограничителното. Проверка след
промяна: `curl -sI https://astromind-web.onrender.com/ | grep -i "strict-transport\|x-frame\|content-security"`.
