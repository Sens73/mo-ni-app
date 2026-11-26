import { sumdokuModel } from './sumdoku.js?v=0.14.0-release-2';
import { sumdokuLevels } from './sumdoku-levels.js?v=0.14.0-release-2';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderBoard({level,board,selected,mode='value',conflicts=[],hinted=[],solutionElapsed=null}){
  const n=level.size,cages=new Map();level.cages.forEach((c,k)=>c.cells.forEach(i=>cages.set(i,{...c,k})));
  return `<div class="sumdoku-board" role="group" aria-label="Sumdoku ${n} mal ${n}" style="--grid-size:${n}">${board.values.map((value,i)=>{
    const cage=cages.get(i),r=Math.floor(i/n),c=i%n,given=Boolean(level.givens?.[i]);
    const edge=(j,out)=>out||cages.get(j)?.k!==cage.k?'2px solid #36564b':'1px solid #c4d5cb';
    const style=`border-top:${edge(i-n,r===0)};border-right:${edge(i+1,c===n-1)};border-bottom:${edge(i+n,r===n-1)};border-left:${edge(i-1,c===0)};--cage-tint:${['#f4f9f2','#fcf7ee','#f0f7f8'][cage.k%3]}`;
    const status=value?`${given?'Vorgegeben':'Dein Eintrag'} ${value}`:board.notes[i].length?`Möglichkeiten ${board.notes[i].join(', ')}`:'leer';
    return `<div class="sumdoku-cell ${given?'given':''} ${selected===i?'selected':''} ${conflicts.includes(i)?'conflict':''} ${hinted.includes(i)?'hinted':''}" style="${style}">
    <input class="sumdoku-entry" type="text" inputmode="numeric" maxlength="1" pattern="[1-${n}]" autocomplete="off" spellcheck="false" data-puzzle-cell="${i}" data-puzzle-cell-input value="${given||mode==='value'?value||'':''}" ${given?'readonly':''} ${solutionElapsed!==null?'disabled':''} aria-label="Zeile ${r+1}, Spalte ${c+1}, ${status}${cage.sum!==null?`, Bereichssumme ${cage.sum}`:''}"/>
    ${i===Math.min(...cage.cells)&&cage.sum!==null?`<span class="sumdoku-sum" aria-hidden="true">${cage.sum}</span>`:''}
    ${value?mode==='note'&&!given?`<span class="sumdoku-value" aria-hidden="true">${value}</span>`:'' :`<span class="sumdoku-notes" aria-hidden="true">${Array.from({length:n},(_,v)=>`<span>${board.notes[i].includes(v+1)?v+1:''}</span>`).join('')}</span>`}
    ${conflicts.includes(i)?'<span class="sumdoku-alert" aria-hidden="true">!</span>':''}</div>`;
  }).join('')}</div>`;
}
function renderInput({mode}){
  return `<div class="puzzle-modes" role="group" aria-label="Wie möchtest du eintragen?"><button class="puzzle-pen" type="button" data-puzzle-mode="value" aria-pressed="${mode==='value'}">✓ Ich bin sicher</button><button type="button" data-puzzle-mode="note" aria-pressed="${mode==='note'}">✎ Möglichkeiten</button></div>`;
}
export const sumdokuType={
  id:'sumdoku',title:'Sumdoku',symbol:'▦',description:'Kombiniere Zahlen und Summen. Jede Zeile und Spalte zählt!',
  levels:sumdokuLevels,model:sumdokuModel,renderBoard,renderInput,
  cellInput:({text,mode,level})=>text===''?{kind:'erase'}:/^[1-6]$/.test(text)&&+text<=level.size?{kind:mode,value:+text}:null,
  initialCell:level=>Math.max(0,Array.from({length:level.size**2},(_,i)=>i).findIndex(i=>!level.givens?.[i])),
  validCell:(level,i)=>Number.isInteger(i)&&i>=0&&i<level.size**2,
  isFixed:(level,i)=>Boolean(level.givens?.[i]),
  cellLabel:(level,i)=>`Zeile ${Math.floor(i/level.size)+1}, Spalte ${i%level.size+1}${level.givens?.[i]?' · vorgegeben':''}`,
  keyInput:({key,level,selected,mode})=>{
    if(/^[1-6]$/.test(key)&&+key<=level.size)return {input:{kind:mode,value:+key}};
    if(['Backspace','Delete'].includes(key))return {input:{kind:'erase'}};
    if(key.toLowerCase()==='n')return {mode:mode==='value'?'note':'value'};
    const n=level.size,r=Math.floor(selected/n),c=selected%n;
    const cell=key==='ArrowLeft'?r*n+Math.max(0,c-1):key==='ArrowRight'?r*n+Math.min(n-1,c+1):key==='ArrowUp'?Math.max(0,r-1)*n+c:key==='ArrowDown'?Math.min(n-1,r+1)*n+c:null;
    return cell===null?null:{cell};
  },
  rules:level=>`<p>Trage die Zahlen <strong>1 bis ${level.size}</strong> ein. Jede Zahl kommt in <strong>jeder Zeile und jeder Spalte genau einmal</strong> vor.</p><p>Steht in einem dick umrandeten Bereich eine kleine orange <strong>Summe</strong>, müssen seine Zahlen diese Summe ergeben. Bereiche ohne Summe dürfen jede Summe haben. Innerhalb eines Bereichs dürfen sich Zahlen wiederholen, wenn die Zeilen und Spalten stimmen.</p><p>Schwarze Zahlen sind vorgegeben. Deine sicheren Einträge sind groß und grün; deine Möglichkeiten klein und grau.</p>`,
  bandDescriptions:{'Entdecker':'Erste Zahlen finden und Summen ergänzen.','Tüftler':'Möglichkeiten vergleichen und geschickt kombinieren.','Knobelmeister':'Möglichkeiten weiterverfolgen und Widersprüche entdecken.'},
  cardDetail:level=>`${level.size} × ${level.size}`,
  levelDetail:level=>`${level.size} × ${level.size} · Zahlen 1–${level.size}`
};
