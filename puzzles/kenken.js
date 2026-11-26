/** KenKen: Latin rows/columns and arithmetic cages. The checker never reads the authored solution. */
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object||{},key);
const unique=values=>[...new Set(values)];
const row=(i,n)=>Math.floor(i/n);
const col=(i,n)=>i%n;
const validTarget=(target,op,values)=>{
  if(op==='=')return values[0]===target;
  if(op==='+')return values.reduce((sum,value)=>sum+value,0)===target;
  if(op==='*')return values.reduce((product,value)=>product*value,1)===target;
  if(op==='-')return Math.abs(values[0]-values[1])===target;
  if(op==='/')return Math.max(...values)===target*Math.min(...values);
  return false;
};

export function validateKenKen(level){
  const n=level.size;
  if(![4,5,8].includes(n)||!level.id||!Array.isArray(level.cages))throw Error('Ungültiges KenKen');
  const covered=new Set();
  for(const cage of level.cages){
    if(!['=','+','*','-','/'].includes(cage.op)||!Number.isSafeInteger(cage.target)||cage.target<1||!Array.isArray(cage.cells)||!cage.cells.length)throw Error('Ungültiger KenKen-Block');
    if(cage.op==='='&&cage.cells.length!==1||['-','/'].includes(cage.op)&&cage.cells.length!==2)throw Error('Falsche Blockgröße');
    for(const i of cage.cells){if(!Number.isInteger(i)||i<0||i>=n*n||covered.has(i))throw Error('Ungültiges KenKen-Raster');covered.add(i);}
    const found=new Set([cage.cells[0]]),todo=[cage.cells[0]];
    while(todo.length){const i=todo.pop();for(const j of cage.cells)if(!found.has(j)&&Math.abs(row(i,n)-row(j,n))+Math.abs(col(i,n)-col(j,n))===1){found.add(j);todo.push(j);}}
    if(found.size!==cage.cells.length)throw Error('KenKen-Blöcke müssen zusammenhängen');
    if(cage.op==='='&&level.givens?.[cage.cells[0]]!==cage.target)throw Error('Einzelblock ohne Vorgabe');
  }
  if(covered.size!==n*n)throw Error('Unvollständiges KenKen');
  for(const [i,value] of Object.entries(level.givens||{}))if(!/^\d+$/.test(i)||+i>=n*n||!Number.isInteger(value)||value<1||value>n)throw Error('Ungültige KenKen-Vorgabe');
  return level;
}

export function normalizeKenKen(level,board={}){
  const n=level.size;
  const values=Array.from({length:n*n},(_,i)=>own(level.givens,i)?level.givens[i]:Number.isInteger(board.values?.[i])&&board.values[i]>=1&&board.values[i]<=n?board.values[i]:0);
  const notes=values.map((value,i)=>value?[]:unique((Array.isArray(board.notes?.[i])?board.notes[i]:[]).filter(v=>Number.isInteger(v)&&v>=1&&v<=n)).sort((a,b)=>a-b));
  return {values,notes};
}
export function applyKenKen(level,board,action){
  const next=normalizeKenKen(level,board),i=action.cell,n=level.size;
  if(!Number.isInteger(i)||i<0||i>=n*n||own(level.givens,i))return next;
  if(action.kind==='erase'){next.values[i]=0;next.notes[i]=[];}
  else if(Number.isInteger(action.value)&&action.value>=1&&action.value<=n){
    if(action.kind==='note'){next.values[i]=0;const a=next.notes[i];next.notes[i]=a.includes(action.value)?a.filter(v=>v!==action.value):[...a,action.value].sort((a,b)=>a-b);}
    if(action.kind==='value'){next.values[i]=action.value;next.notes[i]=[];}
  }
  return next;
}

function basicOptions(level,values,i){
  const n=level.size,r=row(i,n),c=col(i,n);
  return Array.from({length:n},(_,v)=>v+1).filter(v=>!values.some((x,j)=>i!==j&&x===v&&(row(j,n)===r||col(j,n)===c)));
}
/** Every completion of a cage that respects filled row and column peers. */
function cageOptions(level,values,cage){
  const missing=cage.cells.filter(i=>!values[i]),assigned=[...values],allowed=new Map(missing.map(i=>[i,new Set()]));let completions=0;
  function visit(k){
    if(k===missing.length){if(validTarget(cage.target,cage.op,cage.cells.map(i=>assigned[i]))){completions++;for(const i of missing)allowed.get(i).add(assigned[i]);}return;}
    const i=missing[k];for(const value of basicOptions(level,assigned,i)){assigned[i]=value;visit(k+1);assigned[i]=0;}
  }
  visit(0);return {completions,allowed};
}
export function kenkenCandidates(level,board){
  const {values}=normalizeKenKen(level,board),result=values.map((value,i)=>value?[value]:basicOptions(level,values,i));
  for(const cage of level.cages){const {allowed}=cageOptions(level,values,cage);for(const [i,options] of allowed)result[i]=result[i].filter(v=>options.has(v));}
  return result;
}
export function inspectKenKen(level,board){
  const {values}=normalizeKenKen(level,board),n=level.size,conflicts=new Set(),messages=[];
  for(let k=0;k<n;k++)for(const [name,indices] of [['Zeile',Array.from({length:n},(_,c)=>k*n+c)],['Spalte',Array.from({length:n},(_,r)=>r*n+k)]]){
    const seen=new Map();for(const i of indices)if(values[i])seen.set(values[i],[...(seen.get(values[i])||[]),i]);
    for(const [value,places] of seen)if(places.length>1){places.forEach(i=>conflicts.add(i));messages.push(`${name} ${k+1}: Die ${value} steht mehrfach darin.`);}
  }
  for(const cage of level.cages)if(!cageOptions(level,values,cage).completions){cage.cells.forEach(i=>conflicts.add(i));messages.push(`Im Block ${cage.target}${cage.op==='='?'':cage.op==='*'?'×':cage.op==='/'?'÷':cage.op} passen die Zahlen noch nicht.`);}
  const filled=values.filter(Boolean).length;
  return {complete:filled===n*n&&!conflicts.size,filled,total:n*n,conflicts:[...conflicts],messages:unique(messages)};
}
export function kenkenHint(level,board){
  const checked=inspectKenKen(level,board);
  if(checked.conflicts.length)return {cells:checked.conflicts,message:checked.messages[0]};
  if(checked.complete)return {cells:[],message:'Alle Zeilen, Spalten und Blöcke passen. Geschafft!'};
  const {values}=normalizeKenKen(level,board),options=kenkenCandidates(level,board);
  const impossible=values.findIndex((v,i)=>!v&&!options[i].length);
  if(impossible>=0)return {cells:[impossible],message:'Hier bleibt keine Zahl übrig. Prüfe die Zeile, die Spalte und den Block.'};
  const single=values.findIndex((v,i)=>!v&&options[i].length===1);
  if(single>=0)return {cells:[single],message:`Hier bleibt nur die ${options[single][0]} übrig. Vergleiche Zeile, Spalte und Block.`};
  const i=values.map((v,i)=>({i,count:v?Infinity:options[i].length})).sort((a,b)=>a.count-b.count)[0].i;
  return {cells:[i],message:`Hier sind noch ${options[i].join(' oder ')} möglich. Notiere die Zahlen und prüfe die Nachbarfelder.`};
}
export const kenkenModel={initialBoard:l=>normalizeKenKen(l),normalizeBoard:normalizeKenKen,applyInput:applyKenKen,inspect:inspectKenKen,hint:kenkenHint,validateLevel:validateKenKen};
