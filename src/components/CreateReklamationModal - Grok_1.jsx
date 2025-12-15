// src/components/CreateReklamationModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const today = new Date();

const fallback = {
  filialen: ['Ahaus', 'Münster', 'Telgte', 'Vreden'],
  reklamationsarten: [
    'Kundenreklamation MDE',
    'Lagereklamation Dachser',
    'Streckenwareneingangsreklamation M...',
    'Kundenreklamation Lieferant Güde',
    'Kundenreklamation Lieferant Scheppa...',
    'Kundenreklamation Lieferant Grizzly',
    'Lieferantenrückführung',
    'SmapOne Kundenreklamation',
    'SmapOne Wareneingangsreklamation',
  ],
  einheiten: ['KG', 'Stück', 'Liter', 'lfdm'],
  status: ['Angelegt', 'Freigegeben', 'Erledigt', 'Abgelehnt'],
};

export default function CreateReklamationModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    filiale: '',
    art: '',
    datum: today,
    rekla_nr: '',
    lieferant: '',
    ls_nummer_grund: '',
    versand: false,
    tracking_id: '',
    artikelnummer: '',
    ean: '',
    bestell_menge: '',
    bestell_einheit: '',
    rekla_menge: '',
    rekla_einheit: '',
    status: 'Angelegt',
    letzte_aenderung: today,
  });

  const [options, setOptions] = useState({
    filialen: [],
    lieferanten: [],
    reklamationsarten: [],
    einheiten: [],
    status: [],
  });

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  // User aus Token auslesen
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser(payload);
        // Auto-Fill Filiale bei Filial-Nutzer
        if (payload.filiale) {
          setFormData(prev => ({ ...prev, filiale: payload.filiale }));
        }
      } catch (e) {
        console.error('Token ungültig');
      }
    }
  }, []);

  // Daten laden
  useEffect(() => {
    const fetchData = async () => {
      const token = sessionStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const base = import.meta.env.VITE_API_URL + '/api';

      try {
        const [fil, lief, art, einh, stat] = await Promise.all([
          axios.get(`${base}/filialen`, config),
          axios.get(`${base}/lieferanten`, config),
          axios.get(`${base}/reklamationsarten`, config),
          axios.get(`${base}/einheiten`, config),
          axios.get(`${base}/status`, config),
        ]);

        setOptions({
          filialen: fil.data.length ? fil.data : fallback.filialen,
          lieferanten: lief.data.length ? lief.data : [],
          reklamationsarten: art.data.length ? art.data : fallback.reklamationsarten,
          einheiten: einh.data.length ? einh.data : fallback.einheiten,
          status: stat.data.length ? stat.data : fallback.status,
        });
      } catch (err) {
        console.error('Fehler beim Laden', err);
        setOptions(fallback);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      letzte_aenderung: today,
      rekla_einheit: name === 'bestell_einheit' ? value : prev.rekla_einheit,
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: false }));
  };

  const handleDateChange = (date, name) => {
    setFormData(prev => ({
      ...prev,
      [name]: date,
      letzte_aenderung: today,
    }));
  };

  const validate = () => {
    const newErrors = {};

    // Standard-Pflichtfelder
    const required = ['art', 'rekla_nr', 'lieferant', 'ls_nummer_grund', 'artikelnummer', 'ean', 'rekla_menge', 'rekla_einheit', 'status'];
    required.forEach(field => {
      if (!formData[field]) newErrors[field] = true;
    });

    // Filiale Pflicht für Nicht-Filial-Nutzer
    if (!currentUser?.filiale && !formData.filiale) {
      newErrors.filiale = true;
    }

    // Versand aktiviert → Tracking-ID Pflicht
    if (formData.versand && !formData.tracking_id) {
      newErrors.tracking_id = true;
    }

    // Spezialregel: SodaFixx → Versand + Tracking-ID Pflicht
    if (formData.lieferant === 'SodaFixx') {
      if (!formData.versand) newErrors.versand = true;
      if (!formData.tracking_id) newErrors.tracking_id = true;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      alert('Bitte alle Pflichtfelder ausfüllen!');
      return;
    }
    console.log('Bereit zum Speichern:', formData);
    alert('Speichern würde jetzt passieren (Testphase)');
    onSuccess?.();
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-12 text-2xl text-center">Lade Daten...</div>
      </div>
    );
  }

  const isFilialUser = !!currentUser?.filiale;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-3xl font-bold">Neue Reklamation anlegen</h2>
          <button onClick={onClose} className="text-4xl hover:text-red-600">×</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Filiale */}
            <div>
              <label className="block font-semibold mb-1">
                Filiale {isFilialUser ? '' : <span className="text-red-600">*</span>}
              </label>
              <select
                name="filiale"
                value={formData.filiale}
                onChange={handleChange}
                disabled={isFilialUser}
                className={`w-full px-4 py-2 border rounded-lg ${errors.filiale ? 'border-red-500' : 'border-gray-300'} ${isFilialUser ? 'bg-gray-100' : ''}`}
              >
                <option value="">-- Auswählen --</option>
                {options.filialen.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Art der Reklamation */}
            <div>
              <label className="block font-semibold mb-1">Art der Reklamation <span className="text-red-600">*</span></label>
              <select name="art" value={formData.art} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${errors.art ? 'border-red-500' : 'border-gray-300'}`}>
                <option value="">-- Auswählen --</option>
                {options.reklamationsarten.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Datum + Rekla-Nr */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Anlegedatum</label>
                <DatePicker
                  selected={formData.datum}
                  onChange={(date) => handleDateChange(date, 'datum')}
                  dateFormat="dd.MM.yyyy"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  readOnly
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Reklamationsnr. <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  name="rekla_nr"
                  value={formData.rekla_nr}
                  onChange={handleChange}
                  placeholder="z. B. REK-2025-001"
                  className={`w-full px-4 py-2 border rounded-lg ${errors.rekla_nr ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>
            </div>

            {/* Lieferant */}
            <div>
              <label className="block font-semibold mb-1">Lieferant <span className="text-red-600">*</span></label>
              <select name="lieferant" value={formData.lieferant} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${errors.lieferant ? 'border-red-500' : 'border-gray-300'}`}>
                <option value="">-- Auswählen --</option>
                {options.lieferanten.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* LS-Nummer/Grund */}
            <div>
              <label className="block font-semibold mb-1">LS-Nummer / Grund <span className="text-red-600">*</span></label>
              <input
                type="text"
                name="ls_nummer_grund"
                value={formData.ls_nummer_grund}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg ${errors.ls_nummer_grund ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>

            {/* Versand Checkbox */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="versand"
                checked={formData.versand}
                onChange={handleChange}
                className="w-5 h-5"
              />
              <label className="font-semibold">
                Versand (Rücksendung) {formData.lieferant === 'SodaFixx' && <span className="text-red-600">(Pflicht bei SodaFixx)</span>}
              </label>
            </div>

            {/* Tracking-ID (nur bei Versand oder SodaFixx) */}
            {(formData.versand || formData.lieferant === 'SodaFixx') && (
              <div>
                <label className="block font-semibold mb-1">Tracking ID <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  name="tracking_id"
                  value={formData.tracking_id}
                  onChange={handleChange}
                  placeholder="z. B. DHL-Tracking"
                  className={`w-full px-4 py-2 border rounded-lg ${errors.tracking_id ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>
            )}

            {/* Artikel + EAN */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Artikelnummer <span className="text-red-600">*</span></label>
                <input type="text" name="artikelnummer" value={formData.artikelnummer} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${errors.artikelnummer ? 'border-red-500' : 'border-gray-300'}`} />
              </div>
              <div>
                <label className="block font-semibold mb-1">EAN-Code <span className="text-red-600">*</span></label>
                <input type="text" name="ean" value={formData.ean} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${errors.ean ? 'border-red-500' : 'border-gray-300'}`} />
              </div>
            </div>
          </div>

          {/* Rechte Spalte */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Bestellmenge</label>
                <input type="number" name="bestell_menge" value={formData.bestell_menge} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Bestelleinheit</label>
                <select name="bestell_einheit" value={formData.bestell_einheit} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                  <option value="">--</option>
                  {options.einheiten.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Reklamationsmenge <span className="text-red-600">*</span></label>
                <input type="number" name="rekla_menge" value={formData.rekla_menge} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${errors.rekla_menge ? 'border-red-500' : 'border-gray-300'}`} />
              </div>
              <div>
                <label className="block font-semibold mb-1">Reklamationseinheit <span className="text-red-600">*</span></label>
                <select name="rekla_einheit" value={formData.rekla_einheit} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${errors.rekla_einheit ? 'border-red-500' : 'border-gray-300'}`}>
                  <option value="">-- Auswählen --</option>
                  {options.einheiten.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Status <span className="text-red-600">*</span></label>
              <select name="status" value={formData.status} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${errors.status ? 'border-red-500' : 'border-gray-300'}`}>
                {options.status.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Letzte Änderung</label>
              <DatePicker
                selected={formData.letzte_aenderung}
                onChange={(date) => handleDateChange(date, 'letzte_aenderung')}
                dateFormat="dd.MM.yyyy"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-6 mt-10 pt-6 border-t">
          <button onClick={onClose} className="px-8 py-3 text-lg border border-gray-400 rounded-lg hover:bg-gray-100">
            Abbrechen
          </button>
          <button onClick={handleSubmit} className="px-8 py-3 text-lg bg-[#800000] text-white rounded-lg hover:bg-[#990000]">
            Reklamation anlegen
          </button>
        </div>
      </div>
    </div>
  );
}