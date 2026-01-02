// src/components/EditReklamationModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const today = new Date().toISOString().split('T')[0];

const fallbackOptions = {
  filialen: ['Ahaus', 'Münster', 'Telgte', 'Vreden'],
  reklamationsarten: ['Falsche Lieferung', 'Beschädigt', 'Mangelhaft', 'Falsche Menge', 'Sonstiges'],
  lieferanten: [],
  einheiten: ['KG', 'Stück', 'Liter', 'lfdm'],
  status: ['Angelegt', 'In Bearbeitung', 'Freigegeben', 'Abgelehnt', 'Erledigt'],
};

const EditReklamationModal = ({ onClose }) => {
  const [searchData, setSearchData] = useState({
    filiale: '',
    suchbegriff: '',
    rekla_nr: '',
    ls_nummer_grund: '',
    artikelnummer: '',
  });

  const [formData, setFormData] = useState(null);
  const [positionen, setPositionen] = useState([]);

  const [options, setOptions] = useState({
    filialen: [],
    lieferanten: [],
    reklamationsarten: [],
    einheiten: [],
    status: [],
  });

  const [allReklamationen, setAllReklamationen] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedReklamation, setSelectedReklamation] = useState(null);

  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const userRole = (user.role || '').toLowerCase();
  const canEditLetzteAenderung = ['admin', 'supervisor'].includes(userRole);

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
          axios.get(`${import.meta.env.VITE_API_URL}/api/reklamationen`, config),
        ]);

        setOptions({
          filialen: filRes.data.length ? filRes.data : fallbackOptions.filialen,
          lieferanten: liefRes.data.length ? liefRes.data : fallbackOptions.lieferanten,
          reklamationsarten: artRes.data.length ? artRes.data : fallbackOptions.reklamationsarten,
          einheiten: einhRes.data.length ? einhRes.data : fallbackOptions.einheiten,
          status: statRes.data.length ? statRes.data : fallbackOptions.status,
        });

        setAllReklamationen(reklasRes.data);
        setFilteredResults(reklasRes.data);
      } catch (err) {
        console.error('Fehler beim Laden:', err);
        setOptions(fallbackOptions);
        toast.error('Daten konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Suche – unverändert
  useEffect(() => {
    const filterResults = () => {
      let results = allReklamationen;

      if (searchData.filiale) results = results.filter(r => r.filiale === searchData.filiale);
      if (searchData.rekla_nr) results = results.filter(r => r.rekla_nr.toLowerCase().includes(searchData.rekla_nr.toLowerCase()));
      if (searchData.ls_nummer_grund) results = results.filter(r => r.ls_nummer_grund.toLowerCase().includes(searchData.ls_nummer_grund.toLowerCase()));
      if (searchData.suchbegriff) {
        const term = searchData.suchbegriff.toLowerCase();
        results = results.filter(r => 
          r.rekla_nr.toLowerCase().includes(term) ||
          r.lieferant.toLowerCase().includes(term) ||
          r.art.toLowerCase().includes(term) ||
          r.ls_nummer_grund.toLowerCase().includes(term)
        );
      }

      setFilteredResults(results);
    };

    if (!loading) {
      setIsSearching(true);
      const timeout = setTimeout(() => {
        filterResults();
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [searchData, allReklamationen, loading]);

  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelect = async (reklamation) => {
    setSelectedReklamation(reklamation);
    setLoadingDetails(true);

    try {
      const token = sessionStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/reklamationen/${reklamation.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = response.data.reklamation;
      const pos = response.data.positionen || [];

      // WICHTIG: datum aus DB, letzte_aenderung = today
      const anlegeDatum = data.datum || today; // Fallback, falls leer
      const letzteAenderung = today; // Immer aktuell beim Bearbeiten

      setFormData({
        filiale: data.filiale || '',
        art: data.art || '',
        datum: anlegeDatum,
        rekla_nr: data.rekla_nr || '',
        lieferant: data.lieferant || '',
        ls_nummer_grund: data.ls_nummer_grund || '',
        versand: data.versand || false,
        tracking_id: data.tracking_id || '',
        status: data.status || 'Angelegt',
        letzte_aenderung: letzteAenderung,
      });

      setPositionen(pos.length > 0 ? pos.map(p => ({
        artikelnummer: p.artikelnummer || '',
        ean: p.ean || '',
        bestell_menge: p.bestell_menge || '',
        bestell_einheit: p.bestell_einheit || '',
        rekla_menge: p.rekla_menge || '',
        rekla_einheit: p.rekla_einheit || '',
      })) : [{
        artikelnummer: '',
        ean: '',
        bestell_menge: '',
        bestell_einheit: '',
        rekla_menge: '',
        rekla_einheit: '',
      }]);

      toast.success(`Reklamation ${data.rekla_nr} geladen – bereit zur Bearbeitung!`);
    } catch (err) {
      console.error('Fehler beim Laden der Details:', err);
      toast.error('Details konnten nicht geladen werden.');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Rest unverändert (handleCommonChange, handlePositionChange, add/remove, etc.)

  const handleCommonChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handlePositionChange = (index, field, value) => {
    setPositionen(prev => {
      const newPos = [...prev];
      newPos[index] = { ...newPos[index], [field]: value };

      if (field === 'bestell_menge' && value !== '') newPos[index].rekla_menge = value;
      if (field === 'bestell_einheit' && value !== '') newPos[index].rekla_einheit = value;

      return newPos;
    });
  };

  const addPosition = () => {
    setPositionen(prev => [
      ...prev,
      { artikelnummer: '', ean: '', bestell_menge: '', bestell_einheit: '', rekla_menge: '', rekla_einheit: '' }
    ]);
  };

  const removePosition = (index) => {
    if (positionen.length === 1) return;
    setPositionen(prev => prev.filter((_, i) => i !== index));
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
            <button onClick={onClose} className="text-3xl leading-none hover:text-red-600">×</button>
          </div>

          {/* Suchbereich – unverändert */}
          {/* ... (wie vorher) ... */}

          {/* Bearbeitungsbereich */}
          {selectedReklamation && formData && (
            <div>
              <h3 className="text-xl font-bold mb-6">
                Bearbeiten von Reklamations-Nr. {selectedReklamation.rekla_nr}
              </h3>

              {loadingDetails ? (
                <div className="text-center text-gray-600">Lade Details...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <div className="space-y-4">
                      <div>
                        <label className="block font-semibold mb-1">Filiale</label>
                        <select name="filiale" value={formData.filiale} onChange={handleCommonChange} className="w-full px-3 py-2 border rounded-lg">
                          <option value="">-- Auswählen --</option>
                          {options.filialen.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Anlegedatum</label>
                        <input type="date" value={formData.datum} readOnly className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Reklamationsnr.</label>
                        <input type="text" name="rekla_nr" value={formData.rekla_nr} onChange={handleCommonChange} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Art der Reklamation</label>
                        <select name="art" value={formData.art} onChange={handleCommonChange} className="w-full px-3 py-2 border rounded-lg">
                          <option value="">-- Auswählen --</option>
                          {options.reklamationsarten.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-semibold mb-1">Lieferant</label>
                        <select name="lieferant" value={formData.lieferant} onChange={handleCommonChange} className="w-full px-3 py-2 border rounded-lg">
                          <option value="">-- Auswählen --</option>
                          {options.lieferanten.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">LS-Nummer / Grund</label>
                        <input type="text" name="ls_nummer_grund" value={formData.ls_nummer_grund} onChange={handleCommonChange} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Status</label>
                        <select name="status" value={formData.status} onChange={handleCommonChange} className="w-full px-3 py-2 border rounded-lg">
                          {options.status.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Letzte Änderung</label>
                        <input
                          type="date"
                          name="letzte_aenderung"
                          value={formData.letzte_aenderung}
                          onChange={handleCommonChange}
                          readOnly={!canEditLetzteAenderung}
                          className={`w-full px-3 py-2 border rounded-lg ${!canEditLetzteAenderung ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                        <input type="checkbox" name="versand" checked={formData.versand} onChange={handleCommonChange} disabled={formData.lieferant === 'SodaFixx'} className="w-5 h-5" />
                        <label className="font-semibold">Versand (Rücksendung)</label>
                      </div>
                      {formData.versand && (
                        <div>
                          <label className="block font-semibold mb-1">Tracking ID</label>
                          <input type="text" name="tracking_id" value={formData.tracking_id} onChange={handleCommonChange} className="w-full px-3 py-2 border rounded-lg" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Positionen – unverändert */}
                  {/* ... (wie vorher) ... */}
                </>
              )}
            </div>
          )}

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