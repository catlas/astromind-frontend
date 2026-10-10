// Текстът на отчета като блокове (Фаза 13). Същото разбиране като backend/report_text.py, за да показват екранът и износът
// един и същ отчет. Запазеният текст е смес: Markdown от AI (`##`, `**`, `-`) и малко HTML от приложението (`<h2>`, `<p>`).
// Тук няма HTML на изхода: екранът рисува блоковете с React елементи (текстът се екранира сам), затова вмъкване на
// код от AI, име или въпрос не може да се изпълни.

const HEADING_TAG = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1\s*>/gi;
const RULE = /^\s*(?:[-*_]{3,}|[━─═]{3,})\s*$/;
const BULLET = /^\s*[-*•]\s+(.*)$/;
const ORDERED = /^\s*\d{1,3}[.)]\s+(.*)$/;
const HEADING = /^\s*(#{1,6})\s+(.*?)\s*#*\s*$/;

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

// -> [{ kind: 'h' | 'p' | 'ul' | 'ol' | 'hr', level, items: [текст с **, *] }]
export const parseReport = (text) => {
  const blocks = [];
  let paragraph = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'p', level: 0, items: [paragraph.join(' ')] });
    paragraph = [];
  };
  normalizeMarkup(text).split('\n').forEach((raw) => {
    const line = raw.replace(/\s+$/, '');
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

// Заглавията за съдържание (ниво 1-2)
export const outline = (blocks) => blocks
  .map((block, index) => ({ block, index }))
  .filter(({ block }) => block.kind === 'h' && block.level <= 2)
  .map(({ block, index }) => ({ id: `r-${index}`, title: plainText(block.items[0]), level: block.level }));
