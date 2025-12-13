// src/components/CreateReklamationModal.jsx
import React, { useState } from 'react';
import axios from 'axios';

const today = new Date().toISOString().split('T')[0];

const placeholderOptions = {
  art: ['Falsche Lieferung', 'Beschädigt', 'Mangelhaft', 'Falsche Menge', 'Sonstiges'],
  lieferant: ['Lieferant A', 'Lieferant B', 'Metro', 'Selgros', 'Anderer'],
  einheit: ['Stk', 'Karton', 'Palette', 'kg', 'Liter'],
  status: ['Angelegt', 'In Bearbeitung', 'Freigegeben', 'Abgelehnt'],
};

export default function CreateReklamationModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
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
    letzte_aenderung: today,
    status: 'Angelegt',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      letzte_aenderung: today, // immer aktuell bei Änderung
    }));
    // Clear error on change
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
    if (!formData.ean) err.ean = true;
    if (!formData.rekla_menge) err.rekla_menge = true;
    if (!formData.rekla_einheit) err.rekla_einheit = true;
    if (!formData.status) err.status = true;

    if (formData.versand && !formData.tracking_id) {
      err.tracking_id = true;
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    const token = sessionStorage.getItem('token');

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/reklamationen`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onSuccess(); // z. B. Liste neu laden
      onClose();
    } catch (error) {
      console.error('Fehler beim Anlegen:', error);
      alert('Fehler beim Speichern. Siehe Konsole.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white text-black rounded-xl shadow-2xl w-[calc(100%-160px)] max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-8">
          <div className="flex justify-between items-start mb-8 border-b pb-4">
            <h2 className="text-3xl font-bold">Neue Reklamation anlegen</h2>
            <button
              onClick={onClose}
              className="text-4xl leading-none hover:text-red-600 transition"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Linke Spalte */}
            <div className="space-y-5">
              <div>
                <label className="block font-semibold mb-1">Art der Reklamation <span className="text-red-600">*</span></label>
                <select
                  name="art"
                  value={formData.art}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg ${errors.art ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">-- Auswählen --</option>
                  {placeholderOptions.art.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Anlegedatum <span className="text-red-600">*</span></label>
                <input
                  type="date"
                  name="datum"
                  value={formData.datum}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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

              <div>
                <label className="block font-semibold mb-1">Lieferant <span className="text-red-600">*</span></label>
                <select
                  name="lieferant"
                  value={formData.lieferant}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg ${errors.lieferant ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">-- Auswählen --</option>
                  {placeholderOptions.lieferant.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">LS-Nummer / Grund <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  name="ls_nummer_grund"
                  value={formData.ls_nummer_grund}
                  onChange={handleChange}
                  placeholder="z. B. Lieferschein-Nr. oder Rechnung"
                  className={`w-full px-4 py-2 border rounded-lg ${errors.ls_nummer_grund ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="versand"
                  checked={formData.versand}
                  onChange={handleChange}
                  className="w-5 h-5"
                />
                <label className="font-semibold">Versand (Rücksendung)</label>
              </div>

              {formData.versand && (
                <div>
                  <label className="block font-semibold mb-1">Tracking ID <span className="text-red-600">*</span></label>
                  <input
                    type="text"
                    name="tracking_id"
                    value={formData.tracking_id}
                    onChange={handleChange}
                    placeholder="z. B. DHL-Trackingnummer"
                    className={`w-full px-4 py-2 border rounded-lg ${errors.tracking_id ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
              )}
            </div>

            {/* Rechte Spalte */}
            <div className="space-y-5">
              <div>
                <label className="block font-semibold mb-1">Artikelnummer <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  name="artikelnummer"
                  value={formData.artikelnummer}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg ${errors.artikelnummer ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">EAN <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  name="ean"
                  value={formData.ean}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg ${errors.ean ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Bestellmenge</label>
                  <input
                    type="number"
                    name="bestell_menge"
                    value={formData.bestell_menge}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Bestelleinheit</label>
                  <select
                    name="bestell_einheit"
                    value={formData.bestell_einheit}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">--</option>
                    {placeholderOptions.einheit.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Reklamationsmenge <span className="text-red-600">*</span></label>
                  <input
                    type="number"
                    name="rekla_menge"
                    value={formData.rekla_menge}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-2 border rounded-lg ${errors.rekla_menge ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Reklamationseinheit <span className="text-red-600">*</span></label>
                  <select
                    name="rekla_einheit"
                    value={formData.rekla_einheit}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg ${errors.rekla_einheit ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="">-- Auswählen --</option>
                    {placeholderOptions.einheit.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Status <span className="text-red-600">*</span></label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg ${errors.status ? 'border-red-500' : 'border-gray-300'}`}
                >
                  {placeholderOptions.status.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Letzte Änderung</label>
                <input
                  type="date"
                  value={formData.letzte_aenderung}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4 mt-10 pt-6 border-t">
            <button
              onClick={onClose}
              className="px-8 py-3 text-lg font-medium border border-gray-400 rounded-lg hover:bg-gray-100 transition"
              disabled={isSubmitting}
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-3 text-lg font-medium bg-[#800000] text-white rounded-lg hover:bg-[#990000] transition disabled:opacity-70"
            >
              {isSubmitting ? 'Wird gespeichert...' : 'Reklamation anlegen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}