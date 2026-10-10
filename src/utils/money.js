// Пари. Сървърът праща всички суми в евроценти (цели числа); тук се подготвят за екрана.
// Балансът има две части: внесени средства (paid_cents) и подарък (gift_cents).
// Основните анализи се плащат първо от подаръка, после от внесените средства;
// премиум услугите (анализ за двама, прогноза за период) се плащат само от внесените.

const NBSP = ' ';

export const formatEur = (cents) => {
  const value = Number(cents);
  const safe = Number.isFinite(value) ? value : 0;
  return `${(safe / 100).toFixed(2).replace('.', ',')}${NBSP}€`;
};

// Със знак, за движенията по баланса: „+5,00 €“ и „−1,60 €“
export const formatSignedEur = (cents) => {
  const value = Number(cents) || 0;
  return `${value < 0 ? '−' : '+'}${formatEur(Math.abs(value))}`;
};

const toCents = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const balanceOf = (user) => toCents(user?.balance_cents);
export const paidOf = (user) => toCents(user?.paid_cents);
export const giftOf = (user) => toCents(user?.gift_cents);

// Колко от баланса може да се похарчи за услуга: премиум само внесените средства
export const availableFor = (user, premium) => (premium ? paidOf(user) : balanceOf(user));

// Достъп на потребителя: премиум услугите са отключени, докато има внесени средства
export const accessLabel = (user) => (paidOf(user) > 0 ? 'Премиум' : 'Основен');

// Новият баланс от отговор на сървъра ({ balance_cents, paid_cents, gift_cents }) върху потребителя
export const withBalance = (user, source) => {
  if (!user || !source || source.balance_cents === undefined || source.balance_cents === null) return user;
  return {
    ...user,
    balance_cents: source.balance_cents,
    paid_cents: source.paid_cents ?? user.paid_cents,
    gift_cents: source.gift_cents ?? user.gift_cents,
  };
};

// Цени по подразбиране, докато конфигурацията от сървъра не е заредена
export const FALLBACK_PRICES = {
  basic_analysis: 160,
  pair_analysis: 180,
  forecast_month: 75,
  forecast_partner_extra: 60,
};

// Подарък, пакети за зареждане и ограничения по подразбиране (същите като в бекенда). Началната страница ги показва,
// докато сървърът се събужда след студен старт; щом конфигурацията пристигне, важат живите стойности.
export const FALLBACK_SIGNUP_GIFT = 500;
export const FALLBACK_TOPUPS = [
  { id: 'topup5', amount_cents: 500, credit_cents: 500 },
  { id: 'topup10', amount_cents: 1000, credit_cents: 1050 },
  { id: 'topup20', amount_cents: 2000, credit_cents: 2200 },
];
export const FALLBACK_LIMITS = { forecast_max_months_single: 3, forecast_max_months_pair: 2 };

// Броят календарни месеци на периода, включително първия и последния (01.10–30.11 са 2 месеца)
export const periodMonths = (startIso, endIso) => {
  const start = new Date(`${startIso}T12:00:00`);
  const end = new Date(`${endIso}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 1;
  return (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1;
};

// Цената и видът на услугата: { cents, premium }. Същото правило като на сървъра (billing.py).
export const quoteFor = (prices, { dynamic, months, hasPartner }) => {
  const p = { ...FALLBACK_PRICES, ...(prices || {}) };
  if (dynamic) {
    return { cents: Math.max(1, months) * p.forecast_month + (hasPartner ? p.forecast_partner_extra : 0), premium: true };
  }
  return hasPartner
    ? { cents: p.pair_analysis, premium: true }
    : { cents: p.basic_analysis, premium: false };
};
