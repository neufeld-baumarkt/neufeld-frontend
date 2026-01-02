// src/components/CreateReklamationModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast } from 'react-hot-toast';

const today = new Date();
const formatDate = (date) => date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

const fallbackOptions = {
  filialen: ['Ahaus', 'Münster', 'Telgte', 'Vreden'],
  reklamationsarten: ['Falsche Lieferung', 'Beschädigt', 'Mangelhaft', 'Falsche Menge', 'Sonstiges'],
  lieferanten: [],
  einheiten: ['KG', 'Stück', 'Liter', 'lfdm'],
  status: ['Angelegt', 'In Bearbeitung', 'Freigegeben', 'Abgelehnt', 'Erledigt'],
};

const prefixMap = {
  'SmapOne': 'SMAP-',
  'Grizzly': 'GR-',
  // Ergänze weitere bekannte Arten hier, basierend auf VBA-Beispielen
  'Falsche Lieferung': 'FL-',
  'Beschädigt': 'BES-',
  'Mangelhaft': 'MAN-',
  'Falsche Menge': 'FM-',
  'Sonstiges': 'SON-',
};

export default function CreateReklamationModal({ onClose, onSuccess }) {
  const [user, setUser] = useState(null);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [formData, setFormData] = useState({
    filiale: '',
    art: '',
    datum: today,
    rekla_nr: '',
    lieferant: '',
    ls_nummer_grund: '',
    status: 'Angelegt',
  });

  const [activeTab, setActiveTab] = useState('einzel');
  const [singlePosition, setSinglePosition] = useState({
    artikelnummer: '',
    ean: '',
    bestell_menge: '',
    bestell_einheit: '',
    rekla_menge: '',
    rekla_einheit: '',
  });

  const [multiPositions, setMultiPositions] = useState(
    Array.from({ length: 13 }, (_, i) => ({
      id: i,
      active: false,
      artikelnummer: '',
      ean: '',
      bestell_menge: '',
      bestell_einheit: '',
      rekla_menge: '',
      rekla_einheit: '',
    }))
  );

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

  // User-Daten laden und Filiale setzen
  useEffect(() => {
    const storedUser = JSON.parse(sessionStorage.getItem('user'));
    if (storedUser) {
      setUser(storedUser);
      const superRoles = ['Admin', 'Supervisor'];
      const isSuper = superRoles.includes(storedUser.role) || !storedUser.filiale;
      setIsSuperUser(isSuper);
      setFormData((prev) => ({
        ...prev,
        filiale: isSuper ? '' : storedUser.filiale || '',
      }));
    }
  }, []);

  // Stammdaten laden
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
      } catch (err) {
        console.error('Fehler beim Laden der Stammdaten:', err);
        setOptions(fallbackOptions);
        toast.error('Fehler beim Laden der Stammdaten – Fallback verwendet.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const handleCommonChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (name === 'art' && !formData.rekla_nr) {
      const prefix = prefixMap[value] || '';
      setFormData((prev) => ({ ...prev, rekla_nr: prefix }));
    }
  };

  const handleDatumChange = (date) => {
    setFormData((prev) => ({ ...prev, datum: date }));
    if (errors.datum) {
      setErrors((prev) => ({ ...prev, datum: '' }));
    }
  };

  const handleSingleChange = (e) => {
    const { name, value } = e.target;
    setSinglePosition((prev) => {
      const newPos = { ...prev, [name]: value };
      if (name === 'bestell_einheit' && !newPos.rekla_einheit) {
        newPos.rekla_einheit = value;
      }
      return newPos;
    });
    if (errors[`single_${name}`]) {
      setErrors((prev) => ({ ...prev, [`single_${name}`]: '' }));
    }
  };

  const handleMultiChange = (id, e) => {
    const { name, value, checked, type } = e.target;
    setMultiPositions((prev) =>
      prev.map((pos) =>
        pos.id === id
          ? {
              ...pos,
              [name]: type === 'checkbox' ? checked : value,
              active: name === 'artikelnummer' && value ? true : pos.active,
            }
          : pos
      )
    );
    if (name === 'bestell_einheit') {
      setMultiPositions((prev) =>
        prev.map((pos) =>
          pos.id === id && !pos.rekla_einheit
            ? { ...pos, rekla_einheit: value }
            : pos
        )
      );
    }
    if (errors[`multi_\( {id}_ \){name}`]) {
      setErrors((prev) => ({ ...prev, [`multi_\( {id}_ \){name}`]: '' }));
    }
  };

  const addMultiPosition = () => {
    setMultiPositions((prev) => [
      ...prev,
      {
        id: prev.length,
        active: false,
        artikelnummer: '',
        ean: '',
        bestell_menge: '',
        bestell_einheit: '',
        rekla_menge: '',
        rekla_einheit: '',
      },
    ]);
  };

  const removeMultiPosition = (id) => {
    setMultiPositions((prev) => prev.filter((pos) => pos.id !== id));
  };

  const validateCommon = () => {
    const err = {};
    if (!formData.filiale) err.filiale = true;
    if (!formData.art) err.art = true;
    if (!formData.datum) err.datum = true;
    if (!formData.rekla_nr) err.rekla_nr = true;
    if (!formData.lieferant) err.lieferant = true;
    if (!formData.ls_nummer_grund) err.ls_nummer_grund = true;
    if (!formData.status) err.status = true;
    return err;
  };

  const validatePositions = () => {
    const err = {};
    let positions = [];
    if (activeTab === 'einzel') {
      positions = [singlePosition];
      if (!singlePosition.artikelnummer) err.single_artikelnummer = true;
      if (!singlePosition.ean) err.single_ean = true;
      if (!singlePosition.rekla_menge) err.single_rekla_menge = true;
      if (!singlePosition.rekla_einheit) err.single_rekla_einheit = true;
    } else {
      positions = multiPositions.filter((pos) => pos.active);
      multiPositions.forEach((pos) => {
        if (pos.active) {
          if (!pos.artikelnummer) err[`multi_${pos.id}_artikelnummer`] = true;
          if (!pos.ean) err[`multi_${pos.id}_ean`] = true;
          if (!pos.rekla_menge) err[`multi_${pos.id}_rekla_menge`] = true;
          if (!pos.rekla_einheit) err[`multi_${pos.id}_rekla_einheit`] = true;
        }
      });
    }
    if (positions.length === 0) err.no_positions = true;
    return err;
  };

  const handleSubmit = async () => {
    const commonErr = validateCommon();
    const posErr = validatePositions();
    const allErr = { ...commonErr, ...posErr };
    setErrors(allErr);

    if (Object.keys(allErr).length > 0) {
      if (allErr.no_positions) toast.error('Mindestens eine Position erforderlich!');
      else toast.error('Bitte alle Pflichtfelder ausfüllen!');
      return;
    }

    setIsSubmitting(true);
    const token = sessionStorage.getItem('token');
    const submitData = {
      ...formData,
      datum: formData.datum.toISOString().split('T')[0], // ISO für Backend
      positionen:
        activeTab === 'einzel'
          ? [singlePosition]
          : multiPositions.filter((pos) => pos.active).map(({ id, active, ...rest }) => rest),
    };

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/reklamationen`, submitData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`Die Informationen zu ${formData.rekla_nr} wurden erfolgreich übernommen.`);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Fehler beim Anlegen:', error);
      toast.error('Fehler beim Speichern – siehe Konsole.');
      // TODO: Handle duplicate rekla_nr if Backend returns specific error
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
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
        className="bg-white text-black rounded-xl shadow-2xl w-[calc(100%-4rem)] max-w-5xl max-h-[90vh] overflow-y-auto p-8"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-[#3A3838]">Reklamation anlegen</h2>
          <button onClick={onClose} className="text-4xl hover:text-[#800000] transition">
            ×
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Linke Spalte: Gemeinsame Felder */}
          <div className="col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1 text-[#3A3838]">Filiale *</label>
                <select
                  name="filiale"
                  value={formData.filiale}
                  onChange={handleCommonChange}
                  disabled={!isSuperUser}
                  className={`w-full px-4 py-2 border rounded-lg ${errors.filiale ? 'border-red-500' : 'border-gray-300'} ${!isSuperUser ? 'bg-gray-100' : ''}`}
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
                <label className="block font-semibold mb-1 text-[#3A3838]">Art der Reklamation *</label>
                <select
                  name="art"
                  value={formData.art}
                  onChange={handleCommonChange}
                  className={`w-full px-4 py-2 border rounded-lg ${errors.art ? 'border-red-500' : 'border-gray-300'}`}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1 text-[#3A3838]">Anlegedatum *</label>
                <DatePicker
                  selected={formData.datum}
                  onChange={handleDatumChange}
                  dateFormat="dd.MM.yyyy"
                  className={`w-full px-4 py-2 border rounded-lg ${errors.datum ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#3A3838]">Reklamationsnr. *</label>
                <input
                  type="text"
                  name="rekla_nr"
                  value={formData.rekla_nr}
                  onChange={handleCommonChange}
                  placeholder="z. B. SMAP-2026-001"
                  className={`w-full px-4 py-2 border rounded-lg ${errors.rekla_nr ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1 text-[#3A3838]">Lieferant *</label>
                <select
                  name="lieferant"
                  value={formData.lieferant}
                  onChange={handleCommonChange}
                  className={`w-full px-4 py-2 border rounded-lg ${errors.lieferant ? 'border-red-500' : 'border-gray-300'}`}
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
                <label className="block font-semibold mb-1 text-[#3A3838]">LS-Nummer/Grund *</label>
                <input
                  type="text"
                  name="ls_nummer_grund"
                  value={formData.ls_nummer_grund}
                  onChange={handleCommonChange}
                  placeholder="z. B. Lieferschein-Nr. oder Grund"
                  className={`w-full px-4 py-2 border rounded-lg ${errors.ls_nummer_grund ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1 text-[#3A3838]">Status *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleCommonChange}
                  className={`w-full px-4 py-2 border rounded-lg ${errors.status ? 'border-red-500' : 'border-gray-300'}`}
                >
                  {options.status.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Rechte Spalte: Hinweistext */}
          <div className="col-span-1 p-4 bg-gray-100 rounded-lg shadow-inner">
            <h3 className="text-lg font-bold mb-2 text-[#800000]">Hinweise</h3>
            <p className="text-sm text-[#3A3838]">
              <strong>Einzeleingabe:</strong> Für Reklamationen mit nur einer Position.<br />
              <strong>Mehrfacheingabe:</strong> Für mehrere Positionen in einer Reklamation. Markieren Sie Zeilen mit der Checkbox oder beginnen Sie mit der Artikelnummer-Eingabe, um sie zu aktivieren. Fügen Sie bei Bedarf weitere Zeilen hinzu.
            </p>
          </div>
        </div>

        {/* Tabs für Positionen */}
        <div className="mt-8">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('einzel')}
              className={`px-6 py-3 font-medium ${activeTab === 'einzel' ? 'border-b-2 border-[#800000] text-[#800000]' : 'text-gray-500'}`}
            >
              Einzeleingabe
            </button>
            <button
              onClick={() => setActiveTab('mehrfach')}
              className={`px-6 py-3 font-medium ${activeTab === 'mehrfach' ? 'border-b-2 border-[#800000] text-[#800000]' : 'text-gray-500'}`}
            >
              Mehrfacheingabe
            </button>
          </div>

          <div className="mt-6">
            {activeTab === 'einzel' ? (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-[#3A3838]">Artikelnummer *</label>
                  <input
                    type="text"
                    name="artikelnummer"
                    value={singlePosition.artikelnummer}
                    onChange={handleSingleChange}
                    className={`w-full px-4 py-2 border rounded-lg ${errors.single_artikelnummer ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[#3A3838]">EAN-Code *</label>
                  <input
                    type="text"
                    name="ean"
                    value={singlePosition.ean}
                    onChange={handleSingleChange}
                    className={`w-full px-4 py-2 border rounded-lg ${errors.single_ean ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold mb-1 text-[#3A3838]">Bestellmenge</label>
                    <input
                      type="number"
                      name="bestell_menge"
                      value={singlePosition.bestell_menge}
                      onChange={handleSingleChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-[#3A3838]">Einheit</label>
                    <select
                      name="bestell_einheit"
                      value={singlePosition.bestell_einheit}
                      onChange={handleSingleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                <div className="grid grid-cols-2 gap-2 col-start-3">
                  <div>
                    <label className="block font-semibold mb-1 text-[#3A3838]">Reklamenge *</label>
                    <input
                      type="number"
                      name="rekla_menge"
                      value={singlePosition.rekla_menge}
                      onChange={handleSingleChange}
                      min="0"
                      step="0.01"
                      className={`w-full px-4 py-2 border rounded-lg ${errors.single_rekla_menge ? 'border-red-500' : 'border-gray-300'}`}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-[#3A3838]">Einheit *</label>
                    <select
                      name="rekla_einheit"
                      value={singlePosition.rekla_einheit}
                      onChange={handleSingleChange}
                      className={`w-full px-4 py-2 border rounded-lg ${errors.single_rekla_einheit ? 'border-red-500' : 'border-gray-300'}`}
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
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="px-4 py-2 text-left">Aktiv</th>
                      <th className="px-4 py-2 text-left">Artikelnummer *</th>
                      <th className="px-4 py-2 text-left">EAN-Code *</th>
                      <th className="px-4 py-2 text-left">Bestellmenge</th>
                      <th className="px-4 py-2 text-left">Einheit</th>
                      <th className="px-4 py-2 text-left">Reklamenge *</th>
                      <th className="px-4 py-2 text-left">Einheit *</th>
                      <th className="px-4 py-2 text-left">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {multiPositions.map((pos) => (
                      <tr key={pos.id} className="border-b">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            name="active"
                            checked={pos.active}
                            onChange={(e) => handleMultiChange(pos.id, e)}
                            className="w-5 h-5"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            name="artikelnummer"
                            value={pos.artikelnummer}
                            onChange={(e) => handleMultiChange(pos.id, e)}
                            className={`w-full border rounded-lg px-2 py-1 \( {errors[`multi_ \){pos.id}_artikelnummer`] ? 'border-red-500' : 'border-gray-300'}`}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            name="ean"
                            value={pos.ean}
                            onChange={(e) => handleMultiChange(pos.id, e)}
                            className={`w-full border rounded-lg px-2 py-1 \( {errors[`multi_ \){pos.id}_ean`] ? 'border-red-500' : 'border-gray-300'}`}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            name="bestell_menge"
                            value={pos.bestell_menge}
                            onChange={(e) => handleMultiChange(pos.id, e)}
                            min="0"
                            step="0.01"
                            className="w-full border border-gray-300 rounded-lg px-2 py-1"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            name="bestell_einheit"
                            value={pos.bestell_einheit}
                            onChange={(e) => handleMultiChange(pos.id, e)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1"
                          >
                            <option value="">--</option>
                            {options.einheiten.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            name="rekla_menge"
                            value={pos.rekla_menge}
                            onChange={(e) => handleMultiChange(pos.id, e)}
                            min="0"
                            step="0.01"
                            className={`w-full border rounded-lg px-2 py-1 \( {errors[`multi_ \){pos.id}_rekla_menge`] ? 'border-red-500' : 'border-gray-300'}`}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            name="rekla_einheit"
                            value={pos.rekla_einheit}
                            onChange={(e) => handleMultiChange(pos.id, e)}
                            className={`w-full border rounded-lg px-2 py-1 \( {errors[`multi_ \){pos.id}_rekla_einheit`] ? 'border-red-500' : 'border-gray-300'}`}
                          >
                            <option value="">--</option>
                            {options.einheiten.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => removeMultiPosition(pos.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Löschen
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={addMultiPosition}
                  className="mt-4 px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#990000] transition"
                >
                  + Neue Position hinzufügen
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
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
  );
}