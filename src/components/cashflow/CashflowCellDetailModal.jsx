import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';

function formatEuro(value) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value || 0));
}

function getStatusLabel(status, isEinnahme) {
  if (isEinnahme) {
    return status === 'gebucht' ? 'Gebucht' : 'Geplant';
  }

  return status || 'angekuendigt';
}

const FILIALEN = ['Unternehmen', 'Verwaltung', 'Ahaus', 'Münster', 'Telgte', 'Vreden'];
const EINTRAG_TYPEN = ['betrag', 'feiertag'];
const TAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function CashflowCellDetailModal({
  isOpen,
  onClose,
  cell,
  buchungen = [],
  onReload,
}) {
  const [editableBuchungen, setEditableBuchungen] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const mapped = buchungen.map((buchung) => ({
      ...buchung,
      editJahr: String(buchung.jahr ?? ''),
      editKw: String(buchung.kw ?? ''),
      editTag: buchung.tag || 'Mo',
      editBetrag: String(buchung.betrag ?? 0),
      editFiliale:
        Number(buchung.kategorie_id) === 1
          ? 'Unternehmen'
          : buchung.filiale || 'Verwaltung',
      editStatus: buchung.status || 'angekuendigt',
      editEintragTyp: buchung.eintrag_typ || 'betrag',
      editNotiz: buchung.notiz || '',
    }));

    setEditableBuchungen(mapped);
    setSelectedId(mapped[0]?.id || null);
    setError('');
    setSaving(false);
    setDeletingId(null);
  }, [buchungen, isOpen]);

  if (!isOpen || !cell) return null;

  const selectedBuchung =
    editableBuchungen.find((buchung) => buchung.id === selectedId) || null;

  const isEinnahme = Number(selectedBuchung?.kategorie_id) === 1;
  const isCellEinnahme =
    Number(cell?.kategorieId ?? cell?.kategorie_id ?? selectedBuchung?.kategorie_id) === 1;

  const summe = editableBuchungen.reduce(
    (total, buchung) => total + Number(buchung.editBetrag || 0),
    0
  );

  const offeneBuchungen = editableBuchungen.filter(
    (buchung) => buchung.editStatus === 'angekuendigt'
  ).length;

  const updateLocalBuchung = (id, field, value) => {
    setEditableBuchungen((prev) =>
      prev.map((buchung) => {
        if (buchung.id !== id) return buchung;

        if (field === 'editEintragTyp' && value === 'feiertag') {
          return {
            ...buchung,
            editEintragTyp: value,
            editBetrag: '0',
          };
        }

        return { ...buchung, [field]: value };
      })
    );
  };

  const validateBuchung = (buchung) => {
    const jahr = Number(buchung.editJahr);
    const kw = Number(buchung.editKw);
    const betrag = Number(buchung.editBetrag);
    const isEinnahmenBuchung = Number(buchung.kategorie_id) === 1;

    if (!Number.isFinite(betrag) || betrag <= 0) {
      return 'Der Betrag muss größer 0 sein.';
    }

    if (isEinnahmenBuchung) {
      return '';
    }

    if (!Number.isInteger(jahr) || jahr < 2000 || jahr > 2100) {
      return 'Ungültiges Jahr.';
    }

    if (!Number.isInteger(kw) || kw < 1 || kw > 53) {
      return 'Ungültige KW.';
    }

    if (!TAGE.includes(buchung.editTag)) {
      return 'Ungültiger Tag.';
    }

    if (
      buchung.editEintragTyp === 'betrag' &&
      (!Number.isFinite(betrag) || betrag <= 0)
    ) {
      return 'Bei Eintragstyp betrag muss der Betrag größer 0 sein.';
    }

    if (!FILIALEN.includes(buchung.editFiliale)) {
      return 'Ungültige Filiale.';
    }

    if (!EINTRAG_TYPEN.includes(buchung.editEintragTyp)) {
      return 'Ungültiger Eintragstyp.';
    }

    return '';
  };

  const saveSelectedAndClose = async () => {
    const baseUrl = import.meta.env.VITE_API_URL;
    const token = sessionStorage.getItem('token');

    if (!selectedBuchung) {
      setError('Keine Buchung ausgewählt.');
      return;
    }

    if (!baseUrl) {
      setError('VITE_API_URL fehlt.');
      return;
    }

    if (!token) {
      setError('Kein Login-Token vorhanden.');
      return;
    }

    const validationError = validateBuchung(selectedBuchung);

    if (validationError) {
      setError(validationError);
      return;
    }

    const isEinnahmenBuchung = Number(selectedBuchung.kategorie_id) === 1;

    const body = isEinnahmenBuchung
      ? {
          betrag: Number(selectedBuchung.editBetrag),
          status: selectedBuchung.editStatus,
          filiale: 'Unternehmen',
          eintrag_typ: 'betrag',
          notiz: null,
        }
      : {
          jahr: Number(selectedBuchung.editJahr),
          kw: Number(selectedBuchung.editKw),
          tag: selectedBuchung.editTag,
          betrag: Number(selectedBuchung.editBetrag),
          filiale: selectedBuchung.editFiliale,
          status: selectedBuchung.editStatus,
          eintrag_typ: selectedBuchung.editEintragTyp,
          notiz: selectedBuchung.editNotiz,
        };

    setSaving(true);
    setError('');

    try {
      const response = await fetch(
        `${baseUrl}/api/cashflow/buchungen/${selectedBuchung.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || 'Buchung konnte nicht aktualisiert werden.'
        );
      }

      if (typeof onReload === 'function') {
        await onReload();
      }

      onClose();
    } catch (err) {
      setError(err.message || 'Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  };

  const deleteBuchung = async (buchungId) => {
    const baseUrl = import.meta.env.VITE_API_URL;
    const token = sessionStorage.getItem('token');

    if (!baseUrl) {
      setError('VITE_API_URL fehlt.');
      return;
    }

    if (!token) {
      setError('Kein Login-Token vorhanden.');
      return;
    }

    const confirmed = window.confirm('Buchung wirklich löschen?');

    if (!confirmed) return;

    setDeletingId(buchungId);
    setError('');

    try {
      const response = await fetch(
        `${baseUrl}/api/cashflow/buchungen/${buchungId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Buchung konnte nicht gelöscht werden.');
      }

      if (typeof onReload === 'function') {
        await onReload();
      }

      onClose();
    } catch (err) {
      setError(err.message || 'Fehler beim Löschen.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[75] bg-black/60 px-4 flex items-center justify-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving && !deletingId) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[1100px] max-h-[86vh] rounded-2xl border border-white/10 bg-[#2f2d2d] shadow-[6px_6px_18px_rgba(0,0,0,0.75)] overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between gap-6">
          <div>
            <div className="text-2xl font-bold text-white">
              {cell.tag} · {cell.kategorieName}
            </div>

            <div className="text-white/60 mt-1">
              KW {cell.kw} · {editableBuchungen.length} Buchung
              {editableBuchungen.length === 1 ? '' : 'en'} · Summe{' '}
              {formatEuro(summe)}
            </div>

            {offeneBuchungen > 0 && (
              <div className="text-orange-300 text-sm mt-2">
                {isCellEinnahme
                  ? `${offeneBuchungen} geplante Einnahme${offeneBuchungen === 1 ? '' : 'n'} offen`
                  : `${offeneBuchungen} angekündigte Buchung${offeneBuchungen === 1 ? '' : 'en'} offen`}
              </div>
            )}

            {error && <div className="text-red-300 text-sm mt-2">{error}</div>}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving || !!deletingId}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 transition text-white"
          >
            Schließen
          </button>
        </div>

        <div className="p-6 overflow-auto max-h-[calc(86vh-112px)]">
          {editableBuchungen.length === 0 ? (
            <div className="text-center text-white/50 py-10">
              Keine Buchungen in dieser Zelle.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {editableBuchungen.map((buchung, index) => {
                  const isSelected = buchung.id === selectedId;
                  const isOpen = buchung.editStatus === 'angekuendigt';
                  const isDeleting = deletingId === buchung.id;
                  const isBuchungEinnahme = Number(buchung.kategorie_id) === 1;
                  const title =
                    buchung.editEintragTyp === 'feiertag'
                      ? 'Feiertag'
                      : formatEuro(buchung.editBetrag);

                  return (
                    <div
                      key={buchung.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedId(buchung.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          setSelectedId(buchung.id);
                        }
                      }}
                      className={`text-left rounded-xl border p-4 transition ${
                        saving || deletingId
                          ? 'opacity-50 pointer-events-none'
                          : 'cursor-pointer'
                      } ${
                        isSelected
                          ? 'border-white/40 bg-white/15'
                          : 'border-white/10 bg-black/25 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div
                            className={`text-lg font-bold ${
                              isOpen ? 'text-orange-300' : 'text-white'
                            }`}
                          >
                            {title}
                          </div>

                          <div className="text-white/65 text-sm mt-1">
                            {isBuchungEinnahme
                              ? 'Unternehmen'
                              : buchung.editFiliale}{' '}
                            · {getStatusLabel(buchung.editStatus, isBuchungEinnahme)}
                          </div>

                          {!isBuchungEinnahme && (
                            <div className="text-white/45 text-xs mt-2">
                              Jahr {buchung.editJahr} · KW {buchung.editKw} ·{' '}
                              {buchung.editTag}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-white/35 text-xs">
                            #{index + 1}
                          </div>

                          <button
                            type="button"
                            title="Buchung löschen"
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteBuchung(buchung.id);
                            }}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 transition"
                          >
                            {isDeleting ? (
                              <span className="text-xs">...</span>
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-white/10 bg-black/25 p-5">
                {!selectedBuchung ? (
                  <div className="text-white/50 text-center py-8">
                    Keine Buchung ausgewählt.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-white font-bold text-lg">
                          Ausgewählte Buchung bearbeiten
                        </div>
                        <div className="text-white/50 text-sm">
                          {isEinnahme
                            ? 'Geplante Einnahmen können beliebig angepasst werden. Mit dem Status Gebucht wird die Planung abgeschlossen.'
                            : 'Änderungen gelten nur für diese eine Buchung.'}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={saving || !!deletingId}
                        onClick={saveSelectedAndClose}
                        className="px-5 py-2 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-50 disabled:cursor-not-allowed transition text-white font-semibold"
                      >
                        {saving ? 'Speichern...' : 'OK'}
                      </button>
                    </div>

                    {isEinnahme ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-white/50 mb-1">
                            Betrag
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={selectedBuchung.editBetrag}
                            disabled={saving || !!deletingId}
                            onChange={(event) =>
                              updateLocalBuchung(
                                selectedBuchung.id,
                                'editBetrag',
                                event.target.value
                              )
                            }
                            className={`w-full rounded-lg px-3 py-2 bg-black/35 border border-white/10 outline-none ${
                              selectedBuchung.editStatus === 'angekuendigt'
                                ? 'text-orange-300'
                                : 'text-white'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-white/50 mb-1">
                            Status
                          </label>
                          <select
                            value={selectedBuchung.editStatus}
                            disabled={saving || !!deletingId}
                            onChange={(event) =>
                              updateLocalBuchung(
                                selectedBuchung.id,
                                'editStatus',
                                event.target.value
                              )
                            }
                            className={`w-full rounded-lg px-3 py-2 bg-black/35 border border-white/10 outline-none ${
                              selectedBuchung.editStatus === 'angekuendigt'
                                ? 'text-orange-300'
                                : 'text-white'
                            }`}
                          >
                            <option value="angekuendigt">Geplant</option>
                            <option value="gebucht">Gebucht</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-white/50 mb-1">
                            Jahr
                          </label>
                          <input
                            type="number"
                            min="2000"
                            max="2100"
                            value={selectedBuchung.editJahr}
                            disabled={saving || !!deletingId}
                            onChange={(event) =>
                              updateLocalBuchung(
                                selectedBuchung.id,
                                'editJahr',
                                event.target.value
                              )
                            }
                            className="w-full rounded-lg px-3 py-2 bg-black/35 border border-white/10 text-white outline-none disabled:opacity-50"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-white/50 mb-1">
                            KW
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="53"
                            value={selectedBuchung.editKw}
                            disabled={saving || !!deletingId}
                            onChange={(event) =>
                              updateLocalBuchung(
                                selectedBuchung.id,
                                'editKw',
                                event.target.value
                              )
                            }
                            className="w-full rounded-lg px-3 py-2 bg-black/35 border border-white/10 text-white outline-none disabled:opacity-50"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-white/50 mb-1">
                            Tag
                          </label>
                          <select
                            value={selectedBuchung.editTag}
                            disabled={saving || !!deletingId}
                            onChange={(event) =>
                              updateLocalBuchung(
                                selectedBuchung.id,
                                'editTag',
                                event.target.value
                              )
                            }
                            className="w-full rounded-lg px-3 py-2 bg-black/35 border border-white/10 text-white outline-none disabled:opacity-50"
                          >
                            {TAGE.map((tag) => (
                              <option key={tag} value={tag}>
                                {tag}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-white/50 mb-1">
                            Betrag
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={selectedBuchung.editBetrag}
                            disabled={
                              saving ||
                              !!deletingId ||
                              selectedBuchung.editEintragTyp === 'feiertag'
                            }
                            onChange={(event) =>
                              updateLocalBuchung(
                                selectedBuchung.id,
                                'editBetrag',
                                event.target.value
                              )
                            }
                            className={`w-full rounded-lg px-3 py-2 bg-black/35 border border-white/10 outline-none disabled:opacity-50 ${
                              selectedBuchung.editStatus === 'angekuendigt'
                                ? 'text-orange-300'
                                : 'text-white'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-white/50 mb-1">
                            Filiale
                          </label>
                          <select
                            value={selectedBuchung.editFiliale}
                            disabled={saving || !!deletingId}
                            onChange={(event) =>
                              updateLocalBuchung(
                                selectedBuchung.id,
                                'editFiliale',
                                event.target.value
                              )
                            }
                            className="w-full rounded-lg px-3 py-2 bg-black/35 border border-white/10 text-white outline-none disabled:opacity-50"
                          >
                            {FILIALEN.map((filiale) => (
                              <option key={filiale} value={filiale}>
                                {filiale}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-white/50 mb-1">
                            Status
                          </label>
                          <select
                            value={selectedBuchung.editStatus}
                            disabled={saving || !!deletingId}
                            onChange={(event) =>
                              updateLocalBuchung(
                                selectedBuchung.id,
                                'editStatus',
                                event.target.value
                              )
                            }
                            className={`w-full rounded-lg px-3 py-2 bg-black/35 border border-white/10 outline-none disabled:opacity-50 ${
                              selectedBuchung.editStatus === 'angekuendigt'
                                ? 'text-orange-300'
                                : 'text-white'
                            }`}
                          >
                            <option value="angekuendigt">angekuendigt</option>
                            <option value="gebucht">gebucht</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-white/50 mb-1">
                            Typ
                          </label>
                          <select
                            value={selectedBuchung.editEintragTyp}
                            disabled={saving || !!deletingId}
                            onChange={(event) =>
                              updateLocalBuchung(
                                selectedBuchung.id,
                                'editEintragTyp',
                                event.target.value
                              )
                            }
                            className="w-full rounded-lg px-3 py-2 bg-black/35 border border-white/10 text-white outline-none disabled:opacity-50"
                          >
                            {EINTRAG_TYPEN.map((typ) => (
                              <option key={typ} value={typ}>
                                {typ}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-white/50 mb-1">
                            Notiz
                          </label>
                          <input
                            type="text"
                            value={selectedBuchung.editNotiz}
                            disabled={saving || !!deletingId}
                            onChange={(event) =>
                              updateLocalBuchung(
                                selectedBuchung.id,
                                'editNotiz',
                                event.target.value
                              )
                            }
                            placeholder="Notiz"
                            className="w-full rounded-lg px-3 py-2 bg-black/35 border border-white/10 text-white placeholder-white/30 outline-none disabled:opacity-50"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
