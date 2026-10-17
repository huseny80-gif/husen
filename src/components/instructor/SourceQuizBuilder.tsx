'use client';
import {useEffect,useState,FormEvent} from 'react';
import {supabase} from '@/lib/supabase';
import {GeneratedQuestion} from '@/lib/generated-questions';
import {ScientificText} from '@/components/content/ScientificText';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
interface Source {id:string;title:string;body:string|null;storage_path:string|null}
const field='block w-full rounded-xl border border-gray-300 bg-white p-2 text-gray-900';
export function SourceQuizBuilder({chapterId,onSaved}:{chapterId:string;onSaved:()=>void}) {
 const [sources,setSources]=useState<Source[]>([]),[sourceId,setSourceId]=useState(''),[title,setTitle]=useState(''),[body,setBody]=useState(''),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [start,setStart]=useState(1),[end,setEnd]=useState(1),[count,setCount]=useState(5),[kind,setKind]=useState('mcq'),[consent,setConsent]=useState(false),[reviewed,setReviewed]=useState(false),[quizTitle,setQuizTitle]=useState(''),[draft,setDraft]=useState<{sourceId:string;questions:GeneratedQuestion[]}|null>(null);
 async function load(){const {data,error}=await supabase.from('learning_sources').select('id,title,body,storage_path').eq('chapter_id',chapterId).order('created_at');if(error)setError(error.message);else setSources(data as unknown as Source[]);}
 useEffect(()=>{load();},[chapterId]);
 async function add(e:FormEvent){e.preventDefault();setBusy(true);setError('');setNotice('');let path:string|null=null;
 try{
  if(file){if(file.size>25*1024*1024||!file.name.toLowerCase().endsWith('.pdf'))throw new Error('اختر PDF بحجم لا يتجاوز 25 ميغابايت.');path=`${chapterId}/${crypto.randomUUID()}.pdf`;const {error}=await supabase.storage.from('learning-sources').upload(path,file,{contentType:'application/pdf',upsert:false});if(error)throw error;}
  else if(!body.trim())throw new Error('أضف نص المحتوى أو ملف PDF.');
  const {data,error}=await supabase.from('learning_sources').insert({chapter_id:chapterId,title:title.trim(),body:path?null:body.trim(),storage_path:path}).select('id').single();
  if(error)throw error;setSourceId(String(data.id));setTitle('');setBody('');setFile(null);setDraft(null);setNotice('حُفظ مصدر الفصل. يمكنك فتحه أو توليد مسودة اختبار منه.');await load();
 }catch(e){if(path)await supabase.storage.from('learning-sources').remove([path]);setError((e as Error).message);}finally{setBusy(false);}}
 async function openSource(source:Source){if(!source.storage_path)return;setError('');const {data,error}=await supabase.storage.from('learning-sources').createSignedUrl(source.storage_path,300);if(error){setError(error.message);return;}window.open(data.signedUrl,'_blank','noopener,noreferrer');}
 async function generate(){setBusy(true);setError('');setDraft(null);setReviewed(false);setNotice('');try{
  const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('سجل الدخول أولًا.');
  const res=await fetch('/api/questions/generate',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({source_id:sourceId,start,end,count,kind})});const data=await res.json();if(!res.ok)throw new Error(data.error);setDraft({sourceId,questions:data.questions});
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function save(){if(!draft||!reviewed)return;setBusy(true);setError('');try{const {error}=await supabase.rpc('save_source_quiz',{p_source:draft.sourceId,p_title:quizTitle,p_questions:draft.questions});if(error)throw error;setDraft(null);setNotice('حُفظ الاختبار كمسودة. راجعه من إدارة الأسئلة ثم انشره.');onSaved();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const source=sources.find(s=>s.id===sourceId);
 return <section className="space-y-4 rounded-2xl border border-blue-200 p-4" aria-label="محتوى الفصل وتوليد الاختبارات">
 <h2 className="text-xl font-bold">محتوى الفصل وإنشاء اختبار من المصدر</h2>
 {error&&<p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}{notice&&<p role="status" className="rounded bg-green-50 p-3 text-green-800">{notice}</p>}
 <details><summary className="cursor-pointer font-semibold">إضافة محتوى نصي أو رفع PDF</summary><form onSubmit={add} className="mt-3 space-y-3">
 <label className="block">عنوان المصدر<input required maxLength={200} className={field} value={title} onChange={e=>setTitle(e.target.value)}/></label>
 <label className="block">ملف PDF (حتى 25 ميغابايت)<input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={e=>setFile(e.target.files?.[0]??null)}/></label>
 <label className="block">أو نص الدرس<textarea disabled={!!file} maxLength={40000} rows={5} className={field} value={body} onChange={e=>setBody(e.target.value)}/></label>
 <p className="text-sm text-gray-600">للمعادلات استخدم {'\\( x^2 \\)'} وللتفاعلات {'\\( \\ce{CH4 + 2O2 -> CO2 + 2H2O} \\)'}. رفع PDF يحفظه في مساحة خاصة بالمدرب.</p>
 <Button type="submit" loading={busy}>حفظ المحتوى</Button></form></details>
 <label className="block">المصدر<select className={field} value={sourceId} disabled={busy} onChange={e=>{setSourceId(e.target.value);setDraft(null);setStart(1);setEnd(1);}}><option value="">اختر مصدرًا محفوظًا</option>{sources.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
 {source?.storage_path&&<Button variant="secondary" onClick={()=>openSource(source)}>فتح PDF للتحقق من الصفحات</Button>}
 {source?.body&&<Card><ScientificText text={source.body}/></Card>}
 <div className="grid gap-3 sm:grid-cols-3"><label>من صفحة PDF<input type="number" min={1} className={field} value={start} disabled={busy||!source?.storage_path} onChange={e=>setStart(Number(e.target.value))}/></label><label>إلى صفحة PDF<input type="number" min={start} max={start+9} className={field} value={end} disabled={busy||!source?.storage_path} onChange={e=>setEnd(Number(e.target.value))}/></label><label>عدد الأسئلة<input type="number" min={1} max={10} className={field} value={count} disabled={busy} onChange={e=>setCount(Number(e.target.value))}/></label></div>
 <label className="block">نوع الاختبار<select className={field} value={kind} disabled={busy} onChange={e=>setKind(e.target.value)}><option value="mcq">اختيار متعدد — يشمل المسائل والقواعد والإعراب</option><option value="tf">صح وخطأ</option></select></label>
 <p className="text-sm text-gray-600">حتى 10 صفحات لكل طلب. المراجع بأرقام صفحات PDF؛ قد تختلف عن الأرقام المطبوعة. الحلول المولّدة تحتاج مراجعة بشرية، خاصة المعادلات والإعراب.</p>
 <label className="flex items-start gap-2"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>أوافق على إرسال الصفحات المختارة أو نص الدرس إلى خدمة OpenAI لإنشاء الأسئلة.</label>
 <Button disabled={busy||!sourceId||!consent||start<1||end<start||end-start>=10||count<1||count>10} loading={busy} onClick={generate}>توليد مسودة للمراجعة</Button>
 {draft&&<div className="space-y-3"><h3 className="font-bold">راجع الأسئلة والحلول والشواهد في المصدر قبل الحفظ</h3>{draft.questions.map((q,i)=><Card key={i}><ScientificText text={`${i+1}. ${q.question_text}`}/><ul>{q.options.map(o=><li key={o.key}><ScientificText text={`${o.key}: ${o.text}${o.key===q.correct_answer?' ✓':''}`}/></li>)}</ul><p className="mt-2 font-bold">الحل والتغذية الراجعة</p><ScientificText text={q.explanation}/><p className="mt-2">صفحة PDF: {q.source_page}</p><ScientificText text={q.source_quote}/></Card>)}
 <label className="block">عنوان الاختبار<input required maxLength={200} className={field} value={quizTitle} onChange={e=>setQuizTitle(e.target.value)}/></label>
 <label className="flex gap-2"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>راجعت الحلول والرموز ومراجع الصفحات وأوافق على حفظ المسودة.</label><Button disabled={busy||!reviewed||!quizTitle.trim()} onClick={save} loading={busy}>حفظ اختبار مسودة</Button></div>}
 </section>;
}
