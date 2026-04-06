import React, { useEffect, useMemo, useState } from 'react';

const DEFAULT_FILIALEN = ['Ahaus', 'Münster', 'Telgte', 'Vreden'];

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parsePositiveInteger(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function roundMoney(value) {
  const n = toNumber(value);
  if (n === null) return 0;
  return Math.round(n * 100) / 100;
}

function formatMoney(value) {
  const n = toNumber(value);
  if (n === null) return '—';
  return `${n.toFixed(2)} €`;
}

function normalizeFiliale(value) {
  const t = String(value || '').trim();
  return t ? t : '';
}

function buildSplitBlock({
  sourceFiliale,
  bestellteKartons,
  veGroesse,
  ekEinzel,
  ekProKarton,
  rows,
}) {
  const normalizedBestellteKartons = parsePositiveInteger(bestellteKartons) || 0;
  const normalizedVeGroesse = parsePositiveInteger(veGroesse) || 0;

  const gesamtStueck = normalizedBestellteKartons * normalizedVeGroesse;
  const einzelPreis = toNumber(ekEinzel);
  const kartonPreis = toNumber(ekProKarton);

  const safeEinzelPreis =
    einzelPreis !== null
      ? einzelPreis
      : normalizedVeGroesse > 0 && kartonPreis !== null
      ? kartonPreis / normalizedVeGroesse
      : 0;

  const normalizedRows = rows.map((row) => {
    const einheit = row.einheit === 'karton' ? 'karton' : 'stueck';
    const menge = parsePositiveInteger(row.menge) || 0;

    const mengeStueckBerechnet =
      einheit === 'karton'
        ? menge * normalizedVeGroesse
        : menge;

    const betragNettoBerechnet = roundMoney(mengeStueckBerechnet * safeEinzelPreis);

    return {
      target_filiale: normalizeFiliale(row.target_filiale),
      einheit,
      menge,
      menge_stueck_berechnet: mengeStueckBerechnet,
      betrag_netto_berechnet: betragNettoBerechnet,
    };
  });

  const summeSplitStueck = normalizedRows.reduce(
    (sum, row) => sum + row.menge_stueck_berechnet,
    0
  );

  const restStueck = Math.max(0, gesamtStueck - summeSplitStueck);
  const restBetrag = roundMoney(restStueck * safeEinzelPreis);

  return {
    active: normalizedRows.length > 0,
    source_filiale: normalizeFiliale(sourceFiliale),
    bestellte_kartons: normalizedBestellteKartons,
    ve_groesse: normalizedVeGroesse,
    gesamt_stueck: gesamtStueck,
    ek_einzel: roundMoney(safeEinzelPreis),
    ek_pro_karton: roundMoney(kartonPreis),
    zeilen: normalizedRows,
    rest: {
      filiale: normalizeFiliale(sourceFiliale),
      menge_stueck: restStueck,
      betrag_netto: restBetrag,
    },
  };
}

export default function SplitModal_Mellerud({
  isOpen,
  onClose,
  onSave,
  article,
  sourceFiliale,
  bestellteKartons,
  existingSplitData = null,
  filialen = DEFAULT_FILIALEN,
}) {
  const [rows, setRows] = useState([]);

  const [selectedFiliale, setSelectedFiliale] = useState('');
  const [selectedEinheit, setSelectedEinheit] = useState('');
  const [selectedMenge, setSelectedMenge] = useState('');

  const [error, setError] = useState('');

  const normalizedSourceFiliale = useMemo(
    () => normalizeFiliale(sourceFiliale),
    [sourceFiliale]
  );

  const normalizedBestellteKartons = useMemo(
    () => parsePositiveInteger(bestellteKartons) || 0,
    [bestellteKartons]
  );

  const normalizedVeGroesse = useMemo(
    () => parsePositiveInteger(article?.ve_stueck) || 0,
    [article?.ve_stueck]
  );

  const selectableFilialen = useMemo(() => {
    const currentTargets = new Set(rows.map((row) => normalizeFiliale(row.target_filiale)));
    return (Array.isArray(filialen) ? filialen : DEFAULT_FILIALEN)
      .map((f) => normalizeFiliale(f))
      .filter((f) => f)
      .filter((f) => f !== normalizedSourceFiliale)
      .filter((f) => !currentTargets.has(f) || f === normalizeFiliale(selectedFiliale));
  }, [filialen, normalizedSourceFiliale, rows, selectedFiliale]);

  useEffect(() => {
    if (!isOpen) return;

    const initialRows = Array.isArray(existingSplitData?.zeilen)
      ? existingSplitData.zeilen.map((row) => ({
          target_filiale: normalizeFiliale(row.target_filiale),
          einheit: row.einheit === 'karton' ? 'karton' : 'stueck',
          menge: String(parsePositiveInteger(row.menge) || ''),
        }))
      : [];

    setRows(initialRows);
    setSelectedFiliale('');
    setSelectedEinheit('');
    setSelectedMenge('');
    setError('');
  }, [isOpen, existingSplitData]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const previewBlock = useMemo(() => {
    return buildSplitBlock({
      sourceFiliale: normalizedSourceFiliale,
      bestellteKartons: normalizedBestellteKartons,
      veGroesse: normalizedVeGroesse,
      ekEinzel: article?.ek_einzel,
      ekProKarton: article?.ek_pro_karton,
      rows: rows.map((row) => ({
        ...row,
        menge: parsePositiveInteger(row.menge) || 0,
      })),
    });
  }, [
    normalizedSourceFiliale,
    normalizedBestellteKartons,
    normalizedVeGroesse,
    article?.ek_einzel,
    article?.ek_pro_karton,
    rows,
  ]);

  const pendingPreview = useMemo(() => {
    const filiale = normalizeFiliale(selectedFiliale);
    const einheit = selectedEinheit === 'karton' ? 'karton' : selectedEinheit === 'stueck' ? 'stueck' : '';
    const menge = parsePositiveInteger(selectedMenge);

    if (!filiale || !einheit || !menge) {
      return {
        valid: false,
        menge_stueck_berechnet: null,
        betrag_netto_berechnet: null,
      };
    }

    const einzelPreis =
      toNumber(article?.ek_einzel) !== null
        ? toNumber(article?.ek_einzel)
        : normalizedVeGroesse > 0 && toNumber(article?.ek_pro_karton) !== null
        ? toNumber(article?.ek_pro_karton) / normalizedVeGroesse
        : 0;

    const mengeStueckBerechnet =
      einheit === 'karton'
        ? menge * normalizedVeGroesse
        : menge;

    return {
      valid: true,
      menge_stueck_berechnet: mengeStueckBerechnet,
      betrag_netto_berechnet: roundMoney(mengeStueckBerechnet * einzelPreis),
    };
  }, [
    selectedFiliale,
    selectedEinheit,
    selectedMenge,
    article?.ek_einzel,
    article?.ek_pro_karton,
    normalizedVeGroesse,
  ]);

  const validatePendingRow = () => {
    const targetFiliale = normalizeFiliale(selectedFiliale);
    const einheit = selectedEinheit === 'karton' ? 'karton' : selectedEinheit === 'stueck' ? 'stueck' : '';
    const menge = parsePositiveInteger(selectedMenge);

    if (!targetFiliale) {
      return 'Bitte zuerst eine Filiale auswählen.';
    }

    if (targetFiliale === normalizedSourceFiliale) {
      return 'Die Quellfiliale darf nicht als Ziel gesetzt werden.';
    }

    if (!einheit) {
      return 'Bitte eine Einheit auswählen.';
    }

    if (!menge) {
      return 'Bitte eine gültige Menge eingeben.';
    }

    const duplicate = rows.some(
      (row) => normalizeFiliale(row.target_filiale) === targetFiliale
    );

    if (duplicate) {
      return `Die Filiale ${targetFiliale} wurde für diesen Artikel bereits erfasst.`;
    }

    if (einheit === 'karton' && normalizedVeGroesse <= 0) {
      return 'VE-Größe fehlt oder ist ungültig.';
    }

    const pendingStueck =
      einheit === 'karton'
        ? menge * normalizedVeGroesse
        : menge;

    const bereitsVerteilt = previewBlock.zeilen.reduce(
      (sum, row) => sum + row.menge_stueck_berechnet,
      0
    );

    if (bereitsVerteilt + pendingStueck > previewBlock.gesamt_stueck) {
      return 'Die Split-Menge überschreitet die verfügbare Gesamtstückzahl.';
    }

    return '';
  };

  const addPendingRow = () => {
    const validationError = validatePendingRow();
    if (validationError) {
      setError(validationError);
      return false;
    }

    setRows((prev) => [
      ...prev,
      {
        target_filiale: normalizeFiliale(selectedFiliale),
        einheit: selectedEinheit,
        menge: String(parsePositiveInteger(selectedMenge)),
      },
    ]);

    setSelectedFiliale('');
    setSelectedEinheit('');
    setSelectedMenge('');
    setError('');
    return true;
  };

  const handleAddAnother = () => {
    addPendingRow();
  };

  const handleFinalize = () => {
    const hasPendingInput =
      normalizeFiliale(selectedFiliale) ||
      selectedEinheit ||
      String(selectedMenge || '').trim();

    if (hasPendingInput) {
      const ok = addPendingRow();
      if (!ok) return;
    }

    const finalRows = hasPendingInput
      ? [
          ...rows,
          {
            target_filiale: normalizeFiliale(selectedFiliale),
            einheit: selectedEinheit,
            menge: String(parsePositiveInteger(selectedMenge)),
          },
        ]
      : rows;

    const sanitizedRows = finalRows
      .map((row) => ({
        target_filiale: normalizeFiliale(row.target_filiale),
        einheit: row.einheit === 'karton' ? 'karton' : 'stueck',
        menge: parsePositiveInteger(row.menge),
      }))
      .filter(
        (row) =>
          row.target_filiale &&
          row.einheit &&
          row.menge
      );

    if (sanitizedRows.length === 0) {
      onSave?.(null);
      onClose?.();
      return;
    }

    const finalBlock = buildSplitBlock({
      sourceFiliale: normalizedSourceFiliale,
      bestellteKartons: normalizedBestellteKartons,
      veGroesse: normalizedVeGroesse,
      ekEinzel: article?.ek_einzel,
      ekProKarton: article?.ek_pro_karton,
      rows: sanitizedRows,
    });

    onSave?.(finalBlock);
    onClose?.();
  };

  const handleRemoveRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setError('');
  };

  const handleClearAll = () => {
    setRows([]);
    setSelectedFiliale('');
    setSelectedEinheit('');
    setSelectedMenge('');
    setError('');
  };

  if (!isOpen) return null;

  const articleName = String(article?.name || '').trim() || 'Artikel';
  const supplierArticleNo = String(article?.supplier_article_no || '').trim() || '—';

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/65 flex items-center justify-center px-4 py-6"
      onMouseDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <div
        className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#f7f7f7] text-black shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 bg-white border-b border-black/10">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="text-[28px] font-extrabold tracking-tight leading-none">
                Split-Verteilung
              </div>
              <div className="mt-2 text-sm text-black/65">
                Mellerud · artikelbezogene Verteilung
              </div>
              <div className="mt-4 space-y-1">
                <div className="text-lg font-semibold break-words">{articleName}</div>
                <div className="text-sm text-black/65">
                  Art.-Nr.: {supplierArticleNo}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onClose?.()}
              className="shrink-0 px-4 py-2 rounded-xl border border-black/10 bg-white hover:bg-black/5 transition"
            >
              Schließen
            </button>
          </div>
        </div>

        <div className="px-6 py-5 bg-[#fcfcfc] border-b border-black/10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white border border-black/10 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-black/50">Quelle</div>
              <div className="mt-1 text-lg font-bold">{normalizedSourceFiliale || '—'}</div>
            </div>

            <div className="rounded-2xl bg-white border border-black/10 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-black/50">Bestellt</div>
              <div className="mt-1 text-lg font-bold">{normalizedBestellteKartons} Karton</div>
            </div>

            <div className="rounded-2xl bg-white border border-black/10 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-black/50">VE-Größe</div>
              <div className="mt-1 text-lg font-bold">{normalizedVeGroesse} Stück</div>
            </div>

            <div className="rounded-2xl bg-white border border-black/10 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-black/50">Gesamt</div>
              <div className="mt-1 text-lg font-bold">{previewBlock.gesamt_stueck} Stück</div>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-black/75">Mit wem willst du teilen?</span>
              <select
                value={selectedFiliale}
                onChange={(e) => {
                  setSelectedFiliale(e.target.value);
                  setError('');
                }}
                className="h-[46px] rounded-xl border border-black/15 bg-white px-3 outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="">Bitte Filiale auswählen</option>
                {selectableFilialen.map((filialeName) => (
                  <option key={filialeName} value={filialeName}>
                    {filialeName}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-black/75">In welcher Einheit?</span>
              <select
                value={selectedEinheit}
                onChange={(e) => {
                  setSelectedEinheit(e.target.value);
                  setError('');
                }}
                className="h-[46px] rounded-xl border border-black/15 bg-white px-3 outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="">Bitte Einheit wählen</option>
                <option value="karton">Karton</option>
                <option value="stueck">Stück</option>
              </select>
            </label>

            {(selectedFiliale && selectedEinheit) ? (
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-black/75">Wie viel willst du abgeben?</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={selectedMenge}
                  onChange={(e) => {
                    setSelectedMenge(e.target.value);
                    setError('');
                  }}
                  placeholder={selectedEinheit === 'karton' ? 'z. B. 1' : 'z. B. 3'}
                  className="h-[46px] rounded-xl border border-black/15 bg-white px-3 outline-none focus:ring-2 focus:ring-black/10"
                />
              </label>
            ) : (
              <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] px-4 py-3 flex items-center text-sm text-black/45">
                Menge erscheint nach Auswahl von Filiale und Einheit.
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-[#f7f7f7] border border-black/10 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-black/50">Vorschau Stück</div>
              <div className="mt-1 text-lg font-bold">
                {pendingPreview.valid ? pendingPreview.menge_stueck_berechnet : '—'}
              </div>
            </div>

            <div className="rounded-2xl bg-[#f7f7f7] border border-black/10 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-black/50">Vorschau Betrag</div>
              <div className="mt-1 text-lg font-bold">
                {pendingPreview.valid ? formatMoney(pendingPreview.betrag_netto_berechnet) : '—'}
              </div>
            </div>

            <div className="rounded-2xl bg-[#f7f7f7] border border-black/10 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-black/50">Rest aktuell Quelle</div>
              <div className="mt-1 text-lg font-bold">
                {previewBlock.rest?.menge_stueck ?? 0} Stück
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleFinalize}
              className="h-[46px] px-5 rounded-xl bg-black text-white font-semibold hover:bg-black/90 transition"
            >
              Festlegen
            </button>

            <button
              type="button"
              onClick={handleAddAnother}
              className="h-[46px] px-5 rounded-xl border border-black/15 bg-white font-semibold hover:bg-black/5 transition"
            >
              + Weitere Filiale
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              className="h-[46px] px-5 rounded-xl border border-black/10 bg-[#f7f7f7] font-semibold hover:bg-black/5 transition"
            >
              Alles entfernen
            </button>
          </div>
        </div>

        <div className="px-6 py-5 bg-[#f7f7f7] border-t border-black/10">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="text-lg font-bold">Bereits festgelegte Verteilung</div>
            <div className="text-sm text-black/60">
              Rest für {normalizedSourceFiliale || 'Quelle'}: {previewBlock.rest?.menge_stueck ?? 0} Stück · {formatMoney(previewBlock.rest?.betrag_netto)}
            </div>
          </div>

          {previewBlock.zeilen.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white px-4 py-6 text-sm text-black/50">
              Für diesen Artikel ist aktuell noch keine Split-Verteilung hinterlegt.
            </div>
          ) : (
            <div className="space-y-3">
              {previewBlock.zeilen.map((row, index) => (
                <div
                  key={`${row.target_filiale}-${index}`}
                  className="rounded-2xl border border-black/10 bg-white px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 flex-1">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-black/45">Filiale</div>
                      <div className="mt-1 font-bold">{row.target_filiale}</div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-wide text-black/45">Einheit</div>
                      <div className="mt-1 font-bold">
                        {row.einheit === 'karton' ? 'Karton' : 'Stück'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-wide text-black/45">Menge</div>
                      <div className="mt-1 font-bold">{row.menge}</div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-wide text-black/45">Umgerechnet</div>
                      <div className="mt-1 font-bold">{row.menge_stueck_berechnet} Stück</div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-wide text-black/45">Betrag</div>
                      <div className="mt-1 font-bold">{formatMoney(row.betrag_netto_berechnet)}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveRow(index)}
                    className="shrink-0 h-[42px] px-4 rounded-xl border border-black/10 bg-[#f7f7f7] font-semibold hover:bg-black/5 transition"
                  >
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}