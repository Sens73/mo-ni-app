// Row-major Latin enumeration, independent of the game's solver and answer.
export function countSundaySumdoku(level,limit=2){
 const n=level.size,values=Array(n*n).fill(0),rows=Array.from({length:n},()=>new Set()),cols=Array.from({length:n},()=>new Set()),answers=[];
 const cageAt=Array(n*n);level.cages.forEach((c,k)=>c.cells.forEach(i=>cageAt[i]=k));
 const sums=level.cages.map(()=>0),remaining=level.cages.map(c=>c.cells.length);
 let nodes=0;
 function visit(i){if(++nodes>2000000)throw Error('Sumdoku search exhausted');if(i===n*n){answers.push([...values]);return;}
  const r=Math.floor(i/n),c=i%n,k=cageAt[i],target=level.cages[k].sum;
  for(let v=1;v<=n;v++){
   if(level.givens[i]&&level.givens[i]!==v||rows[r].has(v)||cols[c].has(v))continue;
   const sum=sums[k]+v,left=remaining[k]-1;if(target!==null&&(sum+left>target||sum+left*n<target))continue;
   values[i]=v;rows[r].add(v);cols[c].add(v);sums[k]+=v;remaining[k]--;visit(i+1);values[i]=0;rows[r].delete(v);cols[c].delete(v);sums[k]-=v;remaining[k]++;if(answers.length>=limit)return;
  }
 }visit(0);return {answers,nodes};
}
