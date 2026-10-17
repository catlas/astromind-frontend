// „Твоят кръг“ в Таблото: групите по вид отношения и какво показва всеки филтър.
// „Аз“ няма свой филтър: собствената карта се вижда във „Всички“. Непознат или празен вид отношения е „Други“.
export const GROUPS = [
  { id: 'self', label: 'Аз', relations: ['self'], chip: false },
  { id: 'family', label: 'Семейство', relations: ['spouse', 'partner', 'child', 'relative', 'family'] },
  { id: 'friends', label: 'Приятели', relations: ['friend'] },
  { id: 'other', label: 'Други', relations: ['other'] },
];

export const groupOf = (profile) => (GROUPS.find((g) => g.relations.includes(profile?.relation)) || GROUPS[GROUPS.length - 1]).id;

// Филтрите, които се показват: само групите с поне един профил
export const circleChips = (profiles) => GROUPS.filter((g) => g.chip !== false && profiles.some((p) => groupOf(p) === g.id));

// Профилите за избрания филтър: „all“ са ВСИЧКИ, без ограничение на броя
export const circleVisible = (profiles, filter) => profiles.filter((p) => filter === 'all' || groupOf(p) === filter);
