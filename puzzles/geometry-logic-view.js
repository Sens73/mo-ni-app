import {polyModel,mazeModel,pieceCells,placementCells,polyFeedback,mazeFeedback} from './geometry-logic.js?v=0.14.0-release-2';
import {polyLevels,mazeLevels} from './geometry-levels.js?v=0.14.0-release-2';
import {beastPolyLevels,beastMazeLevels} from './beast-geometry-levels.js?v=0.14.0-release-2';
const colors=['#d9edd6','#ffe9b4','#dceaf6','#f2daeb','#d7eee9'];
const colorNames=['Hellgrünes Teil','Gelbes Teil','Hellblaues Teil','Rosafarbenes Teil','Türkises Teil'];
function pieceOutline(cells,unit=1,offset=0){
 const occupied=new Set(cells.map(([x,y])=>`${x},${y}`)),edges=[];
 for(const [x,y] of cells){
  const left=x*unit+offset,top=y*unit+offset,right=left+unit,bottom=top+unit;
  if(!occupied.has(`${x},${y-1}`))edges.push(`M${left},${top}L${right},${top}`);
  if(!occupied.has(`${x+1},${y}`))edges.push(`M${right},${top}L${right},${bottom}`);
  if(!occupied.has(`${x},${y+1}`))edges.push(`M${right},${bottom}L${left},${bottom}`);
  if(!occupied.has(`${x-1},${y}`))edges.push(`M${left},${bottom}L${left},${top}`);
 }
 return edges.join('');
}
function renderGeometry({type,level:l,board:b,selected,hinted=[]}){const poly=type.id==='polyominos',path=b.path||[],cover=poly?b.placements.flatMap((p,i)=>placementCells(l,l.pieces[i],p).map(cell=>({cell,i}))):[];
 const cells=Array.from({length:l.rows*l.cols},(_,i)=>{if(l.blocked.includes(i))return `<span class="geometry-block" aria-label="Sperrfeld"></span>`;const p=cover.find(p=>p.cell===i),step=path.indexOf(i),label=poly?p?colorNames[p.i%colorNames.length]:'frei':i===l.start?'Start':i===l.end?'Ziel':`${l.turns[i]||'frei'}${step>=0?`, Schritt ${step+1}`:''}`;
 return `<button type="button" data-puzzle-cell="${i}" class="logic-cell geometry-cell ${selected===i?'selected':''} ${hinted.includes(i)?'hinted':''} ${path.at(-1)===i?'route-end':''}" ${p?`style="background:${colors[p.i%colors.length]}"`:''} aria-label="Zeile ${Math.floor(i/l.cols)+1}, Spalte ${i%l.cols+1}, ${label}">${poly?'':`<span class="maze-marker ${i===l.start?'maze-start':''}">${i===l.start?'●':i===l.end?'⚑':l.turns[i]||''}</span>${step>=0?`<small class="maze-step">${step+1}</small>`:''}`}</button>`;}).join('');
 const route=path.length?`<svg class="logic-overlay maze-route" viewBox="0 0 ${l.cols*100} ${l.rows*100}" aria-hidden="true"><polyline points="${path.map(i=>`${(i%l.cols+.5)*100},${(Math.floor(i/l.cols)+.5)*100}`).join(' ')}" fill="none" stroke="#438058" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg>`:'';
 const outlines=poly?`<svg class="logic-overlay poly-piece-outlines" viewBox="0 0 ${l.cols*100} ${l.rows*100}" preserveAspectRatio="none" aria-hidden="true">${b.placements.map((placement,i)=>placement?`<path class="poly-piece-outline" data-poly-piece="${i}" d="${pieceOutline(placementCells(l,l.pieces[i],placement).map(c=>[c%l.cols,Math.floor(c/l.cols)]),100)}"/>`:'').join('')}</svg>`:'';
 return `<div class="logic-board-wrap"><div class="geometry-board ${poly?'poly':'maze'}" role="group" aria-label="${type.title}, ${l.rows} mal ${l.cols}" style="--logic-cols:${l.cols};aspect-ratio:${l.cols}/${l.rows}">${cells}${outlines}${route}</div></div>`;
}
function pieceSvg(piece,color,turn=0,flip=false){const cells=pieceCells(piece,turn,flip),w=Math.max(...cells.map(c=>c[0]))+1,h=Math.max(...cells.map(c=>c[1]))+1;return `<svg viewBox="0 0 ${w*24+8} ${h*24+8}" width="70" height="60" aria-hidden="true">${cells.map(([x,y],i)=>`<rect x="${x*24+4}" y="${y*24+4}" width="24" height="24" fill="${color}" stroke="#476848" stroke-width="1"/>${i===0?`<circle cx="${x*24+16}" cy="${y*24+16}" r="3" fill="#b36e1f"/>`:''}`).join('')}<path class="poly-piece-outline" d="${pieceOutline(cells,24,4)}"/></svg>`;}
export const polyType={id:'polyominos',title:'Polyominos',symbol:'▟',description:'Drehe, spiegle und lege Teile zu einer vollständigen Fläche.',levels:beastPolyLevels,retiredLevels:polyLevels,model:polyModel,renderBoard:renderGeometry,
 defaultNotice:'Wähle ein Teil und lege es auf das Spielfeld.',renderInput:({level:l,board:b})=>`<div class="poly-pieces">${l.pieces.map((p,i)=>`<button type="button" data-puzzle-custom="choose" data-puzzle-value="${i}" aria-pressed="${b.chosen===i}" aria-label="${colorNames[i%colorNames.length]}${b.placements[i]?', bereits gelegt':''}">${pieceSvg(p,colors[i%colors.length],b.chosen===i?b.turn:0,b.chosen===i?b.flip:false)}${b.placements[i]?'<span aria-hidden="true">✓</span>':''}</button>`).join('')}</div><div class="poly-controls"><button class="soft-button" type="button" data-puzzle-custom="rotate"><span aria-hidden="true">↻</span><span>Drehen</span></button><button class="soft-button" type="button" data-puzzle-custom="flip"><span aria-hidden="true">↔</span><span>Spiegeln</span></button><button class="soft-button" type="button" data-puzzle-custom="remove"><span aria-hidden="true">⌫</span><span>Entfernen</span></button></div>`,
 cellAction:({cell})=>({kind:'place',cell}),customInput:(kind,button,s)=>kind==='remove'?{kind:'erase',cell:s.board.placements[s.board.chosen]?.anchor??-1}:{kind,value:Number(button.dataset.puzzleValue)},feedback:polyFeedback,
 initialCell:l=>Array.from({length:l.rows*l.cols},(_,i)=>i).find(i=>!l.blocked.includes(i)),validCell:(l,i)=>Number.isInteger(i)&&i>=0&&i<l.rows*l.cols&&!l.blocked.includes(i),cellLabel:()=> 'Tippe auf ein freies Feld, um das gewählte Teil zu legen.',
 cardDetail:l=>`${l.rows} × ${l.cols} · ${l.pieces.length} Teile`,levelDetail:l=>`${l.pieces.length} Teile · drehen und spiegeln`,keyboardHelp:'Mit Tab wählst du Teile und Felder aus. Enter oder die Leertaste aktiviert die Auswahl.',
 rules:()=>'<p>Belege jedes freie Kästchen <strong>genau einmal</strong>. Nutze jedes Teil genau einmal. Die Teile dürfen <strong>gedreht und gespiegelt</strong> werden. Sie dürfen sich nicht überlappen und keine Sperrfelder bedecken.</p><p>Ein bereits gelegtes Teil kannst du auswählen und neu platzieren. Zum Entfernen wähle das Teil und tippe auf „Entfernen“. Jede passende vollständige Belegung zählt.</p>',
 bandDescriptions:{'Entdecker':'Drei Teile passend zusammensetzen.','Tüftler':'Gedrehte und gespiegelte Formen miteinander vergleichen.','Knobelmeister':'Vier Teile verknüpfen, Sackgassen erkennen und anders anordnen.'}
};
export const mazeType={id:'abbieg-labyrinthe',title:'Abbieg-Labyrinthe',symbol:'↱',description:'Finde einen Weg durch alle Felder und biege richtig ab.',levels:beastMazeLevels,retiredLevels:mazeLevels,model:mazeModel,renderBoard:renderGeometry,
 defaultNotice:'Tippe das nächste Wegfeld an und beachte deine Laufrichtung.',renderInput:()=>'<p class="puzzle-mode-help">Tippe deinen Weg vom grünen Startpunkt zur Zielfahne. Auf L biegst du nach links ab, auf R nach rechts – immer aus deiner Laufrichtung. Ein früheres Wegfeld antippen verkürzt den Weg bis dorthin.</p>',
 cellAction:({cell})=>({kind:'step',cell}),feedback:mazeFeedback,initialCell:l=>l.start,validCell:(l,i)=>Number.isInteger(i)&&i>=0&&i<l.rows*l.cols&&!l.blocked.includes(i),cellLabel:()=> 'Besuche jedes freie Feld genau einmal.',
 cardDetail:l=>`${l.rows} × ${l.cols}`,levelDetail:l=>`${l.rows*l.cols-l.blocked.length} freie Felder`,keyboardHelp:'Mit Tab und Enter kannst du Wegfelder auswählen. Löschen nimmt den letzten Schritt zurück.',
 keyInput:({key})=>['Delete','Backspace'].includes(key)?{input:{kind:'erase'}}:null,
 rules:()=>'<p>Gehe vom <strong>grünen Startpunkt zur Zielfahne</strong>. Dein Weg besucht <strong>jedes freie Feld genau einmal</strong>. Gehe nur waagerecht oder senkrecht.</p><p>Auf <strong>L</strong> musst du aus deiner Laufrichtung nach links abbiegen, auf <strong>R</strong> nach rechts. Ohne Buchstaben darfst du geradeaus gehen oder abbiegen. Sperrfelder bleiben frei. Das Ziel erreichst du erst ganz am Ende.</p>',
 bandDescriptions:{'Entdecker':'Kurze Wege und erste Abbiegeregeln.','Tüftler':'Verzweigungen vergleichen und freie Bereiche erreichbar halten.','Knobelmeister':'Längere Wege vorausplanen und Sackgassen vermeiden.'}
};
