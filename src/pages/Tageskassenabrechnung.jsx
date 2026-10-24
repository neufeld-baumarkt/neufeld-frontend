import {
  ArrowLeft,
  Banknote,
  Calculator,
  Landmark,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import KasseneinzaehlModal from '../components/tageskasse/KasseneinzaehlModal';
import { employeePinApi } from '../lib/employeePinApi';
import { kasseneinzaehlungApi } from '../lib/kasseneinzaehlungApi';

const processes = [
  {
    id: 'opening-count',
    label: 'Kasse einzählen',
    description: 'Eine Kassenlade sicher auf den verbindlichen Bestand von 250,00 € vorbereiten.',
    icon: Banknote,
    enabled: true,
  },
  {
    id: 'closing',
    label: 'Kasse abrechnen',
    description: 'Stückelungen erfassen, Einnahmen berechnen und die Übergabe an EuroControl vorbereiten.',
    icon: Calculator,
    enabled: false,
  },
  {
    id: 'safe-count',
    label: 'Tresorzählung',
    description: 'Den tatsächlichen Tresorbestand im Vier-Augen-Prinzip zählen und dokumentieren.',
    icon: Landmark,
    enabled: false,
  },
];

export default function Tageskassenabrechnung() {
  const navigate = useNavigate();
  const [openingCountOpen, setOpeningCountOpen] = useState(false);
  const user = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem('user')) || {}; } catch { return {}; }
  }, []);
  const branch = String(user.filiale || '').trim();
  const today = new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  const openProcess = (process) => {
    if (!process.enabled) return toast('Dieser Prozess wird erst nach der gemeinsamen fachlichen Festlegung freigeschaltet.', { icon: '🔒' });
    if (!branch || branch.toLowerCase() === 'alle') return toast.error('Deinem Benutzerkonto ist keine einzelne Filiale zugeordnet.');
    setOpeningCountOpen(true);
  };

  return (
    <main className="min-h-screen min-h-dvh bg-[#353232] text-white">
      <header className="bg-[#800000] shadow-xl">
        <div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-4 px-3 sm:px-6 lg:px-10">
          <button
            type="button"
            onClick={() => navigate('/start')}
            className="flex min-h-11 items-center gap-2 rounded-xl px-3 font-black hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ArrowLeft size={20} aria-hidden="true" />
            <span>Startseite</span>
          </button>

          <div className="hidden items-center gap-3 text-right sm:flex">
            <img
              src="/Icons/tageskassenabrechnung.png"
              alt=""
              className="h-11 w-11 rounded-full object-cover"
            />
            <div>
              <div className="text-xs font-bold uppercase tracking-[.18em] text-white/65">Filialprozess</div>
              <div className="font-black">Tageskassenabrechnung</div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1300px] p-3 sm:p-6 lg:p-10">
        <section className="rounded-3xl bg-gradient-to-br from-[#4a4747] to-[#302e2e] p-5 shadow-2xl sm:p-8 lg:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-bold uppercase tracking-[.24em] text-amber-300/80">{branch && branch.toLowerCase() !== 'alle' ? branch : 'Tageskassenabrechnung'}</div>
              <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">Was möchtest du erledigen?</h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
                Hier werden künftig alle Kassenvorgänge eines Geschäftstages sicher zusammengeführt.
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 sm:text-right">
              <div className="text-xs font-bold uppercase tracking-wider text-white/40">Geschäftstag</div>
              <div className="mt-1 font-black capitalize">{today}</div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {processes.map((process) => {
              const Icon = process.icon;
              return (
                <button
                  type="button"
                  onClick={() => openProcess(process)}
                  key={process.label}
                  className={`relative min-h-56 overflow-hidden rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:p-6 ${process.enabled ? 'border-amber-300/30 bg-white/[.09] hover:-translate-y-1 hover:bg-white/[.13]' : 'border-white/10 bg-white/[.07] text-white/60'}`}
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-[#5b170c] shadow-lg shadow-amber-900/20">
                    <Icon size={30} strokeWidth={2.25} aria-hidden="true" />
                  </span>
                  <h2 className="mt-5 text-2xl font-black">{process.label}</h2>
                  <p className="mt-2 leading-relaxed text-white/60">{process.description}</p>
                  <div className={`mt-5 flex items-center gap-2 text-sm font-bold ${process.enabled ? 'text-amber-200' : 'text-amber-200/70'}`}>
                    {process.enabled ? <ShieldCheck size={17} aria-hidden="true" /> : <LockKeyhole size={17} aria-hidden="true" />}
                    {process.enabled ? 'Jetzt starten' : 'Wird im nächsten Schritt freigeschaltet'}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-50 sm:p-5">
            <ShieldCheck className="mt-0.5 shrink-0 text-emerald-300" size={24} aria-hidden="true" />
            <p>
              „Kasse einzählen“ ist freigeschaltet. Jede abgeschlossene Einzählung wird einer Filiale, einer Lade und den bestätigten Mitarbeitern eindeutig zugeordnet.
            </p>
          </div>
        </section>
      </div>
      {openingCountOpen && (
        <KasseneinzaehlModal
          branch={branch}
          onClose={() => setOpeningCountOpen(false)}
          verifyPin={(pin, options) => kasseneinzaehlungApi.verifyPin(pin, options)}
          loadFirstUseCandidates={() => employeePinApi.firstUseCandidates()}
          activatePin={(payload) => employeePinApi.activate(payload)}
          previousClosingFor={({ drawerNumber }) => kasseneinzaehlungApi.previousClosing(drawerNumber)}
          onComplete={(payload) => kasseneinzaehlungApi.saveOpeningCount(payload)}
        />
      )}
    </main>
  );
}
