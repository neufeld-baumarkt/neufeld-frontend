import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Bestellungen() {
  const [lieferanten, setLieferanten] = useState([]);
  const [loadingLieferanten, setLoadingLieferanten] = useState(false);
  const [selectedLieferant, setSelectedLieferant] = useState('');

  const baseUrl = import.meta.env.VITE_API_URL;

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
      console.error('Fehler beim Laden der Lieferanten:', err);
      toast.error('Lieferanten konnten nicht geladen werden.');
      setLieferanten([]);
    } finally {
      setLoadingLieferanten(false);
    }
  };

  useEffect(() => {
    fetchLieferanten();
  }, []);

  return (
    <div className="relative w-screen min-h-screen bg-[#3A3838] text-white overflow-hidden">

      {/* Layout */}
      <div className="absolute top-0 left-0 w-full bg-[#800000]" style={{ height: '57px' }}></div>
      <div className="absolute top-0 left-0 h-full bg-[#800000]" style={{ width: '57px' }}></div>
      <div className="absolute top-[57px] left-[57px] right-0 bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '7px' }}></div>
      <div className="absolute top-[57px] left-[57px] bottom-0 bg-white" style={{ width: '7px' }}></div>
      <div className="absolute bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '11px', top: '165px', left: '95px', right: '80px' }}></div>

      {/* Titel */}
      <h1
        className="absolute text-6xl font-bold drop-shadow-[3px_3px_6px_rgba(0,0,0,0.6)] text-white z-10"
        style={{ top: '100px', left: '92px' }}
      >
        Bestellungen (Eigeneinkauf)
      </h1>

      {/* Zurück */}
      <div
        className="absolute top-[180px] left-[90px] cursor-pointer flex items-center gap-4 text-white hover:text-gray-300 transition-all group"
        onClick={() => (window.location.href = '/start')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="white" viewBox="0 0 24 24">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
        <span className="text-2xl font-medium">Zurück zum Hauptmenü</span>
      </div>

      {/* Hauptbereich */}
      <div className="absolute top-[260px] left-[90px] right-[80px] bottom-[40px] flex gap-6">

        {/* LEFT: Lieferanten */}
        <div className="w-[260px] bg-white/10 rounded-xl border border-white/10 p-4 overflow-auto">
          <div className="text-lg font-semibold mb-4">Lieferanten</div>

          {loadingLieferanten ? (
            <div className="text-white/60">Lade...</div>
          ) : (
            <div className="flex flex-col gap-2">
              {lieferanten.map((l) => (
                <div
                  key={l.id}
                  onClick={() => setSelectedLieferant(l.code)}
                  className={`px-3 py-2 rounded-lg cursor-pointer transition ${
                    selectedLieferant === l.code
                      ? 'bg-[#800000]'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {l.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Hauptbereich */}
        <div className="flex-1 bg-white/10 rounded-xl border border-white/10 p-6 overflow-auto">

          {!selectedLieferant ? (
            <div className="text-white/60">
              Bitte wähle einen Lieferanten aus.
            </div>
          ) : (
            <>
              <div className="text-xl font-semibold mb-4">
                {selectedLieferant.toUpperCase()}
              </div>

              <div className="text-white/60">
                [Hier kommt später:]
                <br />- Bestellhistorie
                <br />- Artikel
                <br />- Bestellmodal
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
}