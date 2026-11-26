import {writeFile} from 'node:fs/promises';
import {pieceCells,placementCells} from '../puzzles/geometry-logic.js';
let seed=2026100717;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},shuffle=a=>[...a].sort(()=>rnd()-.5),range=n=>Array.from({length:n},(_,i)=>i);
const adj=(l,i)=>range(l.rows*l.cols).filter(j=>!l.blocked.includes(j)&&Math.abs(j%l.cols-i%l.cols)+Math.abs(Math.floor(j/l.cols)-Math.floor(i/l.cols))===1);
function mazeCount(l,limit=2){const answers=[],path=[l.start],used=new Set(path),total=l.rows*l.cols-l.blocked.length;let nodes=0,choices=0;
 function dfs(){nodes++;const i=path.at(-1);if(i===l.end){if(path.length===total)answers.push([...path]);return;}let next=adj(l,i).filter(j=>!used.has(j));
 if(l.turns[i]&&path.length>1){const prev=path.at(-2),dx=i%l.cols-prev%l.cols,dy=Math.floor(i/l.cols)-Math.floor(prev/l.cols);next=next.filter(j=>{const cross=dx*(Math.floor(j/l.cols)-Math.floor(i/l.cols))-dy*(j%l.cols-i%l.cols);return l.turns[i]==='L'?cross===-1:cross===1;});}
 if(next.length>1)choices++;for(const j of next){used.add(j);path.push(j);dfs();path.pop();used.delete(j);if(answers.length>=limit)return;}}
 dfs();return {answers,nodes,choices};}
function route(l){for(const start of shuffle(range(l.rows*l.cols).filter(i=>!l.blocked.includes(i)))){const path=[start],used=new Set(path);function dfs(){if(path.length===l.rows*l.cols-l.blocked.length)return true;for(const j of shuffle(adj(l,path.at(-1))).filter(i=>!used.has(i))){path.push(j);used.add(j);if(dfs())return true;path.pop();used.delete(j);}return false;}if(dfs())return path;}return null;}
const mazes=[];for(let tier=0;tier<3;tier++)for(let k=0;k<2;k++){
 const n=tier+3,l={rows:n,cols:n,blocked:k===1?(n%2?[0]:[0,n-1]):[],turns:{}};let path;
 for(let tries=0;tries<100;tries++){path=route(l);if(!path)throw Error('Kein Labyrinthpfad');l.start=path[0];l.end=path.at(-1);l.turns={};
 for(let j=1;j<path.length-1;j++){const a=path[j-1],b=path[j],c=path[j+1],cross=(b%n-a%n)*(Math.floor(c/n)-Math.floor(b/n))-(Math.floor(b/n)-Math.floor(a/n))*(c%n-b%n);if(cross)l.turns[b]=cross<0?'L':'R';}
 if(mazeCount(l).answers.length===1)break;}
 if(mazeCount(l).answers.length!==1)throw Error('Kein eindeutiges Labyrinth');
 for(const i of shuffle(Object.keys(l.turns))){const old=l.turns[i];delete l.turns[i];if(mazeCount(l).answers.length!==1)l.turns[i]=old;}
 const metric=mazeCount(l);mazes.push({...l,id:`maze-${tier*2+k+1}`,band:['Entdecker','Tüftler','Knobelmeister'][tier],reward:[10,15,25][tier],solution:path,metrics:{free:path.length,letters:Object.keys(l.turns).length,nodes:metric.nodes,choices:metric.choices,solutions:metric.answers.length}});
}
function partition(l,size){let remaining=new Set(range(l.rows*l.cols).filter(i=>!l.blocked.includes(i))),pieces=[];
 while(remaining.size){const cells=[shuffle([...remaining])[0]];while(cells.length<size){const next=shuffle([...new Set(cells.flatMap(i=>adj(l,i)))].filter(i=>remaining.has(i)&&!cells.includes(i)))[0];if(next===undefined)return null;cells.push(next);}cells.forEach(i=>remaining.delete(i));const minX=Math.min(...cells.map(i=>i%l.cols)),minY=Math.min(...cells.map(i=>Math.floor(i/l.cols)));pieces.push({label:String.fromCharCode(65+pieces.length),cells:cells.map(i=>[i%l.cols-minX,Math.floor(i/l.cols)-minY]),original:cells});}return pieces;}
