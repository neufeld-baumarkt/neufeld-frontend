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

const EditReklamationModal = ({ onClose, onSuccess }) => {
  const [searchData, setSearchData] = useState({
    filiale: '',
    suchbegriff: '',
    rekla_nr: '',
    ls_nummer_grund: '',
    artikelnummer: '',
  });

  const [formData, setFormData] = useState(null);

  // WICHTIG: Positionen müssen lfd_nr behalten, sonst vergibt Backend neu.
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

  useEffect(() => {
    if (formData && formData.lieferant === 'SodaFixx') {
      setFormData((prev) => ({ ...prev, versand: true }));
    }
  }, [formData?.lieferant]);

  useEffect(() => {
    const filterResults = () => {
      let results = allReklamationen;

      if (searchData.filiale) results = results.filter((r) => r.filiale === searchData.filiale);
      if (searchData.rekla_nr)
        results = results.filter((r) =>
          (r.rekla_nr || '').toLowerCase().includes(searchData.rekla_nr.toLowerCase())
        );
      if (searchData.ls_nummer_grund)
        results = results.filter((r) =>
          (r.ls_nummer_grund || '').toLowerCase().includes(searchData.ls_nummer_grund.toLowerCase())
        );
      if (searchData.suchbegriff) {
        const term = searchData.suchbegriff.toLowerCase();
        results = results.filter(
          (r) =>
            (r.rekla_nr || '').toLowerCase().includes(term) ||
            (r.lieferant || '').toLowerCase().includes(term) ||
            (r.art || '').toLowerCase().includes(term) ||
            (r.ls_nummer_grund || '').toLowerCase().includes(term)
        );
      }

      // NOTE: artikelnummer Suche ist mit /api/reklamationen (Liste ohne Positionen) technisch nicht möglich.
      // Dafür bräuchten wir entweder Backend-Suche oder Prefetch von Detaildaten.
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
    setSearchData((prev) => ({ ...prev, [name]: value }));
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
        letzte_aenderung: today,
      });

      // FIX: lfd_nr unbedingt in den State übernehmen!
      setPositionen(
        pos.length > 0
          ? pos.map((p) => ({
              lfd_nr: p.lfd_nr ?? null, // <- entscheidend
              artikelnummer: p.artikelnummer || '',
              ean: p.ean || '',
              bestell_menge: p.bestell_menge || '',
              bestell_einheit: p.bestell_einheit || '',
              rekla_menge: p.rekla_menge || '',
              rekla_einheit: p.rekla_einheit || '',
            }))
          : [
              {
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
      toast.error('Details konnten nicht geladen werden.');
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
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: false }));
  };

  const handlePositionChange = (index, field, value) => {
    setPositionen((prev) => {
      const newPos = [...prev];
      newPos[index] = { ...newPos[index], [field]: value };

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
        lfd_nr: null, // <- neue Position hat keine lfd_nr, Backend vergibt beim PUT
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

    if (!formData.rekla_nr.trim()) newErrors.rekla_nr = true;
    if (!formData.art) newErrors.art = true;
    if (!formData.lieferant) newErrors.lieferant = true;
    if (!formData.ls_nummer_grund.trim()) newErrors.ls_nummer_grund = true;
    if (formData.versand && !formData.tracking_id.trim()) newErrors.tracking_id = true;

    let hasValidPosition = false;
    positionen.forEach((pos, index) => {
      const isComplete =
        pos.artikelnummer.trim() && pos.ean.trim() && pos.rekla_menge && pos.rekla_einheit;

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

    // FIX: validate darf NICHT true liefern, wenn noValidPosition gesetzt ist.
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Bitte alle Pflichtfelder ausfüllen!');
      return;
    }

    setIsSubmitting(true);

    // validPositionen MIT lfd_nr weitergeben (stabil bei bestehenden Positionen)
    const validPositionen = positionen
      .filter(
        (pos) =>
          pos.artikelnummer.trim() && pos.ean.trim() && pos.rekla_menge && pos.rekla_einheit
      )
      .map((pos) => ({
        lfd_nr: pos.lfd_nr ?? null, // <- entscheidend
        artikelnummer: pos.artikelnummer,
        ean: pos.ean,
        bestell_menge: pos.bestell_menge,
        bestell_einheit: pos.bestell_einheit,
        rekla_menge: pos.rekla_menge,
        rekla_einheit: pos.rekla_einheit,
      }));

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
    if (
      !window.confirm(
        `Sollen die Informationen zur Reklamation ${formData.rekla_nr} wirklich gelöscht werden?`
      )
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      const token = sessionStorage.getItem('token');
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/reklamationen/${selectedReklamation.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Reklamation ${formData.rekla_nr} wurde gelöscht.`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
      toast.error('Löschen fehlgeschlagen – Zugriff verweigert oder Backend-Fehler.');
    } finally {
      setIsSubmitting(false);
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
        className="bg-white text-black rounded-xl shadow-2xl w-[calc(100%-80px)] max-w-5xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 md:p-8">
          <div className="flex justify-between items-start mb-6 border-b pb-4">
            <h2 className="text-2xl md:text-3xl font-bold">Reklamation bearbeiten oder löschen</h2>
            <button onClick={onClose} className="text-3xl leading-none hover:text-red-600">
              ×
            </button>
          </div>

          <div className="mb-10">
            <h3 className="text-xl font-bold mb-4">Suche nach Reklamation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold mb-1">Filiale</label>
                  <select
                    name="filiale"
                    value={searchData.filiale}
                    onChange={handleSearchChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Alle</option>
                    {options.filialen.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Suchbegriff</label>
                  <input
                    type="text"
                    name="suchbegriff"
                    value={searchData.suchbegriff}
                    onChange={handleSearchChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="z. B. Lieferant oder Art"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold mb-1">Reklamations-Nr.</label>
                  <input
                    type="text"
                    name="rekla_nr"
                    value={searchData.rekla_nr}
                    onChange={handleSearchChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">LS-Nummer / Grund</label>
                  <input
                    type="text"
                    name="ls_nummer_grund"
                    value={searchData.ls_nummer_grund}
                    onChange={handleSearchChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Artikel-Nr.</label>
                  <input
                    type="text"
                    name="artikelnummer"
                    value={searchData.artikelnummer}
                    onChange={handleSearchChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-xl font-bold mb-4">Suchergebnisse ({filteredResults.length})</h3>
            {isSearching && <div className="text-center text-gray-600">Suche läuft...</div>}
            {!isSearching && filteredResults.length === 0 && (
              <div className="text-center text-gray-600">Keine Ergebnisse gefunden.</div>
            )}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredResults.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleSelect(r)}
                  className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition border border-gray-200"
                >
                  <div className="flex justify-between">
                    <span className="font-bold">{r.rekla_nr}</span>
                    <span>{r.filiale}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Datum: {formatDateForInput(r.datum)} | Lieferant: {r.lieferant}
                  </div>
                </div>
              ))}
            </div>
          </div>

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
                        <label className="block font-semibold mb-1">Anlegedatum</label>
                        <input
                          type="date"
                          value={formData.datum}
                          readOnly
                          className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Reklamationsnr.</label>
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
                        <label className="block font-semibold mb-1">Art der Reklamation</label>
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
                        <label className="block font-semibold mb-1">Lieferant</label>
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
                        <label className="block font-semibold mb-1">LS-Nummer / Grund</label>
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
                          <label className="block font-semibold mb-1">Tracking ID</label>
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
                      <div
                        key={index}
                        className="bg-gray-50 p-5 rounded-lg mb-5 relative border border-gray-200"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <label className="block font-semibold mb-1">Artikelnummer</label>
                              <input
                                type="text"
                                value={pos.artikelnummer}
                                onChange={(e) =>
                                  handlePositionChange(index, 'artikelnummer', e.target.value)
                                }
                                className={`w-full px-3 py-2 border rounded-lg ${
                                  errors[`pos_${index}_artikelnummer`]
                                    ? 'border-red-500'
                                    : 'border-gray-300'
                                }`}
                              />
                            </div>
                            <div>
                              <label className="block font-semibold mb-1">EAN</label>
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
                                  onChange={(e) =>
                                    handlePositionChange(index, 'bestell_menge', e.target.value)
                                  }
                                  className="w-full px-3 py-2 border rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block font-semibold mb-1">Einheit</label>
                                <select
                                  value={pos.bestell_einheit}
                                  onChange={(e) =>
                                    handlePositionChange(index, 'bestell_einheit', e.target.value)
                                  }
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
                                <label className="block font-semibold mb-1">Reklamationsmenge</label>
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={pos.rekla_menge}
                                  onChange={(e) =>
                                    handlePositionChange(index, 'rekla_menge', e.target.value)
                                  }
                                  className={`w-full px-3 py-2 border rounded-lg ${
                                    errors[`pos_${index}_rekla_menge`]
                                      ? 'border-red-500'
                                      : 'border-gray-300'
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="block font-semibold mb-1">Einheit</label>
                                <select
                                  value={pos.rekla_einheit}
                                  onChange={(e) =>
                                    handlePositionChange(index, 'rekla_einheit', e.target.value)
                                  }
                                  className={`w-full px-3 py-2 border rounded-lg ${
                                    errors[`pos_${index}_rekla_einheit`]
                                      ? 'border-red-500'
                                      : 'border-gray-300'
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
                </>
              )}
            </div>
          )}

          <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-base border border-gray-400 rounded-lg hover:bg-gray-100 transition"
              disabled={isSubmitting}
            >
              Abbrechen
            </button>
            {selectedReklamation && formData && (
              <>
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    className="px-6 py-2.5 text-base bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Wird gelöscht...' : 'Eintrag löschen'}
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-base bg-[#800000] text-white rounded-lg hover:bg-[#990000] transition disabled:opacity-70"
                >
                  {isSubmitting ? 'Wird gespeichert...' : 'Änderungen speichern'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditReklamationModal;
