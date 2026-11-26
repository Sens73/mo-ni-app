import {bindPyramidInput} from './pyramid-input.js?v=0.14.0-release-2';
import { createPuzzleRegistry } from './registry.js?v=0.14.0-release-2';
import { createPuzzleProgress } from './progress.js?v=0.14.0-release-2';
import {extensionTypes} from './extension-library.js?v=0.14.0-release-4';
import { celebrationMarkup, createCelebrationPlayer, goldCoinMarkup } from '../game-celebration.js?v=0.14.0-release-2';
import {solutionDuration,numberPathGeometry} from './solution-presentation.js?v=0.14.0-release-2';
const puzzleNumber=(type,level)=>type.levels.indexOf(level)+1;
const puzzleLabel=(type,level)=>`${type.label||'Rätsel'} ${puzzleNumber(type,level)}`;
const puzzleStars=level=>Number.isInteger(level.source?.stars)?'★'.repeat(level.source.stars):'';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createPuzzleGame({read,write,onActivityChange=()=>{},types=extensionTypes,now=()=>performance.now(),schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id),reduceMotion=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false}){
  let registry=createPuzzleRegistry(types),progress=createPuzzleProgress(registry,{saved:read('puzzle-progress',{}),save:v=>write('puzzle-progress',v),access:'free'});
  const ui=read('puzzle-ui',{});let pendingLast=read('puzzle-progress',{}).last,pendingScreen=ui.screen;
  let root=null,visible=false,typeId=registry.get(ui.typeId)?.id||registry.list()[0].id,screen=['types','levels','playing','solved','result'].includes(ui.screen)?ui.screen:'types';
  let mode=ui.mode==='note'?'note':'value',selected=0,notice='',conflicts=[],hinted=[],reward=Number.isSafeInteger(ui.reward)&&ui.reward>=0?ui.reward:0,query='';const bound=new WeakSet();
  if(['playing','solved','result'].includes(screen)&&!progress.current())screen='levels';
  if(['solved','result'].includes(screen)&&!progress.current()?.type.model.inspect(progress.current().level,progress.current().board).complete)screen='levels';
  if(progress.current()&&screen==='playing'){typeId=progress.current().type.id;selected=progress.current().type.validCell?.(progress.current().level,ui.selected)?ui.selected:0;}
  let restoringCell=false,noteEntry=null,entryCheck=null;
  let solutionElapsed=Number.isFinite(ui.solutionElapsed)?Math.max(0,ui.solutionElapsed):0,solutionStarted=null,solutionTimer=null,solutionToken=0;
  const celebration=createCelebrationPlayer();
  const active=()=>visible&&['playing','solved','result'].includes(screen);
  const elapsed=()=>solutionElapsed+(solutionStarted===null?0:Math.max(0,now()-solutionStarted));
  function stopSolution(){if(solutionStarted!==null)solutionElapsed=elapsed();solutionStarted=null;if(solutionTimer!==null)cancel(solutionTimer);solutionTimer=null;solutionToken++;}
  function runSolution(){
    if(screen!=='solved'||!visible||!root?.isConnected)return;
    stopSolution();solutionStarted=now();
    const token=solutionToken,current=progress.current(),path=numberPathGeometry(current.level,current.board);
    const drawing=path&&!reduceMotion()&&solutionElapsed<path.duration;
    const deadline=drawing?path.duration:solutionDuration(current.level,current.board,{reduceMotion:reduceMotion()});
    solutionTimer=schedule(()=>{
      if(token!==solutionToken||screen!=='solved'||!visible)return;
      stopSolution();
      if(drawing){
        // Start the full three-second hold only after painting the complete path.
        solutionElapsed=path.duration;saveUi();draw();runSolution();return;
      }
      screen='result';saveUi();activity();draw();root.querySelector('h2')?.focus({preventScroll:true});
      if(typeof window!=='undefined')window.scrollTo({top:0,behavior:'instant'});
    },Math.max(0,deadline-solutionElapsed));
  }

  function saveUi(){write('puzzle-ui',{screen,typeId,mode,selected,reward,solutionElapsed:screen==='solved'?elapsed():0});}
  function activity(){onActivityChange(active());}
  function stats(id){const t=progress.totals(),completed=id?progress.totals(id).completed:t.completed;return `<div class="puzzle-collection"><span>${goldCoinMarkup()} <strong>${t.coins}</strong> Goldtaler</span><span><strong>${completed}</strong> Rätsel geschafft</span></div>`;}
  function typeList(){const matches=registry.list().filter(t=>t.levels.length).filter(t=>(t.title+' '+t.description).toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de')));
    return `${matches.map(t=>{
      const image=t.cardImage||t.intro?.example?.puzzle;
      return `<button type="button" class="puzzle-type-card" data-puzzle-type="${escape(t.id)}"><strong>${escape(t.title)}</strong>${image?`<img class="puzzle-type-example" src="${escape(image)}" alt=""/>`:`<span class="puzzle-type-symbol" aria-hidden="true">${escape(t.symbol||'✦')}</span>`}</button>`;
    }).join('')||'<p class="math-help">Diesen Rätseltyp gibt es hier noch nicht. Probiere einen anderen Suchbegriff.</p>'}`;
  }
  function catalog(){
    return `<div class="math-intro math-game-intro puzzle-catalog-intro"><div><span class="math-eyebrow">Mit MO und Ni</span><h2>Rätsel</h2><p>Wähle ein Rätsel, knobele in deinem Tempo und sammle Goldtaler!</p></div><img src="./assets/games/raetsel.png" alt="MO und Ni knobeln gemeinsam mit Zahlen und Puzzleteilen" /></div><div class="puzzle-catalog-content">${stats()}${registry.list().filter(t=>t.levels.length).length>6?`<label class="puzzle-search">Rätseltyp suchen<input type="search" data-puzzle-search placeholder="Rätseltyp suchen" value="${escape(query)}"/></label>`:''}<div class="puzzle-type-list">${typeList()}</div></div>`;
  }
  function episodeLinks(type,episodeId){const episode=type.episodes?.find(e=>e.id===episodeId);if(!episode)return '';const video=episode.videoAvailable===false?`<button type="button" class="secondary-button" disabled>${escape(episode.videoNotice)}</button>`:`<button type="button" class="secondary-button" data-open-sunday-resource data-sunday-id="${escape(episode.id)}" data-viewer-type="video">Lösungsvideo anschauen</button>`;return `<div class="puzzle-episode-links"><div><button type="button" class="soft-button" data-open-sunday-resource data-sunday-id="${escape(episode.id)}" data-viewer-type="pdf">Aufgabenblatt öffnen</button>${video}</div></div>`;}
  function introduction(type){const intro=type.intro;if(!intro)return '';const e=intro.example;
    return `<details class="puzzle-instructions"><summary>Regeln und Beispiel</summary><div class="puzzle-type-rules">${intro.rulesHtml}</div><div class="puzzle-example-pair ${e.layout==='stack'?'puzzle-example-stack':''}"><figure style="--example-image-ratio:${(e.puzzleWidth||1)/Math.max(e.puzzleWidth||1,e.solutionWidth||1)}"><figcaption>Beispiel</figcaption><img src="${escape(e.puzzle)}" alt="${escape(e.altPuzzle)}"/></figure><span aria-hidden="true">⇒</span><figure style="--example-image-ratio:${(e.solutionWidth||1)/Math.max(e.puzzleWidth||1,e.solutionWidth||1)}"><figcaption>Lösung</figcaption><img src="${escape(e.solution)}" alt="${escape(e.altSolution)}"/></figure></div></details>`;
  }
  function levels(){const t=registry.get(typeId);
    return `<div class="puzzle-level-heading"><div class="puzzle-type-heading"><button class="puzzle-back" type="button" data-puzzle-action="types" aria-label="Zurück zu den Rätseltypen">‹</button><h2>${escape(t.title)}</h2></div>${stats(typeId)}</div>${introduction(t)}
    <div class="puzzle-level-grid">${t.levels.map(l=>{const r=progress.record(typeId,l.id);return `<button type="button" class="puzzle-level ${r?.completed?'completed':''}" data-puzzle-level="${escape(l.id)}">${r?.completed?'<span class="puzzle-completed-mark" role="img" aria-label="Bereits gelöst">✓</span>':''}<strong>${escape(puzzleLabel(t,l))}</strong><small>${escape(t.cardDetail?.(l)||t.levelDetail?.(l)||l.title)}</small><span class="puzzle-reward">${l.reward} Goldtaler</span></button>`;}).join('')}</div>`;
  }
  function heading(type,level){return `<h2 tabindex="-1">${escape(type.sunday?puzzleLabel(type,level):`${type.title} · ${puzzleLabel(type,level)}`)}${puzzleStars(level)?` <span class="puzzle-stars" aria-label="${level.source.stars} ${level.source.stars===1?'Stern':'Sterne'}">${puzzleStars(level)}</span>`:''}</h2>`;}
  const modeHelp='<p class="puzzle-mode-help">„Ich bin sicher“: eine grüne Zahl. „Möglichkeiten“: kleine graue Zahlen zum Ausprobieren.</p>';
  function playing(){const s=progress.current(),checked=s.type.model.inspect(s.level,s.board),fullWrong=checked.filled===checked.total&&!checked.complete;
    const shownConflicts=conflicts.length?conflicts:fullWrong?checked.conflicts:[],shownNotice=notice||(fullWrong?`${checked.messages[0]||'Hier stimmt noch etwas nicht.'}${shownConflicts.length?' Schau auf die markierten Felder.':''}`:'');
    const context={...s,mode,selected,conflicts:shownConflicts,hinted,solutionElapsed:checked.complete?Infinity:null};
    const board=s.type.renderBoard(context),input=checked.complete?'':s.type.renderInput(context)+(s.type.cellInput?modeHelp:'');
    const workspace=s.level.kind==='poly'?`<div class="poly-workspace" style="--poly-cols:${s.level.cols};--poly-rows:${s.level.rows};--poly-piece-count:${s.level.pieces.length}">${board}<div class="poly-toolbox">${input}</div></div>`:board+input;
    const content=`${heading(s.type,s.level)}${workspace}${episodeLinks(s.type,s.level.episodeId)}`;
    return `<div class="puzzle-play ${s.type.cellInput||s.level.kind==='pyramid'?'sumdoku-play':''}"><div class="puzzle-play-top"><button class="text-button" type="button" data-puzzle-action="levels">‹ Rätsel</button><button class="text-button" type="button" data-view="home">Start ›</button></div>${content}
    ${shownNotice?`<p class="puzzle-notice ${shownConflicts.length?'has-conflict':''}" role="status" aria-live="polite">${escape(shownNotice)}</p>`:''}
    <button class="text-button" type="button" data-puzzle-action="restart">Dieses Rätsel neu beginnen</button></div>`;
  }
  function solved(){const s=progress.current(),path=numberPathGeometry(s.level,s.board),context={...s,mode,selected:-1,solutionElapsed:elapsed()},drawing=path&&!reduceMotion()&&elapsed()<path.duration;
    return `<div class="puzzle-play puzzle-solved" data-solution-stage="${drawing?'drawing':'holding'}"><div class="puzzle-play-top"><button class="text-button" type="button" data-puzzle-action="levels">‹ Rätsel</button><button class="text-button" type="button" data-view="home">Start ›</button></div>${heading(s.type,s.level)}<p class="puzzle-solved-message" role="status">${path?drawing?'Dein Zahlenpfad: von 1 bis '+s.level.fields.length+'.':'Dein Weg ist vollständig!':'Alle Regeln erfüllt. Schau dir deine Lösung an!'}</p><div class="puzzle-solved-board">${s.type.renderBoard(context).replaceAll('<button ','<button disabled ')}</div>${episodeLinks(s.type,s.level.episodeId)}</div>`;
  }
  function result(){const s=progress.current(),index=s.type.levels.indexOf(s.level);return `<div class="math-result puzzle-result">${celebrationMarkup()}<button class="text-button reward-replay" type="button" data-puzzle-action="replay">Feier noch einmal ansehen ↻</button><span class="math-eyebrow">${escape(s.type.sunday?puzzleLabel(s.type,s.level):`${s.type.title} · ${puzzleLabel(s.type,s.level)}`)}</span><h2 tabindex="-1">Rätsel geschafft!</h2><p>${reward?`Du hast ${reward} Goldtaler verdient!`:'Prima, du hast dieses Rätsel noch einmal gelöst! Die Goldtaler hast du dafür schon gesammelt.'}</p>${stats(s.type.id)}${episodeLinks(s.type,s.level.episodeId)}${s.type.levels[index+1]?`<button class="primary-button" type="button" data-puzzle-action="next">Weiter zu ${escape(puzzleLabel(s.type,s.type.levels[index+1]))}</button>`:'<p>Du hast das letzte Rätsel erreicht. Welches Rätsel möchtest du als Nächstes lösen?</p>'}<button class="soft-button" type="button" data-puzzle-action="levels">Alle Rätsel ansehen</button><button class="text-button" type="button" data-puzzle-action="review">Meine Lösung ansehen</button></div>`;}
  function draw(focusCell=false){if(!root?.isConnected)return;restoringCell=true;root.innerHTML=screen==='types'?catalog():screen==='levels'?levels():screen==='result'?result():screen==='solved'?solved():playing();celebration.mount(root);if(focusCell){const field=root.querySelector(`[data-puzzle-cell="${selected}"]`);field?.focus({preventScroll:true});field?.select?.();}restoringCell=false;}
  function paintEntry(field){
    const s=progress.current(),cell=+field.dataset.puzzleCell,box=field.closest('.logic-cell');
    if(!box)return;
    const value=s.board.values[cell],notes=s.board.notes[cell];
    field.setAttribute('aria-label',`${s.type.cellLabel(s.level,cell)}, ${value===null?notes.length?'Möglichkeiten '+notes.join(', '):'leer':'Dein Eintrag '+value}`);
    field.classList.toggle('wide-value',field.value.length>=3);
    box.classList.toggle('entering-note',mode==='note'&&field.value!=='');
    box.querySelector('.logic-notes').textContent=value===null?notes.join(' · '):'';
    box.querySelector('.logic-value')?.remove();
    root.querySelectorAll('.conflict,.hinted').forEach(el=>el.classList.remove('conflict','hinted'));
    root.querySelectorAll('.sumdoku-alert,.puzzle-notice').forEach(el=>el.remove());
    const bank=root.querySelector('.logic-bank');
    if(bank){const holder=root.ownerDocument.createElement('div');holder.innerHTML=s.type.renderInput({...s,mode,selected});bank.innerHTML=holder.querySelector('.logic-bank').innerHTML;}
  }
  function stopEntryCheck(){if(entryCheck!==null)cancel(entryCheck);entryCheck=null;}
  function inspectEntry(){const s=progress.current();if(screen!=='playing'||!s)return;const result=s.type.model.inspect(s.level,s.board);if(result.complete||result.filled===result.total)check();}
  function queueEntryCheck(){stopEntryCheck();const id=progress.current().level.id;entryCheck=schedule(()=>{
    entryCheck=null;const s=progress.current();if(screen!=='playing'||s?.level.id!==id)return;
    const result=s.type.model.inspect(s.level,s.board);
    if(result.complete){check();return;}
    if(result.filled!==result.total||!root?.isConnected)return;
    // A slow typist can continue a multi-digit number even after a full-grid error.
    // Keep the native input and its caret in place while displaying the feedback.
    conflicts=result.conflicts;notice=result.messages[0]||'Hier stimmt noch etwas nicht.';
    if(conflicts.length)notice+=' Schau auf die markierten Felder.';
    root.querySelectorAll('.puzzle-notice,.sumdoku-alert').forEach(el=>el.remove());
    root.querySelectorAll('[data-puzzle-cell-input]').forEach(field=>{
      const box=field.closest('.logic-cell');if(!box)return;
      const wrong=conflicts.includes(+field.dataset.puzzleCell);box.classList.toggle('conflict',wrong);
      if(wrong){const alert=root.ownerDocument.createElement('span');alert.className='sumdoku-alert';alert.setAttribute('aria-hidden','true');alert.textContent='!';box.append(alert);}
    });
    const message=root.ownerDocument.createElement('p');message.className='puzzle-notice has-conflict';message.setAttribute('role','status');message.textContent=notice;
    root.querySelector('[data-puzzle-action="restart"]')?.before(message);
  },600);}
  function clearFeedback(){notice='';conflicts=[];hinted=[];}
  function openLevel(id){if(!progress.select(typeId,id))return;stopSolution();screen='playing';selected=progress.current().type.initialCell?.(progress.current().level)??0;mode='value';clearFeedback();saveUi();activity();draw();if(progress.current().type.model.inspect(progress.current().level,progress.current().board).complete)inspectEntry();root.querySelector('h2')?.focus({preventScroll:true});if(typeof window!=='undefined')window.scrollTo({top:0,behavior:'instant'});}
  function enter(kind,value,editing=false){const s=progress.current();if(s.type.isFixed?.(s.level,selected)){notice='Diese schwarze Zahl ist vorgegeben. Wähle ein anderes Feld.';draw();return;}
    applyAction({kind,cell:selected,value},editing);}
  function applyAction(action,editing=false){const s=progress.current(),message=s.type.feedback?.(s.level,s.board,action)||'';const changed=progress.change(action);clearFeedback();notice=message;saveUi();if(editing)paintEntry(editing.field);else draw(true);if(changed){if(editing)queueEntryCheck();else inspectEntry();}}
  function submitEntry(){const s=progress.current(),value=s.type.parseInput?.(root);if(value===null||value===undefined||!s.level.domains[selected].includes(value)){notice='Trage eine ganze Zahl aus dem erlaubten Zahlenbereich ein.';draw();return;}enter(mode,value);}
  function check(){const s=progress.current(),result=progress.finish();if(result.complete){stopSolution();solutionElapsed=0;reward=result.reward;screen='solved';clearFeedback();saveUi();activity();draw();root.querySelector('h2')?.focus({preventScroll:true});runSolution();if(typeof window!=='undefined')window.scrollTo({top:0,behavior:'instant'});return;}
    conflicts=result.conflicts;hinted=[];notice=conflicts.length?`${result.messages[0]||'Hier stimmt noch etwas nicht.'} Schau auf die markierten Felder.`:`Bisher ist kein Regelwiderspruch sichtbar. ${result.total-result.filled} Felder fehlen noch. Das ist noch keine Bestätigung aller Einträge.`;draw();}
  return {get active(){return active();},get registry(){return registry;},get progress(){return progress;},
    showCatalog(){stopSolution();screen='types';pendingScreen=null;query='';mode='value';selected=0;reward=0;clearFeedback();saveUi();activity();draw();},
    showEpisode(id){const type=registry.list().find(t=>t.episodes?.some(e=>e.id===id));if(!type)return false;stopSolution();typeId=type.id;screen='levels';clearFeedback();saveUi();activity();draw();return true;},
    updateTypes(nextTypes){if(active())return false;const signature=types=>JSON.stringify(types.map(t=>[t.id,t.levels.map(l=>l.id),t.episodes?.map(e=>[e.id,e.videoAvailable,e.videoNotice])]));if(signature(nextTypes)===signature(registry.list()))return false;
      const saved=progress.snapshot();if(!saved.last&&pendingLast)saved.last=pendingLast;registry=createPuzzleRegistry(nextTypes);progress=createPuzzleProgress(registry,{saved,save:v=>write('puzzle-progress',v),access:'free'});
      if(progress.current()){const current=progress.current();if(pendingScreen==='playing'||['solved','result'].includes(pendingScreen)&&current.type.model.inspect(current.level,current.board).complete){typeId=current.type.id;screen=pendingScreen;selected=current.type.validCell?.(current.level,ui.selected)?ui.selected:current.type.initialCell?.(current.level)??0;}}pendingLast=null;pendingScreen=null;
      if(!registry.get(typeId)?.levels.length){typeId=registry.list().find(t=>t.levels.length)?.id||registry.list()[0].id;screen='types';}
      if(['playing','solved','result'].includes(screen)&&!progress.current())screen='levels';saveUi();activity();return true;},setVisible(value){celebration.setVisible(value);if(visible!==value){if(!value&&screen==='solved'){stopSolution();saveUi();root?.querySelector('.puzzle-solved')?.classList?.add('is-paused');}visible=value;activity();if(value&&screen==='solved'){draw();runSolution();}}},mount(element){root=element;if(!root){celebration.mount(null);return;}
    if(!bound.has(root)){bound.add(root);
      bindPyramidInput(root,{current:()=>screen==='playing'?progress.current():null,select:cell=>{selected=cell;saveUi();},apply:action=>{if(action.cell!==null)selected=action.cell;applyAction(action);}});
      root.addEventListener('focusin',event=>{
        const field=event.target;if(screen!=='playing'||!field.matches('[data-puzzle-cell-input]'))return;
        const s=progress.current(),cell=+field.dataset.puzzleCell;if(!s.type.validCell(s.level,cell))return;
        if(!restoringCell)noteEntry=null;selected=cell;saveUi();root.querySelectorAll('.sumdoku-cell,.logic-cell').forEach(el=>el.classList.toggle('selected',el.contains(field)));field.select();
      });
      root.addEventListener('focusout',event=>{if(restoringCell||!event.target.matches('[data-puzzle-cell-input]'))return;noteEntry=null;if(mode==='note'&&event.target.maxLength>1&&!event.target.readOnly){event.target.value='';event.target.closest('.logic-cell')?.classList.remove('entering-note');}else if(event.target.maxLength>1){const s=progress.current();event.target.value=s.board.values[+event.target.dataset.puzzleCell]??'';}});
      root.addEventListener('input',event=>{
        const field=event.target;
        if(field.matches('[data-puzzle-cell-input]')){
          if(screen!=='playing')return;const s=progress.current(),cell=+field.dataset.puzzleCell;
          if(!s.type.validCell(s.level,cell)||s.type.isFixed?.(s.level,cell))return;
          selected=cell;const action=s.type.cellInput({text:field.value,mode,level:s.level,selected:cell});
          if(action?.kind==='pending'){stopEntryCheck();return;}
          if(action){
            const editing=field.maxLength>1?{field}:false;
            if(editing&&action.kind==='note'){
              // While typing 12, replace the temporary candidate 1; preserve earlier notes.
              if(noteEntry?.cell===cell)progress.change({kind:'note',cell,value:noteEntry.value});
              noteEntry={cell,value:action.value};
            }else noteEntry=null;
            enter(action.kind,action.value,editing);
          }else {noteEntry=null;draw(true);}return;
        }
        if(!field.matches('[data-puzzle-search]'))return;query=field.value;root.querySelector('.puzzle-type-list').innerHTML=typeList();
      });
      root.addEventListener('click',event=>{
        const button=event.target.closest('button');if(!button||!root.contains(button))return;
        if(screen==='solved'&&!['types','levels'].includes(button.dataset.puzzleAction))return;
        if(button.dataset.puzzleType){typeId=button.dataset.puzzleType;screen='levels';saveUi();activity();draw();if(typeof window!=='undefined')window.scrollTo({top:0,behavior:'instant'});return;}
        if(button.dataset.puzzleLevel){openLevel(button.dataset.puzzleLevel);return;}
        if(button.dataset.puzzleCell!==undefined){selected=+button.dataset.puzzleCell;const s=progress.current(),action=s.type.cellAction?.({...s,cell:selected});if(action)applyAction(action);else {saveUi();draw(true);}return;}
        if(button.dataset.puzzleCustom){const s=progress.current(),action=s.type.customInput?.(button.dataset.puzzleCustom,button,s);if(action)applyAction(action);return;}
        if(button.dataset.puzzleMode){mode=button.dataset.puzzleMode;saveUi();draw(Boolean(progress.current().type.cellInput));return;}
        if(button.dataset.puzzleNumber){enter(mode,+button.dataset.puzzleNumber);return;}
        const action=button.dataset.puzzleAction;
        if(['types','levels'].includes(action)){stopSolution();screen=action;clearFeedback();saveUi();activity();draw();if(typeof window!=='undefined')window.scrollTo({top:0,behavior:'instant'});}
        else if(action==='entry')submitEntry();
        else if(action==='erase')enter('erase');
        else if(action==='undo'){progress.undo();clearFeedback();draw();}
        else if(action==='check')check();
        else if(action==='hint'){const s=progress.current(),tip=s.type.model.hint(s.level,s.board);notice=tip.message;hinted=tip.cells;conflicts=[];draw();}
        else if(action==='restart'){notice=progress.current().level.kind==='pyramid'?'Möchtest du alle Zahlen zurücklegen?':'Möchtest du deine Einträge und Möglichkeiten löschen?';draw();const p=root.querySelector('.puzzle-notice');p.insertAdjacentHTML('afterend','<div class="puzzle-reset-choice"><button type="button" class="soft-button" data-puzzle-action="confirm-restart">Ja, neu beginnen</button><button type="button" class="soft-button" data-puzzle-action="cancel-restart">Einträge behalten</button></div>');}
        else if(action==='confirm-restart'){progress.reset();clearFeedback();draw();}
        else if(action==='cancel-restart'){clearFeedback();draw();}
        else if(action==='next'){const s=progress.current(),next=s.type.levels[s.type.levels.indexOf(s.level)+1];if(next)openLevel(next.id);}
        else if(action==='replay'){celebration.replay();}
        else if(action==='review'){screen='playing';clearFeedback();saveUi();activity();draw();}
      });
      root.addEventListener('keydown',event=>{const nativeCell=event.target.matches('[data-puzzle-cell-input]');if(!nativeCell&&(event.target.matches('input,textarea')||event.target.isContentEditable)){if(event.key==='Enter'&&event.target.matches('[data-puzzle-entry]')){event.preventDefault();submitEntry();}return;}if(screen!=='playing'||event.ctrlKey||event.metaKey||event.altKey)return;if(nativeCell&&event.target.maxLength>1){if(event.key==='Enter'){event.preventDefault();noteEntry=null;stopEntryCheck();draw(true);inspectEntry();return;}if(['Backspace','Delete'].includes(event.key)){if(event.target.readOnly){event.preventDefault();return;}if(event.target.value===''){event.preventDefault();noteEntry=null;enter('erase');}return;}}if(nativeCell&&/^[0-9]$/.test(event.key))return;const s=progress.current(),command=s.type.keyInput?.({key:event.key,level:s.level,selected,mode});if(!command)return;event.preventDefault();
        if(command.input)enter(command.input.kind,command.input.value);
        else if(command.mode){mode=command.mode;saveUi();draw(true);}
        else if(command.cell!==undefined){noteEntry=null;selected=command.cell;saveUi();draw(true);}
      });
    }draw();const current=progress.current();if(screen==='playing'&&current&&!progress.record(current.type.id,current.level.id)?.completed&&current.type.model.inspect(current.level,current.board).complete)inspectEntry();runSolution();}
  };
}
