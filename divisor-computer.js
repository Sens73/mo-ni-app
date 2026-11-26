import {hasLegalMove, isPrime} from './divisor-game.js?v=0.14.0-release-2';

export const EXACT_CARD_LIMIT = 1000;
const related = (a,b) => a % b === 0 || b % a === 0;
const pick = (items, random) => items[Math.min(items.length - 1, Math.floor(random() * items.length))];

// Edmonds' blossom algorithm for maximum cardinality matching in an undirected
// graph. Adjacency lists contain zero-based indices; -1 denotes an unmatched vertex.
// The game reduction is documented in docs/COMPUTERSPIELER-2026-10-19.md.
export function maximumMatching(graph) {
  const n = graph.length, match = Array(n).fill(-1), parent = Array(n), base = Array(n);
  const used = Array(n), blossom = Array(n);
  function lca(a,b) {
    const seen = Array(n).fill(false);
    for (;;) { a = base[a]; seen[a] = true; if (match[a] === -1) break; a = parent[match[a]]; }
    for (;;) { b = base[b]; if (seen[b]) return b; b = parent[match[b]]; }
  }
  function markPath(v,b,child) {
    while (base[v] !== b) {
      blossom[base[v]] = blossom[base[match[v]]] = true;
      parent[v] = child; child = match[v]; v = parent[match[v]];
    }
  }
  function augment(root) {
    used.fill(false); parent.fill(-1);
    for (let i=0;i<n;i++) base[i]=i;
    const queue=[root]; used[root]=true;
    for (let head=0;head<queue.length;head++) {
      const v=queue[head];
      for (const u of graph[v]) {
        if (base[v] === base[u] || match[v] === u) continue;
        if (u === root || (match[u] !== -1 && parent[match[u]] !== -1)) {
          const b=lca(v,u); blossom.fill(false); markPath(v,b,u); markPath(u,b,v);
          for (let i=0;i<n;i++) if (blossom[base[i]]) {
            base[i]=b; if (!used[i]) { used[i]=true; queue.push(i); }
          }
        } else if (parent[u] === -1) {
          parent[u]=v;
          if (match[u] === -1) {
            let current=u;
            while (current !== -1) {
              const previous=parent[current], next=previous === -1 ? -1 : match[previous];
              match[current]=previous; if (previous !== -1) match[previous]=current; current=next;
            }
            return;
          }
          used[match[u]]=true; queue.push(match[u]);
        }
      }
    }
  }
  for (let v=0;v<n;v++) if (match[v] === -1) augment(v);
  return match;
}
const matchingSize = graph => maximumMatching(graph).filter(v=>v!==-1).length / 2;
function withoutVertex(graph,index) {
  return graph.filter((_,i)=>i!==index).map(edges=>edges.filter(v=>v!==index).map(v=>v>index?v-1:v));
}
export function divisibilityGraph(values) {
  const graph=values.map(()=>[]);
  for (let i=0;i<values.length;i++) for (let j=i+1;j<values.length;j++) if (related(values[i],values[j])) { graph[i].push(j); graph[j].push(i); }
  return graph;
}
// Starting with the last played vertex, the next player wins iff deleting it
// reduces the maximum matching size. Choosing its mate is then a winning move.
export function exactMove({count,moves},random=Math.random) {
  const used=new Set(moves), last=moves.at(-1);
  const values=Array.from({length:count},(_,i)=>i+1).filter(v=>!used.has(v)||v===last);
  const graph=divisibilityGraph(values), matching=maximumMatching(graph);
  const size=matching.filter(v=>v!==-1).length/2;
  if (!moves.length) {
    // The opening itself counts as a turn; an uncovered even vertex wins.
    const openings=values.map((v,i)=>v%2===0?i:-1).filter(i=>i!==-1);
    for (const i of openings) if (matchingSize(withoutVertex(graph,i)) === size) return {value:values[i],winning:true,exact:true};
    return {value:values[pick(openings,random)],winning:false,exact:true};
  }
  const index=values.indexOf(last), legal=graph[index];
  if (!legal.length) return {value:null,winning:false,exact:true};
  if (matchingSize(withoutVertex(graph,index)) < size) return {value:values[matching[index]],winning:true,exact:true};
  return {value:values[pick(legal,random)],winning:false,exact:true};
}

