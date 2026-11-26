import { generateQuestion } from './mental-math.js?v=0.14.0-release-2';

export const DURATION = 60000;
const SPEED_SCALE = {slow:.65, normal:1, fast:1.5};
// Rain times are anchored to five stones, with separate allowances for calculations.
const FALL_TIME = {numbers:{slow:20000,normal:13000,fast:6000},calculations:{slow:30000,normal:20000,fast:10000}};
const FLOAT_TIME = {slow:24000,normal:20000,fast:16000};
export function normalizeWhirl(value = {}) {
  value = value && typeof value === 'object' ? value : {};
  const operations = ['add', 'subtract', 'multiply', 'divide'].filter(op => value.operations?.includes?.(op));
  return { range: [20,100,1000].includes(+value.range) ? +value.range : 20,
    content: ['numbers','calculations','mixed'].includes(value.content) ? value.content : 'numbers',
    operations: operations.length ? operations : ['add','subtract'],
    direction: value.direction === 'descending' ? 'descending' : 'ascending',
    count: [3,4,5,6].includes(+value.count) ? +value.count : 3,
    movement: value.movement === 'float' ? 'float' : 'fall',
    speed: ['slow','normal','fast'].includes(value.speed) ? value.speed : 'slow',
    mode: value.mode === 'practice' ? 'practice' : 'timed' };
}
export function waveDuration(settings) {
  const s = normalizeWhirl(settings);
  if (s.mode === 'practice' && s.movement === 'float') return Infinity;
  if (s.movement === 'fall') {
    const times = FALL_TIME[s.content === 'numbers' ? 'numbers' : 'calculations'];
    return Math.round(times[s.speed] * (s.count + 3) / 8);
  }
  // Time to think is independent of floating velocity. More targets and
  // calculations need extra thinking time; quick solvers still move on immediately.
  const countFactor=1+(s.count-3)/6;
  const calculationFactor=s.content==='numbers'?1:1.5;
  return Math.round(FLOAT_TIME[s.speed]*countFactor*calculationFactor);
}
// Old per-stone records remain stored, but only comparable new scores compete.
export const whirlScoreKey = settings => {
  const s = normalizeWhirl(settings);
  return `group-time-${s.movement === 'fall' ? 'v3' : 'v2'}:${JSON.stringify(s)}`;
};
export function whirlReward(settings, elapsed, groupErrors = 0) {
  // Rewards use the original fall time; collected stones cannot reset the tiers.
  const s = normalizeWhirl(settings), duration = waveDuration({...s, mode:'timed'});
  const time = Number.isFinite(elapsed) ? Math.max(0, elapsed) : duration;
  const base = Math.max(1, s.count - Math.floor(time * (s.count - 1) / duration + 1e-10));
  const bonus = groupErrors === 0 ? 2 : 0;
  return {base, bonus, total:base + bonus};
}
export function generateWave(settings, random = Math.random) {
  const s = normalizeWhirl(settings);
  return Array.from({length:s.count}, (_, id) => {
    const calculation = s.content === 'calculations' || (s.content === 'mixed' && random() < .5);
    const q = calculation ? generateQuestion(s, random) : null;
    const value = q ? q.result : Math.min(s.range, Math.floor(random() * (s.range + 1)));
    return { id, value, label:q ? q.expression : String(value), selected:false };
  });
}
function fallingLayout(settings, height) {
  const s=normalizeWhirl(settings),stoneHeight=56,gap=70;
  const start=i=>10+Math.floor(i/2)*gap;
  return {s,stoneHeight,start,travel:Math.max(0,height-stoneHeight-start(s.count-1))};
}
/** First contact of a still visible stone; collected stones no longer expire a group. */
export function fallingDeadline(settings, height=332, activeIds) {
  const {s,stoneHeight,start,travel}=fallingLayout(settings,height);
  const ids=activeIds??Array.from({length:s.count},(_,i)=>i);
  if(!ids.length)return Infinity;
  if(travel===0)return 0;
  return Math.min(...ids.map(i=>(height-stoneHeight-start(i))/travel))*waveDuration({...s,mode:'timed'});
}
/** Falling groups only travel downwards; floating rectangles share the whole board. */
export function stonePositions(settings, elapsed, width, height, activeIds) {
  const s = normalizeWhirl(settings);
  if (s.movement === 'float') return createStoneMotion(s, width, height).advance(elapsed);
  const bw = Math.max(48, width / 2 - 28), bh = 56;
  const {start,travel}=fallingLayout(s,height);
  const progress = Math.max(0,Math.min(elapsed,fallingDeadline(s,height,activeIds)))/waveDuration({...s,mode:'timed'});
  return Array.from({length:s.count}, (_, i) => {
    const col = i % 2;
    return {x:12 + col * width / 2, y:Math.min(height-bh,start(i)+travel*progress), width:bw, height:bh};
  });
}

