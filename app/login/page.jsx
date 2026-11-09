'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function Login(){
  const router=useRouter(), [error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function submit(e) {
    e.preventDefault();setBusy(true);setError('');
    const f=new FormData(e.currentTarget);
    try {
      const res=await fetch('/api/session/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:f.get('username'),password:f.get('password')})});
      if(!res.ok)throw Error((await res.json()).error||'Could not sign in');
      router.replace('/');router.refresh();
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }
  return <main className="login-wrap"><div className="eyebrow">HOME / ENERGY</div><h1>Energy Lab</h1><p>Private household energy monitoring and experiments.</p>
    <form className="panel form" onSubmit={submit}>
      <div className="field"><label htmlFor="user">Username</label><input id="user" name="username" autoComplete="username" required /></div>
      <div className="field"><label htmlFor="pass">Password</label><input id="pass" type="password" name="password" autoComplete="current-password" required /></div>
      {error&&<p role="alert" className="error">{error}</p>}<button disabled={busy}>{busy?'Signing in…':'Sign in'}</button>
    </form></main>;
}
