// src/components/EditReklamationModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const fallbackOptions = {
  filialen: ['Ahaus', 'Münster', 'Telgte', 'Vreden'],
  reklamationsarten: ['Falsche Lieferung', 'Beschädigt', 'Mangelhaft', 'Falsche Menge', 'Sonstiges'],
  lieferanten: [],
  einheiten: ['KG', 'Stück', 'Liter', 'lfdm'],
  status: ['Angelegt', 'In Bearbeitung', 'Freigegeben', 'Abgelehnt', 'Erledigt'],
};

const EditReklamationModal = ({ onClose, onSubmit }) => {
  const [searchData, setSearchData] = useState({
    filiale: '',
    suchbegriff: '',
    rekla_nr: '',
    ls_nummer_grund: '',
    artikelnummer: '',
  });

  const [options, setOptions] = useState({
    filialen: [],
    lieferanten: [],
    reklamationsarten: [],
    einheiten: [],
    status: [],
  });

  const [allReklamationen, setAllReklamationen] = useState([]); // Alle laden für client-side Filter
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedId, setSelectedId] = useState(null); // Für geladene Reklamation

  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Stammdaten laden
  useEffect(() => {
    const fetchAllData = async () => {
      const token = sessionStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      try {
        const [filRes, liefRes, artRes, einhRes, statRes, reklasRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/filialen`, config),
          axios.get(`${import.meta.env.VITE_API_URL}/api/lieferanten`, config),
          axios.get(`${import.meta.env.VITE_API_URL}/api/reklamationsarten`, config),
          axios.get(`${import.meta.env.VITE_API_URL}/api/einheiten`, config),
          axios.get(`${import.meta.env.VITE_API_URL}/api/status`, config),
          axios.get(`${import.meta.env.VITE_API_URL}/api/reklamationen`, config), // Alle laden
        ]);

        setOptions({
          filialen: filRes.data.length ? filRes.data : fallbackOptions.filialen,
          lieferanten: liefRes.data.length ? liefRes.data : fallbackOptions.lieferanten,
          reklamationsarten: artRes.data.length ? artRes.data : fallbackOptions.reklamationsarten,
          einheiten: einhRes.data.length ? einhRes.data : fallbackOptions.einheiten,
          status: statRes.data.length ? statRes.data : fallbackOptions.status,
        });

        setAllReklamationen(reklasRes.data); // Alle speichern
        setFilteredResults(reklasRes.data); // Initial alle anzeigen
      } catch (err) {
        console.error('Fehler beim Laden:', err);
        setOptions(fallbackOptions);
        toast.error('Daten konnten nicht geladen werden – Fallback verwendet.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Suche: Client-side Filterung
  useEffect(() => {
    const filterResults = () => {
      let results = allReklamationen;

      if (searchData.filiale) {
        results = results.filter(r => r.filiale === searchData.filiale);
      }
      if (searchData.rekla_nr) {
        results = results.filter(r => r.rekla_nr.toLowerCase().includes(searchData.rekla_nr.toLowerCase()));
      }
      if (searchData.ls_nummer_grund) {
        results = results.filter(r => r.ls_nummer_grund.toLowerCase().includes(searchData.ls_nummer_grund.toLowerCase()));
      }
      if (searchData.suchbegriff) {
        const term = searchData.suchbegriff.toLowerCase();
        results = results.filter(r => 
          r.rekla_nr.toLowerCase().includes(term) ||
          r.lieferant.toLowerCase().includes(term) ||
          r.art.toLowerCase().includes(term) ||
          r.ls_nummer_grund.toLowerCase().includes(term)
        );
      }
      if (searchData.artikelnummer) {
        // Für Artikel-Nr. müssten wir Positionen laden – für jetzt skip, oder backend-side erweitern in Zukunft
        toast.info('Artikel-Nr.-Suche erfordert Positionen – kommend in nächstem Schritt.');
      }

      setFilteredResults(results);
    };

    if (!loading) {
      setIsSearching(true);
      const timeout = setTimeout(() => {
        filterResults();
        setIsSearching(false);
      }, 300); // Debounce für bessere UX

      return () => clearTimeout(timeout);
    }
  }, [searchData, allReklamationen, loading]);

  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelect = (id) => {
    setSelectedId(id);
    toast.success(`Reklamation ${id} ausgewählt – Bearbeitung lädt...`); // Platzhalter
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-2xl">Lade Daten...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white text-black rounded-xl shadow-2xl w-[calc(100%-80px)] max-w-5xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 md:p-8">
          <div className="flex justify-between items-start mb-6 border-b pb-4">
            <h2 className="text-2xl md:text-3xl font-bold">Reklamation bearbeiten oder löschen</h2>
            <button onClick={onClose} className="text-3xl leading-none hover:text-red-600">
              ×
            </button>
          </div>

          {/* Suchbereich */}
          <div className="mb-10">
            <h3 className="text-xl font-bold mb-4">Suche nach Reklamation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold mb-1">Filiale</label>
                  <select name="filiale" value={searchData.filiale} onChange={handleSearchChange} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Alle</option>
                    {options.filialen.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Suchbegriff</label>
                  <input type="text" name="suchbegriff" value={searchData.suchbegriff} onChange={handleSearchChange} className="w-full px-3 py-2 border rounded-lg" placeholder="z. B. Lieferant oder Art" />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold mb-1">Reklamations-Nr.</label>
                  <input type="text" name="rekla_nr" value={searchData.rekla_nr} onChange={handleSearchChange} className="w-full px-3 py-2 border rounded-lg" placeholder="z. B. REK-2026-001" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">LS-Nummer / Grund</label>
                  <input type="text" name="ls_nummer_grund" value={searchData.ls_nummer_grund} onChange={handleSearchChange} className="w-full px-3 py-2 border rounded-lg" placeholder="z. B. Leere Zylinder" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Artikel-Nr.</label>
                  <input type="text" name="artikelnummer" value={searchData.artikelnummer} onChange={handleSearchChange} className="w-full px-3 py-2 border rounded-lg" placeholder="z. B. 12345" />
                </div>
              </div>
            </div>
          </div>

          {/* Ergebnisliste */}
          <div className="mb-10">
            <h3 className="text-xl font-bold mb-4">Suchergebnisse ({filteredResults.length})</h3>
            {isSearching && <div className="text-center text-gray-600">Suche läuft...</div>}
            {!isSearching && filteredResults.length === 0 && <div className="text-center text-gray-600">Keine Ergebnisse gefunden.</div>}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredResults.map(r => (
                <div 
                  key={r.id}
                  onClick={() => handleSelect(r.id)}
                  className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition border border-gray-200"
                >
                  <div className="flex justify-between">
                    <span className="font-bold">{r.rekla_nr}</span>
                    <span>{r.filiale}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Datum: {r.datum} | Lieferant: {r.lieferant}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platzhalter für Bearbeitungsbereich (Schritt 2) */}
          {selectedId && (
            <div>
              <h3 className="text-xl font-bold mb-4">Bearbeiten von ID {selectedId}</h3>
              <p className="text-gray-600">Bearbeitungsfelder laden hier... (kommt in Schritt 2)</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
            <button onClick={onClose} className="px-6 py-2.5 text-base border border-gray-400 rounded-lg hover:bg-gray-100 transition">
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditReklamationModal;