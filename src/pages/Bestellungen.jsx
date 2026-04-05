import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

import BestellModalMellerud from '../components/bestellungen/BestellModalMellerud';
import BestellModalChamberlain from '../components/bestellungen/BestellModalChamberlain';
import BestellModalBevermann from '../components/bestellungen/BestellModalBevermann';

export default function Bestellungen() {
  const [lieferanten, setLieferanten] = useState([]);
  const [loadingLieferanten, setLoadingLieferanten] = useState(false);

  const [selectedLieferant, setSelectedLieferant] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [bestellungen, setBestellungen] = useState([]);
  const [loadingBestellungen, setLoadingBestellungen] = useState(false);

  // 🔥 NEU (1:1 aus Reklamationen)
  const [menuOpen, setMenuOpen] = useState(false);

  const baseUrl = import.meta.env.VITE_API_URL;

  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem("user"));
  } catch {}

  const displayName = user?.name || "Unbekannt";

  const handleZurueck = () => {
    window.location.href = "/start";
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    window.location.href = "/";
  };

  const getToken = () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      toast.error('Kein Zugriffstoken gefunden.');
      return null;
    }
    return token;
  };

  const fetchLieferanten = async () => {
    const token = getToken();
    if (!token) return;

    try {
      setLoadingLieferanten(true);

      const res = await axios.get(`${baseUrl}/api/bestellungen/lieferanten`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const items = Array.isArray(res?.data?.items) ? res.data.items : [];
      setLieferanten(items);
    } catch (err) {
      toast.error('Lieferanten konnten nicht geladen werden.');
      setLieferanten([]);
    } finally {
      setLoadingLieferanten(false);
    }
  };

  const fetchBestellungen = async () => {
    const token = getToken();
    if (!token) return;

    try {
      setLoadingBestellungen(true);

      const res = await axios.get(`${baseUrl}/api/bestellungen`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const items = Array.isArray(res?.data?.items) ? res.data.items : [];
      setBestellungen(items);
    } catch (err) {
      toast.error('Bestellungen konnten nicht geladen werden.');
      setBestellungen([]);
    } finally {
      setLoadingBestellungen(false);
    }
  };

  useEffect(() => {
    fetchLieferanten();
    fetchBestellungen();
  }, []);

  const handleLieferantClick = (lieferant) => {
    setSelectedLieferant(lieferant);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('de-DE');
  };

  const formatMoney = (value) => {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return '-';
    return `${numberValue.toFixed(2)} €`;
  };

  return (
    <div className="relative w-screen min-h-screen bg-[#3A3838] text-white overflow-hidden">

      {/* 🔥 Animationen (1:1 übernommen) */}
      <style jsx>{`
        @keyframes arrowWiggle {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-10px); }
        }
      `}</style>

      {/* 🔥 LOGIN INFO + LOGOUT */}
      <div
        className="absolute top-[20px] text-xl font-semibold text-white cursor-pointer select-none"
        style={{ right: '40px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        Angemeldet als: {displayName}
        {menuOpen && (
          <div className="absolute right-0 mt-2 bg-white/90 text-black rounded shadow-lg z-50 px-5 py-4 backdrop-blur-sm">
            <div onClick={handleLogout} className="hover:bg-gray-100 cursor-pointer flex items-center gap-3 py-2 px-2 rounded transition">
              <span>Abmelden</span>
            </div>
          </div>
        )}
      </div>

      {/* Layout */}
      <div className="absolute top-0 left-0 w-full bg-[#800000]" style={{ height: '57px' }}></div>
      <div className="absolute top-0 left-0 h-full bg-[#800000]" style={{ width: '57px' }}></div>
      <div className="absolute top-[57px] left-[57px] right-0 bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '7px' }}></div>
      <div className="absolute top-[57px] left-[57px] bottom-0 bg-white" style={{ width: '7px' }}></div>
      <div className="absolute bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '11px', top: '165px', left: '95px', right: '80px' }}></div>

      <h1 className="absolute text-6xl font-bold text-white z-10" style={{ top: '100px', left: '92px' }}>
        Bestellungen (Eigeneinkauf)
      </h1>

      {/* 🔥 ZURÜCK BUTTON (1:1 mit Animation) */}
      <div
        className="absolute top-[180px] left-[90px] cursor-pointer flex items-center gap-4 text-white hover:text-gray-300 transition-all group"
        onClick={handleZurueck}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="36" height="36"
          fill="white"
          viewBox="0 0 24 24"
          className="transition-all duration-200 group-hover:animate-[arrowWiggle_1s_ease-in-out_infinite]"
        >
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
        <span className="text-2xl font-medium">Zurück zum Hauptmenü</span>
      </div>

      <div className="absolute top-[260px] left-[90px] right-[80px] bottom-[40px] flex gap-6">

        {/* LEFT */}
        <div className="w-[260px] bg-white/10 rounded-xl border border-white/10 p-4 overflow-auto">
          <div className="text-lg font-semibold mb-4">Lieferanten</div>

          {loadingLieferanten ? (
            <div>Lade...</div>
          ) : (
            lieferanten.map((l) => (
              <div
                key={l.id}
                onClick={() => handleLieferantClick(l)}
                className={`px-3 py-2 rounded-lg cursor-pointer ${
                  selectedLieferant?.code === l.code ? 'bg-[#800000]' : ''
                }`}
              >
                {l.name}
              </div>
            ))
          )}
        </div>

        {/* RIGHT */}
        <div className="flex-1 bg-white/10 rounded-xl p-6 overflow-auto">
          {bestellungen.map((b) => (
            <div key={b.id}>
              {b?.supplier?.name} – {formatMoney(b.gesamtsumme_netto)}
            </div>
          ))}
        </div>
      </div>

      <BestellModalMellerud
        isOpen={isModalOpen && selectedLieferant?.code === 'mellerud'}
        lieferant={selectedLieferant}
        onClose={closeModal}
      />
      <BestellModalChamberlain
        isOpen={isModalOpen && selectedLieferant?.code === 'chamberlain'}
        lieferant={selectedLieferant}
        onClose={closeModal}
      />
      <BestellModalBevermann
        isOpen={isModalOpen && selectedLieferant?.code === 'bevermann'}
        lieferant={selectedLieferant}
        onClose={closeModal}
      />
    </div>
  );
}