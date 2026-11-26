import {createDivisorRound, parseCardCount, cardPage, CARD_PAGE_SIZE} from './divisor-game.js?v=0.14.0-release-2';

const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const difficultyNames = {easy:'Leicht',medium:'Mittel',strong:'Stark'};
const options = value => ({opponent:value?.opponent === 'computer' ? 'computer' : 'human',character:value?.character === 'ni' ? 'ni' : 'mo',difficulty:Object.hasOwn(difficultyNames,value?.difficulty) ? value.difficulty : 'medium'});
const characterName = value => value.character === 'ni' ? 'Ni' : 'MO';
// Show the approved original artwork through two portrait windows, without altering it.
const avatar = character => `<svg class="divisor-avatar" viewBox="${character === 'ni' ? '248' : '36'} 76 234 242" aria-hidden="true" focusable="false"><image href="./assets/mo-ni-kanallogo.png" width="512" height="512" /></svg>`;
const twoPlayersIcon = '<svg class="divisor-avatar divisor-two-players" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="16" cy="15" r="7" fill="#27b2b2"/><path d="M3 40v-4a13 13 0 0 1 26 0v4" fill="#27b2b2"/><circle cx="33" cy="17" r="6" fill="#fd6b29"/><path d="M28 28a12 12 0 0 1 17 11v1H32v-4a17 17 0 0 0-4-8" fill="#fd6b29"/></svg>';

function computerTurn(state,difficulty) {
  const worker = new Worker(new URL('./divisor-computer-worker.js?v=0.14.0-release-2',import.meta.url),{type:'module'});
  const promise = new Promise((resolve,reject) => {
    worker.onmessage = ({data}) => {worker.terminate();data.error ? reject(new Error('Computerzug fehlgeschlagen')) : resolve(data.result);};
    worker.onerror = () => {worker.terminate();reject(new Error('Computerzug fehlgeschlagen'));};
    worker.postMessage({state,difficulty});
  });
  return {promise,cancel:()=>worker.terminate()};
}
const number = value => value.toLocaleString('de-DE');

