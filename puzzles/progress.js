const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function createPuzzleProgress(registry,{saved={},save=()=>{},access='free'}={}){
  const records={};let selection=null;
  for(const type of registry.list()){
    records[type.id]={};
    for(const level of [...type.levels,...(type.retiredLevels||[])]){const raw=saved?.types?.[type.id]?.[level.id];if(!raw)continue;
      const board=type.model.normalizeBoard(level,raw.board),completed=raw.completed===true&&type.model.inspect(level,type.model.normalizeBoard(level,raw.solvedBoard)).complete;
      records[type.id][level.id]={board,completed,solvedBoard:completed?type.model.normalizeBoard(level,raw.solvedBoard):null,history:(Array.isArray(raw.history)?raw.history.slice(-60):[]).map(x=>type.model.normalizeBoard(level,x))};
    }
  }
  const snapshot=()=>structuredClone({version:1,types:records,last:selection});
  const persist=()=>save(snapshot());
  function unlocked(typeId,levelId){const type=registry.get(typeId),i=type?.levels.findIndex(x=>x.id===levelId)??-1;return i>=0&&(access==='free'||i===0||records[typeId]?.[type.levels[i-1].id]?.completed===true);}
  function select(typeId,levelId){if(!unlocked(typeId,levelId))return false;selection={typeId,levelId};const type=registry.get(typeId),level=registry.level(typeId,levelId);records[typeId]??={};records[typeId][levelId]??={board:type.model.initialBoard(level),completed:false,solvedBoard:null,history:[]};persist();return true;}
  function current(){if(!selection)return null;const {typeId,levelId}=selection,type=registry.get(typeId),level=registry.level(typeId,levelId);return {type,level,...structuredClone(records[typeId][levelId])};}
  function change(action){const s=current();if(!s)return false;const record=records[s.type.id][s.level.id],next=s.type.model.applyInput(s.level,record.board,action);if(same(next,record.board))return false;if(s.type.model.historyFor?.(action)!==false){record.history.push(structuredClone(record.board));record.history=record.history.slice(-60);}record.board=next;persist();return true;}
  function undo(){const s=current(),r=s&&records[s.type.id][s.level.id];if(!r?.history.length)return false;r.board=r.history.pop();persist();return true;}
  function reset(){const s=current();if(!s)return false;const r=records[s.type.id][s.level.id];r.history.push(structuredClone(r.board));r.history=r.history.slice(-60);r.board=s.type.model.initialBoard(s.level);persist();return true;}
  function finish(){const s=current();if(!s)return {complete:false,reward:0};const result=s.type.model.inspect(s.level,s.board);if(!result.complete)return {...result,reward:0};const r=records[s.type.id][s.level.id],reward=r.completed?0:s.level.reward;r.completed=true;r.solvedBoard=structuredClone(r.board);persist();return {...result,reward};}
  function totals(typeId){const types=typeId?[registry.get(typeId)].filter(Boolean):registry.list();let completed=0,coins=0;for(const t of types){for(const l of t.levels)if(records[t.id]?.[l.id]?.completed){completed++;coins+=l.reward;}for(const l of t.retiredLevels||[])if(records[t.id]?.[l.id]?.completed)coins+=l.reward;}return {completed,coins};}
  function record(typeId,levelId){return structuredClone(records[typeId]?.[levelId]||null);}
  const last=saved?.last;if(last&&registry.level(last.typeId,last.levelId))select(last.typeId,last.levelId);
  return {select,current,change,undo,reset,finish,snapshot,record,totals,unlocked};
}
