// يبني public/studio-content.js من: فهارس الكتب (content-src/toc) + بنوك أسئلة الاختبارات (public/quizzes)
const fs=require('fs');
const rd=f=>fs.readFileSync(f,'utf8');
const quiz=f=>JSON.parse(rd('public/quizzes/'+f+'.html').match(/const DATA = (\[.*\]);/)[1]);
const toc=id=>JSON.parse(rd('content-src/toc/'+id+'.json'));
const conv=q=>q.t==='tf'?{type:'tf',q:q.q,a:!!q.a,e:q.e||''}:{type:'mcq',q:q.q,o:q.o,e:q.e||''};
const uniq=a=>[...new Set(a.map(x=>x.trim()).filter(x=>x.length>=12))];
const subjects=[],manual=[];
let mid=0;
function add(id,name,grade,book,chapters,quizData,opts={}){
  const sub={id,name,grade,book:book||'',chapters:[],lessons:[]};
  chapters.forEach((c,ci)=>{
    const cid=id+'-c'+(ci+1);
    const qd=quizData&&quizData[ci];
    const pts=qd?uniq(qd.questions.map(q=>q.e||'')):[];
    sub.chapters.push({id:cid,title:c.title,pages:c.pages||'',points:pts});
    (c.lessons||[]).forEach((l,li)=>sub.lessons.push({id:cid+'-l'+(li+1),cid,title:l[0],page:l[1]||'',kind:'text',text:'',link:'',files:[]}));
    if(qd)qd.questions.forEach(q=>manual.push({id:'q'+(++mid),sid:id,cid,...conv(q)}));
  });
  subjects.push(sub);
}
const bookMap={chem:['chemistry-grade6',1],ar2:['arabic2-prep',1],isl:['islamic-prep',1]};
const names={chem:'الكيمياء',phy:'الفيزياء',bio:'علم الأحياء',math:'الرياضيات',ar1:'اللغة العربية — الجزء الأول',ar2:'اللغة العربية — الجزء الثاني',isl:'القرآن الكريم والتربية الإسلامية',en:'اللغة الإنجليزية (Activity Book)'};
for(const id of ['chem','phy','bio','math','ar1','ar2','isl','en']){
  const b=toc(id);
  const qd=bookMap[id]?quiz(bookMap[id][0]):null;
  add('g6-'+id,names[id],6,b.t,b.ch.map(c=>({title:c.t,pages:c.p,lessons:c.l})),qd);
}
const g4=[['phys','الفيزياء','physics-prep'],['math','الرياضيات','math-prep'],['ar','اللغة العربية — النحو والإملاء','arabic-prep'],['bio','الأحياء','biology-prep'],['en','اللغة الإنجليزية — Grammar','english-prep']];
for(const [id,name,f] of g4){const d=quiz(f);add('g4-'+id,name,4,'',d.map(c=>({title:c.title,lessons:[]})),d)}
const out={v:2,subjects,manual};
fs.writeFileSync('public/studio-content.js','/* محتوى المنصة: فهارس الكتب + بنوك الأسئلة. يُولَّد بـ content-src/build.js */\nwindow.STUDIO_CONTENT='+JSON.stringify(out)+';\n');
console.log(subjects.map(s=>s.id+': '+s.chapters.length+' ch, '+s.lessons.length+' lessons').join('\n'),'\nquestions',manual.length,'bytes',fs.statSync('public/studio-content.js').size);
