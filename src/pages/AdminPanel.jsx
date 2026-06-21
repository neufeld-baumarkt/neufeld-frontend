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

  return (
    <div className="relative w-screen h-screen bg-[#111111] overflow-hidden text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(128,0,0,0.35),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_30%)]"></div>

      <div className="absolute top-0 left-0 w-full bg-[#800000]" style={{ height: '57px' }}></div>
      <div className="absolute top-0 left-0 h-full bg-[#800000]" style={{ width: '57px' }}></div>
      <div
        className="absolute top-[57px] left-[57px] right-0 bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]"
        style={{ height: '7px' }}
      ></div>
      <div className="absolute top-[57px] left-[57px] bottom-0 bg-white" style={{ width: '7px' }}></div>

      <div className="relative z-10 ml-[95px] mr-[80px] pt-[90px]">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="text-sm uppercase tracking-[0.35em] text-white/60 mb-3">
              Neufeld Baumarkt GmbH 3.0
            </div>
            <h1 className="text-6xl font-black tracking-tight drop-shadow-[3px_3px_8px_rgba(0,0,0,0.8)]">
              Operations Center
            </h1>
            <div className="mt-3 text-white/70 text-lg">
              Admin-Leitstand für Entwicklung, Diagnose und Systemverwaltung
            </div>
          </div>

          <div className="text-right">
            <div className="bg-white/10 border border-white/20 rounded-2xl px-5 py-4 shadow-xl backdrop-blur-sm">
              <div className="text-sm text-white/50">Angemeldet als</div>
              <div className="text-xl font-bold">{displayName}</div>
              <div className="text-sm text-white/60 mt-1">Rolle: {role}</div>
            </div>

            <button
              onClick={handleBack}
              className="mt-4 px-5 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition font-semibold"
            >
              Zurück zur Startseite
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 border border-white/20 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
            <div className="text-sm text-white/50 mb-2">Backend</div>
            <div className="text-2xl font-bold text-green-400">● Online</div>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
            <div className="text-sm text-white/50 mb-2">Frontend</div>
            <div className="text-2xl font-bold text-green-400">● Online</div>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
            <div className="text-sm text-white/50 mb-2">Datenbank</div>
            <div className="text-2xl font-bold text-yellow-300">● Backend geprüft</div>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
            <div className="text-sm text-white/50 mb-2">JWT / Rollen</div>
            <div className="text-2xl font-bold text-green-400">● Aktiv</div>
          </div>
        </div>

        <div className="bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl backdrop-blur-sm">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-3xl font-black">Admin-Module</h2>
              <p className="text-white/60 mt-1">
                Aktive und geplante Werkzeuge für Systemverwaltung und Entwicklung.
              </p>
            </div>

            <div className="text-sm text-white/40">
              DEV Center V2 · Frontend geplant
            </div>
          </div>

          <div className="grid grid-cols-3 gap-5">
            <button
              onClick={handleDevCenter}
              className="group text-left rounded-2xl p-6 bg-[#800000]/80 border border-white/20 shadow-xl hover:bg-[#9b0000] hover:-translate-y-1 transition"
            >
              <div className="text-sm uppercase tracking-[0.25em] text-white/50 mb-3">
                Aktiv
              </div>
              <div className="text-3xl font-black mb-3">DEV Center</div>
              <div className="text-white/70">
                SQL-Konsole für Admin-Aufgaben über den geschützten Backend-Endpunkt.
              </div>
              <div className="mt-5 text-white/60 group-hover:text-white transition">
                Öffnen →
              </div>
            </button>

            <button
              onClick={() => handleComingSoon('DB Explorer')}
              className="text-left rounded-2xl p-6 bg-white/8 border border-white/15 shadow-xl opacity-70 hover:opacity-100 hover:bg-white/12 transition"
            >
              <div className="text-sm uppercase tracking-[0.25em] text-white/40 mb-3">
                Zukunft
              </div>
              <div className="text-3xl font-black mb-3">DB Explorer</div>
              <div className="text-white/55">
                Schemas, Tabellen, Spalten und Datensätze ohne SQL durchsuchen.
              </div>
            </button>

            <button
              onClick={() => handleComingSoon('Systemlogs')}
              className="text-left rounded-2xl p-6 bg-white/8 border border-white/15 shadow-xl opacity-70 hover:opacity-100 hover:bg-white/12 transition"
            >
              <div className="text-sm uppercase tracking-[0.25em] text-white/40 mb-3">
                Zukunft
              </div>
              <div className="text-3xl font-black mb-3">Systemlogs</div>
              <div className="text-white/55">
                Spätere Übersicht über relevante Admin-, API- und Fehlerereignisse.
              </div>
            </button>

            <button
              onClick={() => handleComingSoon('Benutzerverwaltung')}
              className="text-left rounded-2xl p-6 bg-white/8 border border-white/15 shadow-xl opacity-70 hover:opacity-100 hover:bg-white/12 transition"
            >
              <div className="text-sm uppercase tracking-[0.25em] text-white/40 mb-3">
                Zukunft
              </div>
              <div className="text-3xl font-black mb-3">User Admin</div>
              <div className="text-white/55">
                Benutzer, Rollen, Filialzuweisung und Rechte zentral verwalten.
              </div>
            </button>

            <button
              onClick={() => handleComingSoon('API Tests')}
              className="text-left rounded-2xl p-6 bg-white/8 border border-white/15 shadow-xl opacity-70 hover:opacity-100 hover:bg-white/12 transition"
            >
              <div className="text-sm uppercase tracking-[0.25em] text-white/40 mb-3">
                Zukunft
              </div>
              <div className="text-3xl font-black mb-3">API Tests</div>
              <div className="text-white/55">
                Gezielte Prüfung wichtiger Backend-Endpunkte direkt aus der App.
              </div>
            </button>

            <button
              onClick={() => handleComingSoon('Diagnose')}
              className="text-left rounded-2xl p-6 bg-white/8 border border-white/15 shadow-xl opacity-70 hover:opacity-100 hover:bg-white/12 transition"
            >
              <div className="text-sm uppercase tracking-[0.25em] text-white/40 mb-3">
                Zukunft
              </div>
              <div className="text-3xl font-black mb-3">Diagnose</div>
              <div className="text-white/55">
                Technischer Status für Auth, Backend, Datenbank und Rollenmodell.
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;