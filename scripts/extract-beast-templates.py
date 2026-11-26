"""Read the already transcribed book puzzles, preserving geometry and all clues.

The JSON is an authoring source, not a scan shown to children. Its transcription
is also compared visually with the selected pages of the original book.
"""
import json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
from orte import ordner
WORKSHEETS = ordner('Sonntagsrätsel mit MO und Ni') / 'Arbeitsblätter'
POINT = r'\(([-.\d]+)(?:mm)?,([-.\d]+)(?:mm)?\)'
NODE = re.compile(r'\\node\[([^\n]+?)\]\s+at\s+' + POINT + r'\s*\{(\d+|L|R)\};')
RECT = re.compile(r'\\(?:filldraw|draw)\[([^\n]+?)\]\s+' + POINT + r'\s+rectangle\s+' + POINT + ';')

def source(number):
    return next(p for p in WORKSHEETS.glob('Sonntagsrätsel '+number+' – *.tex') if 'Aufgabenblatt' not in p.name).read_text()

def sections(s):
    hits = list(re.finditer(r'Rätsel ([1-5])(?:\\quad|\})', s))
    out = {}
    for k, m in enumerate(hits):
        number = int(m[1])
        if number not in out:
            end = hits[k+1].start() if k+1<len(hits) else len(s)
            out[number] = s[m.start():end]
    return out

def calls(s, name, count):
    found = []
    for hit in re.finditer(r'\\'+name+r'\{', s):
        pos = hit.end()-1; args=[]
        for _ in range(count):
            if pos>=len(s) or s[pos]!='{': break
            start=pos+1; depth=1; pos+=1
            while depth:
                depth += (s[pos]=='{')-(s[pos]=='}'); pos+=1
            args.append(s[start:pos-1])
        if len(args)==count:found.append(args)
    return found

def nodes(s):
    return [(style,float(x),float(y),v) for style,x,y,v in NODE.findall(s)]

def field_grid(s, kind):
    edges = re.findall(r'\\draw\[draw=(?:MazePurple|NiTeal),line width=[^]]+\]\s+'+POINT+r'\s+--\s+'+POINT+';',s)
    xs=sorted(set(float(x) for a,b,c,d in edges for x in (a,c)))
    ys=sorted(set(float(y) for a,b,c,d in edges for y in (b,d)))
    x0,y0=xs[0],ys[0];size=xs[1]-x0;cols=round((xs[-1]-x0)/size);rows=round((ys[-1]-y0)/size)
    blocked=[]
    for style,x,y,_,_ in RECT.findall(s):
        if 'fill=MazePurple' in style or 'fill=NiTeal' in style:blocked.append(round((float(y)-y0)/size)*cols+round((float(x)-x0)/size))
    fields=[dict(x=x,y=y,w=1,h=1) for y in range(rows) for x in range(cols) if y*cols+x not in blocked]
    at=lambda x,y: next(i for i,f in enumerate(fields) if f['x']==round((x-x0)/size-.5) and f['y']==round((y-y0)/size-.5))
    out=dict(kind=kind,rows=rows,cols=cols,fields=fields,givens={})
    if kind=='magic':
        out['digits']=4 if cols>4 else 3;out['sums']=[]
        for style,x,y,v in nodes(s):
            if 'text=MOOrange' in style:out['givens'][at(x,y)]=int(v)
            elif 'text=BrandGreen' in style:
                vertical='anchor=north,' in style
                line=round(((x-x0) if vertical else (y-y0))/size-.5)
                out['sums'].append(dict(vertical=vertical,line=line,target=int(v)))
    elif kind=='digit':
        out['circles']=[]
        for style,x,y,v in nodes(s):
            if 'text=MOOrange' in style:out['givens'][at(x,y)]=int(v)
            elif 'text=BrandGreen' in style:out['circles'].append(dict(x=round((x-x0)/size),y=round((y-y0)/size),target=int(v)))
    else:
        out['blocked']=blocked;out.pop('fields');out.pop('givens');out['turns']={}
        for style,x,y,v in nodes(s):
            if v in ('L','R'):out['turns'][round((y-y0)/size-.5)*cols+round((x-x0)/size-.5)]=v
        x,y=re.search(r'\\fill\[BrandGreen!75\]\s+'+POINT,s).groups();out['start']=round((float(y)-y0)/size-.5)*cols+round((float(x)-x0)/size-.5)
        # Goal is a small checkerboard square with a surrounding outline.
        style,x,y,x1,y1=next(q for q in RECT.findall(s) if 'draw=black,fill=none' in q[0])
        out['end']=round(((float(y)+float(y1))/2-y0)/size-.5)*cols+round(((float(x)+float(x1))/2-x0)/size-.5)
    return out

