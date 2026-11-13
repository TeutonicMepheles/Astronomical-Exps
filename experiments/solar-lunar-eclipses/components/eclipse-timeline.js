// EXP-04 tick/caret timeline adapted as an experiment-owned native range control.
// See README.md for source snapshot and scope.
export function mountEclipseTimeline({input,output,ticks=97,majorEvery=8,start,end}) {
 const axis=document.createElement('div');axis.className='eclipse-time-axis';
 input.before(axis);axis.append(input,output);output.classList.add('eclipse-time-value');
 const marks=document.createElement('div');marks.className='eclipse-time-ticks';marks.setAttribute('aria-hidden','true');
 for(let i=0;i<ticks;i++){const mark=document.createElement('i');if(i%majorEvery===0)mark.className='major';marks.append(mark);}
 const caret=document.createElement('div');caret.className='eclipse-time-caret';caret.setAttribute('aria-hidden','true');
 const ends=document.createElement('div');ends.className='eclipse-time-ends';ends.setAttribute('aria-hidden','true');
 for(const text of [start,end]){const span=document.createElement('span');span.textContent=text;ends.append(span);}
 axis.append(marks,caret,ends);
 return {sync(){const min=Number(input.min),max=Number(input.max),ratio=Math.max(0,Math.min(1,(Number(input.value)-min)/(max-min||1)));axis.style.setProperty('--time-progress',`${ratio*100}%`);axis.dataset.value=input.value;}};
}
