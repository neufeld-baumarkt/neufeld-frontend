// src/components/reklamationen/ReklamationDetailModal.jsx
import React from "react";
import { Bookmark } from "lucide-react";

export default function ReklamationDetailModal({
  activeReklaId,
  setActiveReklaId,
  reklaDetails,

  showNotiz,
  setShowNotiz,
  notizDraft,
  setNotizDraft,
  notizSaving,
  saveNotiz,
  canWriteNotiz,

  formatDate,
  getStatusColor,
}) {
  if (!activeReklaId) return null;

  const details = reklaDetails?.[activeReklaId] || null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={() => setActiveReklaId(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white text-black rounded-xl shadow-2xl w-[calc(100%-160px)] max-w-7xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-8">
          {!details ? (
            <div className="text-center py-20 text-2xl text-gray-600">
              Lade Details...
            </div>
          ) : (
            <>
              <div className="mb-5 border-b pb-3 flex items-center justify-between gap-6">
                <h2 className="text-3xl font-bold">Reklamationsdetails</h2>

                <div className="flex items-center gap-3">
                  {(() => {
                    const r = details?.reklamation;
                    const hasNotiz = !!(r?.notiz && String(r.notiz).trim().length > 0);

                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowNotiz((prev) => !prev);
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${
                          hasNotiz
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-gray-200 bg-gray-50 text-gray-500"
                        } hover:opacity-90`}
                        title={hasNotiz ? "Notiz vorhanden" : "Keine Notiz"}
                      >
                        <Bookmark className="w-5 h-5" fill={hasNotiz ? "currentColor" : "none"} />
                        <span className="text-sm font-semibold">Notiz</span>
                      </button>
                    );
                  })()}

                  {/* X oben rechts: schließt das Modal */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveReklaId(null);
                    }}
                    aria-label="Schließen"
                    title="Schließen"
                    className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-black flex items-center justify-center text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>

              {showNotiz && (
                <div className="mb-6" onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const r = details?.reklamation;
                    const hasMeta = !!(r?.notiz_von || r?.notiz_am);

                    return (
                      <>
                        <div className="flex items-end justify-between gap-6 mb-2">
                          <div className="text-lg font-bold">Interne Notiz</div>

                          {hasMeta && (
                            <div className="text-sm text-gray-600 text-right">
                              {r?.notiz_von ? (
                                <div>
                                  Notiz von:{" "}
                                  <span className="font-semibold">{r.notiz_von}</span>
                                </div>
                              ) : null}
                              {r?.notiz_am ? (
                                <div>
                                  am:{" "}
                                  <span className="font-semibold">
                                    {new Date(r.notiz_am).toLocaleString("de-DE")}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>

                        <textarea
                          value={notizDraft}
                          onChange={(e) => setNotizDraft(e.target.value)}
                          readOnly={!canWriteNotiz}
                          placeholder={
                            canWriteNotiz
                              ? "Notiz hier eintragen..."
                              : "Keine Berechtigung zum Bearbeiten."
                          }
                          className={`w-full min-h-[110px] p-3 rounded-lg border resize-y outline-none ${
                            canWriteNotiz
                              ? "border-gray-300 focus:border-blue-300"
                              : "border-gray-200 bg-gray-50 text-gray-600"
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        />

                        <div className="mt-2 flex items-center justify-between gap-6">
                          <div className="text-sm text-gray-600">
                            Löschen = Text leeren + Speichern.
                          </div>

                          {canWriteNotiz && (
                            <button
                              type="button"
                              onClick={saveNotiz}
                              disabled={notizSaving}
                              className="px-4 py-2 rounded-lg bg-[#800000] text-white font-semibold disabled:opacity-50"
                            >
                              {notizSaving ? "Speichern..." : "Speichern"}
                            </button>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {(() => {
                const r = details?.reklamation || {};
                const hasTracking =
                  r?.versand === true &&
                  !!(r?.tracking_id && String(r.tracking_id).trim().length > 0);

                const lsTextRaw = r?.ls_nummer_grund ?? "";
                const lsText = String(lsTextRaw || "").trim();
                const showLs = lsText.length > 0;

                return (
                  <>
                    <div className="grid grid-cols-[220px_140px_120px_minmax(0,1fr)_180px_140px] gap-4 items-center text-sm text-gray-700">
                      <div className="font-semibold text-gray-500">Rekla-Nr.</div>
                      <div className="font-semibold text-gray-500">Datum</div>
                      <div className="font-semibold text-gray-500">Filiale</div>
                      <div className="font-semibold text-gray-500">Lieferant</div>
                      <div className="font-semibold text-gray-500">Art</div>
                      <div className="font-semibold text-gray-500 text-right">Status</div>

                      <div
                        className="text-base font-semibold text-black whitespace-nowrap overflow-hidden text-ellipsis"
                        title={r?.rekla_nr || ""}
                      >
                        {r?.rekla_nr || "-"}
                      </div>
                      <div className="text-base">{formatDate(r?.datum)}</div>
                      <div
                        className="text-base whitespace-nowrap overflow-hidden text-ellipsis"
                        title={r?.filiale || ""}
                      >
                        {r?.filiale || "-"}
                      </div>
                      <div
                        className="text-base whitespace-nowrap overflow-hidden text-ellipsis"
                        title={r?.lieferant || ""}
                      >
                        {r?.lieferant || "-"}
                      </div>
                      <div
                        className="text-base whitespace-nowrap overflow-hidden text-ellipsis"
                        title={r?.art || ""}
                      >
                        {r?.art || "-"}
                      </div>
                      <div className={`text-base font-semibold text-right ${getStatusColor(r?.status)}`}>
                        {r?.status || "-"}
                      </div>
                    </div>

                    {showLs && (
                      <div className="mt-3 text-sm text-gray-700 flex gap-2 items-center">
                        <span className="font-semibold text-gray-500 whitespace-nowrap">LS / Grund:</span>
                        <span
                          className="whitespace-nowrap overflow-hidden text-ellipsis"
                          style={{ maxWidth: "100%" }}
                          title={lsText}
                        >
                          {lsText}
                        </span>
                      </div>
                    )}

                    {hasTracking && (
                      <div className="mt-1 text-sm text-gray-700 flex gap-2 items-center">
                        <span className="font-semibold text-gray-500 whitespace-nowrap">Tracking-ID:</span>
                        <span
                          className="whitespace-nowrap overflow-hidden text-ellipsis"
                          title={String(r.tracking_id)}
                        >
                          {String(r.tracking_id)}
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}

              {details.positionen?.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="font-bold text-lg text-gray-800">
                      Positionen ({details.positionen.length})
                    </p>
                  </div>

                  <div className="space-y-2">
                    {details.positionen.map((pos) => {
                      const artikel = pos?.artikelnummer ?? "-";
                      const ean = pos?.ean ?? "-";
                      const reklaMenge = pos?.rekla_menge ?? "-";
                      const reklaEinheit = pos?.rekla_einheit ?? "";
                      const bestellMenge = pos?.bestell_menge ?? "-";
                      const bestellEinheit = pos?.bestell_einheit ?? "";
                      const lfd = pos?.lfd_nr ?? null;

                      return (
                        <div key={pos.id} className="border border-gray-200 rounded-lg px-3 py-2 bg-white">
                          <div className="grid grid-cols-[minmax(0,1fr)_220px_140px] gap-3 items-center">
                            <div
                              className="font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis"
                              title={String(artikel)}
                            >
                              {artikel}
                            </div>
                            <div
                              className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis"
                              title={String(ean)}
                            >
                              EAN: {ean}
                            </div>
                            <div className="text-right font-bold text-gray-700 whitespace-nowrap">
                              #{lfd ?? "-"}
                            </div>
                          </div>

                          <div className="mt-1 text-sm text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
                            <span className="font-medium">Rekla:</span> {reklaMenge} {reklaEinheit}
                            <span className="mx-2 text-gray-400">|</span>
                            <span className="font-medium">Bestellt:</span> {bestellMenge} {bestellEinheit}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t text-right text-sm text-gray-600">
                Letzte Änderung: {formatDate(details?.reklamation?.letzte_aenderung)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
