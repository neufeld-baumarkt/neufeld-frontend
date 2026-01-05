// src/pages/Reklamationen.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import CreateReklamationModal from '../components/CreateReklamationModal';
import EditReklamationModal from '../components/EditReklamationModal';
import FilterModal from '../components/FilterModal';

const PAGE_SIZE = 10;

export default function Reklamationen() {
  const [reklas, setReklas] = useState([]);
  const [filteredReklas, setFilteredReklas] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeReklaId, setActiveReklaId] = useState(null);
  const [reklaDetails, setReklaDetails] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showNotiz, setShowNotiz] = useState(false);
  const [notizDraft, setNotizDraft] = useState('');
  const [notizSaving, setNotizSaving] = useState(false);

  const [filters, setFilters] = useState({
    filiale: 'Alle',
    status: 'Alle',
    reklaNr: '',
    sortDatum: 'desc'
  });

  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem("user"));
  } catch (e) {
    console.warn("Benutzer konnte nicht geladen werden:", e);
  }

  const displayName = user?.name || "Unbekannt";
  const rawFiliale = user?.filiale || "";
  const userRole = user?.role || "";
  const isSuperUser =
    !rawFiliale ||
    rawFiliale.trim() === "" ||
    rawFiliale.trim() === "-" ||
    rawFiliale.toLowerCase().trim() === "alle" ||
    ['supervisor', 'manager', 'admin'].includes(userRole.toLowerCase());

  const canEdit = userRole.toLowerCase() !== 'filiale';

  const canWriteNotiz = ['admin', 'supervisor'].includes(userRole.toLowerCase());

  const headlineText = isSuperUser
    ? "Reklamationsliste"
    : `Reklamationsliste – Filiale ${rawFiliale}`;

  // ---- lfd. Nr. Anzeige-Logik (List + Detail) ----
  const getLfdDisplayFromListRow = (row) => {
    const min = row?.min_lfd_nr;
    const count = row?.position_count;

    if (!min || !count || count <= 0) return "–";
    if (count === 1) return `${min}`;
    return `${min}+${count - 1}`;
  };

  const formatLfdFromDetails = (details) => {
    const pos = details?.positionen || [];
    const nums = pos.map(p => p?.lfd_nr).filter(n => Number.isFinite(n));
    if (nums.length === 0) return "–";
    const min = Math.min(...nums);
    const count = nums.length;
    if (count === 1) return `#${min}`;
    return `#${min}+${count - 1}`;
  };

  const fetchReklamationen = async () => {
    const token = sessionStorage.getItem('token');
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/reklamationen`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data;
      setReklas(data);
      applyFilters(data, filters);
    } catch (error) {
      console.error('Fehler beim Laden der Reklamationen:', error);
    }
  };

  useEffect(() => {
    fetchReklamationen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync Notiz-Entwurf sobald Detaildaten da sind (aber nicht während aktivem Edit)
  useEffect(() => {
    if (!activeReklaId) return;
    const details = reklaDetails[activeReklaId];
    if (!details?.reklamation) return;
    if (showNotiz) return; // nicht überschreiben, wenn User gerade tippt
    setNotizDraft(details.reklamation.notiz ?? '');
  }, [activeReklaId, reklaDetails, showNotiz]);

  const loadDetails = async (id) => {
    const token = sessionStorage.getItem('token');
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/reklamationen/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReklaDetails((prev) => ({ ...prev, [id]: res.data }));
    } catch (err) {
      console.error("Fehler beim Laden der Detaildaten:", err);
    }
  };

  const saveNotiz = async (e) => {
    // e optional, damit wir es direkt an Buttons hängen können
    if (e?.stopPropagation) e.stopPropagation();

    if (!activeReklaId) return;
    if (!canWriteNotiz) {
      toast.error("Keine Berechtigung: Notiz darf nur Admin/Supervisor speichern.");
      return;
    }

    const token = sessionStorage.getItem('token');
    const payload = { notiz: notizDraft };

    try {
      setNotizSaving(true);
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/reklamationen/${activeReklaId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Notiz gespeichert.");
      await loadDetails(activeReklaId);
    } catch (err) {
      console.error("Fehler beim Speichern der Notiz:", err);
      toast.error("Notiz konnte nicht gespeichert werden.");
    } finally {
      setNotizSaving(false);
    }
  };

  const applyFilters = (data, newFilters) => {
    let result = [...data];

    if (newFilters.filiale !== 'Alle') {
      result = result.filter(r => r.filiale === newFilters.filiale);
    }
    if (newFilters.status !== 'Alle') {
      result = result.filter(r => r.status === newFilters.status);
    }
    if (newFilters.reklaNr) {
      const search = newFilters.reklaNr.toLowerCase();
      result = result.filter(r => (r.rekla_nr || "").toLowerCase().includes(search));
    }

    // ✅ Sortierung: primär Datum, sekundär min_lfd_nr
    const sortDir = newFilters.sortDatum === 'asc' ? 1 : -1;

    result.sort((a, b) => {
      const da = a?.datum ? new Date(a.datum).getTime() : 0;
      const db = b?.datum ? new Date(b.datum).getTime() : 0;

      if (da !== db) return (da - db) * sortDir;

      const aHas = Number.isFinite(a?.min_lfd_nr);
      const bHas = Number.isFinite(b?.min_lfd_nr);

      if (!aHas && !bHas) return 0;
      if (!aHas) return 1;
      if (!bHas) return -1;

      return a.min_lfd_nr - b.min_lfd_nr;
    });

    setFilteredReklas(result);
    setCurrentPage(1);
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    applyFilters(reklas, newFilters);
    setShowFilterModal(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString('de-DE');
    } catch {
      return dateStr;
    }
  };

  const statusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("freigegeben")) return "text-green-700";
    if (s.includes("abgelehnt")) return "text-red-700";
    if (s.includes("erledigt")) return "text-gray-700";
    if (s.includes("bearbeitung")) return "text-yellow-700";
    return "text-blue-700";
  };

  const totalPages = Math.max(1, Math.ceil(filteredReklas.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredReklas.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="relative w-screen min-h-screen bg-[#3A3838] text-white overflow-hidden">
      <style jsx>{`
        @keyframes arrowWiggle {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-10px); }
        }
        @keyframes plusPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.35); }
        }
        @keyframes pencilScribble {
          0% { stroke-dashoffset: 30; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>

      <div className="absolute top-0 left-0 w-full bg-[#800000]" style={{ height: '57px' }}></div>
      <div className="absolute top-0 left-0 h-full bg-[#800000]" style={{ width: '57px' }}></div>
      <div className="absolute top-[57px] left-[57px] right-0 bg-white" style={{ height: '11px' }}></div>
      <div className="absolute top-[57px] left-[57px] bottom-0 bg-white" style={{ width: '11px' }}></div>

      <div className="relative z-10 pl-[68px] pr-[20px] pt-[25px] pb-[30px]">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{headlineText}</h1>

          <div className="relative">
            <button
              type="button"
              className="bg-[#800000] px-4 py-2 rounded-lg font-semibold hover:opacity-90"
              onClick={() => setMenuOpen(prev => !prev)}
            >
              Aktionen
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white text-black rounded-lg shadow-xl overflow-hidden border border-gray-200 z-20">
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-gray-100"
                  onClick={() => {
                    setShowCreateModal(true);
                    setMenuOpen(false);
                  }}
                >
                  Neue Reklamation anlegen
                </button>

                {canEdit && (
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-gray-100"
                    onClick={() => {
                      setShowEditModal(true);
                      setMenuOpen(false);
                    }}
                  >
                    Reklamation bearbeiten / löschen
                  </button>
                )}

                <button
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-gray-100"
                  onClick={() => {
                    setShowFilterModal(true);
                    setMenuOpen(false);
                  }}
                >
                  Filter / Sortierung
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white text-black rounded-xl shadow-2xl p-6">
          <div className="grid grid-cols-[110px_200px_140px_1fr_140px_140px] gap-4 text-sm font-bold text-gray-700 border-b border-gray-300 pb-3">
            <div>Lfd. Nr.</div>
            <div>Rekla-Nr.</div>
            <div>Datum</div>
            <div>Lieferant</div>
            <div>Art</div>
            <div className="text-right">Status</div>
          </div>

          <div className="divide-y divide-gray-200">
            {pageItems.map((rekla) => (
              <div
                key={rekla.id}
                className="grid grid-cols-[110px_200px_140px_1fr_140px_140px] gap-4 py-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setActiveReklaId(rekla.id);
                  setShowNotiz(false);
                  setNotizDraft('');
                  if (!reklaDetails[rekla.id]) loadDetails(rekla.id);
                  else {
                    const existingNotiz = (reklaDetails[rekla.id]?.reklamation?.notiz ?? '');
                    setNotizDraft(existingNotiz);
                  }
                }}
              >
                <div className="font-bold text-[#800000]">
                  {getLfdDisplayFromListRow(rekla)}
                </div>
                <div className="font-semibold">{rekla.rekla_nr}</div>
                <div>{formatDate(rekla.datum)}</div>
                <div className="truncate">{rekla.lieferant}</div>
                <div className="truncate">{rekla.art || "-"}</div>
                <div className={`text-right font-semibold ${statusColor(rekla.status)}`}>
                  {rekla.status}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-gray-600">
              Seite {currentPage} von {totalPages} • Benutzer: {displayName}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 disabled:opacity-50"
              >
                ««
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 disabled:opacity-50"
              >
                «
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 disabled:opacity-50"
              >
                »
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 disabled:opacity-50"
              >
                »»
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail-Modal */}
      {activeReklaId && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setActiveReklaId(null)}
        >
          <div
            // WICHTIG: schließen per Klick AUF die Karte (wie gewünscht)
            onClick={() => setActiveReklaId(null)}
            className="bg-white text-black rounded-xl shadow-2xl w-[calc(100%-160px)] max-w-7xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-8">
              {!reklaDetails[activeReklaId] ? (
                <div className="text-center py-20 text-2xl text-gray-600">
                  Lade Details...
                </div>
              ) : (
                <>
                  <div className="mb-8 border-b pb-4 flex items-center justify-between gap-6">
                    <h2 className="text-3xl font-bold">Reklamationsdetails</h2>

                    {(() => {
                      const r = reklaDetails[activeReklaId]?.reklamation;
                      const hasNotiz = !!(r?.notiz && String(r.notiz).trim().length > 0);
                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowNotiz((prev) => !prev);
                          }}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${
                            hasNotiz ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-50 text-gray-500"
                          } hover:opacity-90`}
                          title={hasNotiz ? "Notiz vorhanden" : "Keine Notiz"}
                        >
                          <Bookmark className="w-5 h-5" fill={hasNotiz ? "currentColor" : "none"} />
                          <span className="text-sm font-semibold">Notiz</span>
                        </button>
                      );
                    })()}
                  </div>

                  {/* Notizfeld (nur Detailansicht, kein eigenes Modal) */}
                  {showNotiz && (
                    <div className="mb-8" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const r = reklaDetails[activeReklaId]?.reklamation;
                        const hasMeta = !!(r?.notiz_von || r?.notiz_am);
                        return (
                          <>
                            <div className="flex items-end justify-between gap-6 mb-2">
                              <div className="text-xl font-bold">Interne Notiz</div>

                              {hasMeta && (
                                <div className="text-sm text-gray-600 text-right">
                                  {r?.notiz_von ? (
                                    <div>Notiz von: <span className="font-semibold">{r.notiz_von}</span></div>
                                  ) : null}
                                  {r?.notiz_am ? (
                                    <div>am: <span className="font-semibold">{new Date(r.notiz_am).toLocaleString('de-DE')}</span></div>
                                  ) : null}
                                </div>
                              )}
                            </div>

                            <textarea
                              value={notizDraft}
                              onChange={(e) => setNotizDraft(e.target.value)}
                              readOnly={!canWriteNotiz}
                              placeholder={canWriteNotiz ? "Notiz hier eintragen..." : "Keine Berechtigung zum Bearbeiten."}
                              className={`w-full min-h-[120px] p-4 rounded-lg border resize-y outline-none ${
                                canWriteNotiz ? "border-gray-300 focus:border-blue-300" : "border-gray-200 bg-gray-50 text-gray-600"
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            />

                            <div className="mt-3 flex items-center justify-between gap-6">
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

                  <div className="grid grid-cols-[100px_200px_160px_1fr_140px_140px] gap-4 text-lg font-bold text-gray-700 border-b border-gray-300 pb-3">
                    <div>lfd. Nr.</div>
                    <div>Rekla-Nr.</div>
                    <div>Datum</div>
                    <div>Lieferant</div>
                    <div>Art</div>
                    <div className="text-right">Status</div>
                  </div>

                  <div className="grid grid-cols-[100px_200px_160px_1fr_140px_140px] gap-4 mb-8 text-lg">
                    <div className="font-bold">{formatLfdFromDetails(reklaDetails[activeReklaId])}</div>
                    <div>{reklaDetails[activeReklaId]?.reklamation?.rekla_nr}</div>
                    <div>{formatDate(reklaDetails[activeReklaId]?.reklamation?.datum)}</div>
                    <div>{reklaDetails[activeReklaId]?.reklamation?.lieferant}</div>
                    <div>{reklaDetails[activeReklaId]?.reklamation?.art || "-"}</div>
                    <div className={`text-right font-semibold ${statusColor(reklaDetails[activeReklaId]?.reklamation?.status)}`}>
                      {reklaDetails[activeReklaId]?.reklamation?.status}
                    </div>
                  </div>

                  {reklaDetails[activeReklaId].positionen?.length > 0 && (
                    <div className="mt-6">
                      <p className="font-bold text-xl mb-4">
                        Positionen ({reklaDetails[activeReklaId].positionen.length})
                      </p>
                      <div className="space-y-3">
                        {reklaDetails[activeReklaId].positionen.map((pos) => (
                          <div key={pos.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex justify-between gap-6">
                              <div className="font-semibold text-lg">{pos.artikelnummer}</div>
                              <div className="font-bold text-lg text-gray-700">
                                #{pos.lfd_nr ?? "-"}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">EAN: {pos.ean || "-"}</div>
                            <div className="mt-2 text-sm">
                              <span className="font-medium">Reklamierte Menge:</span> {pos.rekla_menge} {pos.rekla_einheit}<br />
                              <span className="font-medium">Bestellte Menge:</span> {pos.bestell_menge} {pos.bestell_einheit}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-10 pt-6 border-t text-right text-sm text-gray-600">
                    Letzte Änderung: {formatDate(reklaDetails[activeReklaId]?.reklamation?.letzte_aenderung)}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateReklamationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchReklamationen();
          }}
        />
      )}

      {showEditModal && (
        <EditReklamationModal
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            fetchReklamationen();
          }}
        />
      )}

      {showFilterModal && (
        <FilterModal
          onClose={() => setShowFilterModal(false)}
          currentFilters={filters}
          onApply={handleApplyFilters}
          isSuperUser={isSuperUser}
        />
      )}
    </div>
  );
}
