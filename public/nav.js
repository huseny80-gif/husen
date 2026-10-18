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
  '<a href="'+root+'login"><i class="fa-solid fa-user-shield"></i> دخول المدرب</a></span>';
 function gh(){if(!/github\.io$/.test(location.hostname))return;[].forEach.call(document.querySelectorAll('a'),function(a){var h=a.getAttribute('href')||'';if(h==='/login'||h==='/student/progress'||/(^|\/)login$/.test(h))a.setAttribute('href',base+'unavailable.html')})}
 function mount(){document.body.insertBefore(bar,document.body.firstChild);gh();setTimeout(gh,300);var b=document.getElementById('navback');
  if(b)b.onclick=function(){var same=document.referrer&&document.referrer.indexOf(location.origin)===0;if(history.length>1&&same)history.back();else location.href=fallback;};}
 if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount);
})();
