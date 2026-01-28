// src/components/EditReklamationModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const today = new Date().toISOString().split('T')[0];

const formatDateForInput = (isoString) => {
  if (!isoString) return '';
  return isoString.split('T')[0];
};

const fallbackOptions = {
  filialen: ['Ahaus', 'Münster', 'Telgte', 'Vreden'],
  reklamationsarten: ['Falsche Lieferung', 'Beschädigt', 'Mangelhaft', 'Falsche Menge', 'Sonstiges'],
  lieferanten: [],
  einheiten: ['KG', 'Stück', 'Liter', 'lfdm'],
  status: ['Angelegt', 'In Bearbeitung', 'Freigegeben', 'Abgelehnt', 'Erledigt'],
};

export default function EditReklamationModal({ onClose, onSuccess }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFiliale, setSearchFiliale] = useState('');
  const [results, setResults] = useState([]);
  const [selectedReklamation, setSelectedReklamation] = useState(null);

  const [formData, setFormData] = useState({
    filiale: '',
    art: '',
    datum: '',
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

        if (user.filiale && Array.isArray(filRes.data) && filRes.data.includes(user.filiale)) {
          setSearchFiliale(user.filiale);
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
      setFormData((prev) => ({ ...prev, versand: true }));
    }
  }, [formData.lieferant]);

  const resetEditor = () => {
    setSelectedReklamation(null);
    setFormData({
      filiale: '',
      art: '',
      datum: '',
      rekla_nr: '',
      lieferant: '',
      ls_nummer_grund: '',
      versand: false,
      tracking_id: '',
      status: 'Angelegt',
      letzte_aenderung: today,
    });
    setPositionen([
      {
        artikelnummer: '',
        ean: '',
        bestell_menge: '',
        bestell_einheit: '',
        rekla_menge: '',
        rekla_einheit: '',
      },
    ]);
    setErrors({});
  };

  const handleCommonChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: false }));
    }
  };

  const handlePositionChange = (index, field, value) => {
    setPositionen((prev) => {
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

    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`pos_${index}_${field}`];
      if (field === 'bestell_menge') delete newErrors[`pos_${index}_rekla_menge`];
      if (field === 'bestell_einheit') delete newErrors[`pos_${index}_rekla_einheit`];
      return newErrors;
    });
  };

  const addPosition = () => {
    setPositionen((prev) => [
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
    setPositionen((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach((key) => {
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
    if (formData.versand && !formData.tracking_id.trim()) newErrors.tracking_id = true;

    let hasValidPosition = false;

    positionen.forEach((pos, index) => {
      const isComplete =
        pos.artikelnummer.trim() &&
        pos.ean.trim() &&
        pos.rekla_menge &&
        pos.rekla_einheit;

      const hasAny =
        pos.artikelnummer.trim() ||
        pos.ean.trim() ||
        pos.rekla_menge ||
        pos.rekla_einheit ||
        pos.bestell_menge ||
        pos.bestell_einheit;

      if (isComplete) {
        hasValidPosition = true;
      } else if (hasAny) {
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
    return Object.keys(newErrors).length === 0;
  };

  const doSearch = async () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      toast.error('Kein Token – bitte neu einloggen.');
      return;
    }

    try {
      // Wir holen die Liste und filtern client-side (wie bisher)
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/reklamationen`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list = Array.isArray(res.data) ? res.data : [];

      const term = searchTerm.trim().toLowerCase();
      const fil = (searchFiliale || '').trim();

      const filtered = list.filter((r) => {
        const byFiliale = fil ? (r.filiale || '') === fil : true;

        if (!term) return byFiliale;

        const candidates = [
          r.rekla_nr,
          r.ls_nummer_grund,
          r.lieferant,
          r.status,
          r.art,
        ]
          .filter(Boolean)
          .map((x) => x.toString().toLowerCase());

        return byFiliale && candidates.some((c) => c.includes(term));
      });

      setResults(filtered);
      if (!filtered.length) toast('Keine Treffer gefunden.');
    } catch (err) {
      console.error('Fehler bei Suche:', err);
      toast.error('Fehler bei der Suche – siehe Konsole.');
    }
  };

  const loadReklamation = async (rekla) => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      toast.error('Kein Token – bitte neu einloggen.');
      return;
    }

    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/reklamationen/${rekla.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const r = res?.data?.reklamation;
      const p = Array.isArray(res?.data?.positionen) ? res.data.positionen : [];

      if (!r) {
        toast.error('Reklamation konnte nicht geladen werden.');
        return;
      }

      setSelectedReklamation(rekla);

      setFormData({
        filiale: r.filiale || '',
        art: r.art || '',
        datum: formatDateForInput(r.datum) || '',
        rekla_nr: r.rekla_nr || '',
        lieferant: r.lieferant || '',
        ls_nummer_grund: r.ls_nummer_grund || '',
        versand: !!r.versand,
        tracking_id: r.tracking_id || '',
        status: r.status || 'Angelegt',
        letzte_aenderung: formatDateForInput(r.letzte_aenderung) || today,
      });

      if (p.length) {
        setPositionen(
          p.map((x) => ({
            artikelnummer: x.artikelnummer || '',
            ean: x.ean || '',
            bestell_menge: x.bestell_menge || '',
            bestell_einheit: x.bestell_einheit || '',
            rekla_menge: x.rekla_menge || '',
            rekla_einheit: x.rekla_einheit || '',
            lfd_nr: x.lfd_nr ?? null, // falls benötigt
          }))
        );
      } else {
        setPositionen([
          {
            artikelnummer: '',
            ean: '',
            bestell_menge: '',
            bestell_einheit: '',
            rekla_menge: '',
            rekla_einheit: '',
          },
        ]);
      }

      setErrors({});
    } catch (err) {
      console.error('Fehler beim Laden:', err);
      toast.error('Fehler beim Laden – siehe Konsole.');
    }
  };

  const handleSave = async () => {
    if (!selectedReklamation?.id) {
      toast.error('Bitte zuerst eine Reklamation auswählen.');
      return;
    }

    if (!validate()) {
      toast.error('Bitte alle Pflichtfelder ausfüllen!');
      return;
    }

    setIsSubmitting(true);

    const validPositionen = positionen.filter(
      (pos) => pos.artikelnummer.trim() && pos.ean.trim() && pos.rekla_menge && pos.rekla_einheit
    );

    const payload = {
      ...formData,
      positionen: validPositionen,
    };

    try {
      const token = sessionStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/reklamationen/${selectedReklamation.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Änderungen an ${formData.rekla_nr} erfolgreich übernommen!`);
      onSuccess();
      onClose();
    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      const msgFromBackend = err?.response?.data?.message;

      // Blockierend (nur OK): Dublette Rekla-Nr.
      if (status === 409 && code === 'REKLA_NR_EXISTS' && msgFromBackend) {
        window.alert(msgFromBackend);
        return;
      }

      console.error('Fehler beim Speichern:', err);
      toast.error('Fehler beim Speichern – siehe Konsole.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedReklamation?.id) {
      toast.error('Bitte zuerst eine Reklamation auswählen.');
      return;
    }

    const ok = window.confirm(`Reklamation ${formData.rekla_nr} wirklich löschen?`);
    if (!ok) return;

    const token = sessionStorage.getItem('token');
    if (!token) {
      toast.error('Kein Token – bitte neu einloggen.');
      return;
    }

    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/reklamationen/${selectedReklamation.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(`Reklamation ${formData.rekla_nr} gelöscht.`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
      toast.error('Fehler beim Löschen – siehe Konsole.');
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
        className="bg-white text-black rounded-xl shadow-2xl w-[calc(100%-80px)] max-w-6xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 md:p-8">
          <div className="flex justify-between items-start mb-6 border-b pb-4">
            <h2 className="text-2xl md:text-3xl font-bold">Reklamation bearbeiten oder löschen</h2>
            <button onClick={onClose} className="text-3xl leading-none hover:text-red-600">
              ×
            </button>
          </div>

          {/* Suche */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold mb-1">Filiale</label>
                <select
                  value={searchFiliale}
                  onChange={(e) => setSearchFiliale(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">-- Alle --</option>
                  {options.filialen.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold mb-1">Suchbegriff</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Rekla-Nr., LS-Grund, Lieferant, Status, Art..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={doSearch}
                className="px-5 py-2.5 bg-[#800000] text-white rounded-lg hover:bg-[#990000] transition font-medium"
              >
                Suchen
              </button>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setResults([]);
                  resetEditor();
                }}
                className="px-5 py-2.5 border border-gray-400 rounded-lg hover:bg-gray-100 transition font-medium"
              >
                Zurücksetzen
              </button>
            </div>
          </div>

          {/* Trefferliste */}
          {results.length > 0 && (
            <div className="mb-8">
              <div className="font-bold mb-2">Treffer:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => loadReklamation(r)}
                    className="text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-[#800000] hover:bg-gray-50 transition"
                  >
                    <div className="font-extrabold text-[#800000]">{r.rekla_nr}</div>
                    <div className="text-sm text-gray-700">
                      {r.filiale} · {r.lieferant} · {r.status}
                    </div>
                    <div className="text-xs text-gray-500">{r.ls_nummer_grund}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Editor */}
          {selectedReklamation && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold mb-1">Filiale</label>
                    <select
                      name="filiale"
                      value={formData.filiale}
                      onChange={handleCommonChange}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">-- Auswählen --</option>
                      {options.filialen.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Anlegedatum (aus DB)</label>
                    <input
                      type="date"
                      name="datum"
                      value={formData.datum}
                      readOnly
                      className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">
                      Reklamationsnr. <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="rekla_nr"
                      value={formData.rekla_nr}
                      onChange={handleCommonChange}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        errors.rekla_nr ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">
                      Art der Reklamation <span className="text-red-600">*</span>
                    </label>
                    <select
                      name="art"
                      value={formData.art}
                      onChange={handleCommonChange}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        errors.art ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">-- Auswählen --</option>
                      {options.reklamationsarten.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold mb-1">
                      Lieferant <span className="text-red-600">*</span>
                    </label>
                    <select
                      name="lieferant"
                      value={formData.lieferant}
                      onChange={handleCommonChange}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        errors.lieferant ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">-- Auswählen --</option>
                      {options.lieferanten.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">
                      LS-Nummer / Grund <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="ls_nummer_grund"
                      value={formData.ls_nummer_grund}
                      onChange={handleCommonChange}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        errors.ls_nummer_grund ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleCommonChange}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {options.status.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
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
                      className={`w-full px-3 py-2 border rounded-lg ${
                        !canEditLetzteAenderung ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      name="versand"
                      checked={formData.versand}
                      onChange={handleCommonChange}
                      disabled={formData.lieferant === 'SodaFixx'}
                      className="w-5 h-5"
                    />
                    <label className="font-semibold">Versand (Rücksendung)</label>
                  </div>

                  {formData.versand && (
                    <div>
                      <label className="block font-semibold mb-1">
                        Tracking ID <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        name="tracking_id"
                        value={formData.tracking_id}
                        onChange={handleCommonChange}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          errors.tracking_id ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
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
                          <label className="block font-semibold mb-1">
                            Artikelnummer <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={pos.artikelnummer}
                            onChange={(e) => handlePositionChange(index, 'artikelnummer', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg ${
                              errors[`pos_${index}_artikelnummer`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block font-semibold mb-1">
                            EAN <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={pos.ean}
                            onChange={(e) => handlePositionChange(index, 'ean', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg ${
                              errors[`pos_${index}_ean`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block font-semibold mb-1">Bestellmenge</label>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={pos.bestell_menge}
                              onChange={(e) => handlePositionChange(index, 'bestell_menge', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold mb-1">Einheit</label>
                            <select
                              value={pos.bestell_einheit}
                              onChange={(e) => handlePositionChange(index, 'bestell_einheit', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg"
                            >
                              <option value="">--</option>
                              {options.einheiten.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block font-semibold mb-1">
                              Reklamationsmenge <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={pos.rekla_menge}
                              onChange={(e) => handlePositionChange(index, 'rekla_menge', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg ${
                                errors[`pos_${index}_rekla_menge`] ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="block font-semibold mb-1">
                              Einheit <span className="text-red-600">*</span>
                            </label>
                            <select
                              value={pos.rekla_einheit}
                              onChange={(e) => handlePositionChange(index, 'rekla_einheit', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg ${
                                errors[`pos_${index}_rekla_einheit`] ? 'border-red-500' : 'border-gray-300'
                              }`}
                            >
                              <option value="">-- Auswählen --</option>
                              {options.einheiten.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
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
                <button
                  onClick={handleDelete}
                  className="px-6 py-2.5 text-base border border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition"
                  disabled={isSubmitting}
                >
                  Löschen
                </button>

                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-base bg-[#800000] text-white rounded-lg hover:bg-[#990000] transition disabled:opacity-70"
                >
                  {isSubmitting ? 'Wird gespeichert...' : 'Änderungen speichern'}
                </button>
              </div>
            </div>
          )}

          {!selectedReklamation && (
            <div className="text-gray-600">
              Suche starten und dann eine Reklamation auswählen.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
