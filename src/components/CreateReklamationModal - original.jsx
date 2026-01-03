// src/components/CreateReklamationModal.jsx
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
    status: 'Angelegt',
    letzte_aenderung: today,
  });

  const [positionen, setPositionen] = useState([
    {
      artikelnummer: '',
      ean: '',
      bestell_menge: '',
      bestell_einheit: '',
      rekla_menge: '',
      rekla_einheit: '',
    },
  ]);

  const [options, setOptions] = useState({
    filialen: [],
    lieferanten: [],
    reklamationsarten: [],
    einheiten: [],
    status: [],
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const userRole = (user.role || '').toLowerCase();
  const canEditLetzteAenderung = ['admin', 'supervisor'].includes(userRole);

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
          axios.get(`${import.meta.env.VITE_API_URL}/api/status`, config),
        ]);

        setOptions({
          filialen: filRes.data.length ? filRes.data : fallbackOptions.filialen,
          lieferanten: liefRes.data.length ? liefRes.data : fallbackOptions.lieferanten,
          reklamationsarten: artRes.data.length ? artRes.data : fallbackOptions.reklamationsarten,
          einheiten: einhRes.data.length ? einhRes.data : fallbackOptions.einheiten,
          status: statRes.data.length ? statRes.data : fallbackOptions.status,
        });

        if (user.filiale && filRes.data.includes(user.filiale)) {
          setFormData(prev => ({ ...prev, filiale: user.filiale }));
        }
      } catch (err) {
        console.error('Fehler beim Laden der Stammdaten:', err);
        setOptions(fallbackOptions);
        toast.error('Stammdaten konnten nicht geladen werden – Fallback verwendet.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  useEffect(() => {
    if (formData.lieferant === 'SodaFixx') {
      setFormData(prev => ({ ...prev, versand: true }));
    }
  }, [formData.lieferant]);

  const handleCommonChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  const handlePositionChange = (index, field, value) => {
    setPositionen(prev => {
      const newPos = [...prev];
      newPos[index] = { ...newPos[index], [field]: value };

      // Automatische Übernahme Bestell → Rekla
      if (field === 'bestell_menge' && value !== '') {
        newPos[index].rekla_menge = value;
      }
      if (field === 'bestell_einheit' && value !== '') {
        newPos[index].rekla_einheit = value;
      }

      return newPos;
    });

    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`pos_${index}_${field}`];
      if (field === 'bestell_menge') delete newErrors[`pos_${index}_rekla_menge`];
      if (field === 'bestell_einheit') delete newErrors[`pos_${index}_rekla_einheit`];
      return newErrors;
    });
  };

  const addPosition = () => {
    setPositionen(prev => [
      ...prev,
      {
        artikelnummer: '',
        ean: '',
        bestell_menge: '',
        bestell_einheit: '',
        rekla_menge: '',
        rekla_einheit: '',
      },
    ]);
  };

  const removePosition = (index) => {
    if (positionen.length === 1) return;
    setPositionen(prev => prev.filter((_, i) => i !== index));
    setErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith(`pos_${index}_`)) delete newErrors[key];
      });
      return newErrors;
    });
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.rekla_nr.trim()) newErrors.rekla_nr = true;
    if (!formData.art) newErrors.art = true;
    if (!formData.lieferant) newErrors.lieferant = true;
    if (!formData.ls_nummer_grund.trim()) newErrors.ls_nummer_grund = true;
    if (formData.versand && !formData.tracking_id.trim()) {
      newErrors.tracking_id = true;
    }

    let hasValidPosition = false;
    positionen.forEach((pos, index) => {
      if (
        pos.artikelnummer.trim() &&
        pos.ean.trim() &&
        pos.rekla_menge &&
        pos.rekla_einheit
      ) {
        hasValidPosition = true;
      } else if (
        pos.artikelnummer.trim() ||
        pos.ean.trim() ||
        pos.rekla_menge ||
        pos.rekla_einheit ||
        pos.bestell_menge ||
        pos.bestell_einheit
      ) {
        if (!pos.artikelnummer.trim()) newErrors[`pos_${index}_artikelnummer`] = true;
        if (!pos.ean.trim()) newErrors[`pos_${index}_ean`] = true;
        if (!pos.rekla_menge) newErrors[`pos_${index}_rekla_menge`] = true;
        if (!pos.rekla_einheit) newErrors[`pos_${index}_rekla_einheit`] = true;
      }
    });

    if (!hasValidPosition) {
      toast.error('Mindestens eine vollständige Position erforderlich!');
      newErrors.noValidPosition = true;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 || newErrors.noValidPosition;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('Bitte alle Pflichtfelder ausfüllen!');
      return;
    }

    setIsSubmitting(true);

    const validPositionen = positionen.filter(pos =>
      pos.artikelnummer.trim() &&
      pos.ean.trim() &&
      pos.rekla_menge &&
      pos.rekla_einheit
    );

    const payload = {
      ...formData,
      positionen: validPositionen,
    };

    try {
      const token = sessionStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/reklamationen`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Reklamation ${formData.rekla_nr} erfolgreich angelegt!`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Fehler beim Anlegen:', error);
      toast.error('Fehler beim Speichern – siehe Konsole oder Backend.');
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
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white text-black rounded-xl shadow-2xl w-[calc(100%-80px)] max-w-5xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 md:p-8">
          <div className="flex justify-between items-start mb-6 border-b pb-4">
            <h2 className="text-2xl md:text-3xl font-bold">Neue Reklamation anlegen</h2>
            <button onClick={onClose} className="text-3xl leading-none hover:text-red-600">
              ×
            </button>
          </div>

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
                <input type="date" name="datum" value={formData.datum} onChange={handleCommonChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Reklamationsnr. <span className="text-red-600">*</span></label>
                <input type="text" name="rekla_nr" value={formData.rekla_nr} onChange={handleCommonChange} className={`w-full px-3 py-2 border rounded-lg ${errors.rekla_nr ? 'border-red-500' : 'border-gray-300'}`} placeholder="z. B. REK-2026-001" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Art der Reklamation <span className="text-red-600">*</span></label>
                <select name="art" value={formData.art} onChange={handleCommonChange} className={`w-full px-3 py-2 border rounded-lg ${errors.art ? 'border-red-500' : 'border-gray-300'}`}>
                  <option value="">-- Auswählen --</option>
                  {options.reklamationsarten.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Lieferant <span className="text-red-600">*</span></label>
                <select name="lieferant" value={formData.lieferant} onChange={handleCommonChange} className={`w-full px-3 py-2 border rounded-lg ${errors.lieferant ? 'border-red-500' : 'border-gray-300'}`}>
                  <option value="">-- Auswählen --</option>
                  {options.lieferanten.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">LS-Nummer / Grund <span className="text-red-600">*</span></label>
                <input type="text" name="ls_nummer_grund" value={formData.ls_nummer_grund} onChange={handleCommonChange} className={`w-full px-3 py-2 border rounded-lg ${errors.ls_nummer_grund ? 'border-red-500' : 'border-gray-300'}`} />
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
                  <label className="block font-semibold mb-1">Tracking ID {formData.versand && <span className="text-red-600">*</span>}</label>
                  <input type="text" name="tracking_id" value={formData.tracking_id} onChange={handleCommonChange} className={`w-full px-3 py-2 border rounded-lg ${errors.tracking_id ? 'border-red-500' : 'border-gray-300'}`} placeholder="z. B. DHL-Trackingnummer" />
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4">Positionen</h3>

            {positionen.map((pos, index) => (
              <div key={index} className="bg-gray-50 p-5 rounded-lg mb-5 relative border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block font-semibold mb-1">Artikelnummer <span className="text-red-600">*</span></label>
                      <input type="text" value={pos.artikelnummer} onChange={e => handlePositionChange(index, 'artikelnummer', e.target.value)} className={`w-full px-3 py-2 border rounded-lg ${errors[`pos_${index}_artikelnummer`] ? 'border-red-500' : 'border-gray-300'}`} />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">EAN <span className="text-red-600">*</span></label>
                      <input type="text" value={pos.ean} onChange={e => handlePositionChange(index, 'ean', e.target.value)} className={`w-full px-3 py-2 border rounded-lg ${errors[`pos_${index}_ean`] ? 'border-red-500' : 'border-gray-300'}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold mb-1">Bestellmenge</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={pos.bestell_menge}
                          onChange={e => handlePositionChange(index, 'bestell_menge', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Einheit</label>
                        <select value={pos.bestell_einheit} onChange={e => handlePositionChange(index, 'bestell_einheit', e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                          <option value="">--</option>
                          {options.einheiten.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold mb-1">Reklamationsmenge <span className="text-red-600">*</span></label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={pos.rekla_menge}
                          onChange={e => handlePositionChange(index, 'rekla_menge', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg ${errors[`pos_${index}_rekla_menge`] ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Einheit <span className="text-red-600">*</span></label>
                        <select value={pos.rekla_einheit} onChange={e => handlePositionChange(index, 'rekla_einheit', e.target.value)} className={`w-full px-3 py-2 border rounded-lg ${errors[`pos_${index}_rekla_einheit`] ? 'border-red-500' : 'border-gray-300'}`}>
                          <option value="">-- Auswählen --</option>
                          {options.einheiten.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {positionen.length > 1 && (
                  <button
                    onClick={() => removePosition(index)}
                    className="absolute top-4 right-4 text-red-600 hover:text-red-800"
                    title="Position löschen"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={addPosition}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#800000] text-white rounded-lg hover:bg-[#990000] transition font-medium"
            >
              <Plus size={18} />
              Neue Position hinzufügen
            </button>
          </div>

          <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
            <button onClick={onClose} className="px-6 py-2.5 text-base border border-gray-400 rounded-lg hover:bg-gray-100 transition" disabled={isSubmitting}>
              Abbrechen
            </button>
            <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-2.5 text-base bg-[#800000] text-white rounded-lg hover:bg-[#990000] transition disabled:opacity-70">
              {isSubmitting ? 'Wird gespeichert...' : 'Reklamation anlegen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}