/** Continuous rectangle collisions: even a long frame cannot jump through another stone. */
export function createStoneMotion(settings, width, height, {stones} = {}) {
  const s = normalizeWhirl(settings), rows = Math.ceil(s.count / 2), bw = Math.max(48, width / 2 - 28), bh = 56;
  // Gentler velocity steps; group deadlines are defined independently above.
  const speed = Math.max(24, (height / 2 - bh - 24) * Math.PI * .73 / 4.5) * SPEED_SCALE[s.speed];
  const directions = [[1,.67],[-.91,.46],[.82,-1],[-.63,-1],[1,.45],[-.78,.82]];
  const bodies = stones ? stones.map((stone, id) => ({id, active:true, ...stone})) : Array.from({length:s.count}, (_, id) => {
    const [dx,dy] = directions[id], length = Math.hypot(dx,dy);
    return {id, active:true, x:12 + id % 2 * width / 2,
      y:12 + Math.floor(id / 2) * (height - bh - 24) / Math.max(1, rows - 1),
      width:bw, height:bh, vx:dx / length * speed, vy:dy / length * speed};
  });
  const EPS = 1e-9;
  let elapsed = 0;
  function interval(a, b, axis) {
    const size = axis === 'x' ? 'width' : 'height', velocity = a[axis === 'x' ? 'vx' : 'vy'] - b[axis === 'x' ? 'vx' : 'vy'];
    if (Math.abs(velocity) < EPS) return a[axis] + a[size] <= b[axis] + EPS || b[axis] + b[size] <= a[axis] + EPS ? null : [-Infinity, Infinity];
    const first = (b[axis] - a[axis] - a[size]) / velocity, second = (b[axis] + b[size] - a[axis]) / velocity;
    return [Math.min(first,second), Math.max(first,second)];
  }
  function travel(seconds) {
    for (const b of bodies) if (b.active) {
      b.x = Math.min(width - b.width, Math.max(0, b.x + b.vx * seconds));
      b.y = Math.min(height - b.height, Math.max(0, b.y + b.vy * seconds));
    }
  }
  function step(seconds) {
    let remaining = seconds;
    while (remaining > EPS) {
      let earliest = remaining, events = [];
      function contact(time, event) {
        if (time < -EPS || time > remaining + EPS) return;
        time = Math.max(0, time);
        if (time < earliest - EPS) {earliest = time; events = [event];}
        else if (Math.abs(time - earliest) <= EPS) events.push(event);
      }
      for (const b of bodies) if (b.active) {
        if (Math.abs(b.vx) > EPS) contact((b.vx > 0 ? width - b.width - b.x : -b.x) / b.vx, {body:b, axis:'x'});
        if (Math.abs(b.vy) > EPS) contact((b.vy > 0 ? height - b.height - b.y : -b.y) / b.vy, {body:b, axis:'y'});
      }
      for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i], b = bodies[j]; if (!a.active || !b.active) continue;
        const x = interval(a,b,'x'), y = interval(a,b,'y'); if (!x || !y) continue;
        const entry = Math.max(x[0],y[0]), exit = Math.min(x[1],y[1]);
        if (exit < Math.max(0,entry) - EPS || entry < -EPS) continue;
        const axes = Math.abs(x[0] - y[0]) <= EPS ? ['x','y'] : [x[0] > y[0] ? 'x' : 'y'];
        contact(entry, {a,b,axes});
      }
      travel(earliest); remaining -= earliest;
      if (!events.length) break;
      for (const event of events) {
        if (event.body) {
          const b = event.body, axis = event.axis, v = axis === 'x' ? 'vx' : 'vy', size = axis === 'x' ? 'width' : 'height', limit = axis === 'x' ? width : height;
          if (b[axis] <= EPS && b[v] < 0 || b[axis] + b[size] >= limit - EPS && b[v] > 0) b[v] *= -1;
        } else {
          for (const axis of event.axes) {
            const {a,b} = event, v = axis === 'x' ? 'vx' : 'vy';
            if ((b[axis] - a[axis]) * (a[v] - b[v]) > EPS) [a[v], b[v]] = [b[v], a[v]];
          }
        }
      }
    }
  }
  return {
    advance(time) {
      const next = Math.max(elapsed, Number.isFinite(time) ? time : elapsed);
      step((next - elapsed) / 1000); elapsed = next;
      return bodies.map(({x,y,width,height}) => ({x,y,width,height}));
    },
    setActive(ids) {const selected = new Set(ids); for (const b of bodies) b.active = selected.has(b.id);},
    snapshot() {return bodies.map(b => ({...b}));}
  };
}
export function createWhirlRound(settings, {now = 0, random = Math.random} = {}) {
  const s = normalizeWhirl(settings);
  let phase = 'playing', previousPhase, remaining = DURATION, elapsed = 0, last = now, delay = 0;
  let serial = 0, coins = 0, correct = 0, errors = 0, completed = 0, escaped = 0;
  let stones, feedback = null, groupErrors = 0, playfieldHeight=332;
  const groupDuration=()=>s.movement==='fall'?fallingDeadline(s,playfieldHeight,stones.filter(x=>!x.selected).map(x=>x.id)):waveDuration(s);
  const mistakes = [];
  function next() { stones = generateWave(s, random); serial++; elapsed = 0; groupErrors = 0; phase = 'playing'; feedback = null; }
  function review() { return [...stones].sort((a,b) => s.direction === 'ascending' ? a.value-b.value : b.value-a.value).map(x => ({label:x.label,value:x.value})); }
  function tick(time) {
    if (!['playing','feedback'].includes(phase)) return false;
    const delta = Math.max(0, time-last); last = time;
    if (s.mode === 'timed') remaining = Math.max(0, remaining-delta);
    if (phase === 'feedback') {
      delay = Math.max(0, delay-delta);
      if (delay > 0) return false;
      if (remaining === 0 && s.mode === 'timed') { phase = 'done'; return true; }
      next(); return true;
    }
    elapsed += delta;
    if (s.mode === 'timed' && remaining === 0) { phase = 'done'; return true; }
    if (elapsed >= groupDuration()) {
      escaped++; const order = review(); mistakes.push(order);
      feedback = {kind:'escaped', order}; phase = 'feedback'; delay = 2800; return true;
    }
    if (feedback?.kind === 'wrong' && elapsed >= feedback.until) { feedback = null; return true; }
    return false;
  }
  function answer(id, waveId, time) {
    tick(time);
    if (phase !== 'playing' || waveId !== serial) return false;
    const target = stones.find(x => x.id === id);
    if (!target || target.selected || (feedback?.kind === 'wrong' && elapsed < feedback.until)) return false;
    const values = stones.filter(x => !x.selected).map(x => x.value);
    const expected = s.direction === 'ascending' ? Math.min(...values) : Math.max(...values);
    if (target.value !== expected) {
      errors++; groupErrors++; feedback = {kind:'wrong', id, until:elapsed+800}; return true;
    }
    target.selected = true; correct++; feedback = {kind:'right', id};
    if (stones.every(x => x.selected)) {
      const reward = whirlReward(s, elapsed, groupErrors);
      coins += reward.total; completed++; phase='feedback'; delay=1000;
      feedback={kind:'complete', ...reward};
    }
    return true;
  }
  next();
  return { tick, answer,
    setPlayfieldHeight(height) {if(Number.isFinite(height)&&height>=206)playfieldHeight=height;},
    pause(time) { tick(time); if (!['playing','feedback'].includes(phase)) return false; previousPhase=phase; phase='paused'; return true; },
    resume(time) { if (phase !== 'paused') return false; phase=previousPhase; last=time; return true; },
    finish(time) { tick(time); phase='done'; },
    snapshot() { return {settings:{...s,operations:[...s.operations]}, phase, remaining, elapsed, groupDuration:groupDuration(), waveId:serial,
      stones:stones.map(x=>({...x})), coins, correct, errors, groupErrors, completed, escaped,
      feedback:feedback && {...feedback, order:feedback.order?.map(x=>({...x}))},
      mistakes:mistakes.map(order=>order.map(x=>({...x}))) }; }
  };
}
