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
      console.error('Fehler beim Laden der Bestellungen:', err);
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
    if (!lieferant) return;

    setSelectedLieferant(lieferant);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const formatDate = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString('de-DE');
    } catch {
      return '-';
    }
  };

  const formatMoney = (value) => {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return '-';
    return `${numberValue.toFixed(2)} €`;
  };

  return (
    <div className="relative w-screen min-h-screen bg-[#3A3838] text-white overflow-hidden">

      {/* Layout */}
      <div className="absolute top-0 left-0 w-full bg-[#800000]" style={{ height: '57px' }}></div>
      <div className="absolute top-0 left-0 h-full bg-[#800000]" style={{ width: '57px' }}></div>
      <div className="absolute top-[57px] left-[57px] right-0 bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '7px' }}></div>
      <div className="absolute top-[57px] left-[57px] bottom-0 bg-white" style={{ width: '7px' }}></div>
      <div className="absolute bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '11px', top: '165px', left: '95px', right: '80px' }}></div>

      <h1
        className="absolute text-6xl font-bold text-white z-10"
        style={{ top: '100px', left: '92px' }}
      >
        Bestellungen (Eigeneinkauf)
      </h1>

      <div className="absolute top-[260px] left-[90px] right-[80px] bottom-[40px] flex gap-6">

        {/* LEFT */}
        <div className="w-[260px] bg-white/10 rounded-xl border border-white/10 p-4 overflow-auto">
          <div className="text-lg font-semibold mb-4">Lieferanten</div>

          {loadingLieferanten ? (
            <div className="text-white/60">Lade...</div>
          ) : (
            <div className="flex flex-col gap-2">
              {lieferanten.map((l) => (
                <div
                  key={l.id}
                  onClick={() => handleLieferantClick(l)}
                  className={`px-3 py-2 rounded-lg cursor-pointer transition ${
                    selectedLieferant?.code === l.code
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

        {/* RIGHT */}
        <div className="flex-1 bg-white/10 rounded-xl border border-white/10 p-6 overflow-auto">
          <div className="text-xl font-semibold mb-4">Bisherige Bestellungen</div>

          {loadingBestellungen ? (
            <div className="text-white/60">Lade Bestellungen...</div>
          ) : (
            <div className="flex flex-col gap-3">
              {bestellungen.map((b) => (
                <div key={b.id} className="bg-white/10 p-3 rounded">
                  {b?.supplier?.name} – {formatMoney(b.gesamtsumme_netto)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
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