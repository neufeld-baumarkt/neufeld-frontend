// src/components/EditReklamationModal.jsx – Stammdaten laden wie im Create-Modal (mit Token optional, richtige Routes)
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const today = new Date().toISOString().split('T')[0];

const fallbackOptions = {
  filialen: ['Ahaus', 'Münster', 'Telgte', 'Vreden'],
  reklamationsarten: ['Falsche Lieferung', 'Beschädigt', 'Mangelhaft', 'Falsche Menge', 'Sonstiges'],
  lieferanten: [],
  einheiten: ['KG', 'Stück', 'Liter', 'lfdm'],
  status: ['Angelegt', 'In Bearbeitung', 'Freigegeben', 'Abgelehnt', 'Erledigt'],
};

const EditReklamationModal = ({ initialData = {}, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    filiale: initialData.filiale || '',
    art: initialData.art || '',
    datum: initialData.datum || today,
    rekla_nr: initialData.rekla_nr || '',
    lieferant: initialData.lieferant || '',
    ls_nummer_grund: initialData.ls_nummer_grund || '',
    versand: initialData.versand || false,
    tracking_id: initialData.tracking_id || '',
    artikelnummer: initialData.artikelnummer || '',
    ean: initialData.ean || '',
    bestell_menge: initialData.bestell_menge || '',
    bestell_einheit: initialData.bestell_einheit || '',
    rekla_menge: initialData.rekla_menge || '',
    rekla_einheit: initialData.rekla_einheit || '',
    status: initialData.status || 'Angelegt',
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      const token = sessionStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      try {
        const [filRes, liefRes, artRes, einhRes, statRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/filialen`, config),
          axios.get(`${import.meta.env.VITE_API_URL}/api/lieferanten`, config),
          axios.get(`${import.meta.env.VITE_API_URL}/api/reklamationsarten`, config),
          axios.get(`${import.meta.env.VITE_API_URL}/api/einheiten`, config),
          axios.get(`${import.meta.env.VITE_API_URL}/api/status`, config), // RICHTIG: singular "status"
        ]);

        setOptions({
          filialen: filRes.data.length ? filRes.data : fallbackOptions.filialen,
          lieferanten: liefRes.data.length ? liefRes.data : fallbackOptions.lieferanten,
          reklamationsarten: artRes.data.length ? artRes.data : fallbackOptions.reklamationsarten,
          einheiten: einhRes.data.length ? einhRes.data : fallbackOptions.einheiten,
          status: statRes.data.length ? statRes.data : fallbackOptions.status,
        });
      } catch (err) {
        console.error('Fehler beim Laden der Stammdaten:', err);
        setOptions(fallbackOptions);
        alert('Stammdaten konnten nicht geladen werden – Fallback verwendet.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const err = {};
    if (!formData.art) err.art = true;
    if (!formData.rekla_nr) err.rekla_nr = true;
    if (!formData.lieferant) err.lieferant = true;
    if (!formData.ls_nummer_grund) err.ls_nummer_grund = true;
    if (!formData.artikelnummer) err.artikelnummer = true;
    if (!formData.rekla_menge) err.rekla_menge = true;
    if (!formData.rekla_einheit) err.rekla_einheit = true;
    if (formData.versand && !formData.tracking_id) err.tracking_id = true;
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      alert('Bitte alle Pflichtfelder ausfüllen!');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      alert('Fehler beim Speichern.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-2xl">Lade Stammdaten...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white text-black rounded-xl shadow-2xl w-[calc(100%-160px)] max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-start mb-8 border-b pb-4">
            <h2 className="text-3xl font-bold">Reklamation bearbeiten</h2>
            <button onClick={onClose} className="text-4xl leading-none hover:text-red-600 transition">×</button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="grid grid-cols-2 gap-6">
            {/* Linke Spalte – identisch wie im Create-Modal */}
            <div className="space-y-5">
              <div>
                <label className="block font-semibold mb-1">Filiale</label>
                <select name="filiale" value={formData.filiale} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                  <option value="">-- Auswählen --</option>
                  {options.filialen.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Art der Reklamation <span className="text-red-600">*</span></label>
                <select name="art" value={formData.art} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${errors.art ? 'border-red-500' : 'border-gray-300'}`}>
                  <option value="">-- Auswählen --</option>
                  {options.reklamationsarten.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Anlegedatum</label>
                <input type="date" value={formData.datum} onChange={handleChange} name="datum" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Reklamationsnr. <span className="text-red-600">*</span></label>
                <input type="text" name="rekla_nr" value={formData.rekla_nr} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${errors.rekla_nr ? 'border-red-500' : 'border-gray-300'}`} />
              </div>
              <div>
                <label className="block font-semibold mb-1">Lieferant <span className="text-red-600">*</span></label>
                <select name="lieferant" value={formData.lieferant} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${errors.lieferant ? 'border-red-500' : 'border-gray-300'}`}>
                  <option value="">-- Auswählen --</option>
                  {options.lieferanten.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">LS-Nummer / Grund <span className="text-red-600">*</span></label>
                <input type="text" name="ls_nummer_grund" value={formData.ls_nummer_grund} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${errors.ls_nummer_grund ? 'border-red-500' : 'border-gray-300'}`} />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" name="versand" checked={formData.versand} onChange={handleChange} className="w-5 h-5" />
                <label className="font-semibold">Versand (Rücksendung)</label>
              </div>
              {formData.versand && (
                <div>
                  <label className="block font-semibold mb-1">Tracking ID <span className="text-red-600">*</span></label>
                  <input type="text" name="tracking_id" value={formData.tracking_id} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${errors.tracking_id ? 'border-red-500' : 'border-gray-300'}`} />
                </div>
              )}
            </div>

            {/* Rechte Spalte */}
            <div className="space-y-5">
              <div>
                <label className="block font-semibold mb-1">Artikelnummer <span className="text-red-600">*</span></label>
                <input type="text" name="artikelnummer" value={formData.artikelnummer} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${errors.artikelnummer ? 'border-red-500' : 'border-gray-300'}`} />
              </div>
              <div>
                <label className="block font-semibold mb-1">EAN</label>
                <input type="text" name="ean" value={formData.ean} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Bestellmenge</label>
                  <input type="number" name="bestell_menge" value={formData.bestell_menge} onChange={handleChange} min="0" step="0.01" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
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
                  <input type="number" name="rekla_menge" value={formData.rekla_menge} onChange={handleChange} min="0" step="0.01" className={`w-full px-4 py-2 border rounded-lg ${errors.rekla_menge ? 'border-red-500' : 'border-gray-300'}`} />
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
                <label className="block font-semibold mb-1">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                  <option value="">-- Auswählen --</option>
                  {options.status.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="col-span-2 flex justify-end gap-4 mt-10 pt-6 border-t">
              <button type="button" onClick={onClose} className="px-8 py-3 text-lg font-medium border border-gray-400 rounded-lg hover:bg-gray-100 transition" disabled={isSubmitting}>
                Abbrechen
              </button>
              <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="px-8 py-3 text-lg font-medium bg-[#800000] text-white rounded-lg hover:bg-[#990000] transition disabled:opacity-70">
                {isSubmitting ? 'Wird gespeichert...' : 'Änderungen speichern'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditReklamationModal;