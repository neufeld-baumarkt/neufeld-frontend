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
  const [searchNr, setSearchNr] = useState('');
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

  // WICHTIG: lfd_nr/IDs werden IMMER im State behalten (read-only im UI)
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

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const userRole = (user.role || '').toLowerCase();
  const canEditLetzteAenderung = ['admin', 'supervisor'].includes(userRole);
  const canDelete = canEditLetzteAenderung;

  useEffect(() => {
    const fetchAllData = async () => {
      const token = sessionStorage.getItem('token');

      try {
        const [reklasRes, optsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/reklamationen`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/options`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setAllReklamationen(reklasRes.data || []);

        const o = optsRes.data || {};
        setOptions({
          filialen: o.filialen?.length ? o.filialen : fallbackOptions.filialen,
          lieferanten: o.lieferanten?.length ? o.lieferanten : fallbackOptions.lieferanten,
          reklamationsarten: o.reklamationsarten?.length ? o.reklamationsarten : fallbackOptions.reklamationsarten,
          einheiten: o.einheiten?.length ? o.einheiten : fallbackOptions.einheiten,
          status: o.status?.length ? o.status : fallbackOptions.status,
        });
      } catch (err) {
        console.error('Fehler beim Laden:', err);
        setOptions(fallbackOptions);
        toast.error('Fehler beim Laden der Stammdaten – Fallback aktiv.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const handleSearch = () => {
    const term = searchNr.trim().toLowerCase();
    if (!term) {
      setFilteredResults([]);
      return;
    }

    const results = allReklamationen.filter((r) =>
      (r.rekla_nr || '').toLowerCase().includes(term)
    );

    setFilteredResults(results.slice(0, 20));
  };

  useEffect(() => {
    setIsSearching(true);
    const t = setTimeout(() => {
      handleSearch();
      setIsSearching(false);
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchNr, allReklamationen]);

  const loadReklamationDetails = async (rekla) => {
    setLoadingDetails(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/reklamationen/${rekla.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = res.data?.reklamation || {};
      const pos = res.data?.positionen || [];

      setSelectedReklamation(rekla);

      setFormData({
        filiale: data.filiale || '',
        art: data.art || '',
        datum: formatDateForInput(data.datum),
        rekla_nr: data.rekla_nr || '',
        lieferant: data.lieferant || '',
        ls_nummer_grund: data.ls_nummer_grund || '',
        versand: data.versand || false,
        tracking_id: data.tracking_id || '',
        status: data.status || 'Angelegt',
        // FIX: echte letzte Änderung anzeigen, nicht stumpf "today"
        letzte_aenderung: formatDateForInput(data.letzte_aenderung) || today,
      });

      // FIX: lfd_nr/IDs NICHT wegwerfen (sonst vergibt Backend neue Nummern!)
      setPositionen(
        pos.length > 0
          ? pos.map((p) => ({
              // WICHTIG: Sensible Nummern/IDs IMMER mitnehmen (read-only im UI)
              id: p.id || null,
              pos_id: p.pos_id ?? null,
              lfd_nr: p.lfd_nr ?? null,

              artikelnummer: p.artikelnummer || '',
              ean: p.ean || '',
              bestell_menge: p.bestell_menge || '',
              bestell_einheit: p.bestell_einheit || '',
              rekla_menge: p.rekla_menge || '',
              rekla_einheit: p.rekla_einheit || '',
            }))
          : [
              {
                id: null,
                pos_id: null,
                lfd_nr: null,
                artikelnummer: '',
                ean: '',
                bestell_menge: '',
                bestell_einheit: '',
                rekla_menge: '',
                rekla_einheit: '',
              },
            ]
      );

      toast.success(`Reklamation ${data.rekla_nr} geladen – bereit zur Bearbeitung!`);
    } catch (err) {
      console.error('Fehler beim Laden der Details:', err);
      toast.error('Fehler beim Laden der Reklamation.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCommonChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  };

  const handlePositionChange = (index, field, value) => {
    setPositionen((prev) => {
      const newPos = [...prev];
      newPos[index] = { ...newPos[index], [field]: value };

      // Auto-Kopplungen
      if (field === 'bestell_menge' && value !== '') newPos[index].rekla_menge = value;
      if (field === 'bestell_einheit' && value !== '') newPos[index].rekla_einheit = value;

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
        id: null,
        pos_id: null,
        lfd_nr: null,
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
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.rekla_nr.trim()) newErrors.rekla_nr = 'Rekla-Nr ist Pflicht';
    if (!formData.filiale) newErrors.filiale = 'Filiale ist Pflicht';
    if (!formData.art) newErrors.art = 'Art ist Pflicht';
    if (!formData.datum) newErrors.datum = 'Datum ist Pflicht';
    if (!formData.lieferant) newErrors.lieferant = 'Lieferant ist Pflicht';
    if (!formData.status) newErrors.status = 'Status ist Pflicht';

    if (formData.versand && formData.lieferant !== 'SodaFixx' && !formData.tracking_id) {
      newErrors.tracking_id = 'Tracking ID ist Pflicht bei Versand';
    }

    positionen.forEach((pos, index) => {
      if (!pos.artikelnummer.trim()) newErrors[`pos_${index}_artikelnummer`] = 'Artikelnummer ist Pflicht';
      if (!pos.ean.trim()) newErrors[`pos_${index}_ean`] = 'EAN ist Pflicht';
      if (!pos.rekla_menge) newErrors[`pos_${index}_rekla_menge`] = 'Rekla-Menge ist Pflicht';
      if (!pos.rekla_einheit) newErrors[`pos_${index}_rekla_einheit`] = 'Rekla-Einheit ist Pflicht';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Bitte alle Pflichtfelder ausfüllen!');
      return;
    }

    setIsSubmitting(true);

    // Filtert leere Positionen – aber behält id/pos_id/lfd_nr automatisch mit
    const validPositionen = positionen.filter(
      (pos) =>
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
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/reklamationen/${selectedReklamation.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Änderungen an ${formData.rekla_nr} erfolgreich übernommen!`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
      toast.error('Fehler beim Speichern – siehe Konsole.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;

    if (!window.confirm(`Sollen die Informationen zur Reklamation ${formData.rekla_nr} wirklich gelöscht werden?`)) {
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/reklamationen/${selectedReklamation.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Reklamation ${formData.rekla_nr} gelöscht!`);
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
          <div className="text-2xl">Lade Daten...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold">Reklamation bearbeiten</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">✕</button>
        </div>

        <div className="p-6 overflow-auto max-h-[80vh]">
          {!selectedReklamation ? (
            <div className="space-y-4">
              <label className="block font-semibold">Rekla-Nr suchen</label>
              <input
                type="text"
                value={searchNr}
                onChange={(e) => setSearchNr(e.target.value)}
                className="w-full border border-gray-300 rounded p-2"
                placeholder="z.B. REK-2026-0001"
              />

              {isSearching && <div className="text-sm text-gray-500">Suche...</div>}

              {filteredResults.length > 0 && (
                <div className="border rounded p-2 bg-gray-50">
                  {filteredResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => loadReklamationDetails(r)}
                      className="w-full text-left px-3 py-2 hover:bg-white rounded"
                    >
                      <div className="font-semibold">{r.rekla_nr}</div>
                      <div className="text-xs text-gray-600">
                        {r.filiale} · {formatDateForInput(r.datum)}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchNr.trim() && filteredResults.length === 0 && !isSearching && (
                <div className="text-sm text-gray-500">Keine Treffer</div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {loadingDetails && (
                <div className="p-4 rounded bg-yellow-50 border border-yellow-200 text-sm">
                  Lade Detaildaten...
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-semibold mb-1">Filiale</label>
                  <select
                    name="filiale"
                    value={formData.filiale}
                    onChange={handleCommonChange}
                    className={`w-full border rounded p-2 ${errors.filiale ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="">Bitte wählen</option>
                    {options.filialen.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Reklamationsart</label>
                  <select
                    name="art"
                    value={formData.art}
                    onChange={handleCommonChange}
                    className={`w-full border rounded p-2 ${errors.art ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="">Bitte wählen</option>
                    {options.reklamationsarten.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Datum</label>
                  <input
                    type="date"
                    name="datum"
                    value={formData.datum}
                    onChange={handleCommonChange}
                    className={`w-full border rounded p-2 ${errors.datum ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Rekla-Nr</label>
                  <input
                    type="text"
                    name="rekla_nr"
                    value={formData.rekla_nr}
                    onChange={handleCommonChange}
                    className={`w-full border rounded p-2 ${errors.rekla_nr ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Lieferant</label>
                  <select
                    name="lieferant"
                    value={formData.lieferant}
                    onChange={handleCommonChange}
                    className={`w-full border rounded p-2 ${errors.lieferant ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="">Bitte wählen</option>
                    {options.lieferanten.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleCommonChange}
                    className={`w-full border rounded p-2 ${errors.status ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="">Bitte wählen</option>
                    {options.status.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">LS Nummer / Grund</label>
                  <input
                    type="text"
                    name="ls_nummer_grund"
                    value={formData.ls_nummer_grund}
                    onChange={handleCommonChange}
                    className="w-full border border-gray-300 rounded p-2"
                  />
                </div>

                <div className="flex flex-col justify-end gap-3">
                  <div className="flex items-center gap-3">
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
                      <label className="block font-semibold mb-1">Tracking ID</label>
                      <input
                        type="text"
                        name="tracking_id"
                        value={formData.tracking_id}
                        onChange={handleCommonChange}
                        className={`w-full border rounded p-2 ${errors.tracking_id ? 'border-red-500' : 'border-gray-300'}`}
                      />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold mb-1">Letzte Änderung</label>
                  <input
                    type="date"
                    name="letzte_aenderung"
                    value={formData.letzte_aenderung}
                    onChange={handleCommonChange}
                    disabled={!canEditLetzteAenderung}
                    className="w-full border border-gray-300 rounded p-2 disabled:bg-gray-100"
                  />
                  {!canEditLetzteAenderung && (
                    <div className="text-xs text-gray-500 mt-1">
                      Nur Admin/Supervisor dürfen „Letzte Änderung“ direkt ändern.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4">Positionen</h3>

                {positionen.map((pos, index) => (
                  <div key={index} className="bg-gray-50 p-5 rounded-lg mb-5 relative border border-gray-200">
                    <div className="absolute top-3 left-3 text-xs font-semibold bg-white border border-gray-300 rounded px-2 py-1 shadow-sm">
                      Lfd.-Nr.: {pos.lfd_nr ?? '—'}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block font-semibold mb-1">Artikelnummer</label>
                          <input
                            type="text"
                            value={pos.artikelnummer}
                            onChange={(e) => handlePositionChange(index, 'artikelnummer', e.target.value)}
                            className={`w-full border rounded p-2 ${errors[`pos_${index}_artikelnummer`] ? 'border-red-500' : 'border-gray-300'}`}
                          />
                        </div>

                        <div>
                          <label className="block font-semibold mb-1">EAN</label>
                          <input
                            type="text"
                            value={pos.ean}
                            onChange={(e) => handlePositionChange(index, 'ean', e.target.value)}
                            className={`w-full border rounded p-2 ${errors[`pos_${index}_ean`] ? 'border-red-500' : 'border-gray-300'}`}
                          />
                        </div>

                        <div>
                          <label className="block font-semibold mb-1">Bestellmenge</label>
                          <input
                            type="text"
                            value={pos.bestell_menge}
                            onChange={(e) => handlePositionChange(index, 'bestell_menge', e.target.value)}
                            className="w-full border border-gray-300 rounded p-2"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold mb-1">Bestelleinheit</label>
                          <select
                            value={pos.bestell_einheit}
                            onChange={(e) => handlePositionChange(index, 'bestell_einheit', e.target.value)}
                            className="w-full border border-gray-300 rounded p-2"
                          >
                            <option value="">Bitte wählen</option>
                            {options.einheiten.map((e) => <option key={e} value={e}>{e}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block font-semibold mb-1">Rekla-Menge</label>
                          <input
                            type="text"
                            value={pos.rekla_menge}
                            onChange={(e) => handlePositionChange(index, 'rekla_menge', e.target.value)}
                            className={`w-full border rounded p-2 ${errors[`pos_${index}_rekla_menge`] ? 'border-red-500' : 'border-gray-300'}`}
                          />
                        </div>

                        <div>
                          <label className="block font-semibold mb-1">Rekla-Einheit</label>
                          <select
                            value={pos.rekla_einheit}
                            onChange={(e) => handlePositionChange(index, 'rekla_einheit', e.target.value)}
                            className={`w-full border rounded p-2 ${errors[`pos_${index}_rekla_einheit`] ? 'border-red-500' : 'border-gray-300'}`}
                          >
                            <option value="">Bitte wählen</option>
                            {options.einheiten.map((e) => <option key={e} value={e}>{e}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    {positionen.length > 1 && (
                      <button
                        onClick={() => removePosition(index)}
                        className="absolute top-3 right-3 text-red-600 hover:text-red-800"
                        title="Position löschen"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  onClick={addPosition}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#800000] text-white rounded hover:opacity-90"
                >
                  <Plus size={18} /> Position hinzufügen
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    className="px-5 py-2.5 rounded border border-red-300 text-red-700 hover:bg-red-50"
                    disabled={isSubmitting}
                  >
                    Löschen
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded border border-gray-300 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Abbrechen
                </button>

                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 rounded bg-[#800000] text-white hover:opacity-90 disabled:opacity-60"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