// Exact integer factorization keeps sparse late positions with very large card
// numbers playable without scanning 1..N or up to sqrt(N). All inputs are <2^53.
const gcd=(a,b)=>{while(b){const t=a%b;a=b;b=t;}return a;};
function factor(value,answer=[]) {
  if (value===1) return answer;
  if (isPrime(value)) {answer.push(value);return answer;}
  if (value%2===0) {answer.push(2);return factor(value/2,answer);}
  const n=BigInt(value);
  for (let c=1n;;c++) {
    let x=2n,y=2n,d=1n;
    const step=v=>(v*v+c)%n;
    for(let tries=0;d===1n&&tries<200000;tries++) {x=step(x);y=step(step(y));d=gcd(x>y?x-y:y-x,n);}
    if(d>1n&&d<n){factor(Number(d),answer);factor(value/Number(d),answer);return answer;}
  }
}
function divisors(value) {
  const factors=factor(value).sort((a,b)=>a-b), powers=new Map();
  for(const p of factors)powers.set(p,(powers.get(p)||0)+1);
  let answer=[1];
  for(const [p,exponent] of powers){const prior=[...answer];let power=1;for(let e=1;e<=exponent;e++){power*=p;answer.push(...prior.map(v=>v*power));}}
  return answer;
}
// Complete move lists for ordinary sets; bounded representative lists for huge
// sets. Every returned card is genuinely legal. No suggestions leave this module.
export function legalCards({count,moves},random=Math.random,limit=256) {
  const used=new Set(moves),last=moves.at(-1),answer=new Set();
  const add=v=>{if(Number.isSafeInteger(v)&&v>=1&&v<=count&&!used.has(v)&&(!last?v%2===0:related(v,last)))answer.add(v);};
  if(count<=EXACT_CARD_LIMIT){for(let v=1;v<=count;v++)add(v);return [...answer];}
  if(!last){
    for(let i=0;i<limit;i++)add(2*(1+Math.floor(random()*Math.floor(count/2))));
    add(2); return [...answer];
  }
  for(const v of divisors(last))add(v);
  const multipleCount=Math.floor(count/last);
  if(multipleCount<=limit+used.size){for(let k=1;k<=multipleCount;k++)add(k*last);}
  else {
    for(let i=0;i<limit;i++)add((1+Math.floor(random()*multipleCount))*last);
    // At least one among |used|+1 different multiples is unplayed.
    for(let k=1;k<=used.size+1;k++)add(k*last);
  }
  return [...answer];
}
function mediumMove(state,random,{budget=10000,maxDepth=4,milliseconds=120}={}) {
  let nodes=0;
  const deadline=performance.now()+milliseconds, stop={};
  const choices=legalCards(state,random), memo=new Map();
  function score(moves,depth) {
    if(!hasLegalMove(state.count,moves))return -10000-depth;
    if(depth===0)return 0;
    if(++nodes>budget||performance.now()>deadline)throw stop;
    const key=depth+':'+moves.at(-1)+':'+[...moves].sort((a,b)=>a-b).join(',');
    if(memo.has(key))return memo.get(key);
    let best=-Infinity;
    for(const value of legalCards({count:state.count,moves},random,24)) {
      best=Math.max(best,-score([...moves,value],depth-1));if(best>1000)break;
    }
    memo.set(key,best);return best;
  }
  let scored=choices.map(value=>({value,score:hasLegalMove(state.count,[...state.moves,value])?0:10000}));
  // Complete shallow passes before attempting deeper ones; exhausting the budget
  // must never make a later candidate look better merely because it was skipped.
  for(let depth=2;depth<=maxDepth;depth++) {
    try {const pass=choices.map(value=>({value,score:-score([...state.moves,value],depth-1)}));scored=pass;}
    catch(error){if(error!==stop)throw error;break;}
  }
  const best=Math.max(...scored.map(item=>item.score));
  return {value:scored.length?pick(scored.filter(item=>item.score===best),random).value:null,exact:false};
}
export function chooseComputerMove(state,difficulty='medium',random=Math.random) {
  if (state.finished) return {value:null,exact:false};
  if (difficulty==='strong' && state.count<=EXACT_CARD_LIMIT) return exactMove(state,random);
  const choices=legalCards(state,random);
  if (!choices.length) return {value:null,exact:false};
  if (difficulty==='easy') return {value:pick(choices,random),exact:false};
  return mediumMove(state,random,difficulty==='strong'?{budget:40000,maxDepth:6,milliseconds:350}:undefined);
}
