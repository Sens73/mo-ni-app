/** Numeric puzzle constraints. Null is empty: zero is a real digit.
 * No checker or hint reads the authored solution. */
const unique=a=>[...new Set(a)];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
export function normalizeNumbers(level,board={}){
  const values=level.fields.map((_,i)=>own(level.givens,i)?level.givens[i]:level.domains[i].includes(board.values?.[i])?board.values[i]:null);
  const notes=values.map((v,i)=>v!==null?[]:unique((Array.isArray(board.notes?.[i])?board.notes[i]:[]).filter(x=>level.domains[i].includes(x))).sort((a,b)=>a-b));
  return {values,notes};
}
export function applyNumber(level,board,action){
  const next=normalizeNumbers(level,board),i=action.cell;if(!Number.isInteger(i)||!level.fields[i]||own(level.givens,i))return next;
  if(action.kind==='erase'){next.values[i]=null;next.notes[i]=[];}
  else if(level.domains[i].includes(action.value)){
    if(action.kind==='note'){next.values[i]=null;const a=next.notes[i];next.notes[i]=a.includes(action.value)?a.filter(v=>v!==action.value):[...a,action.value].sort((a,b)=>a-b);}
    else if(action.kind==='value'){next.values[i]=action.value;next.notes[i]=[];}
  }return next;
}
function distance(level,a,b){const x=level.fields[a],y=level.fields[b];return Math.abs(x.x-y.x)+Math.abs(x.y-y.y);}
function relation(c,a){
  if(c.kind==='arithmetic')return a.every((v,i)=>i<2||v-a[i-1]===a[1]-a[0]);
  if(c.kind==='linear')return a.reduce((s,v,i)=>s+c.weights[i]*v,0)===c.target;
  if(c.kind==='difference')return Math.abs(a[0]-a[1])===a[2];
  if(c.kind==='digitDifference')return Math.abs(10*a[0]+a[1]-10*a[2]-a[3])===c.target;
  if(c.kind==='less')return a[0]<a[1];
  throw Error('Unbekannte Zahlenbedingung');
}
/** Local supports, with an algebraic final variable for linear/digit sums. */
function supports(c,domains){
  const allowed=c.cells.map(()=>new Set());
  if(c.kind==='arithmetic'){for(const a of domains[c.cells[0]])for(const b of domains[c.cells[1]]){const values=c.cells.map((_,i)=>a+(b-a)*i);if(values.every((v,i)=>domains[c.cells[i]].includes(v)))values.forEach((v,i)=>allowed[i].add(v));}return allowed.map(a=>[...a]);}
  const order=c.cells.map((i,k)=>({i,k})).sort((a,b)=>domains[a.i].length-domains[b.i].length),chosen=Array(c.cells.length);
  const weights=c.kind==='linear'?c.weights:c.kind==='digitDifference'?[10,1,-10,-1]:null;
  function visit(k){
    if(k===order.length){if(relation(c,chosen))chosen.forEach((v,j)=>allowed[j].add(v));return;}
    const {i,k:j}=order[k];
    if(weights&&k===order.length-1){
      const sum=chosen.reduce((s,v,h)=>h===j?s:s+(v??0)*weights[h],0),targets=c.kind==='digitDifference'?[c.target,-c.target]:[c.target];
      for(const target of unique(targets)){const v=(target-sum)/weights[j];if(Number.isInteger(v)&&domains[i].includes(v)){chosen[j]=v;visit(k+1);chosen[j]=undefined;}}return;
    }
    for(const v of domains[i]){chosen[j]=v;
      if(weights){const sum=chosen.reduce((s,x,h)=>s+(x??0)*weights[h],0),left=order.slice(k+1);const lo=sum+left.reduce((s,x)=>s+Math.min(...domains[x.i].map(y=>y*weights[x.k])),0),hi=sum+left.reduce((s,x)=>s+Math.max(...domains[x.i].map(y=>y*weights[x.k])),0);const targets=c.kind==='digitDifference'?[c.target,-c.target]:[c.target];if(!targets.some(t=>lo<=t&&hi>=t)){chosen[j]=undefined;continue;}}
      visit(k+1);chosen[j]=undefined;
    }
  }visit(0);return allowed.map(a=>[...a].sort((a,b)=>a-b));
}
export function propagateNumbers(level,values=[],strength='strong'){
  const d=level.domains.map((a,i)=>own(level.givens,i)?[level.givens[i]]:a.includes(values[i])?[values[i]]:[...a]),trace=[];
  let changed=true,valid=true,rounds=0;
  function reduce(i,allowed,method){const next=d[i].filter(v=>allowed.includes(v));if(next.length===d[i].length)return;trace.push({cell:i,before:d[i],after:next,method});d[i]=next;changed=true;if(!next.length)valid=false;}
  while(changed&&valid){changed=false;rounds++;
    for(const c of level.constraints){if(!valid)break;
      if(c.kind==='distinct'){
        const fixed=c.cells.filter(i=>d[i].length===1).map(i=>d[i][0]);if(unique(fixed).length!==fixed.length){valid=false;break;}
        for(const i of c.cells)if(d[i].length>1)reduce(i,d[i].filter(v=>!fixed.includes(v)),'Zahlen ausschließen');
        if(strength==='strong'&&c.required)for(const v of c.required){const places=c.cells.filter(i=>d[i].includes(v));if(!places.length){valid=false;break;}if(places.length===1)reduce(places[0],[v],'Einziger Zahlenplatz');}
      }else if(c.kind==='bank'){
        const stock=new Map();c.numbers.forEach(v=>stock.set(v,(stock.get(v)||0)+1));
        for(const [v,count] of stock){const fixed=c.cells.filter(i=>d[i].length===1&&d[i][0]===v),possible=c.cells.filter(i=>d[i].includes(v));if(fixed.length>count||possible.length<count){valid=false;break;}
          if(fixed.length===count)for(const i of possible)if(d[i].length>1)reduce(i,d[i].filter(x=>x!==v),'Zahlenvorrat');
          if(strength==='strong'&&possible.length===count)possible.forEach(i=>reduce(i,[v],'Zahlenvorrat vergleichen'));
        }
      }else if(c.kind==='path'){
        const fixed=c.cells.filter(i=>d[i].length===1);
        for(const i of c.cells)reduce(i,d[i].filter(v=>fixed.every(j=>{if(i===j)return true;const gap=Math.abs(v-d[j][0]),dist=distance(level,i,j);return gap>=dist&&(gap-dist)%2===0;})),'Abstände im Zahlenpfad');
      }else{
        if(strength==='basic'&&c.kind==='arithmetic'&&c.cells.filter(i=>d[i].length===1).length<2)continue;
        if(strength==='basic'&&c.kind!=='arithmetic'&&c.cells.filter(i=>d[i].length>1).length>1&&c.kind!=='less')continue;
        const a=supports(c,d);c.cells.forEach((i,k)=>reduce(i,a[k],strength==='basic'?'Direkt ergänzen':'Möglichkeiten verknüpfen'));
      }
    }
  }
  return {valid,complete:valid&&d.every(a=>a.length===1),options:d,values:d.map(a=>a.length===1?a[0]:null),filled:d.filter(a=>a.length===1).length,rounds,trace};
}
function possible(level,c,values){
  const known=c.cells.filter(i=>values[i]!==null);
  if(c.kind==='distinct')return unique(known.map(i=>values[i])).length===known.length&&(!c.required||known.every(i=>c.required.includes(values[i])));
  if(c.kind==='bank'){const stock=new Map();c.numbers.forEach(v=>stock.set(v,(stock.get(v)||0)+1));for(const i of known){const n=stock.get(values[i])||0;if(!n)return false;stock.set(values[i],n-1);}return true;}
  if(c.kind==='path')return known.every(i=>known.every(j=>{const gap=Math.abs(values[i]-values[j]),dist=distance(level,i,j);return gap>=dist&&(gap-dist)%2===0;}));
  const d=level.domains.map((a,i)=>values[i]===null?a:[values[i]]);return supports(c,d).every(a=>a.length);
}
export function inspectNumbers(level,board){
  const {values}=normalizeNumbers(level,board),conflicts=new Set(),messages=[];
  for(const c of level.constraints)if(!possible(level,c,values)){c.cells.forEach(i=>conflicts.add(i));messages.push(c.message||'Hier passen deine Zahlen noch nicht zur Regel.');}
  const filled=values.filter(v=>v!==null).length;
  return {complete:filled===values.length&&!conflicts.size,filled,total:values.length,conflicts:[...conflicts],messages:unique(messages)};
}
export function solveNumbers(level,limit=2,maxNodes=20000){
  const answers=[],metrics={nodes:0,branches:0,depth:0};
  function search(values,depth=0){if(answers.length>=limit)return;if(metrics.nodes>=maxNodes){metrics.exhausted=true;return;}metrics.nodes++;metrics.depth=Math.max(metrics.depth,depth);const p=propagateNumbers(level,values);if(!p.valid)return;
    if(p.complete){if(inspectNumbers(level,{values:p.values}).complete)answers.push(p.values);return;}
    const i=p.options.map((a,i)=>({i,n:a.length})).filter(x=>x.n>1).sort((a,b)=>a.n-b.n)[0].i;
    for(const v of p.options[i]){metrics.branches++;const next=[...p.values];next[i]=v;search(next,depth+1);if(answers.length>=limit)return;}
  }search([]);return {answers,metrics};
}
export function numberHint(level,board){
  const state=inspectNumbers(level,board);if(state.conflicts.length)return {cells:state.conflicts,message:state.messages[0]};if(state.complete)return {cells:[],message:'Alle Zahlen erfüllen die Regeln. Geschafft!'};
  const {values}=normalizeNumbers(level,board),p=propagateNumbers(level,values);
  if(!p.valid)return {cells:[],message:'Die Einträge führen zusammen zu einem Widerspruch. Überprüfe die letzten Zahlen und nutze Rückgängig.'};
  const i=p.options.map((a,i)=>({i,n:values[i]!==null?Infinity:a.length})).sort((a,b)=>a.n-b.n)[0].i;
  return {cells:[i],message:p.options[i].length===1?`Für das markierte Feld bleibt nach den Regeln nur die ${p.options[i][0]} übrig.`:`Vergleiche beim markierten Feld die Möglichkeiten ${p.options[i].join(', ')} mit seinen Nachbarfeldern und Bedingungen.`};
}
export function validateNumberLevel(level){
  if(!level.id||!level.fields?.length||level.domains?.length!==level.fields.length||!level.constraints?.length)throw Error('Ungültiges Zahlenrätsel');
  for(const [i,a] of level.domains.entries())if(!a.length||a.some(v=>!Number.isSafeInteger(v)||v<0)||own(level.givens,i)&&!a.includes(level.givens[i]))throw Error('Ungültiger Zahlenbereich');
  for(const c of level.constraints){if(!c.cells?.length||c.cells.some(i=>!Number.isInteger(i)||!level.fields[i]))throw Error('Ungültige Bedingung');if(c.kind==='linear'&&(c.weights?.length!==c.cells.length||c.weights.some(v=>!v)))throw Error('Ungültige Summe');}
}
export const numberLogicModel={initialBoard:l=>normalizeNumbers(l),normalizeBoard:normalizeNumbers,applyInput:applyNumber,inspect:inspectNumbers,hint:numberHint,validateLevel:validateNumberLevel};
