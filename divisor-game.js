// Teiler-Vielfache-Spiel / Juniper Green. No move suggestions are exposed.
export const CARD_PAGE_SIZE = 100;
export function validCardCount(value) {
  return Number.isSafeInteger(value) && (value === 40 || value >= 100);
}
export function parseCardCount(mode, text = '') {
  if (mode === '40' || mode === '100') return Number(mode);
  if (mode !== 'custom' || !/^\d+$/.test(String(text).trim())) return null;
  const value = Number(String(text).trim());
  return Number.isSafeInteger(value) && value > 100 ? value : null;
}

const primeCache = new Map();
function powerMod(base, exponent, modulus) {
  let result = 1n;
  for (; exponent > 0n; exponent >>= 1n, base = base * base % modulus) {
    if (exponent & 1n) result = result * base % modulus;
  }
  return result;
}
// Deterministic Miller–Rabin witnesses for unsigned 64-bit integers; all our
// accepted integers are below 2^53. BigInt keeps modular products exact.
export function isPrime(value) {
  if (!Number.isSafeInteger(value) || value < 2) return false;
  if (primeCache.has(value)) return primeCache.get(value);
  const n = BigInt(value);
  for (const p of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]) {
    if (n % p === 0n) return n === p;
  }
  let d = n - 1n, shifts = 0;
  while (!(d & 1n)) { d >>= 1n; shifts++; }
  let prime = true;
  for (const witness of [2n, 325n, 9375n, 28178n, 450775n, 9780504n, 1795265022n]) {
    if (witness % n === 0n) continue;
    let x = powerMod(witness % n, d, n);
    if (x === 1n || x === n - 1n) continue;
    let passed = false;
    for (let r = 1; r < shifts; r++) {
      x = x * x % n;
      if (x === n - 1n) { passed = true; break; }
    }
    if (!passed) { prime = false; break; }
  }
  if (primeCache.size > 10000) primeCache.clear();
  primeCache.set(value, prime);
  return prime;
}

export function hasLegalMove(count, moves) {
  if (!moves.length) return count >= 2;
  const last = moves.at(-1), used = new Set(moves);
  // Count unused multiples without creating an array with count elements.
  const usedMultiples = moves.filter(value => value % last === 0).length;
  if (Math.floor(count / last) > usedMultiples) return true;
  if (last !== 1 && !used.has(1)) return true;
  if (last === 1 || isPrime(last)) return false;
  const usedDivisors = moves.filter(value => value < last && last % value === 0);
  let remaining = last, divisorCount = 1;
  for (const divisor of usedDivisors) {
    if (!isPrime(divisor)) continue;
    let exponent = 0;
    while (remaining % divisor === 0) { remaining /= divisor; exponent++; }
    divisorCount *= exponent + 1;
  }
  // An unfactored residue has a prime divisor that has not been played.
  // Otherwise we know the complete factorization, so we can count divisors.
  return remaining > 1 || usedDivisors.length < divisorCount - 1;
}

export function cardPage(count, requestedStart = 0) {
  const lastStart = Math.floor((count - 1) / CARD_PAGE_SIZE) * CARD_PAGE_SIZE;
  const start = Math.min(lastStart, Math.max(0, Math.floor(requestedStart / CARD_PAGE_SIZE) * CARD_PAGE_SIZE || 0));
  const length = Math.min(CARD_PAGE_SIZE, count - start);
  return { start, end: start + length, cards: Array.from({length}, (_, index) => start + index + 1) };
}

export function createDivisorRound({count = 40, starter = 0, moves: savedMoves = []} = {}) {
  if (!validCardCount(count)) throw new RangeError('Ungültige Kartenzahl');
  if (![0, 1].includes(starter)) throw new RangeError('Ungültiger Startspieler');
  const moves = [], used = new Set();
  let finished = false;
  function error(value) {
    if (finished) return 'Diese Partie ist beendet.';
    if (!Number.isSafeInteger(value) || value < 1 || value > count) return 'Diese Zahl gehört nicht zum gewählten Zahlenbereich.';
    if (used.has(value)) return `Die ${value} wurde schon gelegt.`;
    if (!moves.length) return value % 2 ? 'Beginne mit einer geraden Zahl.' : '';
    const last = moves.at(-1);
    return last % value === 0 || value % last === 0 ? '' : `${value} ist weder ein Teiler noch ein Vielfaches von ${last}.`;
  }
  function play(value) {
    const reason = error(value);
    if (reason) return {ok: false, reason};
    moves.push(value); used.add(value);
    finished = !hasLegalMove(count, moves);
    return {ok: true, finished};
  }
  if (!Array.isArray(savedMoves)) throw new TypeError('Ungültiger Spielstand');
  for (const value of savedMoves) if (!play(value).ok) throw new TypeError('Ungültiger Spielstand');
  return {
    play,
    snapshot() {
      const nextPlayer = (starter + moves.length) % 2;
      return {count, starter, moves: [...moves], last: moves.at(-1) ?? null,
        nextPlayer, finished, winner: finished ? 1 - nextPlayer : null};
    }
  };
}
