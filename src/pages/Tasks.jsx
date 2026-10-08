import React from 'react';
import { useNavigate } from 'react-router-dom';
import PushTaskCenter from '../components/tasks/PushTaskCenter';

export default function Tasks() {
  const navigate = useNavigate();
  let user = null; try { user = JSON.parse(sessionStorage.getItem('user')); } catch {}
  return <div className="min-h-screen bg-[#3A3838]"><button onClick={()=>navigate('/start')} className="m-3 rounded-lg bg-white px-4 py-2 font-bold text-[#800000] sm:ml-8 sm:mt-6">← Startseite</button><PushTaskCenter user={user}/></div>;
}
