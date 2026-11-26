/** Authoring audit, independent of the game's solver and hidden solution.
 * Tier 0: eliminate fixed peers and use arithmetic min/max bounds on sums.
 * Tier 1: additionally enumerate sum combinations and row/column placements.
 * Tier 2: additionally reject a tentative candidate when tier 1 contradicts it.
 * These are reproducible strategy bands, not measured child difficulty. */
export function reason(level,tier=0){
  const n=level.size,all=Array.from({length:n},(_,i)=>i+1),units=[];
  for(let k=0;k<n;k++)units.push(Array.from({length:n},(_,i)=>k*n+i),Array.from({length:n},(_,i)=>i*n+k));
  const start=Array.from({length:n*n},(_,i)=>new Set(level.givens?.[i]?[level.givens[i]]:all));
  const trace=[];let probes=0;
  const record=(log,step)=>{if(log)(Array.isArray(log)?log:trace).push(step);};
  const clone=d=>d.map(s=>new Set(s));
  function propagate(d,advanced,log){
    let changed=true,bad=false;
    const reduce=(i,allowed,method,scope)=>{const before=[...d[i]],after=before.filter(v=>allowed.has(v));if(after.length===before.length)return;
      d[i]=new Set(after);changed=true;if(!after.length)bad=true;record(log,{method,cell:i,before,after,scope});};
    while(changed&&!bad){changed=false;
      for(const cells of units){
        const fixed=cells.filter(i=>d[i].size===1),seen=new Set();
        for(const i of fixed){const v=[...d[i]][0];if(seen.has(v)){bad=true;record(log,{method:'Doppelte Zahl',scope:cells,number:v,options:cells.map(i=>[...d[i]])});break;}seen.add(v);}
        for(const i of cells)if(d[i].size>1)reduce(i,new Set([...d[i]].filter(v=>!seen.has(v))),'Zeile/Spalte',cells);
        if(bad)break;
      }
      if(bad)break;
      for(const cage of level.cages){if(cage.sum===null)continue;
        const cells=cage.cells,mins=cells.map(i=>Math.min(...d[i])),maxs=cells.map(i=>Math.max(...d[i]));
        const lo=mins.reduce((a,b)=>a+b,0),hi=maxs.reduce((a,b)=>a+b,0);
        if(lo>cage.sum||hi<cage.sum){bad=true;record(log,{method:'Unmögliche Summe',scope:cells,sum:cage.sum,min:lo,max:hi});break;}
        cells.forEach((i,k)=>reduce(i,new Set([...d[i]].filter(v=>lo-mins[k]+v<=cage.sum&&hi-maxs[k]+v>=cage.sum)),'Summengrenzen',cells));
        if(bad)break;
      }
      if(!advanced||bad)continue;
      // Support each candidate with a compatible combination. Distinctness is
      // required only for row/column peers, never for an entire sum cage.
      for(const constraint of [...level.cages.filter(c=>c.sum!==null).map(c=>({...c,method:'Summenkombination'})),...units.map(cells=>({cells,sum:null,method:'Zahlenplätze'}))]){
        const {cells,sum,method}=constraint,allowed=cells.map(()=>new Set()),chosen=[];
        function visit(k,total){
          if(k===cells.length){if(sum===null||total===sum)chosen.forEach((v,j)=>allowed[j].add(v));return;}
          const i=cells[k];for(const v of d[i]){
            if(chosen.some((x,j)=>x===v&&(Math.floor(cells[j]/n)===Math.floor(i/n)||cells[j]%n===i%n)))continue;
            if(sum!==null){const tail=cells.slice(k+1);if(total+v+tail.reduce((a,j)=>a+Math.min(...d[j]),0)>sum||total+v+tail.reduce((a,j)=>a+Math.max(...d[j]),0)<sum)continue;}
            chosen.push(v);visit(k+1,total+v);chosen.pop();
          }
        }visit(0,0);cells.forEach((i,k)=>reduce(i,allowed[k],method,cells));if(bad)break;
      }
    }return !bad;
  }
  let valid=propagate(start,tier>0,true);
  if(valid&&tier>1){let changed=true;while(changed&&start.some(s=>s.size>1)){
    changed=false;
    // A single hypothetical value followed by ordinary propagation. No
    // recursive search and no secret answer are used to discard it.
    for(const i of start.map((s,i)=>({i,count:s.size})).filter(x=>x.count>1).sort((a,b)=>a.count-b.count).map(x=>x.i)){
      for(const v of [...start[i]]){probes++;const test=clone(start);test[i]=new Set([v]);if(!propagate(test,true,false)){
        const proof=[],branch=clone(start);branch[i]=new Set([v]);propagate(branch,true,proof);
        const before=[...start[i]];start[i].delete(v);trace.push({method:'Widerspruch prüfen',cell:i,before,after:[...start[i]],assumption:v,proof});
        changed=true;valid=propagate(start,true,true);break;
      }}if(changed||!valid)break;
    }
  }}
  return {complete:valid&&start.every(s=>s.size===1),valid,filled:start.filter(s=>s.size===1).length,remaining:start.filter(s=>s.size>1).length,values:start.map(s=>s.size===1?[...s][0]:0),options:start.map(s=>[...s]),trace,probes};
}
export function classify(level){
  const basic=reason(level,0),combined=basic.complete?basic:reason(level,1),advanced=combined.complete?combined:reason(level,2);
  const tier=basic.complete?0:combined.complete?1:advanced.complete?2:3;
  return {tier,band:['Entdecker','Tüftler','Knobelmeister','Noch nicht eingeordnet'][tier],basicFilled:basic.filled,combinedFilled:combined.filled,advancedFilled:advanced.filled,combinationSteps:combined.trace.filter(x=>['Summenkombination','Zahlenplätze'].includes(x.method)).length,contradictions:advanced.trace.filter(x=>x.method==='Widerspruch prüfen').length,probes:advanced.probes};
}
