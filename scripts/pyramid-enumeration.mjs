// Independent authoring oracle: enumerate bottom rows, derive every upper stone.
// Receives only the height, visible clues and multiset of available numbers.
export function countPyramidCompletions(height,givens,bank,{limit=2,maxNodes=2000000}={}){
 const size=height*(height+1)/2,starts=[];let start=0;
 for(let row=0;row<height;row++){starts.push(start);start+=height-row;}
 if(!Number.isInteger(height)||height<2||bank.length+Object.keys(givens).length!==size)throw Error('Invalid pyramid inventory');
 const stock=new Map();for(const v of bank){if(!Number.isInteger(v)||v<0)throw Error('Invalid stock');stock.set(v,(stock.get(v)||0)+1);}
 for(const [i,v]of Object.entries(givens))if(!Number.isInteger(+i)||+i<0||+i>=size||!Number.isInteger(v)||v<0)throw Error('Invalid clue');
 const values=Array(size),answers=[];let nodes=0;
 function visit(column){
  if(++nodes>maxNodes)throw Error('Pyramid enumeration exhausted');
  const options=Object.hasOwn(givens,column)?[givens[column]]:[...stock.keys()].filter(v=>stock.get(v)>0).sort((a,b)=>a-b);
  for(const bottom of options){
   const changed=[],consumed=[];let valid=true;
   for(let row=0;row<=column;row++){
    const position=column-row,index=starts[row]+position;
    const value=row===0?bottom:Math.abs(values[starts[row-1]+position]-values[starts[row-1]+position+1]);
    if(Object.hasOwn(givens,index)){if(givens[index]!==value){valid=false;break;}}
    else {if(!(stock.get(value)>0)){valid=false;break;}stock.set(value,stock.get(value)-1);consumed.push(value);}
    values[index]=value;changed.push(index);
   }
   if(valid){if(column===height-1){if([...stock.values()].some(n=>n!==0))throw Error('Inventory accounting');answers.push([...values]);}else visit(column+1);}
   for(const i of changed)values[i]=undefined;for(const v of consumed)stock.set(v,stock.get(v)+1);
   if(answers.length>=limit)return;
  }
 }
 visit(0);return {answers,nodes,exhaustive:answers.length<limit};
}
export function pyramidFromBottom(bottom){
 const rows=[[...bottom]];while(rows.at(-1).length>1){const last=rows.at(-1);rows.push(last.slice(1).map((v,i)=>Math.abs(last[i]-v)));}return rows.flat();
}
export function pyramidClues(solution,indices){return Object.fromEntries(indices.map(i=>[i,solution[i]]));}
export function pyramidBank(solution,indices){const given=new Set(indices);return solution.filter((_,i)=>!given.has(i));}
export function combinations(size,count){
 const out=[];function next(chosen,start){if(chosen.length===count){out.push(chosen);return;}for(let i=start;i<=size-(count-chosen.length);i++)next([...chosen,i],i+1);}next([],0);return out;
}
