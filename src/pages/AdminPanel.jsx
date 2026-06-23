import React from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function AdminPanel() {
  const navigate = useNavigate();

  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem('user'));
  } catch (e) {
    console.warn('❗ Benutzer konnte nicht geladen werden:', e);
  }

  const displayName = user?.name || 'Unbekannt';
  const role = user?.role || 'Unbekannt';

  const handleBack = () => {
    navigate('/start');
  };

  const handleDevCenter = () => {
    navigate('/dev-center');
  };

  const handleComingSoon = (label) => {
    toast(`${label} ist noch nicht implementiert.`, { icon: '🛠️' });
  };

  const Gauge = ({ label, value, subLabel }) => {
    const rotation = -120 + (value / 100) * 240;

    return (
      <div className="relative bg-black/55 border border-white/20 rounded-3xl p-5 shadow-[0_0_35px_rgba(128,0,0,0.45)] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(128,0,0,0.25),transparent_65%)]"></div>

        <div className="relative z-10">
          <div className="text-center text-xs uppercase tracking-[0.35em] text-white/50 mb-3">
            {label}
          </div>

          <div className="relative mx-auto w-44 h-24 overflow-hidden">
            <div className="absolute left-0 top-0 w-44 h-44 rounded-full border-[14px] border-white/10"></div>
            <div className="absolute left-0 top-0 w-44 h-44 rounded-full border-[14px] border-t-green-400 border-r-yellow-300 border-b-red-500 border-l-green-400 rotate-45 opacity-80"></div>

            <div
              className="absolute left-1/2 bottom-0 w-1 h-20 bg-red-500 origin-bottom shadow-[0_0_12px_rgba(255,0,0,0.9)]"
              style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
            ></div>

            <div className="absolute left-1/2 bottom-0 w-5 h-5 -translate-x-1/2 translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]"></div>
          </div>

          <div className="text-center mt-2">
            <div className="text-4xl font-black">{value}%</div>
            <div className="text-xs uppercase tracking-[0.25em] text-white/45 mt-1">
              {subLabel}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const StatusLight = ({ label, status, color = 'green' }) => {
    const colorClass =
      color === 'green'
        ? 'bg-green-400 shadow-[0_0_18px_rgba(74,222,128,0.9)]'
        : color === 'yellow'
          ? 'bg-yellow-300 shadow-[0_0_18px_rgba(253,224,71,0.9)]'
          : 'bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.9)]';

    return (
      <div className="flex items-center justify-between bg-black/45 border border-white/15 rounded-2xl px-4 py-3">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-white/40">{label}</div>
          <div className="text-lg font-black">{status}</div>
        </div>
        <div className={`w-5 h-5 rounded-full ${colorClass}`}></div>
      </div>
    );
  };

  return (
    <div className="relative w-screen h-screen bg-[#060606] overflow-hidden text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(128,0,0,0.55),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.10),transparent_28%)]"></div>
      <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      <div className="absolute top-0 left-0 w-full bg-[#800000]" style={{ height: '57px' }}></div>
      <div className="absolute top-0 left-0 h-full bg-[#800000]" style={{ width: '57px' }}></div>
      <div
        className="absolute top-[57px] left-[57px] right-0 bg-white shadow-[3px_3px_10px_rgba(0,0,0,0.8)]"
        style={{ height: '7px' }}
      ></div>
      <div className="absolute top-[57px] left-[57px] bottom-0 bg-white" style={{ width: '7px' }}></div>

      <div className="relative z-10 ml-[95px] mr-[80px] pt-[80px]">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-sm uppercase tracking-[0.45em] text-red-300/80 mb-2">
              Neufeld Baumarkt GmbH 3.0
            </div>
            <h1 className="text-7xl font-black tracking-tight drop-shadow-[0_0_18px_rgba(128,0,0,0.9)]">
              CONTROL CENTER
            </h1>
            <div className="mt-2 text-white/70 text-xl font-semibold">
              Central Operations · Admin Command Interface
            </div>
          </div>

          <div className="text-right">
            <div className="bg-black/60 border border-white/20 rounded-3xl px-6 py-5 shadow-[0_0_35px_rgba(128,0,0,0.55)] backdrop-blur-sm">
              <div className="text-xs uppercase tracking-[0.3em] text-white/40">Operator</div>
              <div className="text-2xl font-black mt-1">{displayName}</div>
              <div className="text-sm text-red-300 mt-1">AUTH LEVEL: {role}</div>
            </div>

            <button
              onClick={handleBack}
              className="mt-4 px-5 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition font-black uppercase tracking-[0.18em] text-sm"
            >
              Exit Control
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-5">
          <StatusLight label="Backend" status="ONLINE" color="green" />
          <StatusLight label="Frontend" status="ONLINE" color="green" />
          <StatusLight label="PostgreSQL" status="LINKED" color="yellow" />
          <StatusLight label="JWT / Roles" status="ARMED" color="green" />
        </div>

        <div className="grid grid-cols-4 gap-5 mb-5">
          <Gauge label="Render CPU" value={37} subLabel="Simulation" />
          <Gauge label="Render RAM" value={52} subLabel="Simulation" />
          <Gauge label="Synology Load" value={41} subLabel="Simulation" />
          <Gauge label="DB Pressure" value={18} subLabel="Simulation" />
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 bg-black/55 border border-white/20 rounded-3xl p-6 shadow-[0_0_40px_rgba(128,0,0,0.45)] backdrop-blur-sm">
            <div className="flex justify-between items-end mb-5">
              <div>
                <h2 className="text-4xl font-black">MISSION MODULES</h2>
                <p className="text-white/50 mt-1">
                  Aktive und geplante Werkzeuge für Systemsteuerung, Entwicklung und Diagnose.
                </p>
              </div>

              <div className="text-xs uppercase tracking-[0.25em] text-red-300/70">
                OPS V2 · VISUAL MODE
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={handleDevCenter}
                className="group text-left rounded-2xl p-5 bg-[#800000]/90 border border-red-300/30 shadow-[0_0_28px_rgba(128,0,0,0.75)] hover:bg-[#a00000] hover:-translate-y-1 transition"
              >
                <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-2">
                  Armed
                </div>
                <div className="text-3xl font-black mb-2">DEV Center</div>
                <div className="text-white/70 text-sm">
                  SQL-Konsole über geschützten Backend-Endpunkt.
                </div>
                <div className="mt-4 text-white/60 group-hover:text-white transition">
                  Launch →
                </div>
              </button>

              <button
                onClick={() => handleComingSoon('DB Explorer')}
                className="text-left rounded-2xl p-5 bg-white/8 border border-white/15 shadow-xl opacity-75 hover:opacity-100 hover:bg-white/12 transition"
              >
                <div className="text-xs uppercase tracking-[0.3em] text-white/35 mb-2">
                  Standby
                </div>
                <div className="text-2xl font-black mb-2">DB Explorer</div>
                <div className="text-white/50 text-sm">
                  Schemas, Tabellen, Spalten und Datensätze.
                </div>
              </button>

              <button
                onClick={() => handleComingSoon('Systemlogs')}
                className="text-left rounded-2xl p-5 bg-white/8 border border-white/15 shadow-xl opacity-75 hover:opacity-100 hover:bg-white/12 transition"
              >
                <div className="text-xs uppercase tracking-[0.3em] text-white/35 mb-2">
                  Standby
                </div>
                <div className="text-2xl font-black mb-2">Logs</div>
                <div className="text-white/50 text-sm">
                  Admin-, API- und Fehlerereignisse.
                </div>
              </button>

              <button
                onClick={() => handleComingSoon('Benutzerverwaltung')}
                className="text-left rounded-2xl p-5 bg-white/8 border border-white/15 shadow-xl opacity-75 hover:opacity-100 hover:bg-white/12 transition"
              >
                <div className="text-xs uppercase tracking-[0.3em] text-white/35 mb-2">
                  Standby
                </div>
                <div className="text-2xl font-black mb-2">User Admin</div>
                <div className="text-white/50 text-sm">
                  Benutzer, Rollen und Filialzuweisung.
                </div>
              </button>

              <button
                onClick={() => handleComingSoon('API Tests')}
                className="text-left rounded-2xl p-5 bg-white/8 border border-white/15 shadow-xl opacity-75 hover:opacity-100 hover:bg-white/12 transition"
              >
                <div className="text-xs uppercase tracking-[0.3em] text-white/35 mb-2">
                  Standby
                </div>
                <div className="text-2xl font-black mb-2">API Tests</div>
                <div className="text-white/50 text-sm">
                  Backend-Endpunkte direkt prüfen.
                </div>
              </button>

              <button
                onClick={() => handleComingSoon('Diagnose')}
                className="text-left rounded-2xl p-5 bg-white/8 border border-white/15 shadow-xl opacity-75 hover:opacity-100 hover:bg-white/12 transition"
              >
                <div className="text-xs uppercase tracking-[0.3em] text-white/35 mb-2">
                  Standby
                </div>
                <div className="text-2xl font-black mb-2">Diagnose</div>
                <div className="text-white/50 text-sm">
                  Auth, Backend, DB und Rollenmodell.
                </div>
              </button>
            </div>
          </div>

          <div className="bg-black/55 border border-white/20 rounded-3xl p-6 shadow-[0_0_40px_rgba(128,0,0,0.45)] backdrop-blur-sm">
            <div className="text-xs uppercase tracking-[0.35em] text-red-300/70 mb-3">
              Mission Feed
            </div>

            <div className="space-y-4 text-sm">
              <div className="border-l-4 border-green-400 pl-4">
                <div className="font-black">OPS CENTER ONLINE</div>
                <div className="text-white/45">Admin-Leitstand aktiv</div>
              </div>

              <div className="border-l-4 border-yellow-300 pl-4">
                <div className="font-black">GAUGES SIMULATED</div>
                <div className="text-white/45">Live-Daten folgen über Backend</div>
              </div>

              <div className="border-l-4 border-red-400 pl-4">
                <div className="font-black">DEV CENTER READY</div>
                <div className="text-white/45">Nächstes Modul zur Aktivierung</div>
              </div>

              <div className="border-l-4 border-white/40 pl-4">
                <div className="font-black">ROADMAP LOADED</div>
                <div className="text-white/45">DB Explorer · Logs · Diagnose</div>
              </div>
            </div>

            <div className="mt-8 bg-[#800000]/40 border border-red-300/20 rounded-2xl p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-white/45 mb-2">
                Warning
              </div>
              <div className="text-lg font-black">Big Design Mode</div>
              <div className="text-white/55 text-sm mt-1">
                Braucht man es so groß? Nein. Ist trotzdem besser so.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;