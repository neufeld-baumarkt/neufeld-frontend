// src/components/CreateReklamationModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const today = new Date().toISOString().split('T')[0];

export default function CreateReklamationModal({ onClose, onSuccess }) {
  // User aus Session für Filiale-Auto-Fill
  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem("user"));
  } catch (e) {}
  const userFiliale = user?.filiale?.trim() || "";
  const isFilialUser = userFiliale && !["", "-", "alle", "zentrale"].includes(userFiliale.toLowerCase());

  const [formData, setFormData] = useState({
    filiale: isFilialUser ? userFiliale : '',
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

  const [dropdownData, setDropdownData] = useState({
    filialen: [],
    arten: [],
    lieferanten: [],
    einheiten: [],
    status: [],
  });

  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown-Daten aus Backend laden
  useEffect(() => {
    const fetchDropdowns = async () => {
      const token = sessionStorage.getItem('token');
      const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      try {
        const [filialenRes, artenRes, lieferantenRes, einheitenRes, statusRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/filialen`, headers).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/api/art_der_reklamation`, headers).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/api/lieferanten`, headers).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/api/einheit`, headers).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/api/status`, headers).catch(() => ({ data: [] })),
        ]);

        setDropdownData({
          filialen: filialenRes.data,
          arten: artenRes.data,
          lieferanten: lieferantenRes.data,
          einheiten: einheitenRes.data,
          status: statusRes.data,
        });
      } catch (error) {
        console.error('Fehler beim Laden der Dropdown-Daten:', error);
      } finally {
        setLoadingDropdowns(false);
      }
    };

    fetchDropdowns();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      letzte_aenderung: today,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const err = {};
    if (!formData.filiale && dropdownData.filialen.length > 0) err.filiale = true;
    if (!formData.art) err.art = true;
    if (!formData.rekla_nr) err.rekla_nr = true;
    if (!formData.lieferant) err.lieferant = true;
    if (!formData.ls_nummer_grund) err.ls_nummer_grund = true;
    if (!formData.artikelnummer) err.artikelnummer = true;
    if (!formData.ean) err.ean = true;
    if (!formData.rekla_menge) err.rekla_menge = true;
    if (!formData.rekla_einheit) err.rekla_einheit = true;
    if (!formData.status) err.status = true;
    if (formData.versand && !formData.tracking_id) err.tracking_id = true;

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

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Fehler beim Anlegen:', error);
      alert('Fehler beim Speichern – siehe Konsole.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingDropdowns) {
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
            <h2 className="text-3xl font-bold">Neue Reklamation anlegen</h2>
            <button onClick={onClose} className="text-4xl leading-none hover:text-red-600 transition">×</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Linke Spalte */}
            <div className="space-y-5">
              {/* Filiale */}
              {dropdownData.filialen.length > 0 && (
                <div>
                  <label className="block font-semibold mb-1">Filiale <span className="text-red-600">*</span></label>
                  <select
                    name="filiale"
                    value={formData.filiale}
                    onChange={handleChange}
                    disabled={isFilialUser}
                    className={`w-full px-4 py-2 border rounded-lg ${errors.filiale ? 'border-red-500' : 'border-gray-300'} ${isFilialUser ? 'bg-gray-100' : ''}`}
                  >
                    <option value="">-- Auswählen --</option>
                    {dropdownData.filialen.map((f) => (
                      <option key={f.id} value={f.name}>{f.name}</option>
                    ))}
                  </select>
                  {isFilialUser && <p className="text-sm text-gray-600 mt-1">Automatisch aus Anmeldung</p>}
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Art der Reklamation <span className="text-red-600">*</span></label>
                <select name="art" value={formData.art} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${errors.art ? 'border-red-500' : 'border-gray-300'}`}>
                  <option value="">-- Auswählen --</option>
                  {dropdownData.arten.map((a) => (
                    <option key={a.id} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Anlegedatum <span className="text-red-600">*</span></label>
                <input type="date" name="datum" value={formData.datum} readOnly className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100" />
              </div>

              <div>
                <label className="block font-semibold mb-1">Reklamationsnr. <span className="text-red-600">*</span></label>
                <input type="text" name="rekla_nr" value={formData.rekla_nr} onChange={handleChange} placeholder="z. B. REK-2025-001" className={`w-full px-4 py-2 border rounded-lg ${errors.rekla_nr ? 'border-red-500' : 'border-gray-300'}`} />
              </div>

              <div>
                <label className="block font-semibold mb-1">Lieferant <span className="text-red-600">*</span></label>
                <select name="lieferant" value={formData.lieferant} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${errors.lieferant ? 'border-red-500' : 'border-gray-300'}`}>
                  <option value="">-- Auswählen --</option>
                  {dropdownData.lieferanten.map((l) => (
                    <option key={l.id} value={l.name}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">LS-Nummer / Grund <span className="text-red-600">*</span></label>
                <input type="text" name="ls_nummer_grund" value={formData.ls_nummer_grund} onChange={handleChange} placeholder="z. B. Lieferschein-Nr." className={`w-full px-4 py-2 border rounded-lg ${errors.ls_nummer_grund ? 'border-red-500' : 'border-gray-300'}`} />
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" name="versand" checked={formData.versand} onChange={handleChange} className="w-5 h-5" />
                <label className="font-semibold">Versand (Rücksendung)</label>
              </div>

              {formData.versand && (
                <div>
                  <label className="block font-semibold mb-1">Tracking ID <span className="text-red-600">*</span></label>
                  <input type="text" name="tracking_id" value={formData.tracking_id} onChange={handleChange} placeholder="z. B. DHL-Tracking" className={`w-full px-4 py-2 border rounded-lg ${errors.tracking_id ? 'border-red-500' : 'border-gray-300'}`} />
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
                <label className="block font-semibold mb-1">EAN <span className="text-red-600">*</span></label>
                <input type="text" name="ean" value={formData.ean} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${errors.ean ? 'border-red-500' : 'border-gray-300'}`} />
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
                    {dropdownData.einheiten.map((e) => (
                      <option key={e.id} value={e.name}>{e.name}</option>
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
                    {dropdownData.einheiten.map((e) => (
                      <option key={e.id} value={e.name}>{e.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Status <span className="text-red-600">*</span></label>
                <select name="status" value={formData.status} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${errors.status ? 'border-red-500' : 'border-gray-300'}`}>
                  {dropdownData.status.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Letzte Änderung</label>
                <input type="date" value={formData.letzte_aenderung} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100" readOnly />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-10 pt-6 border-t">
            <button onClick={onClose} className="px-8 py-3 text-lg font-medium border border-gray-400 rounded-lg hover:bg-gray-100 transition" disabled={isSubmitting}>
              Abbrechen
            </button>
            <button onClick={handleSubmit} disabled={isSubmitting} className="px-8 py-3 text-lg font-medium bg-[#800000] text-white rounded-lg hover:bg-[#990000] transition disabled:opacity-70">
              {isSubmitting ? 'Wird gespeichert...' : 'Reklamation anlegen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}