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

## Зависимости и известни предупреждения на `npm audit`

- `npm audit --omit=dev` (какво стига до браузъра): **0 известни уязвимости**.
- Vite е на 7.3.6 (фиксирана версия): с нея esbuild е 0.28.x и предупреждението „всеки сайт може да праща заявки към dev
  сървъра“ е затворено. Node за build е 20.20.2 (`.node-version`).
- Остават 7 предупреждения в **инструментите за компилация на CSS** (Tailwind 3: `braces`, `micromatch`, `fast-glob`,
  `chokidar`, `postcss-nested`, `postcss-selector-parser`): те са за претоварване на процесора при специално подготвени шаблони за
  файлове или CSS селектори. Подават им се само нашите собствени файлове при компилация, не данни от потребители, и не влизат в
  сайта. Поправката е преминаване към Tailwind 4 (голяма промяна на настройките и на външния вид), затова не се прави с
  `npm audit fix --force`. Отделно решение за собственика; до него рискът е приет и описан тук.
