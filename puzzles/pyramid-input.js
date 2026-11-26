import {numberLogicModel} from './number-logic.js?v=0.14.0-release-2';
const fixed=(l,i)=>Object.hasOwn(l.givens||{},i);
export function pyramidTokens(l,b){
 const used=b.values.filter((v,i)=>!fixed(l,i)&&v!==null);
 return l.bank.map((value,index)=>({value,index})).filter(t=>{const i=used.indexOf(t.value);if(i<0)return true;used.splice(i,1);return false;});
}
export const pyramidModel={...numberLogicModel,applyInput(l,b,a){
 if(a.kind!=='token')return numberLogicModel.applyInput(l,b,a);
 const next=numberLogicModel.normalizeBoard(l,b),from=a.from;
 const source=Number.isInteger(from)&&!!l.fields[from]&&!fixed(l,from);
 const value=source?next.values[from]:pyramidTokens(l,next).find(t=>t.index===a.token)?.value;
 if(value===null||value===undefined)return next;
 if(a.cell===null){if(source){next.values[from]=null;next.notes[from]=[];}return next;}
 if(!Number.isInteger(a.cell)||!l.fields[a.cell]||fixed(l,a.cell)||!l.domains[a.cell].includes(value)||from===a.cell)return next;
 const displaced=next.values[a.cell];
 if(source&&displaced!==null&&!l.domains[from].includes(displaced))return next;
 next.values[a.cell]=value;next.notes[a.cell]=[];
 if(source){next.values[from]=displaced;next.notes[from]=[];}
 return next;
}};
// Pointer capture keeps a drag intact even when it leaves the source button.
// Click / Enter / Space offer the same selection-and-placement path without dragging.
export function bindPyramidInput(root,{current,apply,select}){
 let chosen=null,drag=null,suppressUntil=0;
 const enabled=()=>current()?.level.kind==='pyramid';
 const source=el=>el?.closest('[data-pyramid-token],[data-pyramid-cell][data-filled]');
 const action=el=>el.hasAttribute('data-pyramid-token')?{token:+el.dataset.pyramidToken}:{from:+el.dataset.pyramidCell};
 function clear(){root.querySelectorAll('.token-selected').forEach(el=>{el.classList.remove('token-selected');el.setAttribute('aria-pressed','false');});chosen=null;}
 function choose(el){clear();chosen={...action(el),element:el};el.classList.add('token-selected');el.setAttribute('aria-pressed','true');}
 function place(el,src){const target=el?.closest('[data-pyramid-cell],[data-pyramid-bank]');if(!target||!root.contains(target)||target.disabled)return false;const cell=target.hasAttribute('data-pyramid-cell')?+target.dataset.pyramidCell:null;clear();apply({kind:'token',...src,cell});return true;}
 function cleanDrag(){if(!drag)return;drag.ghost?.remove();root.querySelectorAll('.token-drop-target').forEach(el=>el.classList.remove('token-drop-target'));if(root.hasPointerCapture?.(drag.id))root.releasePointerCapture(drag.id);drag=null;}
 root.addEventListener('pointerdown',e=>{suppressUntil=0;if(!enabled()||e.button!==0)return;const el=source(e.target);if(!el||el.disabled)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,el,src:action(el)};root.setPointerCapture(e.pointerId);});
 root.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;if(!drag.ghost&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;e.preventDefault();if(!drag.ghost){clear();drag.ghost=root.ownerDocument.createElement('div');drag.ghost.className='pyramid-drag-ghost';drag.ghost.textContent=drag.el.textContent;drag.ghost.setAttribute('aria-hidden','true');root.ownerDocument.body.append(drag.ghost);}drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';root.querySelectorAll('.token-drop-target').forEach(el=>el.classList.remove('token-drop-target'));const target=root.ownerDocument.elementFromPoint(e.clientX,e.clientY)?.closest('[data-pyramid-cell],[data-pyramid-bank]');if(target&&root.contains(target)&&!target.disabled)target.classList.add('token-drop-target');});
 root.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.id)return;const d=drag,target=root.ownerDocument.elementFromPoint(e.clientX,e.clientY);cleanDrag();if(d.ghost){suppressUntil=Date.now()+400;place(target,d.src);}else if(enabled()){suppressUntil=Date.now()+400;if(chosen&&chosen.element!==d.el)place(d.el,chosen);else choose(d.el);}});
 root.addEventListener('pointercancel',cleanDrag);
 root.addEventListener('lostpointercapture',cleanDrag);
 root.addEventListener('click',e=>{if(!enabled())return;if(e.target===root&&Date.now()<suppressUntil){e.stopImmediatePropagation();return;}const el=e.target.closest('[data-pyramid-token],[data-pyramid-cell],[data-pyramid-bank]');if(!el){clear();return;}e.stopImmediatePropagation();if(el.disabled)return;if(chosen&&!root.contains(chosen.element))clear();if(chosen&&chosen.element!==el&&place(el,chosen))return;const src=source(el);if(src)choose(src);});
 root.addEventListener('focusin',e=>{if(enabled()&&e.target.hasAttribute('data-pyramid-cell'))select(+e.target.dataset.pyramidCell);});
 root.addEventListener('keydown',e=>{if(enabled()&&e.key==='Escape'){clear();cleanDrag();}});
}
