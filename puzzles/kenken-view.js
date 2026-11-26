import {kenkenModel} from './kenken.js?v=0.14.0-release-4';
import {kenkenEpisode} from './kenken-levels.js?v=0.14.0-release-4';
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object||{},key);
const symbol=op=>({'*':'×','/':'÷','-':'−','+':'+','=':''}[op]);

function renderBoard({level,board,selected,mode='value',conflicts=[],hinted=[],solutionElapsed=null}){
  const n=level.size,cages=new Map();level.cages.forEach((cage,k)=>cage.cells.forEach(i=>cages.set(i,{...cage,k})));
  const cells=board.values.map((value,i)=>{
    const cage=cages.get(i),r=Math.floor(i/n),c=i%n,given=own(level.givens,i);
    const edge=(j,out)=>out||cages.get(j)?.k!==cage.k?'3px solid #183640':'1px solid #b8c8c3';
    const style=`border-top:${edge(i-n,r===0)};border-right:${edge(i+1,c===n-1)};border-bottom:${edge(i+n,r===n-1)};border-left:${edge(i-1,c===0)}`;
    const status=value?`${given?'Vorgegeben':'Dein Eintrag'} ${value}`:board.notes[i].length?`Möglichkeiten ${board.notes[i].join(', ')}`:'leer';
    const clue=i===Math.min(...cage.cells)?`${cage.target}${symbol(cage.op)}`:'';
    return `<div class="sumdoku-cell kenken-cell ${given?'given':''} ${selected===i?'selected':''} ${conflicts.includes(i)?'conflict':''} ${hinted.includes(i)?'hinted':''}" style="${style}">
      <input class="sumdoku-entry" type="text" inputmode="numeric" maxlength="1" pattern="[1-${n}]" autocomplete="off" spellcheck="false" data-puzzle-cell="${i}" data-puzzle-cell-input value="${given||mode==='value'?value||'':''}" ${given?'readonly':''} ${solutionElapsed!==null?'disabled':''} aria-label="Zeile ${r+1}, Spalte ${c+1}, ${status}, Block ${cage.target}${symbol(cage.op)}"/>
      ${clue?`<span class="sumdoku-sum kenken-clue" aria-hidden="true">${clue}</span>`:''}
      ${value?mode==='note'&&!given?`<span class="sumdoku-value" aria-hidden="true">${value}</span>`:'' :`<span class="sumdoku-notes kenken-notes" aria-hidden="true">${Array.from({length:n},(_,v)=>`<span>${board.notes[i].includes(v+1)?v+1:''}</span>`).join('')}</span>`}
      ${conflicts.includes(i)?'<span class="sumdoku-alert" aria-hidden="true">!</span>':''}</div>`;
  }).join('');
  return `<div class="sumdoku-board kenken-board" data-size="${n}" role="group" aria-label="KenKen ${n} mal ${n}" style="--grid-size:${n}">${cells}</div>`;
}
function renderInput({mode}){return `<div class="puzzle-modes" role="group" aria-label="Wie möchtest du eintragen?"><button class="puzzle-pen" type="button" data-puzzle-mode="value" aria-pressed="${mode==='value'}">✓ Ich bin sicher</button><button type="button" data-puzzle-mode="note" aria-pressed="${mode==='note'}">✎ Möglichkeiten</button></div>`;}
export const kenkenType={
  id:'kenken',title:'KenKens',symbol:'▦',description:'Fülle Zeilen, Spalten und Rechenblöcke.',
  levels:[],retiredLevels:kenkenEpisode.levels,model:kenkenModel,renderBoard,renderInput,
  cellInput:({text,mode,level})=>text===''?{kind:'erase'}:/^[1-8]$/.test(text)&&+text<=level.size?{kind:mode,value:+text}:null,
  initialCell:level=>Math.max(0,Array.from({length:level.size**2},(_,i)=>i).findIndex(i=>!own(level.givens,i))),
  validCell:(level,i)=>Number.isInteger(i)&&i>=0&&i<level.size**2,
  isFixed:(level,i)=>own(level.givens,i),
  cellLabel:(level,i)=>`Zeile ${Math.floor(i/level.size)+1}, Spalte ${i%level.size+1}${own(level.givens,i)?' · vorgegeben':''}`,
  keyInput:({key,level,selected,mode})=>{
    if(/^[1-8]$/.test(key)&&+key<=level.size)return {input:{kind:mode,value:+key}};
    if(['Backspace','Delete'].includes(key))return {input:{kind:'erase'}};
    if(key.toLowerCase()==='n')return {mode:mode==='value'?'note':'value'};
    const n=level.size,r=Math.floor(selected/n),c=selected%n;
    const cell=key==='ArrowLeft'?r*n+Math.max(0,c-1):key==='ArrowRight'?r*n+Math.min(n-1,c+1):key==='ArrowUp'?Math.max(0,r-1)*n+c:key==='ArrowDown'?Math.min(n-1,r+1)*n+c:null;
    return cell===null?null:{cell};
  },
  rules:level=>`<p>Trage die Zahlen <strong>1 bis ${level.size}</strong> ein. Jede Zahl steht in jeder Zeile und jeder Spalte genau einmal. Rechne in jedem dick umrandeten Block mit allen Zahlen und dem Zeichen oben links. Das Ergebnis muss die Zielzahl sein. Eine einzelne Zahl ohne Zeichen ist vorgegeben.</p>`,
  cardDetail:level=>`${level.size} × ${level.size}`,
  levelDetail:level=>`${level.size} × ${level.size} · Zahlen 1–${level.size}`
};
