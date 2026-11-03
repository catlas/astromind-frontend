// Кратък вид на отчета (02.11.2026): само обобщените блокове, без разпокъсаните карти за позиции и аспекти.
// Записаният текст не се променя: пълният остава в базата и в DOCX/Markdown; тук краткият се изрязва от него при показване.
// Ако формата не се разпознае, връща целия текст (нищо не се скрива по грешка).
import { normalizeMarkup } from './reportText';

const H2 = /^\s*##\s+(.*?)\s*#*\s*$/;
const H3 = /^\s*###\s+(.*?)\s*#*\s*$/;
const RULE = /^\s*(?:[-*_]{3,}|[━─═]{3,})\s*$/;
const CLOSING = /^(Обща картина|Какво да имате предвид.*|Отговор на въпроса|Заключение)$/;
const OVERVIEW = /Общ преглед на периода/;
const MONTH = /^📅/;
const ADVICE = /^Съвет за месеца$/;

const trimEnd = (lines) => {
  const out = [...lines];
  while (out.length && (!out[out.length - 1].trim() || RULE.test(out[out.length - 1]))) out.pop();
  return out;
};

const sections = (lines) => {
  const preface = [];
  const list = [];
  let current = null;
  lines.forEach((line) => {
    const m = line.match(H2);
    if (m) {
      current = { title: m[1].trim(), lines: [line] };
      list.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      preface.push(line);
    }
  });
  return { preface, list };
};

// Подраздел „### Съвет за месеца“ до следващия „###“ или края: с него остават и бележките накрая на отчета
const adviceOf = (section) => {
  const start = section.lines.findIndex((l) => ADVICE.test((l.match(H3) || [])[1] || ''));
  if (start < 0) return null;
  let end = section.lines.length;
  for (let i = start + 1; i < section.lines.length; i += 1) {
    if (H3.test(section.lines[i])) { end = i; break; }
  }
  return [section.lines[0], '', ...section.lines.slice(start, end)];
};

export const shortReport = (text) => {
  const full = String(text || '');
  const lines = normalizeMarkup(full).split('\n');
  const { preface, list } = sections(lines);
  const period = list.some((s) => OVERVIEW.test(s.title));
  let keep = [];
  if (period) {
    list.forEach((s) => {
      if (OVERVIEW.test(s.title)) keep.push(trimEnd(s.lines));
      else if (MONTH.test(s.title)) {
        const advice = adviceOf(s);
        if (advice) keep.push(trimEnd(advice));
      }
    });
  } else {
    keep = list.filter((s) => CLOSING.test(s.title)).map((s) => trimEnd(s.lines));
  }
  if (!keep.length) return { text: full, shortened: false };
  const head = trimEnd(preface);
  const body = [...(head.length ? [head.join('\n')] : []), ...keep.map((k) => k.join('\n'))].join('\n\n');
  const shortened = body.length < normalizeMarkup(full).trim().length - 40;
  return shortened ? { text: body, shortened: true } : { text: full, shortened: false };
};

export const REPORT_VIEWS = { short: 'short', full: 'full' };

// Изгледът по подразбиране е кратък; „Пълен“ се избира в Настройки (user.report_view)
export const savedReportView = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.report_view === 'full' ? 'full' : 'short';
  } catch {
    return 'short';
  }
};
