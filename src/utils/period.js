// Периоди на прогнозата. Месеците са календарни и се броят като на сървъра (backend/limits.py): първият и последният влизат.

// Последният позволен ден за период, започващ на startIso (YYYY-MM-DD): краят на maxMonths-я календарен месец.
export const maxEndDate = (startIso, maxMonths) => {
  const [y, m] = String(startIso || '').split('-').map(Number);
  if (!y || !m) return '';
  const last = new Date(y, m - 1 + maxMonths, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`;
};

// Следващият ден след YYYY-MM-DD (по UTC, без часови пояси)
export const nextDay = (iso) => {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};

// Периодът веднага след приключил на endIso: започва на следващия ден, а краят е най-късният позволен за maxMonths месеца.
// null при невалидна дата. Броят продължения не е ограничен; всеки период е отделен анализ със собствена цена.
export const nextPeriod = (endIso, maxMonths) => {
  const start = nextDay(endIso);
  const end = maxEndDate(start, maxMonths);
  return start && end ? { start, end } : null;
};
