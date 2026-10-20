/* تحليلات الأداء: سجل المحاولات + مخطط Canvas تفاعلي + أشرطة تقدّم متحركة.
   يعتمد على LocalStorage فقط، ولا يغيّر مفاتيح الحفظ الحالية للاختبارات. */
(function(){
'use strict';
var HIST='perf-history-v1',STUDIO='studio-v1-scores',STUDIO_STATE='studio-v1',MAXH=600;
var TERMS=['الكورس الأول','الكورس الثاني'];
/* أشهر السنة الدراسية: أكتوبر → سبتمبر (فهرس JS للشهر 9 = أكتوبر) */
var MONTHS=['أكتوبر','نوفمبر','ديسمبر','يناير','فبراير','مارس','أبريل','مايو','يونيو'];
var PALETTE=['#14b8a6','#d4af37','#38bdf8','#f472b6','#a3e635','#fb923c','#c084fc','#f87171'];

function ls(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}
function put(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function cat(){return window.CATALOG||{grades:[],quizzes:[]}}
function find(k){var q=cat().quizzes;for(var i=0;i<q.length;i++)if(q[i].k===k)return q[i];return null}

/* الكورس الأول: أكتوبر–يناير. الثاني: فبراير–سبتمبر */
function termOf(ts){var m=new Date(ts).getMonth();return (m>=9||m===0)?0:1}
function monthIdx(ts){var m=new Date(ts).getMonth();return m>=9?m-9:(m<=5?m+3:-1)} /* -1 = سبتمبر (خارج الأشهر التسعة) */

function readHist(){var h=ls(HIST);return Array.isArray(h)?h:[]}

/* نقل النتائج السابقة (أفضل درجة لكل وحدة) إلى السجل مرة واحدة */
function migrate(){
  var h=readHist(),have={},changed=false,now=Date.now();
  h.forEach(function(e){have[e.k+'|'+e.u]=1});
  cat().quizzes.forEach(function(q){
    var d=ls(q.k);if(!d||typeof d!=='object')return;
    Object.keys(d).forEach(function(u){
      if(have[q.k+'|'+u]||!d[u]||isNaN(+d[u].pct))return;
      h.push({k:q.k,u:+u,g:q.g,sub:q.sub||q.t,pct:+d[u].pct,score:+d[u].score||0,total:+d[u].total||0,ts:now,legacy:1});
      changed=true;
    });
  });
  if(changed)put(HIST,h.slice(-MAXH));
}

/* تسجيل محاولة جديدة. تُستدعى من صفحات الاختبارات عند الإنهاء */
function record(key,unit,v){
  try{
    var q=find(key);if(!q||!v)return null;
    var e={k:key,u:+unit,g:q.g,sub:q.sub||q.t,pct:+v.pct||0,score:+v.score||0,total:+v.total||0,ts:Date.now()};
    var h=readHist();h.push(e);put(HIST,h.slice(-MAXH));return e;
  }catch(err){return null}
}

/* كل المحاولات (الاختبارات + بنك الأسئلة في الاستوديو) لصف معيّن */
function attempts(grade){
  migrate();
  var out=readHist().filter(function(e){return e.g===grade});
  var st=ls(STUDIO_STATE),sc=ls(STUDIO),subj={};
  if(st&&st.subjects)st.subjects.forEach(function(s){subj[s.id]=s});
  if(sc)Object.keys(sc).forEach(function(id){
    var v=sc[id],s=v&&subj[v.sid];
    if(s&&+s.grade===grade&&!isNaN(+v.pct))out.push({k:'studio:'+v.sid,u:id,g:grade,sub:normSubject(s.name),pct:+v.pct,score:0,total:+v.n||0,ts:+v.ts||Date.now(),bank:1});
  });
  return out;
}
function normSubject(n){n=String(n||'');if(/^eng/i.test(n)||n==='English')return 'اللغة الإنجليزية';return n}

function groupBy(list,fn){var o={};list.forEach(function(e){var k=fn(e);(o[k]=o[k]||[]).push(e)});return o}
function avg(a){return a.length?a.reduce(function(s,e){return s+e.pct},0)/a.length:null}

/* ملخص كل مادة: متوسط الدرجات + نسبة الإنجاز (وحدات تمّ حلّها / كل الوحدات) */
function summary(grade){
  var list=attempts(grade),by=groupBy(list,function(e){return e.sub}),subs=[];
  cat().quizzes.filter(function(q){return q.g===grade}).forEach(function(q){
    var s=q.sub||q.t;if(subs.indexOf(s)<0)subs.push(s)});
  Object.keys(by).forEach(function(s){if(subs.indexOf(s)<0)subs.push(s)});
  return subs.map(function(s,i){
    var a=by[s]||[],units={};a.filter(function(e){return !e.bank}).forEach(function(e){units[e.k+'|'+e.u]=1});
    var total=0;cat().quizzes.forEach(function(q){if(q.g===grade&&(q.sub||q.t)===s)total+=q.u||0});
    var done=Object.keys(units).length;
    return {sub:s,color:PALETTE[i%PALETTE.length],attempts:a.length,avg:avg(a),
      completion:total?Math.min(100,done/total*100):(a.length?100:0),done:done,total:total,list:a};
  });
}

/* ---------- أشرطة التقدّم المتحركة ---------- */
var cssDone=false;
function css(){
  if(cssDone)return;cssDone=true;
  var s=document.createElement('style');
  s.textContent='.pa-wrap{margin:16px 0;padding:16px;border-radius:1.1rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);text-align:right}'+
  '.pa-row{margin:10px 0}.pa-lab{display:flex;justify-content:space-between;font-size:.9rem;margin-bottom:6px;color:#d8e6ea}.pa-lab b{color:#f3d97a}'+
  '.pa-track{position:relative;height:14px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,.4)}'+
  '.pa-fill{position:absolute;inset:0 auto 0 0;width:0;border-radius:99px;transition:width 1.1s cubic-bezier(.22,1,.36,1)}'+
  '[dir=rtl] .pa-fill{inset:0 0 0 auto}'+
  '.pa-fill.tq{background:linear-gradient(90deg,#0f766e,#14b8a6,#5eead4)}.pa-fill.gd{background:linear-gradient(90deg,#9a7412,#d4af37,#f3d97a)}'+
  '.pa-fill::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.45) 50%,transparent 70%);background-size:200% 100%;animation:pashine 2.4s linear infinite}'+
  '@keyframes pashine{from{background-position:200% 0}to{background-position:-200% 0}}'+
  '@media(prefers-reduced-motion:reduce){.pa-fill{transition:none}.pa-fill::after{animation:none}}';
  document.head.appendChild(s);
}
function bar(label,pct,cls,extra){
  pct=Math.max(0,Math.min(100,Math.round(pct)));
  return '<div class="pa-row"><div class="pa-lab"><span>'+label+(extra?' <small style="color:#9fb6bf">'+extra+'</small>':'')+'</span><b>'+pct+'%</b></div>'+
    '<div class="pa-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'" aria-label="'+label+'"><div class="pa-fill '+cls+'" data-w="'+pct+'"></div></div></div>';
}
function animate(root){
  var f=root.querySelectorAll('.pa-fill');
  requestAnimationFrame(function(){requestAnimationFrame(function(){for(var i=0;i<f.length;i++)f[i].style.width=f[i].getAttribute('data-w')+'%'})});
}
/* لوحة نتيجة فورية: الدرجة المحققة + إنجاز المادة. تُدرَج داخل شاشة النتائج */
function mountResult(host,key,unit,v){
  try{
    css();var q=find(key);if(!q||!host)return;
    var s=summary(q.g).filter(function(x){return x.sub===(q.sub||q.t)})[0];if(!s)return;
    var box=document.createElement('div');box.className='pa-wrap';
    box.innerHTML='<div style="font-weight:800;color:#d4af37;margin-bottom:4px"><i class="fa-solid fa-chart-simple"></i> أداؤك في هذه المادة</div>'+
      bar('درجتك في هذا الاختبار',v.pct,'gd',v.score+' / '+v.total)+
      bar('متوسط درجاتك في '+s.sub,s.avg==null?0:s.avg,'gd',s.attempts+' محاولة')+
      bar('إنجاز وحدات '+s.sub,s.completion,'tq',s.done+' من '+s.total+' وحدات')+
      '<a href="performance.html?g='+q.g+'" style="display:inline-block;margin-top:6px;color:#5eead4;text-decoration:none"><i class="fa-solid fa-chart-line"></i> عرض لوحة التحليلات الكاملة</a>';
    var anchor=host.querySelector('.flex.flex-wrap.gap-3');
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(box,anchor);else host.appendChild(box);
    animate(box);
  }catch(e){}
}

/* لوحة فورية لنتيجة بنك الأسئلة (الاستوديو): subj = {name,grade} */
function mountBank(host,subj,pct){
  try{
    css();var g=+subj.grade,name=normSubject(subj.name);
    var s=summary(g).filter(function(x){return x.sub===name})[0];if(!host||!s)return;
    var box=document.createElement('div');box.className='pa-wrap';
    box.innerHTML='<div style="font-weight:800;color:#d4af37;margin-bottom:4px">أداؤك في '+name+'</div>'+
      bar('درجتك في هذا الاختبار',pct,'gd','')+
      bar('متوسط درجاتك في '+name,s.avg==null?0:s.avg,'gd',s.attempts+' محاولة')+
      '<a href="performance.html?g='+g+'" style="display:inline-block;margin-top:6px;color:#5eead4;text-decoration:none">عرض لوحة التحليلات الكاملة ←</a>';
    host.appendChild(box);animate(box);
  }catch(e){}
}

/* ---------- مخطط Canvas التفاعلي ---------- */
function Chart(canvas,tip){
  var ctx=canvas.getContext('2d'),self=this;
  self.mode='bar';self.data=[];self.hidden={};self.hit=[];self.t=0;self.hover=null;self.raf=0;
  function size(){
    var r=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
    canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));
    ctx.setTransform(dpr,0,0,dpr,0,0);self.w=r.width;self.h=r.height;self.draw();
  }
  self.resize=size;
  self.setData=function(d){self.data=d;self.play()};
  self.setMode=function(m){self.mode=m;self.play()};
  self.toggle=function(name){self.hidden[name]=!self.hidden[name];self.draw()};
  self.play=function(){
    cancelAnimationFrame(self.raf);
    if(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches){self.t=1;self.draw();return}
    var t0=null;self.t=0;
    (function step(ts){if(t0===null)t0=ts;var p=Math.min(1,(ts-t0)/900);self.t=1-Math.pow(1-p,3);self.draw();if(p<1)self.raf=requestAnimationFrame(step)})(performance.now?performance.now():0);
  };
  function axes(pad){
    ctx.font='12px Cairo, Tajawal, sans-serif';ctx.textBaseline='middle';
    var W=self.w,H=self.h;
    for(var v=0;v<=100;v+=25){
      var y=pad.t+(H-pad.t-pad.b)*(1-v/100);
      ctx.strokeStyle='rgba(255,255,255,'+(v?0.08:0.25)+')';ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();
      ctx.fillStyle='#9fb6bf';ctx.textAlign='left';ctx.fillText(v+'%',W-pad.r+8,y);
    }
  }
  function grad(x,y0,y1,c0,c1){var g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,c0);g.addColorStop(1,c1);return g}
  self.draw=function(){
    var W=self.w||0,H=self.h||0;if(!W||!H)return;
    ctx.clearRect(0,0,W,H);self.hit=[];
    var pad={l:14,r:46,t:16,b:50},pw=W-pad.l-pad.r,ph=H-pad.t-pad.b,ease=self.t;
    axes(pad);
    var subs=self.data;
    if(!subs.length){ctx.fillStyle='#9fb6bf';ctx.textAlign='center';ctx.font='15px Cairo, sans-serif';ctx.fillText('لا توجد نتائج لهذا الصف بعد — حلّ اختباراً لتظهر بياناتك هنا',W/2,H/2);return}
    ctx.textAlign='center';ctx.font='12px Cairo, Tajawal, sans-serif';
    if(self.mode==='bar'){
      var gw=pw/subs.length,tv=[0,1].filter(function(i){return !self.hidden[TERMS[i]]}),n=Math.max(1,tv.length),bw=Math.min(34,gw*0.7/n);
      subs.forEach(function(s,i){
        var cx=pad.l+gw*(subs.length-i-0.5);
        ctx.fillStyle='#d8e6ea';label(s.sub,cx,H-pad.b+16);
        tv.forEach(function(ti,j){
          var v=s.terms[ti],val=v==null?0:v,x=cx+bw*n/2-bw*(j+1)+2,bh=ph*val/100*ease,y=pad.t+ph-bh;
          if(v==null){ctx.fillStyle='rgba(255,255,255,.06)';rr(x,pad.t+ph-4,bw-4,4,2);ctx.fill();return}
          ctx.fillStyle=ti===0?grad(x,y,pad.t+ph,'#5eead4','#0f766e'):grad(x,y,pad.t+ph,'#f3d97a','#9a7412');
          rr(x,y,bw-4,Math.max(bh,2),5);ctx.fill();
          var hv=self.hover&&self.hover.s===i&&self.hover.t===ti;
          if(hv){ctx.strokeStyle='#fff';ctx.lineWidth=2;rr(x,y,bw-4,Math.max(bh,2),5);ctx.stroke();ctx.lineWidth=1}
          ctx.fillStyle='#e6f1f5';ctx.fillText(Math.round(v*ease)+'',x+(bw-4)/2,y-9);
          self.hit.push({x:x,y:y,w:bw-4,h:Math.max(bh,2),s:i,t:ti,v:v,n:s.termN[ti]});
        });
      });
    }else{
      var step=pw/(MONTHS.length-1);
      MONTHS.forEach(function(m,i){ctx.fillStyle='#9fb6bf';ctx.fillText(m,pad.l+step*(MONTHS.length-1-i),H-pad.b+18)});
      subs.forEach(function(s,si){
        if(self.hidden[s.sub])return;
        var pts=[];s.months.forEach(function(v,mi){if(v!=null)pts.push({x:pad.l+step*(MONTHS.length-1-mi),y:pad.t+ph*(1-v*ease/100),v:v,m:mi,n:s.monthN[mi]})});
        if(!pts.length)return;
        ctx.strokeStyle=s.color;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.beginPath();
        pts.forEach(function(p,i){i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.stroke();
        if(pts.length>1){var g=ctx.createLinearGradient(0,pad.t,0,pad.t+ph);g.addColorStop(0,s.color+'55');g.addColorStop(1,s.color+'00');
          ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(pts[0].x,pad.t+ph);pts.forEach(function(p){ctx.lineTo(p.x,p.y)});ctx.lineTo(pts[pts.length-1].x,pad.t+ph);ctx.closePath();ctx.fill()}
        pts.forEach(function(p){
          var hv=self.hover&&self.hover.s===si&&self.hover.m===p.m;
          ctx.fillStyle='#050d1a';ctx.strokeStyle=s.color;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(p.x,p.y,hv?7:4.5,0,6.283);ctx.fill();ctx.stroke();
          self.hit.push({cx:p.x,cy:p.y,r:14,s:si,m:p.m,v:p.v,n:p.n});
        });ctx.lineWidth=1;
      });
    }
  };
  function rr(x,y,w,h,r){r=Math.min(r,w/2,h);ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath()}
  function label(s,x,y){
    if(s.length<=13){ctx.fillText(s,x,y);return}
    var w=s.split(' '),a='',i=0;
    for(;i<w.length;i++){if((a+' '+w[i]).trim().length>13&&a)break;a=(a+' '+w[i]).trim()}
    ctx.fillText(a,x,y);ctx.fillText(w.slice(i).join(' ').slice(0,16),x,y+15);
  }
  function pick(ev){
    var r=canvas.getBoundingClientRect(),x=ev.clientX-r.left,y=ev.clientY-r.top,best=null,bd=1e9;
    self.hit.forEach(function(h){
      if(h.w!=null){if(x>=h.x-3&&x<=h.x+h.w+3&&y>=h.y-6&&y<=h.y+h.h+6){best=h;bd=0}}
      else{var d=Math.hypot(x-h.cx,y-h.cy);if(d<h.r&&d<bd){best=h;bd=d}}
    });
    return {h:best,x:x,y:y};
  }
  function move(ev){
    var p=pick(ev),h=p.h,old=self.hover;
    self.hover=h?{s:h.s,t:h.t,m:h.m}:null;
    if(h){
      var s=self.data[h.s];
      tip.innerHTML='<b style="color:'+(h.t===1?'#f3d97a':s.color)+'">'+s.sub+'</b><br>'+(h.t!=null?TERMS[h.t]:MONTHS[h.m])+': <b>'+Math.round(h.v)+'%</b><br><small>'+h.n+' محاولة</small>';
      tip.style.display='block';
      var tw=tip.offsetWidth,left=Math.min(Math.max(4,p.x-tw/2),self.w-tw-4);
      tip.style.left=left+'px';tip.style.top=Math.max(0,p.y-tip.offsetHeight-14)+'px';
    }else tip.style.display='none';
    canvas.style.cursor=h?'pointer':'default';
    if(!old!==!self.hover||(old&&self.hover&&(old.s!==self.hover.s||old.t!==self.hover.t||old.m!==self.hover.m)))self.draw();
  }
  canvas.addEventListener('mousemove',move);
  canvas.addEventListener('mouseleave',function(){self.hover=null;tip.style.display='none';self.draw()});
  canvas.addEventListener('touchstart',function(e){if(e.touches[0])move(e.touches[0])},{passive:true});
  window.addEventListener('resize',size);
  size();
}

/* تجهيز بيانات المخطط من ملخص الصف */
function chartData(grade){
  return summary(grade).filter(function(s){return s.attempts>0}).map(function(s){
    var t=[[],[]],m=[];for(var i=0;i<MONTHS.length;i++)m.push([]);
    s.list.forEach(function(e){t[termOf(e.ts)].push(e);var mi=monthIdx(e.ts);if(mi>=0)m[mi].push(e)});
    return {sub:s.sub,color:s.color,
      terms:t.map(avg),termN:t.map(function(a){return a.length}),
      months:m.map(avg),monthN:m.map(function(a){return a.length})};
  });
}

window.PerfAnalytics={record:record,attempts:attempts,summary:summary,chartData:chartData,Chart:Chart,
  mountResult:mountResult,mountBank:mountBank,bar:bar,animate:animate,css:css,TERMS:TERMS,MONTHS:MONTHS,termOf:termOf};
})();
