'use client';
import { useRouter } from 'next/navigation';
export default function SignOut(){
  const router=useRouter();
  return <button className="subtle" type="button" onClick={async()=>{await fetch('/api/session/logout',{method:'POST'});router.push('/login');router.refresh();}}>Sign out</button>;
}
