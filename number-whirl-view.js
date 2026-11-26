import { createWhirlRound, createStoneMotion, normalizeWhirl, stonePositions, whirlScoreKey, whirlReward } from './number-whirl.js?v=0.14.0-release-2';
import { roundCelebrationMarkup, createCelebrationPlayer, goldCoinMarkup } from './game-celebration.js?v=0.14.0-release-2';

const names = {add:'+ Plus',subtract:'− Minus',multiply:'× Mal',divide:': Geteilt'};
const timeLabel = ms => `${Math.floor(Math.ceil(ms/1000)/60)}:${String(Math.ceil(ms/1000)%60).padStart(2,'0')}`;
const safeScores = value => Object.fromEntries(Object.entries(value && typeof value==='object' ? value : {}).filter(([,n])=>Number.isSafeInteger(n)&&n>=0));
export function createNumberWhirlGame({read,write,onActivityChange=()=>{},scope=window}) {
  let settings=normalizeWhirl(read('whirl-settings',{})), scores=safeScores(read('whirl-scores',{}));
  let root=null, round=null, visible=false, timer=null, recorded=false, bestBefore=0;
  let motion=null, motionKey='';
  const resizeObserver=scope.ResizeObserver?new scope.ResizeObserver(()=>move()):null;
  const bound=new WeakSet();
  const celebration=createCelebrationPlayer({scope});
  const now=()=>scope.performance?.now() ?? Date.now();
  const active=()=>Boolean(round && ['playing','feedback','paused'].includes(round.snapshot().phase));
  const activity=()=>onActivityChange(active());
  function stop() { if(timer!==null) scope.clearInterval(timer);timer=null; }
  function save() {
    const s=round?.snapshot(); if(!s || s.phase!=='done' || recorded)return;
    recorded=true;
    if(s.settings.mode==='timed'&&s.remaining===0) {const key=whirlScoreKey(s.settings);scores[key]=Math.max(bestBefore,s.coins);write('whirl-scores',scores);}
    activity();
  }
  function clock() {
    stop();if(!visible || !round || !['playing','feedback'].includes(round.snapshot().phase))return;
    timer=scope.setInterval(()=>{const changed=round.tick(now());save();if(changed)draw();else move();if(!['playing','feedback'].includes(round.snapshot().phase))stop();},40);
  }
  function choices(name,legend,options,value) {
    return `<fieldset><legend>${legend}</legend><div class="math-options whirl-options">${options.map(([v,label])=>`<label><input type="radio" name="${name}" value="${v}" ${String(value)===String(v)?'checked':''}/><span>${label}</span></label>`).join('')}</div></fieldset>`;
  }
  function setup() {
    return `<div class="math-intro math-game-intro"><div><span class="math-eyebrow">Mit MO und Ni</span><h2>Zahlenwirbel</h2><p>Bring die Zahlen in die richtige Reihenfolge und sammle Goldtaler!</p></div><img src="./assets/games/zahlenwirbel.png" alt="MO und Ni fangen wirbelnde Zahlensteine und ordnen 2, 5 und 8"/></div>
    <form class="math-settings" data-whirl-form>
      ${choices('range','Dein Zahlenbereich',[[20,'Bis 20'],[100,'Bis 100'],[1000,'Bis 1.000']],settings.range)}
      ${choices('content','Was steht auf den Steinen?',[['numbers','Zahlen'],['calculations','Rechnungen'],['mixed','Gemischt']],settings.content)}
      <fieldset data-whirl-operations ${settings.content==='numbers'?'hidden':''}><legend>Welche Rechenarten?</legend><div class="math-options math-operations">${Object.entries(names).map(([op,label])=>`<label><input type="checkbox" name="operation" value="${op}" ${settings.operations.includes(op)?'checked':''}/><span>${label}</span></label>`).join('')}</div></fieldset>
      ${choices('direction','In welcher Reihenfolge?',[['ascending','Klein → groß'],['descending','Groß → klein']],settings.direction)}
      ${choices('count','Wie viele Steine?',[[3,'3'],[4,'4'],[5,'5'],[6,'6']],settings.count)}
      ${choices('movement','Wie bewegen sich die Steine?',[['fall','Zahlenregen'],['float','Zahlenwirbel']],settings.movement)}
      ${choices('speed','Wie schnell?',[['slow','Langsam'],['normal','Mittel'],['fast','Schnell']],settings.speed)}
      ${choices('mode','Wie möchtest du spielen?',[['timed','1 Minute'],['practice','Ohne Zeitlimit']],settings.mode)}
      <p class="math-help" data-whirl-description ${settings.mode==='practice'?'':'hidden'}>${description(settings)}</p>
      <p class="math-error" role="alert" data-whirl-error hidden>Wähle mindestens eine Rechenart.</p>
      <p class="math-best" data-whirl-best ${settings.mode==='timed'&&scores[whirlScoreKey(settings)]>0?'':'hidden'}>${bestText(settings)}</p>
      <button type="submit" class="primary-button math-start" data-whirl-start>${startLabel(settings)}</button>
      <p class="math-help math-rules" data-whirl-rules>${rulesText(settings)}</p>
    </form>`;
  }
  function startLabel(s){return s.movement==='fall'?'Zahlenregen starten':'Zahlenwirbel starten';}
  function description(s) {return s.mode!=='practice'?'':s.movement==='fall'?'Die Runde hat kein Zeitlimit. Erreicht ein übriger Stein den unteren Rand, ist die Gruppe entwischt.':'Die Steine bleiben im Spielfeld. Beende die Runde selbst.';}
  function rulesText(s){return `Ganze Gruppe geschafft: 1–${s.count} Goldtaler. Je schneller, desto mehr! Ohne Fehler: +2 Extrataler. Gleiche Ergebnisse darfst du in beliebiger Reihenfolge antippen.`;}
  function rewardText(s) {
    if(s.feedback?.kind==='complete')return '';
    if(s.feedback?.kind==='escaped')return 'Diese Gruppe: 0 Goldtaler';
    const reward=whirlReward(s.settings,s.elapsed,s.groupErrors);
    return `Diese Gruppe: ${reward.base} Goldtaler${reward.bonus?' + 2 fehlerfrei':''}`;
  }
  function bestText(s){return s.mode==='timed'?`Dein Rekord mit dieser Auswahl: <strong>${scores[whirlScoreKey(s)]||0} Goldtaler</strong>`:'';}
  function direction(s){return s.direction==='ascending'?'Klein → groß':'Groß → klein';}
  function solution(order){return order.map(x=>`${x.label}${x.label!==String(x.value)?` = ${x.value}`:''}`).join(' → ');}
  function playing(s) {
    const f=s.feedback;
    const message=f?.kind==='complete'?`✓ Gruppe geschafft! +${f.total} Goldtaler${f.bonus?` (${f.base} + 2 fehlerfrei)`:''}`:f?.kind==='escaped'?`Diese Gruppe ist entwischt. Die richtige Reihenfolge: ${solution(f.order)}`:f?.kind==='wrong'?'✕ Schau noch einmal: Welcher übrige Stein kommt zuerst?':f?.kind==='right'?'✓ Richtig!':'';
    return `<div class="whirl-play"><div class="math-round-top"><div class="math-purse"><span class="whirl-coin" aria-hidden="true">${goldCoinMarkup()}</span><strong>${s.coins}</strong><span>Goldtaler</span></div>${s.settings.mode==='timed'?`<div class="math-timer"><span>Noch</span><strong data-whirl-timer>${timeLabel(s.remaining)}</strong></div>`:'<span class="math-mode-chip">In deinem Tempo</span>'}</div>
      <h2 class="whirl-direction" tabindex="-1">${direction(s.settings)}</h2><p class="math-help whirl-instruction">${s.settings.direction==='ascending'?'Tippe zuerst auf das kleinste Ergebnis.':'Tippe zuerst auf das größte Ergebnis.'}</p>
      <p class="whirl-reward" data-whirl-reward>${rewardText(s)}</p>
      <div class="whirl-wave-track" aria-hidden="true"><span data-whirl-wave-bar></span></div>
      <div class="whirl-board ${s.settings.movement}" aria-label="Bewegte Zahlensteine">${s.stones.map(x=>`<button class="whirl-stone ${x.selected?'collected':''} ${f?.kind==='wrong'&&f.id===x.id?'wrong':''}" type="button" data-whirl-stone="${x.id}" data-wave-id="${s.waveId}" aria-label="${x.label}" ${x.selected||s.phase!=='playing'?'disabled':''}>${x.selected?'✓':x.label}${f?.kind==='wrong'&&f.id===x.id?'<span aria-hidden="true"> ✕</span>':''}</button>`).join('')}${s.settings.movement==='fall'?'<span class="whirl-floor" aria-hidden="true">Hier entwischen die Steine</span>':''}</div>
      <p class="whirl-feedback ${f?.kind==='wrong'||f?.kind==='escaped'?'wrong':''}" role="status" aria-live="polite">${message}</p>
      <div class="math-round-actions"><button class="soft-button" type="button" data-whirl-action="pause">Pause</button><button class="soft-button" type="button" data-whirl-action="finish">Runde beenden</button></div></div>`;
  }
  function result(s) {
    return `<div class="math-result whirl-result">${roundCelebrationMarkup(s.coins)}<span class="math-eyebrow">Deine Wirbelrunde ist beendet</span><h2 tabindex="-1">${s.coins} Goldtaler${s.coins>0?' gesammelt!':''}</h2>${s.coins>0?'':'<p>Versuche es noch einmal: Wähle ein ruhigeres Tempo oder übe ohne Zeitlimit.</p>'}<div class="math-result-stats"><div><strong>${s.completed}</strong><span>Gruppen geschafft</span></div><div><strong>${s.correct}</strong><span>Steine sortiert</span></div></div>
      ${s.settings.mode==='timed'&&s.remaining===0?`<p class="math-record">${s.coins>bestBefore?'Dein neuer Rekord! ':''}Deine Bestleistung mit dieser Auswahl: ${scores[whirlScoreKey(s.settings)]||0} Goldtaler.</p>`:''}
      <p class="math-help">${s.errors} ${s.errors===1?'Fehlversuch':'Fehlversuche'} · ${s.escaped} ${s.escaped===1?'Gruppe entwischt':'Gruppen entwischt'}</p>
      <button class="primary-button" type="button" data-whirl-action="again">Noch eine Runde</button>${s.coins>0?'<button class="text-button" type="button" data-whirl-action="replay">MO und Ni noch einmal feiern lassen</button>':''}<button class="text-button" type="button" data-whirl-action="settings">Einstellungen ändern</button></div>
      ${s.mistakes.length?`<details class="math-review"><summary>Entwischte Gruppen noch einmal anschauen (${s.mistakes.length})</summary><ul>${s.mistakes.map(order=>`<li>${solution(order)}</li>`).join('')}</ul></details>`:''}`;
  }
  function draw() {
    if(!root?.isConnected)return;
    const focused=root.querySelector('[data-whirl-stone]:focus')?.dataset.whirlStone;
    const s=round?.snapshot();
    root.innerHTML=!s?setup():s.phase==='done'?result(s):s.phase==='paused'?`<div class="math-result"><img class="whirl-pause-mascots" src="./assets/mo-ni-reise.png" alt="MO und Ni warten auf dich"/><h2 tabindex="-1">Dein Wirbel macht Pause</h2><p>${s.coins===1?'Dein Goldtaler bleibt':`${s.coins} Goldtaler bleiben`} erhalten.${s.settings.mode==='timed'?` Noch ${Math.ceil(s.remaining/1000)} Sekunden.`:''}</p><button class="primary-button" type="button" data-whirl-action="resume">Weiter spielen</button><button class="text-button" type="button" data-whirl-action="settings">Neue Runde einstellen</button></div>`:playing(s);
    celebration.mount(root);
    move();
    if(resizeObserver) {resizeObserver.disconnect();const board=root.querySelector('.whirl-board');if(board)resizeObserver.observe(board);}
    if(focused!==undefined) (root.querySelector(`[data-whirl-stone="${focused}"]:not([disabled])`)||root.querySelector('[data-whirl-stone]:not([disabled])')||root.querySelector('h2'))?.focus?.({preventScroll:true});
    if(s?.phase==='done')root.querySelector('h2')?.focus?.({preventScroll:true});
  }
  function move() {
    const board=root?.querySelector('.whirl-board');if(!round||!board)return;
    const reduced=scope.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const width=board.clientWidth, height=board.clientHeight-28;
    round.setPlayfieldHeight(height);
    const s=round.snapshot();
    let positions;
    if(s.settings.movement==='float') {
      const key=`${s.waveId}:${width}:${height}:${Boolean(reduced)}`;
      if(key!==motionKey) {motion=createStoneMotion(s.settings,width,height);motionKey=key;motion.setActive(s.stones.filter(x=>!x.selected).map(x=>x.id));}
      positions=motion.advance(reduced?0:s.elapsed);
      motion.setActive(s.stones.filter(x=>!x.selected).map(x=>x.id));
    } else positions=stonePositions(s.settings,reduced?0:s.elapsed,width,height,s.stones.filter(x=>!x.selected).map(x=>x.id));
    for(const el of board.querySelectorAll('[data-whirl-stone]')) {const p=positions[+el.dataset.whirlStone];el.style.width=`${p.width}px`;el.style.transform=`translate(${p.x}px, ${p.y}px)`;}
    const bar=root.querySelector('[data-whirl-wave-bar]');if(bar)bar.style.width=`${s.feedback?.kind==='escaped'?0:Math.max(0,1-s.elapsed/s.groupDuration)*100}%`;
    const rewardEl=root.querySelector('[data-whirl-reward]');if(rewardEl) {const text=rewardText(s);if(rewardEl.textContent!==text)rewardEl.textContent=text;}
    const timerEl=root.querySelector('[data-whirl-timer]');if(timerEl)timerEl.textContent=timeLabel(s.remaining);
  }
  function formSettings() {
    const form=root.querySelector('[data-whirl-form]');if(!form)return null;
    const value=Object.fromEntries(['range','content','direction','count','movement','speed','mode'].map(name=>[name,form.querySelector(`[name="${name}"]:checked`).value]));
    value.operations=[...form.querySelectorAll('[name="operation"]:checked')].map(x=>x.value);
    const startButton=form.querySelector('[data-whirl-start]');if(startButton)startButton.textContent=startLabel(value);
    form.querySelector('[data-whirl-operations]').hidden=value.content==='numbers';
    const invalid=value.content!=='numbers'&&!value.operations.length;
    form.querySelector('[data-whirl-error]').hidden=!invalid;
    return invalid?null:normalizeWhirl(value);
  }
  function start(){stop();motion=null;motionKey='';bestBefore=scores[whirlScoreKey(settings)]||0;recorded=false;round=createWhirlRound(settings,{now:now()});activity();draw();clock();root.querySelector('h2')?.focus?.({preventScroll:true});}
  function pause(){if(round?.pause(now())){save();draw();}stop();}
  scope.document?.addEventListener('visibilitychange',()=>{if(scope.document.visibilityState!=='visible')pause();});
  return {get active(){return active();},setVisible(value){visible=value;celebration.setVisible(value);if(!value)pause();},pause,
    mount(element){root=element;if(!root){celebration.mount(null);return;}if(!bound.has(root)){bound.add(root);
      root.addEventListener('submit',event=>{if(!event.target.matches('[data-whirl-form]'))return;event.preventDefault();const selected=formSettings();if(!selected)return;settings=selected;write('whirl-settings',settings);start();});
      root.addEventListener('change',()=>{const selected=formSettings();if(!selected)return;settings=selected;write('whirl-settings',settings);const help=root.querySelector('[data-whirl-description]');help.hidden=settings.mode!=='practice';help.textContent=description(settings);root.querySelector('[data-whirl-rules]').textContent=rulesText(settings);const best=root.querySelector('[data-whirl-best]');best.hidden=settings.mode!=='timed'||!(scores[whirlScoreKey(settings)]>0);best.innerHTML=bestText(settings);});
      root.addEventListener('click',event=>{
        const stone=event.target.closest('[data-whirl-stone]');if(stone&&root.contains(stone)&&round){const before=round.snapshot().phase;const accepted=round.answer(+stone.dataset.whirlStone,+stone.dataset.waveId,now());save();if(accepted||before!==round.snapshot().phase)draw();return;}
        const button=event.target.closest('[data-whirl-action]');if(!button||!root.contains(button))return;
        const action=button.dataset.whirlAction;
        if(action==='pause')pause();else if(action==='resume'){round.resume(now());draw();clock();}else if(action==='finish'){round.finish(now());save();stop();draw();}else if(action==='again')start();else if(action==='settings'){round=null;stop();activity();draw();}else if(action==='replay')celebration.replay();
      });}
      draw();clock();}
  };
}
