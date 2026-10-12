// Едно правило за филтриране на историята, общо за таблицата и времевата линия (R17): една и съща комбинация тема + профил +
// текст дава едно и също множество отчети и в двата изгледа. Идентичността на профила е по номер (profile_id); показаното име е
// само етикет, затова два профила с еднакво име не се сливат.

export const profileKey = (item) => {
  if (item?.profile_id) return `id:${item.profile_id}`;
  return item?.profile ? `name:${item.profile}` : 'none';
};

export const matchesFilters = (item, { type = 'all', profile = 'all', query = '' } = {}) => {
  if (type !== 'all' && item.type !== type) return false;
  if (profile !== 'all' && profileKey(item) !== profile) return false;
  const q = String(query || '').trim().toLowerCase();
  if (q && !String(item.label || '').toLowerCase().includes(q) && !String(item.profile || '').toLowerCase().includes(q)) return false;
  return true;
};

export const filterItems = (items, filters) => (items || []).filter((item) => matchesFilters(item, filters));

// Групите по месеци с филтрирани отчети; празните групи изчезват, броят във всяка група е преизчислен
export const filterGroups = (groups, filters) => (groups || [])
  .map((group) => ({ ...group, reports: group.reports.filter((item) => matchesFilters(item, filters)) }))
  .filter((group) => group.reports.length > 0);

// Падащо меню за профил: ключ + етикет. При еднакви показани имена се добавя номерът, за да се различават
export const profileOptions = (items) => {
  const seen = new Map();
  (items || []).forEach((item) => {
    const key = profileKey(item);
    if (key !== 'none' && !seen.has(key)) seen.set(key, { key, label: item.profile || '', id: item.profile_id || null });
  });
  const labels = [...seen.values()];
  const counts = labels.reduce((acc, o) => ({ ...acc, [o.label]: (acc[o.label] || 0) + 1 }), {});
  return labels.map((o) => ({ key: o.key, label: counts[o.label] > 1 && o.id ? `${o.label} (профил №${o.id})` : o.label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'bg'));
};
