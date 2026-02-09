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

