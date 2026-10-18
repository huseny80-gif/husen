const fs=require('fs');
const f=process.argv[2];const toc=JSON.parse(fs.readFileSync(`content-src/toc/${require('path').basename(f,'.json')}.json`,'utf8'));
const D=JSON.parse(fs.readFileSync(f,'utf8'));
const errs=[],cnt={};let figs=0;
const T=['def','why','enum','mcq','tf','fill','calc','label','draw','read'];
const isArr=Array.isArray;
const svgOk=(s,where)=>{if(typeof s!=='string'||!/^<svg\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*viewBox="0 0 \d+ \d+"/.test(s.trim()))errs.push(where+': svg header');
  if(/<script|<image|<foreignObject|href=/i.test(s))errs.push(where+': svg forbidden element');
  const o=(s.match(/<([a-zA-Z]+)(\s[^>]*[^\/])?>/g)||[]).length,c=(s.match(/<\/[a-zA-Z]+>/g)||[]).length;if(o!==c)errs.push(where+': svg tags unbalanced open='+o+' close='+c)};
if(!isArr(D))errs.push('root must be array');
(isArr(D)?D:[]).forEach((q,i)=>{const w='#'+i+' ('+(q.t||'?')+')';
  if(!T.includes(q.t)){errs.push(w+': bad type');return}
  cnt[q.t]=(cnt[q.t]||0)+1;
  if(!(q.c>=1&&q.c<=toc.ch.length))errs.push(w+': bad c');
  if(q.l!=null&&!(q.c&&toc.ch[q.c-1]&&q.l>=1&&q.l<=toc.ch[q.c-1].l.length))errs.push(w+': bad l');
  if(q.t!=='read'&&!(typeof q.q==='string'&&q.q.trim().length>3))errs.push(w+': q');
  if(q.t==='def'||q.t==='why'){if(typeof q.a!=='string'||!isArr(q.k)||q.k.length<2)errs.push(w+': a/k')}
  if(q.t==='enum'&&(!isArr(q.a)||q.a.length<2))errs.push(w+': a[]');
  if(q.t==='mcq'&&(!isArr(q.o)||q.o.length<3||new Set(q.o).size!==q.o.length))errs.push(w+': o');
  if(q.t==='tf'&&typeof q.a!=='boolean')errs.push(w+': a bool');
  if(q.t==='fill'&&(!/____/.test(q.q)||!isArr(q.a)||(q.q.split('____').length-1)!==q.a.length))errs.push(w+': fill blanks/a mismatch');
  if(q.t==='calc'){if(!['chem','math','phys'].includes(q.kind))errs.push(w+': kind');if(!isArr(q.a)||!q.a.length)errs.push(w+': a[]');if(typeof q.sol!=='string')errs.push(w+': sol');if(q.num!=null&&typeof q.num!=='number')errs.push(w+': num')}
  if(q.t==='label'){svgOk(q.fig,w+' fig');if(!isArr(q.labels)||q.labels.length<2||q.labels.some(l=>!l.n||!l.a))errs.push(w+': labels')}
  if(q.t==='draw'){if(typeof q.a!=='string')errs.push(w+': a');if(q.fig)svgOk(q.fig,w+' fig');if(q.figA)svgOk(q.figA,w+' figA')}
  if(q.t==='read'&&(typeof q.passage!=='string'||!isArr(q.subs)||!q.subs.length))errs.push(w+': read');
  if(q.fig&&!['label','draw'].includes(q.t))svgOk(q.fig,w+' fig');
  if(q.fig)figs++;
});
const per={};(isArr(D)?D:[]).forEach(q=>per[q.c]=(per[q.c]||0)+1);
console.log('questions',(isArr(D)?D:[]).length,'types',JSON.stringify(cnt),'withFig',figs,'perChapter',JSON.stringify(per));
if(errs.length){console.log('ERRORS',errs.length);errs.slice(0,40).forEach(e=>console.log(' -',e));process.exit(1)}console.log('OK');
