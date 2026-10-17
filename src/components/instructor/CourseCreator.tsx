'use client';
import {useEffect,useState,FormEvent} from 'react';
import {supabase} from '@/lib/supabase';
import {Button} from '@/components/ui/Button';
export function CourseCreator({onCreated}:{onCreated:()=>void}) {
 const [grades,setGrades]=useState<{id:number;name:string}[]>([]),[grade,setGrade]=useState(''),[title,setTitle]=useState(''),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{supabase.from('grades').select('id,name').order('id').then(({data,error})=>{if(error)setError(error.message);else setGrades(data as unknown as {id:number;name:string}[]);});},[]);
 async function save(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const {error}=await supabase.rpc('create_assigned_course',{p_grade:Number(grade),p_title:title});if(error)throw error;setTitle('');setOpen(false);onCreated();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <div className="mb-5"><Button onClick={()=>setOpen(!open)}>إضافة مادة دراسية</Button>{error&&<p role="alert" className="text-red-700">{error}</p>}{open&&<form onSubmit={save} className="mt-3 flex flex-wrap gap-3 rounded-xl bg-white p-4"><label>المرحلة<select required value={grade} onChange={e=>setGrade(e.target.value)} className="block rounded border p-2"><option value="">اختر المرحلة</option>{grades.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label><label>اسم المادة<input required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} className="block rounded border p-2"/></label><Button type="submit" loading={busy}>حفظ وإسناد المادة لحسابي</Button></form>}</div>;
}
