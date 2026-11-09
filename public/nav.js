// شريط تنقل موحّد: رجوع + الرئيسية. يُضاف تلقائياً في أعلى كل صفحة.
(function(){
 var s=document.currentScript,base=s.src.slice(0,s.src.lastIndexOf('/')+1);
 var file=location.pathname.split('/').pop().replace('.html','');
 var C=window.CATALOG||{quizzes:[]},grade=null,q=C.quizzes.filter(function(x){return x.f===file})[0];
 var m=location.search.match(/[?&]g=(\d)/);
 if(q)grade=q.g;else if(m)grade=+m[1];
 var home=base+'platform.html',fallback=(grade&&file!=='grade')?base+'grade.html?g='+grade:home;
 if(file==='grade'||file==='curriculum')fallback=home;
 if(file==='curriculum'&&grade)fallback=base+'grade.html?g='+grade;
 var isHome=file==='platform'||file===''||file==='index';
 var st=document.createElement('style');
 st.textContent='#sitenav{position:sticky;top:0;z-index:60;display:flex;justify-content:space-between;gap:10px;max-width:1000px;margin:0 auto 14px;padding:8px 0;direction:rtl;flex-wrap:wrap}#sitenav .nv-r{display:flex;gap:8px;flex-wrap:wrap}#sitenav a,#sitenav button{display:inline-flex;align-items:center;gap:6px;cursor:pointer;color:#e6f1f5;text-decoration:none;font:700 .9rem Cairo,Tajawal,sans-serif;background:rgba(8,24,38,.78);border:1px solid rgba(255,255,255,.2);border-radius:99px;padding:8px 16px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}#sitenav a:hover,#sitenav button:hover{border-color:#14b8a6}';
 document.head.appendChild(st);
 var bar=document.createElement('nav');bar.id='sitenav';bar.setAttribute('aria-label','التنقل');
 var root=base;
 bar.innerHTML=(isHome?'<span></span>':'<button type="button" id="navback"><i class="fa-solid fa-arrow-right"></i> رجوع</button>')+
  '<span class="nv-r">'+(isHome?'':'<a href="'+home+'"><i class="fa-solid fa-house"></i> الرئيسية</a>')+
  '<a href="'+root+'progress.html"><i class="fa-solid fa-chart-line"></i> سجل التقدم</a>'+
  '<a href="'+root+'performance.html"><i class="fa-solid fa-chart-column"></i> تحليلات الأداء</a>'+
  '<a href="'+root+'login"><i class="fa-solid fa-user-shield"></i> دخول المدرب</a></span>';
 function gh(){if(!/github\.io$/.test(location.hostname))return;[].forEach.call(document.querySelectorAll('a'),function(a){var h=a.getAttribute('href')||'';if(h==='/login'||h==='/student/progress'||/(^|\/)login$/.test(h))a.setAttribute('href',base+'unavailable.html')})}
 function mount(){document.body.insertBefore(bar,document.body.firstChild);gh();setTimeout(gh,300);var b=document.getElementById('navback');
  if(b)b.onclick=function(){var same=document.referrer&&document.referrer.indexOf(location.origin)===0;if(history.length>1&&same)history.back();else location.href=fallback;};}
 /* زر عائم للطباعة وحفظ PDF في كل الصفحات (الاستوديو له زره الخاص) */
 function fab(){if(file==='studio'||document.getElementById('fab'))return;
  var ps=document.createElement('style');
  ps.textContent='#pfab{position:fixed;left:16px;bottom:16px;z-index:70;display:flex;align-items:center;gap:8px;padding:11px 16px;border-radius:99px;border:1px solid rgba(243,217,122,.6);background:linear-gradient(135deg,#d4af37,#f3d97a);color:#1a1400;font:800 .92rem Cairo,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.45)}@media print{#pfab,#sitenav{display:none!important}*{color:#111!important;background:transparent!important;box-shadow:none!important;text-shadow:none!important;backdrop-filter:none!important}body{background:#fff!important}}';
  document.head.appendChild(ps);
  var b=document.createElement('button');b.type='button';b.id='pfab';b.setAttribute('aria-label','طباعة أو حفظ PDF');b.title='طباعة الصفحة أو حفظها بصيغة PDF (اختر «حفظ بصيغة PDF» من نافذة الطباعة)';
  b.innerHTML='<i class="fa-solid fa-print"></i> طباعة / PDF';b.onclick=function(){window.print()};document.body.appendChild(b)}
 function mount2(){mount();fab()}
 if(document.body)mount2();else document.addEventListener('DOMContentLoaded',mount2);
})();
