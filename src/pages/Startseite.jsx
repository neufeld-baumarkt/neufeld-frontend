import { useState } from 'react';
import { ChevronDown, LogOut, Menu, Package, Settings, UserRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import PushTaskCenter from '../components/tasks/PushTaskCenter';
import { canUsePushTaskPilot } from '../lib/pushTaskUi.mjs';

const modules = [
  { label: 'Reklamationen', description: 'Vorgänge erfassen und bearbeiten', path: '/reklamationen', image: '/Icons/reklamation.png' },
  { label: 'Budgetliste', description: 'Budgets und Buchungen im Blick', path: '/budgetliste', image: '/Icons/budget.png' },
  { label: 'Controlling', description: 'Cashflow und Auswertungen', path: '/cashflow', image: '/Icons/cashflow.png' },
  { label: 'Bestellungen', description: 'Bestellungen vorbereiten', path: '/bestellungen', image: '/Icons/Bestellungen_gruen_rund.png' },
  { label: 'Tageskassenabrechnung', description: 'Kassen und Tresor sicher abrechnen', path: '/tageskassenabrechnung', image: '/Icons/tageskassenabrechnung.png' },
  { label: 'Technikstörungen', description: 'Störungen zentral melden', path: '/stoerungen', icon: Settings, disabled: true },
  { label: 'Materialshop', description: 'Verbrauchsmaterial bestellen', path: '/materialshop', icon: Package, disabled: true },
];

export default function Startseite() {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  let user = {};

  try {
    user = JSON.parse(sessionStorage.getItem('user')) || {};
  } catch {
    // Eine unlesbare Sitzung wird durch die geschützte Route behandelt.
  }

  const openModule = (module) => {
    setNavOpen(false);
    if (module.disabled) {
      toast('Zur Zeit noch in Bearbeitung.', { icon: '🛠️' });
      return;
    }
    navigate(module.path);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    navigate('/');
  };

  const firstName = String(user.name || '').split(' ')[0] || 'Kollege';

  return (
    <main className="min-h-screen min-h-dvh overflow-x-hidden bg-[#353232] text-white">
      <header className="relative z-50 bg-[#800000] shadow-xl">
        <div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-3 px-3 sm:px-6 lg:px-10">
          <button
            type="button"
            aria-expanded={navOpen}
            aria-controls="start-navigation"
            onClick={() => setNavOpen(!navOpen)}
            className="flex min-h-11 items-center gap-2 rounded-xl px-3 font-black hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:hidden"
          >
            {navOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            <span>Menü</span>
          </button>

          <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-2 lg:hidden">
            <img src="/logonb-emblem.png" alt="" className="h-9 w-9 rounded-full bg-white object-contain p-1" />
            <span className="hidden font-black sm:inline">Neufeld Baumarkt</span>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <img src="/logonb-emblem.png" alt="Neufeld Baumarkt" className="h-11 w-11 rounded-full bg-white object-contain p-1" />
            <span className="text-lg font-black">Neufeld Baumarkt GmbH</span>
          </div>

          <div className="relative">
            <button
              type="button"
              aria-label={`Benutzermenü für ${user.name || 'Benutzer'}`}
              aria-expanded={userOpen}
              onClick={() => setUserOpen(!userOpen)}
              className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <UserRound size={20} aria-hidden="true" />
              <span className="hidden sm:inline">{user.name || 'Benutzer'}</span>
              <ChevronDown size={16} aria-hidden="true" />
            </button>

            {userOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 rounded-xl bg-white p-2 text-[#242121] shadow-2xl">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left font-bold text-[#800000] hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800000]"
                >
                  <LogOut size={18} aria-hidden="true" />
                  Abmelden
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[250px_1fr]">
        <aside
          id="start-navigation"
          className={`${navOpen ? 'block' : 'hidden'} border-b border-white/10 bg-[#2b2929] p-4 lg:block lg:min-h-[calc(100vh-4rem)] lg:min-h-[calc(100dvh-4rem)] lg:border-b-0 lg:border-r lg:p-5`}
        >
          <div className="mb-3 hidden text-xs font-bold uppercase tracking-[.2em] text-white/40 lg:block">Hauptmenü</div>
          <nav aria-label="Hauptmenü" className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <button
                  type="button"
                  key={module.label}
                  onClick={() => openModule(module)}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-left font-bold transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${module.disabled ? 'text-white/45' : 'text-white/80'}`}
                >
                  {module.image
                    ? <img src={module.image} alt="" className="h-8 w-8 object-contain" />
                    : <Icon size={24} aria-hidden="true" />}
                  <span>{module.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 p-3 sm:p-6 lg:p-10">
          <section className="rounded-3xl bg-gradient-to-br from-[#4a4747] to-[#302e2e] p-5 shadow-2xl sm:p-8">
            <div className="max-w-3xl">
              <div className="text-xs font-bold uppercase tracking-[.24em] text-white/45">Management Tool 3.0</div>
              <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">Guten Tag, {firstName}.</h1>
              <p className="mt-3 text-base text-white/60 sm:text-lg">Was steht heute an?</p>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {modules.filter((module) => !module.disabled).map((module) => (
                <button
                  type="button"
                  key={module.label}
                  onClick={() => openModule(module)}
                  className="group min-h-36 rounded-2xl border border-white/10 bg-white/[.07] p-5 text-left transition hover:-translate-y-1 hover:bg-white/[.11] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                    <img src={module.image} alt="" className="h-9 w-9 object-contain" />
                  </span>
                  <h2 className="mt-4 text-xl font-black">{module.label}</h2>
                  <p className="mt-1 text-sm text-white/60">{module.description}</p>
                </button>
              ))}
            </div>
          </section>

          {canUsePushTaskPilot(user.role) && (
            <div className="mt-6">
              <PushTaskCenter user={user} compact />
            </div>
          )}

          <footer className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-white/35 sm:flex-row sm:justify-between">
            <span>Neufeld Baumarkt GmbH</span>
            <span>Management Tool 3.0 · by Peter Neufeld</span>
          </footer>
        </div>
      </div>
    </main>
  );
}
