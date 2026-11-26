export const OPERATIONS = { add: '+', subtract: '−', multiply: '×', divide: ':' };
export const DEFAULT_SETTINGS = { range: 100, operations: ['add', 'subtract'], mode: 'timed' };
export const ROUND_MS = 60000;
const FEEDBACK_MS = 700;

export function normalizeSettings(value = {}) {
  value = value && typeof value === "object" ? value : {};
  const operations = Object.keys(OPERATIONS).filter(op => Array.isArray(value.operations) && value.operations.includes(op));
  return { range: [20, 100, 1000].includes(Number(value.range)) ? Number(value.range) : 100,
    operations: operations.length ? operations : [...DEFAULT_SETTINGS.operations],
    mode: value.mode === 'practice' ? 'practice' : 'timed' };
}
export function scoreKey(settings) {
  const s = normalizeSettings(settings);
  return `${s.range}:${s.operations.join(',')}:${s.mode}:60`;
}
const pick = (items, random) => items[Math.min(items.length - 1, Math.floor(random() * items.length))];
const integer = (max, random) => Math.min(max, Math.floor(random() * (max + 1)));
function shuffle(items, random) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = integer(i, random); [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

const factorPools = new Map();
function factors(range) {
  if (!factorPools.has(range)) {
    const pairs = new Map();
    for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) {
      for (const scale of [1, 10, 100]) for (const side of [0, 1]) {
        const left = a * (side === 0 ? scale : 1), right = b * (side === 1 ? scale : 1);
        if (left * right <= range) pairs.set(`${left}:${right}`, [left, right]);
      }
    }
    factorPools.set(range, [...pairs.values()]);
  }
  return factorPools.get(range);
}

export function generateQuestion(settings, random = Math.random, recent = []) {
  const s = normalizeSettings(settings);
  let q;
  for (let attempt = 0; attempt < 40; attempt++) {
    const operation = pick(s.operations, random);
    let a, b, result;
    if (operation === 'add') {
      result = integer(s.range, random); a = integer(result, random); b = result - a;
    } else if (operation === 'subtract') {
      a = integer(s.range, random); b = integer(a, random); result = a - b;
    } else {
      const [left, right] = pick(factors(s.range), random);
      a = operation === 'multiply' ? left : left * right;
      b = right;
      result = operation === 'multiply' ? left * right : left;
    }
    const signature = `${a}:${operation}:${b}`;
    q = { a, b, operation, result, signature, expression: `${a} ${OPERATIONS[operation]} ${b}` };
    if (!recent.includes(signature)) break;
  }
  const wrong = new Set();
  const candidates = [q.result - 1, q.result + 1, q.result - 10, q.result + 10,
    q.result - q.b, q.result + q.b, q.a + q.b, q.a * q.b];
  const distance = Math.max(3, Math.ceil(q.result * .35), Math.min(q.b, 10));
  for (const value of shuffle(candidates, random)) {
    if (Number.isInteger(value) && value >= 0 && value <= s.range && value !== q.result && Math.abs(value - q.result) <= distance) wrong.add(value);
    if (wrong.size === 2) break;
  }
  for (let value = 0; wrong.size < 2; value++) if (value !== q.result) wrong.add(value);
  q.answers = shuffle([q.result, ...wrong], random);
  return q;
}

/** Monotonic timestamps are supplied by the caller; answers and expiry share one clock. */
export function createRound(settings, { now = 0, random = Math.random } = {}) {
  const s = normalizeSettings(settings);
  let phase = 'playing', pausedFrom = null, remaining = ROUND_MS, lastTime = now;
  let feedbackUntil = 0, feedbackRemaining = 0, serial = 0;
  let correct = 0, mistakes = [], feedback = null;
  const recent = [];
  let question;
  function next() {
    question = { ...generateQuestion(s, random, recent), id: ++serial };
    recent.push(question.signature); if (recent.length > 8) recent.shift();
    feedback = null; phase = 'playing';
  }
  function tick(time) {
    if (!['playing', 'feedback'].includes(phase)) return false;
    if (s.mode === 'timed') remaining = Math.max(0, remaining - Math.max(0, time - lastTime));
    lastTime = time;
    if (phase === 'feedback' && time < feedbackUntil) return false;
    if (s.mode === 'timed' && remaining <= 0) { phase = 'done'; return true; }
    if (phase === 'feedback') { next(); return true; }
    return false;
  }
  function answer(value, id, time) {
    tick(time);
    if (phase !== 'playing' || id !== question.id || !question.answers.includes(value)) return false;
    const right = value === question.result;
    if (right) correct++;
    else mistakes.push({ ...question, answers: [...question.answers], selected: value });
    feedback = { right, selected: value };
    phase = 'feedback'; feedbackUntil = time + FEEDBACK_MS;
    return true;
  }
  function pause(time) {
    tick(time);
    if (!['playing', 'feedback'].includes(phase)) return false;
    pausedFrom = phase; feedbackRemaining = Math.max(0, feedbackUntil - time); phase = 'paused'; return true;
  }
  function resume(time) {
    if (phase !== 'paused') return false;
    phase = pausedFrom; lastTime = time; feedbackUntil = time + feedbackRemaining; return true;
  }
  next();
  return { tick, answer, pause, resume,
    finish(time) { tick(time); phase = 'done'; },
    snapshot() { return { settings: { ...s, operations: [...s.operations] }, phase, remaining,
      correct, coins: correct, mistakes: mistakes.map(q => ({ ...q, answers: [...q.answers] })),
      feedback: feedback && { ...feedback }, question: { ...question, answers: [...question.answers] } }; }
  };
}
