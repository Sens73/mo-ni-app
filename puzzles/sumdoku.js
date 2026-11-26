/** Sumdoku uses Latin rows/columns and cage sums. Repeats inside cages are allowed. */
export function validateLevel(level) {
  const n=level.size;
  if(!Number.isInteger(n)||n<2||n>6||!level.id||!Array.isArray(level.cages))throw Error('Ungültiges Sumdoku');
  const covered=new Set();
  for(const cage of level.cages){
    if(!Array.isArray(cage.cells)||!cage.cells.length||cage.cells.length>(cage.sum===null?n*n:6))throw Error('Ungültiger Bereich');
    if(cage.sum!==null&&(!Number.isInteger(cage.sum)||cage.sum<cage.cells.length||cage.sum>n*cage.cells.length))throw Error('Ungültige Summe');
    for(const i of cage.cells){if(!Number.isInteger(i)||i<0||i>=n*n||covered.has(i))throw Error('Ungültiges Raster');covered.add(i);}
    const visited=new Set([cage.cells[0]]),todo=[cage.cells[0]];
    while(todo.length){const i=todo.pop();for(const j of cage.cells)if(!visited.has(j)&&(Math.floor(i/n)===Math.floor(j/n)&&Math.abs(i-j)===1||Math.abs(i-j)===n)){visited.add(j);todo.push(j);}}
    if(visited.size!==cage.cells.length)throw Error('Bereich muss zusammenhängen');
  }
  if(covered.size!==n*n)throw Error('Unvollständiges Raster');
  for(const [i,v] of Object.entries(level.givens||{}))if(!/^\d+$/.test(i)||+i>=n*n||!Number.isInteger(v)||v<1||v>n)throw Error('Ungültige Vorgabe');
  return level;
}
export function initialBoard(level){return normalizeBoard(level,{});}
export function normalizeBoard(level,board){
  const n=level.size,values=Array.from({length:n*n},(_,i)=>level.givens?.[i]||(Number.isInteger(board?.values?.[i])&&board.values[i]>=1&&board.values[i]<=n?board.values[i]:0));
  const notes=values.map((v,i)=>v?[]:[...new Set((Array.isArray(board?.notes?.[i])?board.notes[i]:[]).filter(x=>Number.isInteger(x)&&x>=1&&x<=n))].sort((a,b)=>a-b));
  return {values,notes};
}
export function applyInput(level,board,action){
  const next=normalizeBoard(level,board),i=action.cell;
  if(!Number.isInteger(i)||i<0||i>=level.size**2||level.givens?.[i])return next;
  if(action.kind==='erase'){next.values[i]=0;next.notes[i]=[];}
  else if(Number.isInteger(action.value)&&action.value>=1&&action.value<=level.size){
    if(action.kind==='note'){next.values[i]=0;const a=next.notes[i];next.notes[i]=a.includes(action.value)?a.filter(v=>v!==action.value):[...a,action.value].sort((a,b)=>a-b);}
    else if(action.kind==='value'){next.values[i]=action.value;next.notes[i]=[];}
  }
  return next;
}
export function inspect(level,board){
  const {values}=normalizeBoard(level,board),n=level.size,conflicts=new Set(),messages=[];
  for(let k=0;k<n;k++)for(const [name,indices] of [['Zeile',Array.from({length:n},(_,c)=>k*n+c)],['Spalte',Array.from({length:n},(_,r)=>r*n+k)]]){
    const counts=new Map();for(const i of indices)if(values[i])counts.set(values[i],[...(counts.get(values[i])||[]),i]);
    for(const [v,a] of counts)if(a.length>1){a.forEach(i=>conflicts.add(i));messages.push(`${name} ${k+1}: Die ${v} steht mehr als einmal darin.`);}
  }
  for(const cage of level.cages){if(cage.sum===null)continue;const sum=cage.cells.reduce((a,i)=>a+values[i],0),empty=cage.cells.filter(i=>!values[i]).length;
    if(sum+empty>cage.sum||sum+empty*n<cage.sum){cage.cells.forEach(i=>conflicts.add(i));messages.push(`Im Bereich mit Summe ${cage.sum} passen die eingetragenen Zahlen noch nicht zusammen.`);}
  }
  const filled=values.filter(Boolean).length;
  return {complete:filled===n*n&&conflicts.size===0,filled,total:n*n,conflicts:[...conflicts],messages:[...new Set(messages)]};
}
function basicOptions(level,values,i){
  const n=level.size,r=Math.floor(i/n),c=i%n;
  return Array.from({length:n},(_,v)=>v+1).filter(v=>!values.some((x,j)=>j!==i&&x===v&&(Math.floor(j/n)===r||j%n===c)));
}
/** All local cage completions, respecting row/column peers; never reads a hidden solution. */
export function candidates(level,board){
  const {values}=normalizeBoard(level,board),result=values.map((v,i)=>v?[v]:basicOptions(level,values,i));
  for(const cage of level.cages){
    if(cage.sum===null)continue;
    const missing=cage.cells.filter(i=>!values[i]),allowed=new Map(missing.map(i=>[i,new Set()]));
    const assigned=[...values],base=cage.cells.reduce((s,i)=>s+values[i],0);
    function visit(k,sum){
      if(k===missing.length){if(sum===cage.sum)for(const i of missing)allowed.get(i).add(assigned[i]);return;}
      const i=missing[k],left=missing.length-k-1;
      for(const v of basicOptions(level,assigned,i)){if(sum+v+left>cage.sum||sum+v+left*level.size<cage.sum)continue;assigned[i]=v;visit(k+1,sum+v);assigned[i]=0;}
    }
    visit(0,base);for(const i of missing)result[i]=[...allowed.get(i)].sort((a,b)=>a-b);
  }
  return result;
}
export function hint(level,board){
  const checked=inspect(level,board);
  if(checked.conflicts.length)return {cells:checked.conflicts,message:`Schau zuerst hier nach: ${checked.messages[0]}`};
  if(checked.complete)return {cells:[],message:'Alle Zahlen und Summen passen. Geschafft!'};
  const options=candidates(level,board),{values}=normalizeBoard(level,board);
  const impossible=values.findIndex((v,i)=>!v&&!options[i].length);
  if(impossible>=0)return {cells:[impossible],message:'Für dieses Feld bleibt gerade keine Zahl übrig. Überprüfe deine Einträge in der Zeile, Spalte und im Summenbereich.'};
  const single=values.findIndex((v,i)=>!v&&options[i].length===1);
  if(single>=0)return {cells:[single],message:`Schau auf das markierte Feld in Zeile ${Math.floor(single/level.size)+1}, Spalte ${single%level.size+1}. Wenn du die Zeile, die Spalte und die Summe beachtest, bleibt nur die ${options[single][0]} übrig.`};
  const i=values.map((v,i)=>({i,count:v?Infinity:options[i].length})).sort((a,b)=>a.count-b.count)[0].i;
  return {cells:[i],message:`Hier kommen noch ${options[i].join(' oder ')} infrage. Notiere die Möglichkeiten und vergleiche die Nachbarfelder im Summenbereich.`};
}
/** Pack-authoring helper: counts solutions up to limit, with no extra cage uniqueness rule. */
export function solve(level,limit=2){
  const answers=[],values=initialBoard(level).values;
  function search(){
    if(inspect(level,{values}).conflicts.length)return;
    const opts=candidates(level,{values});let i=-1;
    for(let j=0;j<values.length;j++)if(!values[j]&&(i<0||opts[j].length<opts[i].length))i=j;
    if(i<0){answers.push([...values]);return;}
    for(const v of opts[i]){values[i]=v;search();values[i]=0;if(answers.length>=limit)return;}
  }
  search();return answers;
}
export const sumdokuModel={initialBoard,normalizeBoard,applyInput,inspect,hint,validateLevel};
