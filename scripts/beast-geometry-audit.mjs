// Authoring/test oracle. No imports from the game's placement or path model.
const range=n=>Array.from({length:n},(_,i)=>i);
export function auditMaze(l,limit=2){
 const free=new Set(range(l.rows*l.cols).filter(i=>!l.blocked.includes(i))),answers=[],path=[l.start],used=new Set(path);let nodes=0;
 const adjacent=i=>[i-l.cols,i+l.cols,i-1,i+1].filter(j=>free.has(j)&&Math.abs(j%l.cols-i%l.cols)+Math.abs(Math.floor(j/l.cols)-Math.floor(i/l.cols))===1);
 function visit(){if(++nodes>2000000)throw Error('Maze audit exhausted');const i=path.at(-1);
  if(i===l.end){if(used.size===free.size)answers.push([...path]);return;}
  let next=adjacent(i).filter(j=>!used.has(j));
  if(l.turns[i]&&path.length>1){const a=path.at(-2),dx=i%l.cols-a%l.cols,dy=Math.floor(i/l.cols)-Math.floor(a/l.cols),v=l.turns[i]==='L'?[dy,-dx]:[-dy,dx];next=next.filter(j=>j%l.cols-i%l.cols===v[0]&&Math.floor(j/l.cols)-Math.floor(i/l.cols)===v[1]);}
  for(const j of next){path.push(j);used.add(j);visit();used.delete(j);path.pop();if(answers.length>=limit)return;}
 }visit();return {answers,nodes};
}
export function auditPoly(l,limit=2){
 const free=new Set(range(l.rows*l.cols).filter(i=>!l.blocked.includes(i))),options=l.pieces.map(p=>{const seen=new Set(),out=[];
  for(const flip of [false,true])for(let turn=0;turn<4;turn++){
   let shape=p.cells.map(([x,y])=>[flip?-x:x,y]);for(let k=0;k<turn;k++)shape=shape.map(([x,y])=>[-y,x]);
   const mx=Math.min(...shape.map(c=>c[0])),my=Math.min(...shape.map(c=>c[1]));shape=shape.map(([x,y])=>[x-mx,y-my]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
   for(let y=0;y<l.rows;y++)for(let x=0;x<l.cols;x++){
    if(shape.some(([dx,dy])=>x+dx>=l.cols||y+dy>=l.rows))continue;
    const cells=shape.map(([dx,dy])=>(y+dy)*l.cols+x+dx).sort((a,b)=>a-b),key=cells.join(',');
    if(cells.every(c=>free.has(c))&&!seen.has(key)){seen.add(key);out.push({cells,placement:{anchor:(y+shape[0][1])*l.cols+x+shape[0][0],turn,flip}});}
   }
  }return out;
 }),answers=[],occupied=new Set(),placed=Array(l.pieces.length).fill(null);let nodes=0;
 function search(){if(++nodes>2000000)throw Error('Polyomino audit exhausted');if(occupied.size===free.size){answers.push(structuredClone(placed));return;}
  const candidates=[...free].filter(c=>!occupied.has(c)).map(c=>options.flatMap((os,i)=>placed[i]?[]:os.filter(o=>o.cells.includes(c)&&o.cells.every(c=>!occupied.has(c))).map(o=>({...o,i})))).sort((a,b)=>a.length-b.length)[0];
  for(const o of candidates){placed[o.i]=o.placement;o.cells.forEach(c=>occupied.add(c));search();o.cells.forEach(c=>occupied.delete(c));placed[o.i]=null;if(answers.length>=limit)return;}
 }search();return {answers,nodes,placements:options.map(os=>os.length)};
}
// Full rank over a prime implies full rank over the rationals. The integer
// solution is separately checked, so uniqueness does not depend on a range.
export function crossRank(l){
 const n=l.fields.length,at=new Map(l.fields.map((f,i)=>[`${f.x},${f.y}`,i])),rows=[],prime=1000003n;
 const mod=x=>(x%prime+prime)%prime;
 for(const f of l.fields)for(const [dx,dy]of [[1,0],[0,1]]){
  const cells=range(3).map(k=>at.get(`${f.x+k*dx},${f.y+k*dy}`));if(cells.some(i=>i===undefined))continue;
  const r=Array(n).fill(0n);cells.forEach((i,k)=>r[i]=BigInt(k===1?-2:1));rows.push(r);
 }
 for(const i of Object.keys(l.givens)){const r=Array(n).fill(0n);r[+i]=1n;rows.push(r);}
 function power(a,b){let v=1n;for(;b;b/=2n,a=mod(a*a))if(b%2n)v=mod(v*a);return v;}
 let rank=0;
 for(let c=0;c<n;c++){const hit=rows.findIndex((r,i)=>i>=rank&&mod(r[c])!==0n);if(hit<0)continue;
  [rows[rank],rows[hit]]=[rows[hit],rows[rank]];const inverse=power(mod(rows[rank][c]),prime-2n);rows[rank]=rows[rank].map(x=>mod(x*inverse));
  for(let i=rank+1;i<rows.length;i++){const v=mod(rows[i][c]);if(v)rows[i]=rows[i].map((x,k)=>mod(x-v*rows[rank][k]));}rank++;
 }return {rank,cells:n,rangeIndependent:rank===n};
}