packs={}
s=source('03');packs['cross']=[]
for k,chunk in sections(s).items():
    chunk=chunk.split('\\end{tikzpicture}')[0]
    fields=[dict(x=int(float(x)),y=int(float(y)),w=1,h=1) for style,x,y,_,_ in RECT.findall(chunk) if style=='gridcell']
    givens={next(i for i,f in enumerate(fields) if f['x']==x-.5 and f['y']==y-.5):int(v) for style,x,y,v in nodes(chunk)}
    packs['cross'].append(dict(kind='cross',rows=max(f['y'] for f in fields)+1,cols=max(f['x'] for f in fields)+1,fields=fields,givens=givens))

s=source('02');packs['number-path']=[]
for name in ('One','Two','Three','Four','Five'):
    chunk=s.split('\\newcommand{\\Puzzle'+name+'}')[1].split('\\newcommand')[0]
    if name!='Five':
        rows,cols=map(int,re.search(r'\\PathGrid\{(\d+)\}\{(\d+)\}',chunk).groups());coords=[(x,y) for y in range(rows) for x in range(cols)]
    else:
        rows,cols=13,9;coords=[(x,y) for y in range(rows) for x in range(cols) if (x<4 or x>=5) and (y<6 or y>=7) or (x,y) in ((4,2),(7,6),(4,10),(1,6))]
    fields=[dict(x=x,y=y,w=1,h=1) for x,y in coords]
    givens={coords.index((round(x-.5),round(y-.5))):int(v) for _,x,y,v in nodes(chunk)}
    packs['number-path'].append(dict(kind='number-path',rows=rows,cols=cols,fields=fields,givens=givens))

s=source('06');packs['deka']=[]
for rows,cols,_,vert,hor,given in calls(s,'DekaGrid',6):
    rows,cols=int(rows),int(cols);vset={tuple(map(int,q.split('/'))) for q in vert.split(',')};hset={tuple(map(int,q.split('/'))) for q in hor.split(',')}
    groups=[{(x,y)} for y in range(rows) for x in range(cols)]
    def merge(a,b):
        ga=next(g for g in groups if a in g);gb=next(g for g in groups if b in g)
        if ga is not gb:ga.update(gb);groups.remove(gb)
    for y in range(rows):
        for x in range(cols):
            if x+1<cols and (x+1,y) not in vset:merge((x,y),(x+1,y))
            if y+1<rows and (y+1,x) not in hset:merge((x,y),(x,y+1))
    fields=[]
    for g in groups:
        xs=[x for x,y in g];ys=[y for x,y in g];f=dict(x=min(xs),y=min(ys),w=max(xs)-min(xs)+1,h=max(ys)-min(ys)+1);assert f['w']*f['h']==len(g);fields.append(f)
    givens={}
    for q in given.split(','):
        x,y,v=map(float,q.split('/'));i=next(i for i,f in enumerate(fields) if f['x']<x<f['x']+f['w'] and f['y']<y<f['y']+f['h']);givens[i]=int(v)
    packs['deka'].append(dict(kind='deka',rows=rows,cols=cols,fields=fields,givens=givens))

