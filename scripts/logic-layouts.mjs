export const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
export function gridFields(rows,cols,blocked=[]){return range(0,rows*cols-1).filter(i=>!blocked.includes(i)).map(i=>({x:i%cols,y:Math.floor(i/cols),w:1,h:1}));}
const pairs=fields=>fields.flatMap((a,i)=>fields.slice(i+1).flatMap((b,k)=>{
  const side=(a.x+a.w===b.x||b.x+b.w===a.x)&&Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y)||(a.y+a.h===b.y||b.y+b.h===a.y)&&Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x);
  return side?[[i,i+k+1]]:[];
}));
export function numberLayout(kind,config){
  const {rows,cols}=config,fields=config.fields||gridFields(rows,cols,config.blocked),constraints=[],level={kind,rows,cols,fields,givens:{},...config};
  const at=(x,y)=>fields.findIndex(f=>f.x===x&&f.y===y);
  if(kind==='cross'){
    level.maxNumber=config.maxNumber??40;level.domains=fields.map(()=>range(0,level.maxNumber));level.runs=[];
    for(const vertical of [false,true])for(let line=0;line<(vertical?cols:rows);line++){
      let run=[];const finish=()=>{if(run.length>=3){level.runs.push(run);constraints.push({kind:'arithmetic',cells:run,message:'In jeder durchgehenden Reihe muss der Zählschritt gleich bleiben.'});}run=[];};
      for(let pos=0;pos<(vertical?rows:cols);pos++){const i=at(vertical?line:pos,vertical?pos:line);if(i>=0)run.push(i);else finish();}finish();
    }
  }else if(kind==='deka'){
    level.domains=fields.map(()=>range(0,9));level.dots=[];level.neighbors=pairs(fields);
    for(let y=1;y<rows;y++)for(let x=1;x<cols;x++){
      const cells=fields.map((f,i)=>({f,i})).filter(({f})=>f.x<=x&&x<=f.x+f.w&&f.y<=y&&y<=f.y+f.h).map(({i})=>i);
      level.dots.push({x,y,cells});constraints.push({kind:'linear',cells,weights:cells.map(()=>1),target:10,message:'An jedem orangefarbenen Punkt muss die Summe 10 entstehen.'});
    }
    level.neighbors.forEach(cells=>constraints.push({kind:'distinct',cells,message:'Kästchen mit gemeinsamer Seite brauchen verschiedene Ziffern.'}));
  }else if(kind==='sudoku'){
    level.domains=fields.map(()=>range(1,4));level.units=[];
    for(let k=0;k<4;k++)level.units.push(fields.map((f,i)=>({f,i})).filter(({f})=>f.y===k).map(x=>x.i),fields.map((f,i)=>({f,i})).filter(({f})=>f.x===k).map(x=>x.i));
    for(let y=0;y<4;y+=2)for(let x=0;x<4;x+=2)level.units.push(fields.map((f,i)=>({f,i})).filter(({f})=>f.x>=x&&f.x<x+2&&f.y>=y&&f.y<y+2).map(q=>q.i));
    level.units.forEach(cells=>constraints.push({kind:'distinct',cells,required:[1,2,3,4],message:'Jede Zahl muss in Zeile, Spalte und Viererblock genau einmal stehen.'}));
    level.comparisons.forEach(c=>constraints.push({kind:'less',cells:[c.small,c.large],message:'Die offene Seite des Zeichens zeigt zur größeren Zahl.'}));
  }else if(kind==='magic'){
    level.digits=config.digits??cols-1;level.domains=fields.map(()=>range(1,level.digits));level.units=[];
    for(const vertical of [false,true])for(let line=0;line<(vertical?cols:rows);line++){
      const cells=fields.map((f,i)=>({f,i})).filter(({f})=>(vertical?f.x:f.y)===line).map(q=>q.i);level.units.push(cells);
      constraints.push({kind:'distinct',cells,required:range(1,level.digits),message:'Jede erlaubte Ziffer gehört genau einmal in jede Zeile und Spalte.'});
    }
    level.sums=config.sums.map(c=>{let power=1;const cells=[],weights=[];for(let k=(c.vertical?rows:cols)-1;k>=0;k--){const i=at(c.vertical?c.line:k,c.vertical?k:c.line);if(i<0){power=1;continue;}cells.unshift(i);weights.unshift(power);power*=10;}return {...c,cells,weights};});
    level.sums.forEach(c=>constraints.push({kind:'linear',cells:c.cells,weights:c.weights,target:c.target,message:'Benachbarte Ziffern bilden mehrstellige Zahlen; ihre Summe muss zur Randzahl passen.'}));
  }else if(kind==='digit'){
    level.circles=config.circles.map(c=>({...c,cells:[at(c.x-1,c.y-1),at(c.x,c.y-1),at(c.x-1,c.y),at(c.x,c.y)]}));
    const leading=new Set(level.circles.flatMap(c=>[c.cells[0],c.cells[2]]));level.domains=fields.map((_,i)=>range(leading.has(i)?1:0,9));
    level.circles.forEach(c=>constraints.push({kind:'digitDifference',cells:c.cells,target:c.target,message:'Der Kreis nennt den Abstand der beiden zweistelligen Zahlen.'}));
  }else if(kind==='number-path'){
    const cells=fields.map((_,i)=>i),numbers=range(1,fields.length);level.domains=fields.map(()=>numbers);
    constraints.push({kind:'distinct',cells,required:numbers,message:'Jede Zahl von 1 bis zur letzten Zahl gehört genau einmal in den Pfad.'},{kind:'path',cells,message:'Aufeinanderfolgende Zahlen müssen eine gemeinsame Seite haben.'});
  }else throw Error('Unbekanntes Gitter');
  level.constraints=constraints;return level;
}
export function pyramidLayout(height,solution,givens={}){
  const fields=[],triples=[];let start=0,previous=null;
  for(let r=0;r<height;r++){
    const row=[];for(let c=0;c<height-r;c++){const i=fields.length;fields.push({x:r+2*c,y:2*(height-1-r),w:2,h:2});row.push(i);if(previous)triples.push([previous[c],previous[c+1],i]);}
    previous=row;start+=height-r;
  }
  const cells=fields.map((_,i)=>i).filter(i=>!Object.hasOwn(givens,i)),bank=cells.map(i=>solution[i]),choices=[...new Set(bank)].sort((a,b)=>a-b);
  return {kind:'pyramid',height,cols:height*2,rows:height*2,fields,givens,bank,domains:fields.map((_,i)=>Object.hasOwn(givens,i)?[givens[i]]:choices),triples,constraints:[...triples.map(cells=>({kind:'difference',cells,message:'Der obere Stein ist der Abstand der beiden Steine darunter.'})),{kind:'bank',cells,numbers:bank,message:'Nutze jede Zahl aus dem Vorrat genau so oft, wie sie dort steht.'}]};
}
/** Hamilton path oracle for authored number grids; no production propagation. */
export function countNumberPaths(level,limit=2,values=[]){
  const fixed={...level.givens};values.forEach((v,i)=>{if(v!==null&&v!==undefined)fixed[i]=v;});
  const byValue=new Map(Object.entries(fixed).map(([i,v])=>[v,+i])),N=level.fields.length,answers=[],metrics={nodes:0,choices:0};
  if(byValue.size!==Object.keys(fixed).length)return {answers,metrics};
  const neighbor=(i,j)=>Math.abs(level.fields[i].x-level.fields[j].x)+Math.abs(level.fields[i].y-level.fields[j].y)===1,adj=level.fields.map((_,i)=>level.fields.map((_,j)=>j).filter(j=>neighbor(i,j)));
  const used=new Set(),path=[];
  function visit(i,v){metrics.nodes++;if(used.has(i)||fixed[i]&&fixed[i]!==v||byValue.has(v)&&byValue.get(v)!==i)return;
    for(const [later,j] of byValue)if(later>v){const d=Math.abs(level.fields[i].x-level.fields[j].x)+Math.abs(level.fields[i].y-level.fields[j].y);if(d>later-v||(later-v-d)%2)return;}
    used.add(i);path.push(i);if(v===N){const a=Array(N);path.forEach((i,k)=>a[i]=k+1);answers.push(a);}else{
      const options=adj[i].filter(j=>!used.has(j)&&(!fixed[j]||fixed[j]===v+1));if(options.length>1)metrics.choices++;
      for(const j of options){visit(j,v+1);if(answers.length>=limit)break;}
    }path.pop();used.delete(i);
  }
  for(const i of byValue.has(1)?[byValue.get(1)]:level.fields.map((_,i)=>i)){visit(i,1);if(answers.length>=limit)break;}
  return {answers,metrics};
}