export function createDivisorGame({read, write, onActivityChange = () => {}, compute = computerTurn, schedule = setTimeout, unschedule = clearTimeout, random = Math.random}) {
  const saved = read('divisor-game', {}) || {};
  let root = null, visible = false, round = null, notice = '', selected = null;
  let screen = 'setup', pageStart = 0, scrollTop = 0, jumpText = '';
  let drag = null, suppressClickUntil = 0;
  let roundOptions = options(saved.roundOptions), pendingComputer = null, generation = 0, computerError = false;
  const player = index => roundOptions.opponent === 'computer' ? (index ? characterName(roundOptions) : 'Du') : `Spieler ${index ? 'B' : 'A'}`;
  const settingPlayer = index => settings.opponent === 'computer' ? (index ? characterName(settings) : 'Du') : `Spieler ${index ? 'B' : 'A'}`;
  const historyPlayer = index => roundOptions.opponent === 'computer' ? (index ? characterName(roundOptions) : 'Du') : (index ? 'B' : 'A');
  let settings = {
    ...options(saved.settings),
    mode: ['40','100','custom'].includes(saved.settings?.mode) ? saved.settings.mode : '40',
    custom: typeof saved.settings?.custom === 'string' ? saved.settings.custom : '150',
    starter: saved.settings?.starter === 1 ? 1 : 0
  };
  try {
    if (saved.round) round = createDivisorRound(saved.round);
    if (round && saved.screen === 'playing') screen = 'playing';
    if (round) {
      const state = round.snapshot();
      pageStart = cardPage(state.count, saved.pageStart).start;
      if (Number.isSafeInteger(saved.selected) && saved.selected > 0 && saved.selected <= state.count && !state.moves.includes(saved.selected)) selected = saved.selected;
    }
  } catch { round = null; }
  const bound = new WeakSet();
  const active = () => visible && screen === 'playing' && Boolean(round && !round.snapshot().finished);
  function save() { write('divisor-game', {settings, roundOptions, round: round?.snapshot() ?? null, screen, selected, pageStart}); }
  function activity() { onActivityChange(active()); }
  function computersTurn() { const state=round?.snapshot(); return roundOptions.opponent==='computer' && state && !state.finished && state.nextPlayer===1; }
  function cancelComputer() {
    generation++; if(pendingComputer) {unschedule(pendingComputer.timer);pendingComputer.job?.cancel();pendingComputer=null;}
  }
  function queueComputer() {
    if(!active() || !root?.isConnected || globalThis.document?.hidden || !computersTurn()) {if(pendingComputer)cancelComputer();return;}
    if(pendingComputer || computerError) return;
    const token=++generation, pending={timer:null,job:null};pendingComputer=pending;
    // Compute straight away; the random pause and computation run in parallel.
    // A slow calculation never gets another full pause added to its duration.
    const pause=new Promise(resolve=>{pending.timer=schedule(resolve,Math.floor(random()*3001));});
    (async()=>{
      try {
        pending.job=compute(round.snapshot(),roundOptions.difficulty);
        const [result]=await Promise.all([pending.job.promise,pause]);
        if(token!==generation)return;
        if(!active() || !root?.isConnected || !computersTurn()) {cancelComputer();return;}
        pendingComputer=null;
        if(!result || !Number.isSafeInteger(result.value))throw new Error('Ungültiger Computerzug');
        commit(result.value,true);
      } catch {
        if(token!==generation)return;
        unschedule(pending.timer);pending.job?.cancel();pendingComputer=null;computerError=true;
        notice=`${characterName(roundOptions)} konnte den Zug nicht abschließen. Versuche es noch einmal.`;draw();
      }
    })();
  }
  globalThis.document?.addEventListener('visibilitychange',()=>{if(globalThis.document.hidden)cancelComputer();else queueComputer();});
  function history(state) {
    return `<section class="divisor-history" aria-label="Spielverlauf"><div class="divisor-history-heading"><strong>Spielverlauf</strong><span>${state.moves.length} ${state.moves.length === 1 ? 'Karte' : 'Karten'}</span></div>${state.moves.length ? `<ol aria-label="Bisher gelegte Karten">${state.moves.map((value, index) => { const who = (state.starter + index) % 2; return `<li class="divisor-player-${who}" aria-label="Zug ${index + 1}: ${player(who)}, Karte ${value}"><span aria-hidden="true">${historyPlayer(who)}</span><strong>${value}</strong></li>`; }).join('')}</ol>` : '<p>Noch keine Karte gelegt.</p>'}</section>`;
  }
  function setup() {
    const state = round?.snapshot();
    return `<div class="divisor-setup"><div class="math-intro math-game-intro"><div><span class="math-eyebrow">Mit MO und Ni</span><h2>Teiler-Vielfache-Spiel</h2><p>Spielt zu zweit oder gegen MO oder Ni. Wer keinen Zug mehr hat, verliert.</p></div><img src="./assets/games/teiler-vielfache.svg" alt="Die Zahlenkarten 6 und 36 bilden einen Spielzug" /></div>
      <div class="divisor-settings-content">
      <details class="divisor-rules"><summary>So spielt ihr</summary><ol><li>Zwei Personen oder du und MO oder Ni legen abwechselnd. Jede Zahl darf nur einmal verwendet werden.</li><li>Die erste Karte muss eine gerade Zahl zeigen.</li><li>Danach legt ihr immer einen Teiler oder ein Vielfaches der zuletzt gelegten Zahl.</li><li>Wer keine Karte mehr legen kann, hat verloren.</li></ol><p>Die App speichert eure begonnene Partie. Ihr könnt sie später fortsetzen.</p></details>
      ${state && !state.finished ? `<button class="soft-button divisor-resume" type="button" data-divisor-action="resume">Partie mit ${number(state.count)} Karten fortsetzen${roundOptions.opponent === 'computer' ? ` · ${characterName(roundOptions)} (${difficultyNames[roundOptions.difficulty]})` : ''}</button>` : ''}
      <form data-divisor-settings class="math-settings" novalidate>
        <fieldset><legend>Mit wem spielst du?</legend><div class="divisor-count-options divisor-opponent-options">${[['human','Zu zweit'],['mo','Gegen MO'],['ni','Gegen Ni']].map(([value,label])=>`<label><input type="radio" name="opponent" value="${value}" ${(settings.opponent==='human'?value==='human':settings.character===value)?'checked':''}/><span>${value==='human'?twoPlayersIcon:avatar(value)}<b>${label}</b></span></label>`).join('')}</div></fieldset>
        <fieldset class="divisor-difficulty" ${settings.opponent==='computer'?'':'hidden'}><legend>Wie stark spielt ${characterName(settings)}?</legend><div class="divisor-count-options">${Object.entries(difficultyNames).map(([value,label])=>`<label><input type="radio" name="difficulty" value="${value}" ${settings.difficulty===value?'checked':''}/><span>${label}</span></label>`).join('')}</div><p class="math-help">${settings.difficulty==='easy'?`${characterName(settings)} wählt die Karten zufällig.`:settings.difficulty==='medium'?`${characterName(settings)} schaut einige Züge voraus.`:`${characterName(settings)} nutzt sichere Gewinnwege, wenn es sie gibt.`}</p></fieldset>
        <fieldset><legend>Mit wie vielen Karten spielt ihr?</legend><div class="divisor-count-options">${[['40','40 Karten'],['100','100 Karten'],['custom','Mehr als 100']].map(([value,label]) => `<label><input type="radio" name="card-count" value="${value}" ${settings.mode === value ? 'checked' : ''}/><span>${label}</span></label>`).join('')}</div>
          <label class="divisor-custom-label" ${settings.mode !== 'custom' ? 'hidden' : ''}>Eigene Kartenzahl<input name="custom-count" type="text" inputmode="numeric" autocomplete="off" pattern="[0-9]*" value="${escape(settings.custom)}" placeholder="Zum Beispiel 150" /></label>
        </fieldset>
        <fieldset><legend>Wer beginnt?</legend><div class="divisor-starter-options">${[0,1].map(index => `<label class="divisor-player-${index}"><input type="radio" name="starter" value="${index}" ${settings.starter === index ? 'checked' : ''}/><span>${settingPlayer(index)}</span></label>`).join('')}</div></fieldset>
        <p class="math-help" data-divisor-computer-limit ${settings.opponent==='computer'&&settings.difficulty==='strong'&&parseCardCount(settings.mode,settings.custom)>1000 ? '' : 'hidden'}>Bei mehr als 1.000 Karten denkt ${characterName(settings)} mit begrenzter Zeit voraus.</p>
        ${notice ? `<p class="divisor-notice" role="alert">${escape(notice)}</p>` : ''}
        <button class="primary-button" type="submit">${state ? 'Neue Partie starten' : 'Partie starten'}</button>
      </form>
      </div></div>`;
  }
  function playing() {
    const state = round.snapshot();
    if (state.finished) return result(state);
    const used = new Set(state.moves), page = cardPage(state.count, pageStart);
    const digits = String(page.end).length, columns = digits <= 5 ? 5 : digits <= 8 ? 4 : digits <= 12 ? 3 : 2;
    const wideColumns = digits <= 3 ? 10 : digits <= 6 ? 8 : digits <= 9 ? 5 : digits <= 12 ? 4 : 3;
    return `<div class="divisor-play divisor-player-${state.nextPlayer}">
      <div class="divisor-play-top"><button class="text-button" type="button" data-divisor-action="setup">‹ Spiele</button><h2>Teiler &amp; Vielfache</h2><button class="text-button" type="button" data-view="home">Start ›</button></div>
      <div class="divisor-status"><div><strong role="status" aria-live="polite">${computersTurn() ? (computerError ? `${player(1)} ist dran` : `${player(1)} überlegt …`) : roundOptions.opponent==='computer' ? 'Du bist dran' : `${player(state.nextPlayer)} ist dran`}</strong><small>Zahlen von 1 bis ${number(state.count)}${roundOptions.opponent==='computer'?` · ${difficultyNames[roundOptions.difficulty]}`:''}</small></div>${roundOptions.opponent==='computer'?avatar(roundOptions.character):''}</div>
      ${state.count > CARD_PAGE_SIZE ? `<div class="divisor-pages"><button type="button" class="soft-button" data-divisor-action="previous-page" aria-label="Vorige Kartenseite" ${page.start === 0 ? 'disabled' : ''}>‹</button><span>${number(page.start + 1)}–${number(page.end)}<small>von ${number(state.count)}</small></span><button type="button" class="soft-button" data-divisor-action="next-page" aria-label="Nächste Kartenseite" ${page.end === state.count ? 'disabled' : ''}>›</button><form data-divisor-jump><label>Zu Zahl<input name="jump" type="text" inputmode="numeric" autocomplete="off" value="${escape(jumpText)}" aria-label="Zu Zahl" /></label><button type="submit" class="soft-button">Gehe zu</button></form></div>` : ''}
      <p class="divisor-notice ${notice ? 'has-notice' : ''}" role="status" aria-live="polite">${escape(notice)}</p>${computerError ? '<button class="soft-button" type="button" data-divisor-action="retry-computer">Computerzug erneut versuchen</button>' : ''}
      <div class="divisor-table"><div class="divisor-card-scroll" tabindex="-1"><div class="divisor-card-grid" role="group" aria-label="Zahlenkarten" style="--card-columns:${columns};--card-wide-columns:${wideColumns};--card-digits:${digits}">${page.cards.map(value => `<button class="divisor-card ${used.has(value) ? 'used' : ''}" type="button" data-divisor-card="${value}" aria-label="Karte ${value}${used.has(value) ? ', bereits gelegt' : ''}" aria-pressed="${selected === value}" ${used.has(value)||computersTurn() ? 'disabled' : ''}><span>${value}</span>${used.has(value) ? '<small aria-hidden="true">✓</small>' : '<span class="divisor-grip" data-divisor-grip aria-hidden="true">⠿</span>'}</button>`).join('')}</div></div>
      <div class="divisor-placement"><button type="button" class="divisor-stack ${state.last === null ? 'empty' : `divisor-player-${1 - state.nextPlayer}`} ${selected === null ? '' : 'has-selection'}" data-divisor-stack data-divisor-action="play" ${computersTurn()?'disabled':''} aria-label="Ablagestapel${state.last === null ? ', erste Karte ablegen' : `, zuletzt Karte ${state.last} von ${roundOptions.opponent==='computer'&&1-state.nextPlayer===0?'dir':player(1-state.nextPlayer)}`}. Ausgewählte Zahl ablegen." style="--stack-digits:${String(state.last ?? '').length}"><span>Ablagestapel</span><strong>${state.last ?? '＋'}</strong><small>${selected !== null ? 'Hier antippen' : state.last === null ? 'Hier ablegen' : player(1 - state.nextPlayer)}</small></button></div>
      ${history(state)}</div></div>`;
  }
  function result(state) {
    return `<div class="divisor-result divisor-player-${state.winner}"><div class="divisor-play-top"><button class="text-button" type="button" data-divisor-action="setup">‹ Spiele</button><button class="text-button" type="button" data-view="home">Start ›</button></div><div class="divisor-winner-symbol" aria-hidden="true">✓</div><h2 tabindex="-1">${roundOptions.opponent==='computer'&&state.winner===0?'Du gewinnst!':`${player(state.winner)} gewinnt!`}</h2><p>${roundOptions.opponent==='computer'&&state.nextPlayer===0?'Du kannst keine Karte mehr legen.':`${player(state.nextPlayer)} kann keine Karte mehr legen.`}</p><div class="divisor-final-card"><small>Letzte Karte</small><strong>${number(state.last)}</strong></div><p class="math-help">Ihr habt ${state.moves.length} von ${number(state.count)} Karten gelegt.</p><button class="primary-button" type="button" data-divisor-action="again">Noch eine Partie</button><button class="text-button" type="button" data-divisor-action="setup">Zahlenbereich ändern</button>${history(state)}</div>`;
  }
  function draw(focusCard = false) {
    if (!root?.isConnected) return;
    cancelDrag();
    const priorScroll = root.querySelector('.divisor-card-scroll')?.scrollTop ?? scrollTop;
    root.innerHTML = screen === 'playing' && round ? playing() : setup();
    const scroller = root.querySelector('.divisor-card-scroll');
    if (scroller) scroller.scrollTop = priorScroll;
    queueComputer();
    if (focusCard && selected !== null) root.querySelector(`[data-divisor-card="${selected}"]`)?.focus({preventScroll:true});
  }
  function showSetup() { cancelDrag(); cancelComputer(); computerError=false; screen = 'setup'; notice = ''; save(); activity(); draw(); globalThis.window?.scrollTo({top:0, behavior:'instant'}); }
  function start(count, starter, gameOptions = options(settings)) {
    cancelComputer(); computerError=false; roundOptions=options(gameOptions);
    round = createDivisorRound({count, starter}); screen = 'playing'; selected = null; notice = ''; pageStart = 0; scrollTop = 0; jumpText = '';
    save(); activity(); draw(); globalThis.window?.scrollTo({top:0, behavior:'instant'});
  }
  function onClick(event) {
    if (Date.now() < suppressClickUntil && event.detail !== 0) { event.preventDefault(); return; }
    const card = event.target.closest('[data-divisor-card]');
    if (card && computersTurn()) return;
    if (card && !card.disabled && round) {
      selected = Number(card.dataset.divisorCard); notice = ''; save(); draw(true); return;
    }
    const action = event.target.closest('[data-divisor-action]')?.dataset.divisorAction;
    if (!action) return;
    if (action === 'retry-computer') {computerError=false;notice='';draw();return;}
    if (action === 'setup') { showSetup(); return; }
    if (action === 'resume' && round) { screen = 'playing'; notice = ''; computerError=false; save(); activity(); draw(); globalThis.window?.scrollTo({top:0,behavior:'instant'}); return; }
    if (!round) return;
    const state = round.snapshot();
    if (action === 'again') { start(state.count, 1 - state.starter, roundOptions); return; }
    if (action === 'play' && !computersTurn() && selected !== null) commit(selected);
    if (action === 'previous-page' || action === 'next-page') {
      pageStart = cardPage(state.count, pageStart + (action === 'next-page' ? CARD_PAGE_SIZE : -CARD_PAGE_SIZE)).start;
      scrollTop = 0; root.querySelector('.divisor-card-scroll')?.scrollTo({top:0}); notice = ''; save(); draw();
    }
  }
  function commit(value, fromComputer=false) {
    if (!round || screen !== 'playing' || Boolean(computersTurn())!==fromComputer) return;
    const result = round.play(value);
    if(fromComputer&&!result.ok)throw new Error('Ungültiger Computerzug');
    notice = result.ok ? '' : result.reason;
    if (result.ok) selected = null;
    save(); activity(); draw();
    if (result.finished) { root.querySelector('h2')?.focus({preventScroll:true}); globalThis.window?.scrollTo({top:0,behavior:'instant'}); }
  }
  function cancelDrag() {
    if (!drag) return;
    const prior = drag; drag = null;
    if (prior.ghost) suppressClickUntil = Date.now() + 400;
    prior.ghost?.remove(); prior.card.classList.remove('divisor-drag-source');
    root?.querySelector('[data-divisor-stack]')?.classList.remove('divisor-drop-target');
    if (root?.hasPointerCapture?.(prior.id)) root.releasePointerCapture(prior.id);
  }
  function dropTarget(event) {
    const target = root.ownerDocument.elementFromPoint(event.clientX, event.clientY)?.closest('[data-divisor-stack]');
    return target && root.contains(target) ? target : null;
  }
  function onPointerDown(event) {
    if (!active() || computersTurn() || event.button !== 0 || event.isPrimary === false || drag) return;
    suppressClickUntil = 0;
    const card = event.target.closest('[data-divisor-card]');
    if (!card || card.disabled) return;
    // The number surface remains scrollable on phones; its grip starts a drag.
    if (event.pointerType === 'touch' && !event.target.closest('[data-divisor-grip]')) return;
    drag = {id:event.pointerId, x:event.clientX, y:event.clientY, card, value:Number(card.dataset.divisorCard), ghost:null};
    root.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event) {
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.ghost && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
    event.preventDefault();
    if (!drag.ghost) {
      drag.ghost = root.ownerDocument.createElement('div');
      drag.ghost.className = 'divisor-drag-ghost'; drag.ghost.textContent = String(drag.value);
      drag.ghost.setAttribute('aria-hidden','true'); root.ownerDocument.body.append(drag.ghost);
      drag.card.classList.add('divisor-drag-source');
    }
    drag.ghost.style.left = `${event.clientX}px`; drag.ghost.style.top = `${event.clientY}px`;
    const pile = root.querySelector('[data-divisor-stack]');
    pile?.classList.toggle('divisor-drop-target', Boolean(dropTarget(event)));
  }
  function onPointerUp(event) {
    if (!drag || drag.id !== event.pointerId) return;
    const prior = drag, target = dropTarget(event);
    cancelDrag();
    if (prior.ghost) {
      suppressClickUntil = Date.now() + 400;
      if (target) commit(prior.value);
    } else {
      // Capture may retarget the compatibility click to the root.
      suppressClickUntil = Date.now() + 400;
      selected = prior.value; notice = ''; save(); draw(true);
    }
  }
  function onChange(event) {
    if(event.target.name==='opponent') {
      settings.opponent=event.target.value==='human'?'human':'computer';
      if(['mo','ni'].includes(event.target.value))settings.character=event.target.value;
      save();draw();return;
    }
    if(event.target.name==='difficulty'){settings.difficulty=event.target.value;save();draw();return;}
    if (event.target.name === 'card-count') {
      settings.mode = event.target.value;
      root.querySelector('.divisor-custom-label').hidden = settings.mode !== 'custom';
      draw();
      if (settings.mode === 'custom') root.querySelector('[name="custom-count"]')?.focus();
    }
    if (event.target.name === 'starter') settings.starter = Number(event.target.value);
    save();
  }
  function onInput(event) {
    if (event.target.name === 'custom-count') { settings.custom = event.target.value; save(); const warning=root.querySelector('[data-divisor-computer-limit]'); if(warning)warning.hidden=!(settings.opponent==='computer'&&settings.difficulty==='strong'&&parseCardCount(settings.mode,settings.custom)>1000); }
    if (event.target.name === 'jump') jumpText = event.target.value;
  }
  function onSubmit(event) {
    if (event.target.matches('[data-divisor-settings]')) {
      event.preventDefault();
      const count = parseCardCount(settings.mode, settings.custom);
      if (count === null) { notice = 'Bitte gib eine ganze Kartenzahl über 100 ein.'; draw(); root.querySelector('[name="custom-count"]')?.focus(); return; }
      start(count, settings.starter);
    }
    if (event.target.matches('[data-divisor-jump]')) {
      event.preventDefault();
      const value = /^\d+$/.test(jumpText.trim()) ? Number(jumpText) : NaN;
      if (!Number.isSafeInteger(value) || value < 1 || value > round.snapshot().count) { notice = 'Diese Zahl gehört nicht zum gewählten Zahlenbereich.'; draw(); return; }
      pageStart = cardPage(round.snapshot().count, value - 1).start; scrollTop = 0; notice = ''; save(); draw();
      root.querySelector(`[data-divisor-card="${value}"]`)?.scrollIntoView({block:'center'});
    }
  }
  return {
    get active() { return active(); },
    setVisible(value) { if (!value) {cancelDrag();cancelComputer();} visible = value; activity(); if(value)queueComputer(); },
    showSetup,
    mount(element) {
      cancelDrag();
      root = element;
      if (!root) return;
      if (!bound.has(root)) {
        bound.add(root); root.addEventListener('click', onClick); root.addEventListener('change', onChange);
        root.addEventListener('input', onInput); root.addEventListener('submit', onSubmit);
        root.addEventListener('pointerdown', onPointerDown); root.addEventListener('pointermove', onPointerMove);
        root.addEventListener('pointerup', onPointerUp); root.addEventListener('pointercancel', cancelDrag); root.addEventListener('lostpointercapture', cancelDrag);
        root.addEventListener('keydown', event => { if (event.key === 'Escape') cancelDrag(); });
      }
      draw(); activity();
    }
  };
}