s=source('07');packs['sudoku']=[]
for num,stars,given,hor,vert in calls(s,'Raetsel',5):
    givens={4*(int(r)-1)+int(c)-1:int(v) for r,c,v in (q.split('/') for q in given.split(','))};comparisons=[]
    for vertical,entries in ((False,hor),(True,vert)):
        for q in filter(None,entries.split(',')):
            r,c,op=q.split('/');a=4*(int(r)-1)+int(c)-1;b=a+(4 if vertical else 1);smaller=(op=='<' or op=='\\wedge');comparisons.append(dict(small=a if smaller else b,large=b if smaller else a))
    packs['sudoku'].append(dict(kind='sudoku',rows=4,cols=4,givens=givens,comparisons=comparisons))

s=source('05');packs['pyramid']=[]
for k,chunk in sections(s).items():
    chunk=chunk.split('\\end{tikzpicture}')[0]
    bank=list(map(int,re.search(r'Nutze:\}\s*\\textcolor\{BrandGreen\}\{([\d, ]+)\}',chunk)[1].split(',')))
    rects=re.findall(POINT+r'\s+rectangle\s+\+\+'+POINT,chunk);size=float(rects[0][2]);height=round(max(float(x) for x,y,w,h in rects)/size)+1
    coords=[(r+2*c,2*(height-1-r)) for r in range(height) for c in range(height-r)]
    givens={coords.index((round(2*x/size-1),round(2*(height-1)-2*y/size+1))):int(v) for style,x,y,v in nodes(chunk)}
    packs['pyramid'].append(dict(kind='pyramid',height=height,bank=bank,givens=givens))

for number,kind in (('09','magic'),('10','digit'),('12','maze')):
    packs[kind]=[field_grid(chunk,kind) for chunk in sections(source(number)).values()]

packs['poly']=[]
for chunk in sections(source('04')).values():
    pictures=re.findall(r'\\begin\{tikzpicture\}.*?\\end\{tikzpicture\}',chunk,re.S)
    coords=[(int(float(x)),int(float(y))) for style,x,y,_,_ in RECT.findall(pictures[0]) if 'fill=white' in style];rows=max(y for x,y in coords)+1;cols=max(x for x,y in coords)+1
    pieces=[]
    for picture in pictures[1:]:
        cells=[[int(float(x)),int(float(y))] for style,x,y,_,_ in RECT.findall(picture) if 'fill=Piece' in style]
        if not cells:continue
        label=re.search('fill=Piece([OILST])',picture)[1];pieces.append(dict(label=label,cells=cells))
    packs['poly'].append(dict(kind='poly',rows=rows,cols=cols,blocked=[i for i in range(rows*cols) if (i%cols,i//cols) not in coords],pieces=pieces))

metadata={
 'cross':[(97,1,1),(98,5,2),(100,13,2),(102,21,3),(105,27,4)],
 'number-path':[(7,1,1),(8,7,2),(12,31,3),(14,41,3),(15,45,4)],
 'poly':[(21,1,1),(22,5,1),(24,13,2),(26,21,3),(28,29,3)],
 'pyramid':[(63,1,1),(64,7,2),(66,19,3),(68,31,4),(69,37,5)],
 'deka':[(49,1,1),(50,9,2),(54,35,3),(56,47,4),(57,53,5)],
 'sudoku':[(75,1,1),(76,7,2),(78,19,3),(80,31,4),(81,37,5)],
 'magic':[(109,2,1),(110,11,2),(112,22,3),(114,27,4),(117,38,5)],
 'digit':[(123,1,1),(124,9,2),(126,25,3),(129,43,4),(131,55,5)],
 'maze':[(149,3,1),(150,9,2),(152,21,2),(154,31,2),(156,43,3)]}
for kind,levels in packs.items():
    assert len(levels)==5,(kind,len(levels))
    for level,(page,task,stars) in zip(levels,metadata[kind]):level['source']=dict(book='Beast Academy Puzzles 1',page=page,task=task,stars=stars)
(HERE/'beast-academy-templates.json').write_text(json.dumps(packs,ensure_ascii=False,indent=2)+'\n')
print({k:len(v) for k,v in packs.items()})
