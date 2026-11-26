import { roundCelebrationMarkup, createCelebrationPlayer, goldCoinMarkup } from './game-celebration.js?v=0.14.0-release-2';
import { createRound, normalizeSettings, scoreKey, ROUND_MS } from './mental-math.js?v=0.14.0-release-2';

const symbol = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${name === 'check' ? '<path d="m5 12 4 4L19 6"/>' : name === 'cross' ? '<path d="m6 6 12 12M18 6 6 18"/>' : '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9h5M9 15h5"/>'}</svg>`;
const coin = `<span class="math-coin" aria-hidden="true">${goldCoinMarkup()}</span>`;
const chest = `<svg class="math-chest" viewBox="0 0 180 135" aria-hidden="true"><ellipse cx="90" cy="119" rx="65" ry="10" fill="#dfe9e3"/><path d="M30 55q0-35 60-35t60 35v20H30Z" fill="#945c36" stroke="#70432b" stroke-width="4"/><path d="M30 60h120v49q0 9-9 9H39q-9 0-9-9Z" fill="#c2874e" stroke="#70432b" stroke-width="4"/><path d="M49 31v85M131 31v85M30 67h120" stroke="#f4b942" stroke-width="9"/><rect x="77" y="62" width="26" height="30" rx="5" fill="#f4b942"/><path d="M90 70v12" stroke="#70432b" stroke-width="5"/><circle cx="69" cy="20" r="12" fill="#f4b942" stroke="#b97817" stroke-width="2"/><circle cx="103" cy="13" r="12" fill="#f9d774" stroke="#b97817" stroke-width="2"/><circle cx="135" cy="22" r="10" fill="#f4b942" stroke="#b97817" stroke-width="2"/></svg>`;
const operationLabels = { add: '+ Plus', subtract: '− Minus', multiply: '× Mal', divide: ': Geteilt' };
const formatTime = ms => { const seconds = Math.ceil(ms / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; };
const safeScores = value => Object.fromEntries(Object.entries(value && typeof value === 'object' ? value : {})
  .filter(([, n]) => Number.isSafeInteger(n) && n >= 0));

export function createMentalMathGame({ read, write, onActivityChange = () => {}, scope = window }) {
  let settings = normalizeSettings(read('math-settings', {}));
  let scores = safeScores(read('math-scores', {}));
  let root = null, round = null, interval = null, visible = false, recorded = false;
  let bestBefore = 0;
  const boundRoots = new WeakSet();
  const celebration = createCelebrationPlayer({scope});
  const now = () => scope.performance?.now() ?? Date.now();
  function activity() { onActivityChange(Boolean(round && ['playing', 'feedback', 'paused'].includes(round.snapshot().phase))); }
  function saveResult() {
    const s = round?.snapshot();
    if (!s || s.phase !== 'done' || recorded) return;
    recorded = true;
    if (s.settings.mode === 'timed' && s.remaining === 0) {
      scores[scoreKey(s.settings)] = Math.max(bestBefore, s.correct);
      write('math-scores', scores);
    }
    activity();
  }
  function stopClock() { if (interval !== null) scope.clearInterval(interval); interval = null; }
  function startClock() {
    stopClock();
    if (!visible || !round || !['playing', 'feedback'].includes(round.snapshot().phase)) return;
    interval = scope.setInterval(() => {
      const changed = round.tick(now());
      saveResult();
      if (changed) draw(true); else updateClock();
      if (!['playing', 'feedback'].includes(round.snapshot().phase)) stopClock();
    }, 100);
  }
  function updateClock() {
    const s = round?.snapshot(); if (!s || !root?.isConnected) return;
    const timer = root.querySelector('[data-math-timer]');
    if (timer) { timer.textContent = formatTime(s.remaining); timer.parentElement.classList.toggle('ending', s.remaining <= 10000); }
    const bar = root.querySelector('[data-math-time-bar]');
    if (bar) bar.style.width = `${s.remaining / ROUND_MS * 100}%`;
  }
  function settingsSummary(s) {
    return `Bis ${s.range.toLocaleString('de-DE')} · ${s.operations.map(op => operationLabels[op].split(' ').slice(1).join(' ')).join(', ')} · ${s.mode === 'timed' ? '1 Minute' : 'Ohne Zeitlimit'}`;
  }
  const modeDescription = mode => mode === 'timed' ? '' : 'Übe in deinem Tempo und beende die Runde selbst.';
  function setupView() {
    const best = scores[scoreKey(settings)] || 0;
    return `<div class="math-intro math-game-intro"><div><span class="math-eyebrow">Mit MO und Ni</span><h2>Rechen-Rallye</h2><p>Rechne im Kopf und sammle Goldtaler! Für jede richtige Antwort bekommst du einen Goldtaler.</p></div><img src="./assets/games/rechen-rallye.png" alt="MO und Ni beim freundlichen Wettrechnen mit Antwortknöpfen und Stoppuhr" /></div>
      <form class="math-settings" data-math-form>
        <fieldset><legend>Dein Zahlenbereich</legend><div class="math-options math-ranges">${[20,100,1000].map(range => `<label><input type="radio" name="range" value="${range}" ${settings.range === range ? 'checked' : ''}/><span>Bis ${range.toLocaleString('de-DE')}</span></label>`).join('')}</div></fieldset>
        <fieldset><legend>Was möchtest du rechnen?</legend><div class="math-options math-operations">${Object.entries(operationLabels).map(([op,label]) => `<label><input type="checkbox" name="operation" value="${op}" ${settings.operations.includes(op) ? 'checked' : ''}/><span>${label}</span></label>`).join('')}</div></fieldset>
        <fieldset><legend>Wie möchtest du spielen?</legend><div class="math-options math-modes"><label><input type="radio" name="mode" value="timed" ${settings.mode === 'timed' ? 'checked' : ''}/><span>1 Minute</span></label><label><input type="radio" name="mode" value="practice" ${settings.mode === 'practice' ? 'checked' : ''}/><span>Ohne Zeitlimit</span></label></div></fieldset>
        <p class="math-help" data-math-mode-description ${settings.mode === 'practice' ? '' : 'hidden'}>${modeDescription(settings.mode)}</p>
        <p class="math-error" role="alert" data-math-error hidden>Wähle mindestens eine Rechenart.</p>
        <p class="math-best" data-math-best ${settings.mode === 'timed' && best > 0 ? '' : 'hidden'}>${settings.mode === 'timed' ? `${coin} Dein Rekord mit dieser Auswahl: <strong>${best} Goldtaler</strong>` : ''}</p>
        <button class="primary-button math-start" type="submit">Rechen-Rallye starten</button>
        <p class="math-help math-rules">Tippe auf das richtige Ergebnis. Nach jeder Antwort zeigen wir dir kurz die Lösung.</p>
      </form>`;
  }
  function roundView(s) {
    const q = s.question;
    const feedback = s.feedback;
    return `<div class="math-round-top"><div class="math-purse">${coin}<strong>${s.coins}</strong><span>Goldtaler</span></div>${s.settings.mode === 'timed' ? `<div class="math-timer" aria-label="Verbleibende Zeit"><span>Noch</span><strong data-math-timer>${formatTime(s.remaining)}</strong></div>` : '<span class="math-mode-chip">In deinem Tempo</span>'}</div>
      ${s.settings.mode === 'timed' ? `<div class="math-time-track" aria-hidden="true"><span data-math-time-bar style="width:${s.remaining / ROUND_MS * 100}%"></span></div>` : ''}
      <div class="math-question-panel"><p class="math-eyebrow">Welches Ergebnis stimmt?</p><h2 class="math-question" tabindex="-1" data-math-question>${q.expression} = ?</h2><div class="math-answers">${q.answers.map(value => `<button type="button" data-math-answer="${value}" data-question-id="${q.id}" ${feedback ? 'disabled' : ''} class="math-answer ${feedback && value === q.result ? 'right' : feedback && value === feedback.selected ? 'wrong' : ''}">${value.toLocaleString('de-DE')}${feedback && value === q.result ? symbol('check') : feedback && value === feedback.selected ? symbol('cross') : ''}</button>`).join('')}</div>
      <div class="math-feedback ${feedback ? feedback.right ? 'right' : 'wrong' : ''}" role="status" aria-live="polite" aria-atomic="true">${feedback ? `${symbol(feedback.right ? 'check' : 'cross')}<span><strong>${feedback.right ? 'Richtig! +1 Goldtaler' : 'Das richtige Ergebnis ist:'}</strong><span>${q.expression} = ${q.result.toLocaleString('de-DE')}</span></span>` : ''}</div></div>
      <div class="math-round-actions"><button class="soft-button" type="button" data-math-action="pause">Pause</button>${s.settings.mode === 'practice' ? '<button class="soft-button" type="button" data-math-action="finish">Runde beenden</button>' : ''}</div>`;
  }
  function pauseView(s) {
    return `<div class="math-result">${chest}<h2 tabindex="-1">Dein Schatz wartet!</h2><p>Die Runde ist pausiert. ${s.coins === 1 ? 'Dein Goldtaler bleibt' : `Deine ${s.coins} Goldtaler bleiben`} erhalten.</p>${s.settings.mode === 'timed' ? `<p>Du hast noch <strong>${Math.ceil(s.remaining / 1000)} Sekunden</strong>.</p>` : ''}<button class="primary-button" type="button" data-math-action="resume">Weiter spielen</button><button class="text-button" type="button" data-math-action="settings">Neue Runde einstellen</button></div>`;
  }
  function resultView(s) {
    const best = scores[scoreKey(s.settings)] || 0;
    const newRecord = s.settings.mode === 'timed' && s.remaining === 0 && s.correct > bestBefore;
    return `<div class="math-result">${roundCelebrationMarkup(s.coins)}<span class="math-eyebrow">Deine Runde ist beendet</span><h2 tabindex="-1">${s.coins} Goldtaler${s.coins>0?' gesammelt!':''}</h2>${s.coins>0?'':'<p>Versuche es noch einmal. Ohne Zeitlimit kannst du in deinem Tempo üben.</p>'}<div class="math-result-stats"><div><strong>${s.correct}</strong><span>richtig</span></div><div><strong>${s.mistakes.length}</strong><span>noch üben</span></div></div>
      ${s.settings.mode === 'timed' && s.remaining === 0 ? `<p class="math-record">${newRecord ? `Dein neuer Rekord! ${bestBefore > 0 ? `${s.correct - bestBefore} Goldtaler mehr als bisher.` : 'Gut gemacht!'}` : `Dein Rekord mit dieser Auswahl: ${best} Goldtaler.`}</p>` : ''}
      <p class="math-help">${settingsSummary(s.settings)}</p><button class="primary-button" type="button" data-math-action="again">Noch eine Runde</button>${s.coins>0?'<button class="text-button" type="button" data-math-action="replay">MO und Ni noch einmal feiern lassen</button>':''}<button class="text-button" type="button" data-math-action="settings">Einstellungen ändern</button></div>
      ${s.mistakes.length ? `<details class="math-review"><summary>Diese Aufgaben kannst du noch üben (${s.mistakes.length})</summary><ul>${s.mistakes.map(q => `<li>${q.expression} = <strong>${q.result.toLocaleString('de-DE')}</strong></li>`).join('')}</ul></details>` : ''}`;
  }
  function draw(focus = false) {
    if (!root?.isConnected) return;
    const s = round?.snapshot();
    root.innerHTML = !s ? setupView() : s.phase === 'done' ? resultView(s) : s.phase === 'paused' ? pauseView(s) : roundView(s);
    celebration.mount(root);
    if (focus) (root.querySelector('[data-math-question]') || root.querySelector('h2'))?.focus?.({ preventScroll: true });
  }
  function formSettings() {
    const form = root.querySelector('[data-math-form]'); if (!form) return null;
    const operations = [...form.querySelectorAll('[name="operation"]:checked')].map(input => input.value);
    const error = form.querySelector('[data-math-error]'); error.hidden = operations.length > 0;
    if (!operations.length) return null;
    return normalizeSettings({ range: Number(form.querySelector('[name="range"]:checked').value), operations, mode: form.querySelector('[name="mode"]:checked').value });
  }
  function start() {
    stopClock(); bestBefore = scores[scoreKey(settings)] || 0;
    round = createRound(settings, { now: now() }); recorded = false;
    activity(); draw(true); startClock();
  }
  function handleClick(event) {
    const answer = event.target.closest('[data-math-answer]');
    if (answer && root.contains(answer) && round) {
      const s = round.snapshot();
      if (round.answer(Number(answer.dataset.mathAnswer), Number(answer.dataset.questionId), now())) draw();
      else if (s.phase !== round.snapshot().phase) { saveResult(); draw(true); }
      return;
    }
    const button = event.target.closest('[data-math-action]'); if (!button || !root.contains(button)) return;
    const action = button.dataset.mathAction;
    if (action === 'pause') { round.pause(now()); saveResult(); stopClock(); draw(); }
    else if (action === 'resume') { round.resume(now()); draw(true); startClock(); }
    else if (action === 'finish') { round.finish(now()); saveResult(); stopClock(); draw(true); }
    else if (action === 'again') start();
    else if (action === 'replay') celebration.replay();
    else if (action === 'settings') { round = null; stopClock(); activity(); draw(); }
  }
  scope.document?.addEventListener('visibilitychange', () => {
    if (scope.document.visibilityState !== 'visible') pause();
  });
  function pause() {
    if (round?.pause(now())) { saveResult(); draw(); }
    stopClock();
  }
  return {
    mount(element) {
      root = element; if (!root) {celebration.mount(null);return;}
      if (!boundRoots.has(root)) {
        boundRoots.add(root); root.addEventListener('click', handleClick);
        root.addEventListener('submit', event => {
          if (!event.target.matches('[data-math-form]')) return;
          event.preventDefault(); const selected = formSettings(); if (!selected) return;
          settings = selected; write('math-settings', settings); start();
        });
        root.addEventListener('change', () => {
          const selected = formSettings(); if (!selected) return;
          settings = selected; write('math-settings', settings);
          root.querySelector('[data-math-mode-description]').textContent = modeDescription(settings.mode);
          root.querySelector('[data-math-mode-description]').hidden = settings.mode !== 'practice';
          const best = root.querySelector('[data-math-best]');
          best.hidden = settings.mode !== 'timed' || !(scores[scoreKey(settings)] > 0);
          best.innerHTML = settings.mode === 'timed' ? `${coin} Dein Rekord mit dieser Auswahl: <strong>${scores[scoreKey(settings)] || 0} Goldtaler</strong>` : '';
        });
      }
      draw(); startClock();
    },
    setVisible(value) { visible = value; celebration.setVisible(value); if (!value) pause(); },
    pause,
    get active() { return Boolean(round && ['playing','feedback','paused'].includes(round.snapshot().phase)); }
  };
}
