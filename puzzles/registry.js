/** New types provide their own model, rendering and levels; the shell owns progress. */
export function createPuzzleRegistry(initial=[]){
  const entries=new Map();
  const register=type=>{
    if(!type||!/^[-a-z0-9]+$/.test(type.id)||entries.has(type.id)||!type.title||!Array.isArray(type.levels)||(!type.levels.length&&!type.retiredLevels?.length))throw Error('Ungültiger oder doppelter Rätseltyp');
    for(const key of ['initialBoard','normalizeBoard','applyInput','inspect','hint'])if(typeof type.model?.[key]!=='function')throw Error(`Rätseltyp benötigt ${key}`);
    if(typeof type.renderBoard!=='function'||typeof type.renderInput!=='function')throw Error('Rätseltyp benötigt eine Darstellung');
    const ids=new Set();for(const level of type.levels){if(!level.id||ids.has(level.id)||!Number.isSafeInteger(level.reward)||level.reward<0)throw Error('Doppelte Levelkennung');ids.add(level.id);type.model.validateLevel?.(level);}
    entries.set(type.id,type);return type;
  };
  const registry={register,list:()=>[...entries.values()],get:id=>entries.get(id),level:(typeId,levelId)=>entries.get(typeId)?.levels.find(x=>x.id===levelId)};
  initial.forEach(register);return registry;
}
