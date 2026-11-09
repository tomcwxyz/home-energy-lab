'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function SyncNow(){
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState('');
  const router=useRouter();
  async function refresh(){
    setLoading(true);setMessage('');
    try{
      const r=await fetch('/api/sync',{method:'POST'});
      const j=await r.json();
      if(!r.ok)throw Error(j.error||'Sync failed');
      setMessage((j.sources||[]).map(s=>s.source+': '+(s.status==='ok'?s.imported+' readings imported':s.message||s.status)).join(' · '));
      router.refresh();
    }catch(e){setMessage(e.message)}finally{setLoading(false)}
  }
  return <div className="sync-controls">
    <button type="button" disabled={loading} onClick={refresh}>{loading?'Refreshing data…':'Refresh connected data'}</button>
    <p role="status" className="note">{message}</p>
  </div>;
}
