import { useEffect, useRef, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../lib/auth';
import { inactivityState } from '../lib/inactivityPolicy.mjs';

const EVENTS = ['pointerdown', 'keydown', 'input', 'touchstart'];

export default function InactivityGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastActivityRef = useRef(Date.now());
  const [warningSeconds, setWarningSeconds] = useState(0);

  useEffect(() => {
    if (!sessionStorage.getItem('token')) { setWarningSeconds(0); return undefined; }
    lastActivityRef.current = Date.now();
    const activity = () => { lastActivityRef.current = Date.now(); setWarningSeconds(0); };
    EVENTS.forEach((eventName)=>window.addEventListener(eventName, activity, { passive: true }));
    const interval = window.setInterval(() => {
      const state = inactivityState({ lastActivityAt: lastActivityRef.current, now: Date.now() });
      if (state.expired) {
        window.clearInterval(interval);
        logout();
        setWarningSeconds(0);
        navigate('/', { replace: true, state: { reason: 'inactive' } });
        return;
      }
      setWarningSeconds(state.warning ? state.remainingSeconds : 0);
    }, 1000);
    return () => {
      window.clearInterval(interval);
      EVENTS.forEach((eventName)=>window.removeEventListener(eventName, activity));
    };
  }, [location.pathname, navigate]);

  if (!warningSeconds) return null;
  return <div className="fixed inset-x-3 top-3 z-[1000000] mx-auto max-w-xl rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-950 shadow-2xl" role="alert"><div className="flex items-center gap-3"><Clock3 className="shrink-0" size={30}/><div><strong className="block text-lg">Automatische Abmeldung in {warningSeconds} Sekunden</strong><span className="text-sm">Tippe, klicke oder drücke eine Taste, um angemeldet zu bleiben. Angefangene Tageskassenprozesse werden in der DB gespeichert.</span></div></div></div>;
}
