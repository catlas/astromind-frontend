// Групите на профилите и видовете отношения между двама души в анализ (Фаза 12)

export const RELATION_LABELS = {
  self: 'Аз',
  friend: 'Приятел',
  spouse: 'Съпруг/а',
  child: 'Дете',
  relative: 'Роднина',
  family: 'Роднина',
  partner: 'Партньор',
  other: 'Друг',
};

// Стойностите са като на сървъра (backend/relationship.py). Празната стойност е „общо взаимодействие“:
// типът на отношенията не се гадае.
export const CONTEXT_OPTIONS = [
  { value: '', label: 'Общо взаимодействие' },
  { value: 'romantic', label: 'Романтична връзка' },
  { value: 'friend', label: 'Приятелство' },
  { value: 'family', label: 'Семейство' },
  { value: 'parent_child', label: 'Родител и дете' },
  { value: 'work', label: 'Работа' },
];

const SUGGESTED = {
  partner: 'romantic',
  spouse: 'romantic',
  friend: 'friend',
  relative: 'family',
  family: 'family',
  child: 'parent_child',
};

// Контекст по групата на втория профил. Важи само когато първият човек е основният профил:
// групата на втория е спрямо собственика на акаунта и не доказва отношенията между други двама.
export const suggestContext = (firstProfile, secondProfile) => {
  if (!firstProfile || !secondProfile) return '';
  const firstIsOwner = Boolean(firstProfile.is_primary) || firstProfile.relation === 'self';
  return firstIsOwner ? (SUGGESTED[secondProfile.relation] || '') : '';
};

export const relationLabel = (relation) => RELATION_LABELS[relation] || 'Друг';
export const contextLabel = (value) => CONTEXT_OPTIONS.find((o) => o.value === (value || ''))?.label || 'Общо взаимодействие';
