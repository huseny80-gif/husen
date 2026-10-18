// فهرس المنصة: الصفوف والاختبارات. يُستخدم في الصفحة الرئيسية وصفحات الصفوف وشريط التنقل.
window.CATALOG={
 grades:[
  {g:4,name:'الصف الرابع الإعدادي',short:'الرابع',icon:'fa-4'},
  {g:5,name:'الصف الخامس الإعدادي',short:'الخامس',icon:'fa-5'},
  {g:6,name:'الصف السادس الإعدادي',short:'السادس',icon:'fa-6'}],
 // g = الصف، f = اسم الملف داخل quizzes/، n = عدد الأسئلة، k = مفتاح حفظ الدرجات
 quizzes:[
  {g:4,f:'physics-prep',sub:'الفيزياء',u:3,t:'الفيزياء',i:'fa-atom',n:18,k:'phys-v1',tag:'عام'},
  {g:4,f:'math-prep',sub:'الرياضيات',u:3,t:'الرياضيات',i:'fa-square-root-variable',n:15,k:'math-v1',tag:'عام'},
  {g:4,f:'arabic-prep',sub:'اللغة العربية',u:3,t:'اللغة العربية — النحو والإملاء',i:'fa-book-quran',n:14,k:'ar-v1',tag:'عام'},
  {g:4,f:'biology-prep',sub:'الأحياء',u:3,t:'الأحياء',i:'fa-dna',n:13,k:'bio-v1',tag:'عام'},
  {g:4,f:'english-prep',sub:'اللغة الإنجليزية',u:2,t:'اللغة الإنجليزية — Grammar',i:'fa-language',n:10,k:'en-v1',tag:'عام'},
  {g:6,f:'chemistry-grade6',sub:'الكيمياء',u:8,t:'الكيمياء',i:'fa-flask-vial',n:147,k:'chem6-scores-v1'},
  {g:6,f:'arabic2-prep',sub:'اللغة العربية',u:5,t:'اللغة العربية — الجزء الثاني',i:'fa-book-open',n:37,k:'ar2-v1'},
  {g:6,f:'islamic-prep',sub:'التربية الإسلامية',u:5,t:'القرآن الكريم والتربية الإسلامية',i:'fa-book-quran',n:51,k:'isl-v1'}
 ],
 // الصفوف التي لها كتب في مكتبة المناهج
 libraryGrades:[6]
};