function polyCount(l,limit=2){const target=new Set(range(l.rows*l.cols).filter(i=>!l.blocked.includes(i))),options=l.pieces.map(p=>{const seen=new Set(),a=[];for(const flip of [false,true])for(let turn=0;turn<4;turn++)for(const anchor of target){const v={anchor,turn,flip},cells=placementCells(l,p,v),key=[...cells].sort((a,b)=>a-b).join(',');if(cells.every(i=>target.has(i))&&!seen.has(key)){seen.add(key);a.push({v,cells});}}return a;});const answers=[],used=new Set(),placed=Array(l.pieces.length).fill(null);let nodes=0,choices=0;
 function dfs(){nodes++;if(used.size===target.size){answers.push(structuredClone(placed));return;}const candidates=[...target].filter(i=>!used.has(i)).map(cell=>({cell,list:options.flatMap((a,p)=>placed[p]?[]:a.filter(o=>o.cells.includes(cell)&&o.cells.every(i=>!used.has(i))).map(o=>({...o,p})))})).sort((a,b)=>a.list.length-b.list.length)[0].list;if(candidates.length>1)choices++;for(const o of candidates){placed[o.p]=o.v;o.cells.forEach(i=>used.add(i));dfs();o.cells.forEach(i=>used.delete(i));placed[o.p]=null;if(answers.length>=limit)return;}}
 dfs();return {answers,nodes,choices,placements:options.map(a=>a.length)};
}
const polys=[];for(let tier=0;tier<3;tier++)for(let k=0;k<2;k++){
 const l=tier===0?(k===0?{rows:2,cols:3,blocked:[]}:{rows:3,cols:3,blocked:[4]}):tier===1?{rows:3,cols:4,blocked:[]}:(k===0?{rows:4,cols:4,blocked:[]}:{rows:4,cols:5,blocked:[0,4,15,19]});let pieces,metric;for(let tries=0;tries<10000;tries++){pieces=partition(l,tier===0&&k===0?3:4);if(!pieces)continue;l.pieces=pieces.map(({original,...p})=>p);
 const shapes=new Set(l.pieces.map(p=>{const variants=[];for(const flip of [false,true])for(let t=0;t<4;t++)variants.push(JSON.stringify(pieceCells(p,t,flip)));return variants.sort()[0];}));
 if(tier===2&&shapes.size<3||tier===1&&shapes.size<2)continue;metric=polyCount(l);if(!metric.answers.length||tier===2&&metric.nodes<16)continue;break;}
 if(!metric?.answers.length||tier===2&&metric.nodes<16)throw Error('Keine passende Polyomino-Aufteilung');
 polys.push({...l,id:`poly-${tier*2+k+1}`,band:['Entdecker','Tüftler','Knobelmeister'][tier],reward:[10,15,25][tier],solution:metric.answers[0],metrics:{pieces:pieces.length,nodes:metric.nodes,choices:metric.choices,solutionsAtLeast:metric.answers.length,placements:metric.placements}});
}
await writeFile(new URL('../puzzles/geometry-levels.js',import.meta.url),`// Own geometry puzzles, seed 2026100717.\nexport const mazeLevels = ${JSON.stringify(mazes,null,2)};\nexport const polyLevels = ${JSON.stringify(polys,null,2)};\n`);
await writeFile(new URL('../docs/geometry-pack-audit.json',import.meta.url),JSON.stringify({mazes:mazes.map(l=>({id:l.id,...l.metrics})),polys:polys.map(l=>({id:l.id,...l.metrics}))},null,2)+'\n');
console.log(mazes.map(l=>l.metrics),polys.map(l=>l.metrics));
