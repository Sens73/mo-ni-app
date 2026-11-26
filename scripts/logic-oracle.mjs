// Separate audit: rebuild rules from visible geometry. Does not import the game model,
// its compiled constraints, candidate propagation or stored answers.
const ints=(a,b)=>Array.from({length:b-a+1},(_,i)=>i+a);
export function oracleRules(l){const rules=[],at=(x,y)=>l.fields.findIndex(f=>f.x===x&&f.y===y),all=l.fields.map((_,i)=>i);
 const distinct=cells=>rules.push({cells,kind:'distinct'}),relation=(cells,fn)=>rules.push({cells,kind:'relation',fn});
 if(l.kind==='cross')for(const vert of [false,true])for(let k=0;k<(vert?l.cols:l.rows);k++){let line=[];const end=()=>{if(line.length>=3)rules.push({kind:'arithmetic',cells:line});line=[];};for(let p=0;p<(vert?l.rows:l.cols);p++){const i=at(vert?k:p,vert?p:k);if(i<0)end();else line.push(i);}end();}
 if(l.kind==='deka'){
  for(let y=1;y<l.rows;y++)for(let x=1;x<l.cols;x++){const touching=new Set();l.fields.forEach((f,i)=>{if(x>=f.x&&x<=f.x+f.w&&y>=f.y&&y<=f.y+f.h)touching.add(i);});relation([...touching],a=>a.reduce((s,v)=>s+v,0)===10);}
  l.fields.forEach((a,i)=>l.fields.forEach((b,j)=>{if(j<=i)return;const xTouch=a.x+a.w===b.x||b.x+b.w===a.x,yTouch=a.y+a.h===b.y||b.y+b.h===a.y;if(xTouch&&a.y<b.y+b.h&&b.y<a.y+a.h||yTouch&&a.x<b.x+b.w&&b.x<a.x+a.w)distinct([i,j]);}));
 }
 if(l.kind==='sudoku'||l.kind==='magic'){
  for(let r=0;r<l.rows;r++)distinct(all.filter(i=>l.fields[i].y===r));for(let c=0;c<l.cols;c++)distinct(all.filter(i=>l.fields[i].x===c));
  if(l.kind==='sudoku'){for(let y=0;y<4;y+=2)for(let x=0;x<4;x+=2)distinct(all.filter(i=>l.fields[i].x>=x&&l.fields[i].x<x+2&&l.fields[i].y>=y&&l.fields[i].y<y+2));l.comparisons.forEach(c=>relation([c.small,c.large],a=>a[0]<a[1]));}
  else for(const sum of l.sums){const cells=all.filter(i=>(sum.vertical?l.fields[i].x:l.fields[i].y)===sum.line).sort((a,b)=>sum.vertical?l.fields[a].y-l.fields[b].y:l.fields[a].x-l.fields[b].x);
   relation(cells,a=>{let total=0,number=0,previous=-2;cells.forEach((i,k)=>{const position=sum.vertical?l.fields[i].y:l.fields[i].x;if(position!==previous+1){total+=number;number=0;}number=10*number+a[k];previous=position;});return total+number===sum.target;});}
 }
 if(l.kind==='digit')for(const circle of l.circles){const x=circle.x-1,y=circle.y-1;relation([at(x,y),at(x+1,y),at(x,y+1),at(x+1,y+1)],a=>Math.abs(Number(`${a[0]}${a[1]}`)-Number(`${a[2]}${a[3]}`))===circle.target);}
 if(l.kind==='pyramid'){
  l.fields.forEach((f,i)=>{const left=at(f.x-1,f.y+2),right=at(f.x+1,f.y+2);if(left>=0&&right>=0)relation([left,right,i],a=>Math.abs(a[0]-a[1])===a[2]);});
  rules.push({kind:'bank',cells:all.filter(i=>!Object.hasOwn(l.givens,i)),bank:l.bank});
 }
 return rules;
}
export function oracleNumeric(l,limit=2){if(l.kind==='number-path')throw Error('Use route enumeration');const rules=oracleRules(l),answers=[];let nodes=0;
 const leading=new Set((l.circles||[]).flatMap(c=>l.fields.map((f,i)=>({f,i})).filter(({f})=>f.x===c.x-1&&(f.y===c.y-1||f.y===c.y)).map(q=>q.i)));
 const initial=l.fields.map((f,i)=>Object.hasOwn(l.givens,i)?[l.givens[i]]:l.kind==='cross'?ints(0,l.maxNumber??40):l.kind==='deka'?ints(0,9):l.kind==='digit'?ints(leading.has(i)?1:0,9):l.kind==='sudoku'?ints(1,4):l.kind==='magic'?ints(1,l.digits??l.cols-1):[...new Set(l.bank)]);
 function search(options){nodes++;if(nodes>200000)throw Error(`Independent oracle exceeded ${l.id}`);let changed=true;
 while(changed){changed=false;for(const rule of rules){const {cells}=rule;let allowed;
  if(rule.kind==='distinct'){const fixed=cells.filter(i=>options[i].length===1).map(i=>options[i][0]);if(new Set(fixed).size!==fixed.length)return;allowed=cells.map(i=>options[i].length===1?options[i]:options[i].filter(v=>!fixed.includes(v)));}
  else if(rule.kind==='bank'){const fixed=cells.filter(i=>options[i].length===1).map(i=>options[i][0]),counts=v=>rule.bank.filter(x=>x===v).length,used=v=>fixed.filter(x=>x===v).length;if(fixed.some(v=>used(v)>counts(v)))return;allowed=cells.map(i=>options[i].length===1?options[i]:options[i].filter(v=>used(v)<counts(v)));}
  else {const support=cells.map(()=>new Set());
   if(rule.kind==='arithmetic'){for(const a of options[cells[0]])for(const b of options[cells[1]]){const list=cells.map((_,i)=>a+i*(b-a));if(list.every((v,k)=>options[cells[k]].includes(v)))list.forEach((v,k)=>support[k].add(v));}}
   else {const values=[];function enumerate(k){if(k===cells.length){if(rule.fn(values))values.forEach((v,j)=>support[j].add(v));return;}for(const v of options[cells[k]]){values[k]=v;enumerate(k+1);}}enumerate(0);}
   allowed=support.map(s=>[...s]);
  }
  cells.forEach((i,k)=>{const a=options[i].filter(v=>allowed[k].includes(v));if(a.length!==options[i].length)changed=true;options[i]=a;});if(options.some(a=>!a.length))return;
 }}
 const cell=options.map((a,i)=>({i,n:a.length})).filter(a=>a.n>1).sort((a,b)=>a.n-b.n)[0];if(!cell){answers.push(options.map(a=>a[0]));return;}
 for(const v of options[cell.i]){const next=options.map(a=>[...a]);next[cell.i]=[v];search(next);if(answers.length>=limit)return;}
 }
 search(initial);return {answers,nodes};
}
export function independentFullCheck(l,values){if(values.length!==l.fields.length||values.some(v=>!Number.isInteger(v)))return false;
 if(Object.entries(l.givens).some(([i,v])=>values[i]!==v))return false;
 if(l.kind==='number-path'){if(new Set(values).size!==values.length||Math.min(...values)!==1||Math.max(...values)!==values.length)return false;for(let v=1;v<values.length;v++){const a=l.fields[values.indexOf(v)],b=l.fields[values.indexOf(v+1)];if(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)!==1)return false;}return true;}
 return oracleRules(l).every(r=>{const a=r.cells.map(i=>values[i]);if(r.kind==='distinct')return new Set(a).size===a.length;if(r.kind==='arithmetic')return a.slice(1).every((v,k)=>v-a[k]===a[1]-a[0]);if(r.kind==='bank')return [...a].sort((x,y)=>x-y).join(',')===[...r.bank].sort((x,y)=>x-y).join(',');return r.fn(a);});
}
