// Текстът на отчета като блокове (Фаза 13). Същото разбиране като backend/report_text.py, за да показват екранът и износът
// един и същ отчет. Запазеният текст е смес: Markdown от AI (`##`, `**`, `-`) и малко HTML от приложението (`<h2>`, `<p>`).
// Тук няма HTML на изхода: екранът рисува блоковете с React елементи (текстът се екранира сам), затова вмъкване на
// код от AI, име или въпрос не може да се изпълни.

const HEADING_TAG = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1\s*>/gi;
const RULE = /^\s*(?:[-*_]{3,}|[━─═]{3,})\s*$/;
const BULLET = /^\s*[-*•]\s+(.*)$/;
const ORDERED = /^\s*\d{1,3}[.)]\s+(.*)$/;
const HEADING = /^\s*(#{1,6})\s+(.*?)\s*#*\s*$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_RULE = /^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const cells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const unescapeEntities = (s) => s.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m]);

// HTML от приложението и AI → Markdown. Непознатите тагове се махат, текстът им остава.
export const normalizeMarkup = (text) => {
  let s = String(text || '').replace(/\r\n?/g, '\n');
  s = s.replace(HEADING_TAG, (_, level, inner) => `\n\n${'#'.repeat(Number(level))} ${inner.trim()}\n\n`);
  s = s.replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p[^>]*>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li\s*>/gi, '')
    .replace(/<\/?(?:ul|ol|div|section|article|blockquote)[^>]*>/gi, '\n')
    .replace(/<\/?(?:strong|b)(?:\s[^>]*)?>/gi, '**')
    .replace(/<\/?(?:em|i)(?:\s[^>]*)?>/gi, '*')
    .replace(/<\/?[a-zA-Z][^>]*>/g, '');
  return unescapeEntities(s);
};

// -> [{ kind: 'h' | 'p' | 'ul' | 'ol' | 'hr' | 'table', level, items: [текст с **, *], rows, header }]
export const parseReport = (text) => {
  const blocks = [];
  let paragraph = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'p', level: 0, items: [paragraph.join(' ')] });
    paragraph = [];
  };
  let table = [];
  // Редове, които почват и свършват с |, са таблица (две или повече поредни); иначе са обикновен текст
  const flushTable = () => {
    const rows = table.filter((line) => !TABLE_RULE.test(line));
    if (table.length >= 2 && rows.length) {
      blocks.push({ kind: 'table', level: 0, items: [], rows: rows.map(cells), header: rows.length !== table.length });
    } else {
      table.forEach((line) => paragraph.push(line.trim()));
    }
    table = [];
  };
  normalizeMarkup(text).split('\n').forEach((raw) => {
    const line = raw.replace(/\s+$/, '');
    if (TABLE_ROW.test(line)) { flush(); table.push(line); return; }
    if (table.length) { flushTable(); flush(); }
    if (!line.trim()) { flush(); return; }
    if (RULE.test(line)) { flush(); blocks.push({ kind: 'hr', level: 0, items: [] }); return; }
    const heading = HEADING.exec(line);
    if (heading) { flush(); blocks.push({ kind: 'h', level: heading[1].length, items: [heading[2].trim()] }); return; }
    const bullet = BULLET.exec(line);
    const ordered = bullet ? null : ORDERED.exec(line);
    if (bullet || ordered) {
      flush();
      const kind = bullet ? 'ul' : 'ol';
      const body = (bullet || ordered)[1].trim();
      const last = blocks[blocks.length - 1];
      if (last && last.kind === kind) last.items.push(body); else blocks.push({ kind, level: 0, items: [body] });
      return;
    }
    paragraph.push(line.trim());
  });
  if (table.length) flushTable();
  flush();
  return blocks;
};

// „a **b** c *d*“ -> [{ text, bold, italic }]
const INLINE = /(\*\*([\s\S]+?)\*\*|(?<![\p{L}\p{N}_*])\*([^*\s][^*]*?)\*(?![\p{L}\p{N}_*])|(?<![\p{L}\p{N}_])_([^_\s][^_]*?)_(?![\p{L}\p{N}_]))/gu;
export const inlineRuns = (text) => {
  const runs = [];
  let position = 0;
  const source = String(text || '');
  for (const match of source.matchAll(INLINE)) {
    if (match.index > position) runs.push({ text: source.slice(position, match.index), bold: false, italic: false });
    if (match[2] !== undefined) runs.push({ text: match[2], bold: true, italic: false });
    else runs.push({ text: match[3] ?? match[4], bold: false, italic: true });
    position = match.index + match[0].length;
  }
  if (position < source.length) runs.push({ text: source.slice(position), bold: false, italic: false });
  return runs.length ? runs : [{ text: '', bold: false, italic: false }];
};

export const plainText = (text) => inlineRuns(text).map((run) => run.text).join('');

// Заглавията за съдържание (ниво 1-2). prefix прави идентификаторите уникални за всеки показан отчет на страницата.
export const outline = (blocks, prefix = 'r') => blocks
  .map((block, index) => ({ block, index }))
  .filter(({ block }) => block.kind === 'h' && block.level <= 2)
  .map(({ block, index }) => ({ id: `${prefix}-${index}`, title: plainText(block.items[0]), level: block.level }));
