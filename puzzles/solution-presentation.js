// Sonntagsrätsel 02: PathGray D6D6DE, solutionpath 5.2pt.
// Cell sizes in the original solution sheet: .70/.70/.58/.58/.72cm.
export const SOLUTION_HOLD_MS = 3000;
export const PATH_STEP_MS = 350;
export const PATH_COLOR = '#D6D6DE';
export function numberPathGeometry(level, board) {
  if (level.kind !== 'number-path') return null;
  const order = Array.from({length:level.fields.length}, (_,i)=>board.values.indexOf(i+1));
  if (order.some(i=>i<0)) return null;
  const points = order.map(i=>{const f=level.fields[i];return [(f.x+f.w/2)*100,(f.y+f.h/2)*100];});
  if (points.slice(1).some((p,i)=>Math.abs(p[0]-points[i][0])+Math.abs(p[1]-points[i][1])!==100)) return null;
  const cellCm=level.origin==='sunday'?[.70,.70,.58,.58,.72][level.number-1]??.69:.69;
  return {points,order,d:points.map((p,i)=>`${i?'L':'M'}${p.join(' ')}`).join(' '),
    width:5.2/(cellCm*72.27/2.54)*100,duration:(points.length-1)*PATH_STEP_MS};
}
export function solutionDuration(level, board, {reduceMotion=false}={}) {
  return (reduceMotion?0:numberPathGeometry(level,board)?.duration??0)+SOLUTION_HOLD_MS;
}
