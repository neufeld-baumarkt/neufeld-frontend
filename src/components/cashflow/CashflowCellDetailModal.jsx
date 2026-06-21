import { useEffect, useState } from 'react';

function formatEuro(value) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value || 0));
}

const FILIALEN = ['Verwaltung', 'Ahaus', 'Münster', 'Telgte', 'Vreden'];
const EINTRAG_TYPEN = ['betrag', 'feiertag'];

export default function CashflowCellDetailModal({
  isOpen,
  onClose,
  cell,
  buchungen = [],
  onReload,
}) {
  const [editableBuchungen, setEditableBuchungen] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setEditableBuchungen(
      buchungen.map((buchung) => ({
        ...buchung,
        editBetrag: String(buchung.betrag ?? 0),
        editFiliale: buchung.filiale || 'Verwaltung',
        editStatus: buchung.status || 'angekuendigt',
        editEintragTyp: buchung.eintrag_typ || 'betrag',
        editNotiz: buchung.notiz || '',
      }))
    );
    setError('');
    setSaving(false);
  }, [buchungen, isOpen]);

  if (!isOpen || !cell) return null;

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

  const saveAllAndClose = async () => {
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

    for (const buchung of editableBuchungen) {
      const betrag = Number(buchung.editBetrag);

      if (buchung.editEintragTyp === 'betrag' && (!Number.isFinite(betrag) || betrag <= 0)) {
        setError('Bei Eintragstyp betrag muss der Betrag größer 0 sein.');
        return;
      }

      if (!FILIALEN.includes(buchung.editFiliale)) {
        setError('Ungültige Filiale.');
        return;
      }

      if (!EINTRAG_TYPEN.includes(buchung.editEintragTyp)) {
        setError('Ungültiger Eintragstyp.');
        return;
      }
    }

    setSaving(true);
    setError('');

    try {
      await Promise.all(
        editableBuchungen.map(async (buchung) => {
          const response = await fetch(
            `${baseUrl}/api/cashflow/buchungen/${buchung.id}`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                betrag: Number(buchung.editBetrag),
                filiale: buchung.editFiliale,
                status: buchung.editStatus,
                eintrag_typ: buchung.editEintragTyp,
                notiz: buchung.editNotiz,
              }),
            }
          );

          const data = await response.json().catch(() => null);

          if (!response.ok) {
            throw new Error(
              data?.message || 'Buchung konnte nicht aktualisiert werden.'
            );
          }

          return data.buchung;
        })
      );

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

  return (
    <div
      className="fixed inset-0 z-[75] bg-black/60 px-4 flex items-center justify-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[1200px] max-h-[82vh] rounded-2xl border border-white/10 bg-[#2f2d2d] shadow-[6px_6px_18px_rgba(0,0,0,0.75)] overflow-hidden">
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
                {offeneBuchungen} angekündigte Buchung
                {offeneBuchungen === 1 ? '' : 'en'} offen
              </div>
            )}

            {error && <div className="text-red-300 text-sm mt-2">{error}</div>}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 transition"
          >
            Schließen
          </button>
        </div>

        <div className="p-6 overflow-auto max-h-[calc(82vh-110px)]">
          {editableBuchungen.length === 0 ? (
            <div className="text-center text-white/50 py-10">
              Keine Buchungen in dieser Zelle.
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <div className="grid grid-cols-13 gap-3 px-5 py-3 bg-black/35 border-b border-white/10 text-xs font-bold text-white/60">
                <div className="col-span-2">Betrag</div>
                <div className="col-span-2">Filiale</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Typ</div>
                <div className="col-span-4">Notiz</div>
                <div className="col-span-1 text-right">Aktion</div>
              </div>

              <div className="divide-y divide-white/10">
                {editableBuchungen.map((buchung) => {
                  const isOpen = buchung.editStatus === 'angekuendigt';

                  return (
                    <div
                      key={buchung.id}
                      className="grid grid-cols-13 gap-3 px-5 py-4 text-sm hover:bg-white/5 transition items-center"
                    >
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={buchung.editBetrag}
                          disabled={saving || buchung.editEintragTyp === 'feiertag'}
                          onChange={(event) =>
                            updateLocalBuchung(
                              buchung.id,
                              'editBetrag',
                              event.target.value
                            )
                          }
                          className={`w-full rounded-lg px-3 py-2 bg-black/35 border border-white/10 outline-none disabled:opacity-50 ${
                            isOpen ? 'text-orange-300' : 'text-white'
                          }`}
                        />
                      </div>

                      <div className="col-span-2">
                        <select
                          value={buchung.editFiliale}
                          disabled={saving}
                          onChange={(event) =>
                            updateLocalBuchung(
                              buchung.id,
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

                      <div className="col-span-2">
                        <select
                          value={buchung.editStatus}
                          disabled={saving}
                          onChange={(event) =>
                            updateLocalBuchung(
                              buchung.id,
                              'editStatus',
                              event.target.value
                            )
                          }
                          className={`w-full rounded-lg px-3 py-2 bg-black/35 border border-white/10 outline-none disabled:opacity-50 ${
                            isOpen ? 'text-orange-300' : 'text-white'
                          }`}
                        >
                          <option value="angekuendigt">angekuendigt</option>
                          <option value="gebucht">gebucht</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <select
                          value={buchung.editEintragTyp}
                          disabled={saving}
                          onChange={(event) =>
                            updateLocalBuchung(
                              buchung.id,
                              'editEintragTyp',
                              event.target.value
                            )
                          }
                          className="w-full rounded-lg px-3 py-2 bg-black/35 border border-white/10 text-white outline-none disabled:opacity-50"
                        >
                          <option value="betrag">betrag</option>
                          <option value="feiertag">feiertag</option>
                        </select>
                      </div>

                      <div className="col-span-4">
                        <input
                          type="text"
                          value={buchung.editNotiz}
                          disabled={saving}
                          onChange={(event) =>
                            updateLocalBuchung(
                              buchung.id,
                              'editNotiz',
                              event.target.value
                            )
                          }
                          placeholder="Notiz"
                          className="w-full rounded-lg px-3 py-2 bg-black/35 border border-white/10 text-white placeholder-white/30 outline-none disabled:opacity-50"
                        />
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={saveAllAndClose}
                          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition text-white"
                        >
                          {saving ? '...' : 'OK'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}