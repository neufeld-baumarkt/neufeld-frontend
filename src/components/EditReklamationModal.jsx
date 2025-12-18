// src/components/EditReklamationModal.jsx – ohne react-hot-toast (nutzt alert statt toast)
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EditReklamationModal = ({ initialData, onClose, onSubmit }) => {
  const [formData, setFormData] = useState(initialData || {});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [filialen, setFilialen] = useState([]);
  const [lieferanten, setLieferanten] = useState([]);
  const [reklamationsarten, setReklamationsarten] = useState([]);
  const [einheiten, setEinheiten] = useState([]);
  const [statuses, setStatuses] = useState([]);

  useEffect(() => {
    loadStammdaten();
  }, []);

  const loadStammdaten = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [filialenRes, lieferantenRes, artenRes, einheitenRes, statusesRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/filialen`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/api/lieferanten`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/api/reklamationsarten`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/api/einheiten`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/api/statuses`, config)
      ]);

      setFilialen(filialenRes.data);
      setLieferanten(lieferantenRes.data);
      setReklamationsarten(artenRes.data);
      setEinheiten(einheitenRes.data);
      setStatuses(statusesRes.data);
    } catch (error) {
      console.error('Fehler beim Laden der Stammdaten:', error);
      alert('Stammdaten konnten nicht geladen werden.');
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.art) newErrors.art = 'Pflichtfeld';
    if (!formData.rekla_nr) newErrors.rekla_nr = 'Pflichtfeld';
    if (!formData.lieferant) newErrors.lieferant = 'Pflichtfeld';
    if (!formData.filiale) newErrors.filiale = 'Pflichtfeld';
    if (!formData.ls_nummer_grund) newErrors.ls_nummer_grund = 'Pflichtfeld';
    if (formData.versand && !formData.tracking_id) newErrors.tracking_id = 'Pflichtfeld bei Versand';
    if (!formData.artikelnummer) newErrors.artikelnummer = 'Pflichtfeld';
    if (!formData.bestell_menge) newErrors.bestell_menge = 'Pflichtfeld';
    if (!formData.bestell_einheit) newErrors.bestell_einheit = 'Pflichtfeld';
    if (!formData.rekla_menge) newErrors.rekla_menge = 'Pflichtfeld';
    if (!formData.rekla_einheit) newErrors.rekla_einheit = 'Pflichtfeld';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      alert('Bitte alle Pflichtfelder ausfüllen.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      alert('Änderungen erfolgreich gespeichert!');
      onClose();
    } catch (error) {
      alert('Fehler beim Speichern der Änderungen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">Reklamation bearbeiten</h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
          {/* Linke Spalte */}
          <div className="space-y-4">
            <div>
              <label className="block font-medium">Datum <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={formData.datum || ''}
                onChange={(e) => handleChange('datum', e.target.value)}
                className={`w-full border p-2 rounded ${errors.datum ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>

            <div>
              <label className="block font-medium">Art <span className="text-red-500">*</span></label>
              <select
                value={formData.art || ''}
                onChange={(e) => handleChange('art', e.target.value)}
                className={`w-full border p-2 rounded ${errors.art ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Auswählen</option>
                {reklamationsarten.map(art => <option key={art} value={art}>{art}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-medium">Rekla-Nr <span className="text-red-500">*</span></label>
              <input
                value={formData.rekla_nr || ''}
                onChange={(e) => handleChange('rekla_nr', e.target.value)}
                className={`w-full border p-2 rounded ${errors.rekla_nr ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>

            <div>
              <label className="block font-medium">Lieferant <span className="text-red-500">*</span></label>
              <select
                value={formData.lieferant || ''}
                onChange={(e) => handleChange('lieferant', e.target.value)}
                className={`w-full border p-2 rounded ${errors.lieferant ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Auswählen</option>
                {lieferanten.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-medium">Filiale <span className="text-red-500">*</span></label>
              <select
                value={formData.filiale || ''}
                onChange={(e) => handleChange('filiale', e.target.value)}
                className={`w-full border p-2 rounded ${errors.filiale ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Auswählen</option>
                {filialen.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          {/* Rechte Spalte */}
          <div className="space-y-4">
            <div>
              <label className="block font-medium">Status</label>
              <select
                value={formData.status || ''}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full border p-2 rounded border-gray-300"
              >
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-medium">LS-Nummer/Grund <span className="text-red-500">*</span></label>
              <input
                value={formData.ls_nummer_grund || ''}
                onChange={(e) => handleChange('ls_nummer_grund', e.target.value)}
                className={`w-full border p-2 rounded ${errors.ls_nummer_grund ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.versand || false}
                  onChange={(e) => handleChange('versand', e.target.checked)}
                />
                Versand
              </label>
            </div>

            {formData.versand && (
              <div>
                <label className="block font-medium">Tracking-ID <span className="text-red-500">*</span></label>
                <input
                  value={formData.tracking_id || ''}
                  onChange={(e) => handleChange('tracking_id', e.target.value)}
                  className={`w-full border p-2 rounded ${errors.tracking_id ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>
            )}

            <div>
              <label className="block font-medium">Artikelnummer <span className="text-red-500">*</span></label>
              <input
                value={formData.artikelnummer || ''}
                onChange={(e) => handleChange('artikelnummer', e.target.value)}
                className={`w-full border p-2 rounded ${errors.artikelnummer ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>

            <div>
              <label className="block font-medium">EAN</label>
              <input
                value={formData.ean || ''}
                onChange={(e) => handleChange('ean', e.target.value)}
                className="w-full border p-2 rounded border-gray-300"
              />
            </div>

            <div>
              <label className="block font-medium">Bestell-Menge <span className="text-red-500">*</span></label>
              <input
                value={formData.bestell_menge || ''}
                onChange={(e) => handleChange('bestell_menge', e.target.value)}
                className={`w-full border p-2 rounded ${errors.bestell_menge ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>

            <div>
              <label className="block font-medium">Bestell-Einheit <span className="text-red-500">*</span></label>
              <select
                value={formData.bestell_einheit || ''}
                onChange={(e) => handleChange('bestell_einheit', e.target.value)}
                className={`w-full border p-2 rounded ${errors.bestell_einheit ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Auswählen</option>
                {einheiten.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-medium">Rekla-Menge <span className="text-red-500">*</span></label>
              <input
                value={formData.rekla_menge || ''}
                onChange={(e) => handleChange('rekla_menge', e.target.value)}
                className={`w-full border p-2 rounded ${errors.rekla_menge ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>

            <div>
              <label className="block font-medium">Rekla-Einheit <span className="text-red-500">*</span></label>
              <select
                value={formData.rekla_einheit || ''}
                onChange={(e) => handleChange('rekla_einheit', e.target.value)}
                className={`w-full border p-2 rounded ${errors.rekla_einheit ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Auswählen</option>
                {einheiten.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="col-span-2 flex justify-end gap-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Speichert...' : 'Änderungen speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditReklamationModal;