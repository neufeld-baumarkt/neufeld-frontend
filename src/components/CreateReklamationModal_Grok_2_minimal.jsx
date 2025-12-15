// src/components/CreateReklamationModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function CreateReklamationModal({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState({
    filialen: [],
    lieferanten: [],
    reklamationsarten: [],
    einheiten: [],
    status: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const base = `${import.meta.env.VITE_API_URL}/api`;
        const [fil, lief, art, einh, stat] = await Promise.all([
          axios.get(`${base}/filialen`),
          axios.get(`${base}/lieferanten`),
          axios.get(`${base}/reklamationsarten`),
          axios.get(`${base}/einheiten`),
          axios.get(`${base}/status`),
        ]);

        setOptions({
          filialen: fil.data,
          lieferanten: lief.data,
          reklamationsarten: art.data,
          einheiten: einh.data,
          status: stat.data,
        });
      } catch (err) {
        console.error('Fetch-Fehler:', err);
        // Fallback, damit es auf keinen Fall crasht
        setOptions({
          filialen: ['Ahaus', 'Münster', 'Telgte', 'Vreden'],
          lieferanten: ['Test-Lieferant'],
          reklamationsarten: ['Test-Art'],
          einheiten: ['Stück'],
          status: ['Angelegt'],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-12 text-center text-2xl">
          Lade Stammdaten...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-auto">
        <h2 className="text-3xl font-bold mb-8 text-center">Neue Reklamation (Testversion)</h2>
        
        <div className="grid grid-cols-2 gap-8">
          <div>
            <label className="block font-semibold mb-2">Filiale</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
              <option>-- Auswählen --</option>
              {options.filialen.map(opt => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-2">Art der Reklamation</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
              <option>-- Auswählen --</option>
              {options.reklamationsarten.map(opt => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-2">Lieferant</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
              <option>-- Auswählen --</option>
              {options.lieferanten.map(opt => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-2">Einheit</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
              <option>-- Auswählen --</option>
              {options.einheiten.map(opt => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-10 flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-3 border border-gray-400 rounded-lg">
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}