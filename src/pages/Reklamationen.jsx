// src/pages/Reklamationen.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import CreateReklamationModal from '../components/CreateReklamationModal';
import EditReklamationModal from '../components/EditReklamationModal';
import FilterModal from '../components/FilterModal';

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getStatusColor = (status) => {
  switch (status) {
    case 'Freigegeben':
      return 'text-green-600';
    case 'Abgelehnt':
      return 'text-red-600';
    case 'In Bearbeitung':
      return 'text-yellow-600';
    case 'Erledigt':
      return 'text-gray-500';
    default:
      return 'text-black';
  }
};

// Liefert den reinen Anzeige-Teil ohne führendes "#"
// Beispiele:
// - min=1435, count=4 => "1435+3"
// - min=12, count=1  => "12"
// - unbekannt         => null
const lfdDisplayFromMinCount = (min, count) => {
  const minNr = min === 0 ? 0 : (min ? Number(min) : null);
  const c = count ? Number(count) : null;

  if (minNr === null || Number.isNaN(minNr)) return null;
  if (!c || Number.isNaN(c) || c <= 1) return String(minNr);

  return `${minNr}+${c - 1}`;
};

// Robust: berechnet min/count aus Positionen
const lfdDisplayFromPositions = (positionen) => {
  if (!Array.isArray(positionen) || positionen.length === 0) return null;

  const nums = positionen
    .map((p) => (p?.lfd_nr !== null && p?.lfd_nr !== undefined ? Number(p.lfd_nr) : null))
    .filter((n) => n !== null && !Number.isNaN(n));

  if (nums.length === 0) return null;

  const min = Math.min(...nums);
  const count = positionen.length;

  return lfdDisplayFromMinCount(min, count);
};

export default function Reklamationen() {
  const [reklamationen, setReklamationen] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeReklaId, setActiveReklaId] = useState(null);
  const [reklaDetails, setReklaDetails] = useState({});

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const storedUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('user'));
    } catch {
      return null;
    }
  }, []);

  const isAdminOrSupervisor = useMemo(() => {
    if (!storedUser) return false;
    return storedUser.role === 'Admin' || storedUser.role === 'Supervisor';
  }, [storedUser]);

  const headlineText = useMemo(() => {
    if (!storedUser) return 'Reklamationen';
    return storedUser.role === 'Filiale'
      ? `Reklamationen – Filiale ${storedUser.filiale}`
      : 'Reklamationen';
  }, [storedUser]);

  const apiBase = import.meta.env.VITE_API_URL;

  const loadReklamationen = async () => {
    setLoading(true);
    const token = sessionStorage.getItem('token');
    try {
      const res = await axios.get(`${apiBase}/api/reklamationen`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setReklamationen(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Fehler beim Laden der Reklamationen:', err);
      setReklamationen([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (id) => {
    const token = sessionStorage.getItem('token');
    try {
      const res = await axios.get(`${apiBase}/api/reklamationen/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setReklaDetails((prev) => ({
        ...prev,
        [id]: res.data,
      }));
    } catch (err) {
      console.error('Fehler beim Laden der Details:', err);
    }
  };

  useEffect(() => {
    loadReklamationen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateSuccess = () => {
    loadReklamationen();
  };

  const handleFilterApply = (newFilters) => {
    setFilters(newFilters || {});
    setCurrentPage(1);
  };

  const openEditModal = () => {
    setShowEditModal(true);
  };

  // Filter + Sort: aktuell minimal belassen (wie vorher)
  const filteredData = useMemo(() => {
    let data = [...reklamationen];

    // Beispielhafte Filteranwendung (so wie du es vermutlich nutzt)
    if (filters?.status && filters.status !== 'alle') {
      data = data.filter((r) => r.status === filters.status);
    }
    if (filters?.filiale && filters.filiale !== 'alle') {
      data = data.filter((r) => r.filiale === filters.filiale);
    }
    if (filters?.lieferant && filters.lieferant.trim() !== '') {
      const s = filters.lieferant.trim().toLowerCase();
      data = data.filter((r) => (r.lieferant || '').toLowerCase().includes(s));
    }
    if (filters?.rekla_nr && filters.rekla_nr.trim() !== '') {
      const s = filters.rekla_nr.trim().toLowerCase();
      data = data.filter((r) => (r.rekla_nr || '').toLowerCase().includes(s));
    }

    // Default-Sort: Datum desc (wie bisher im Backend)
    return data;
  }, [reklamationen, filters]);

  const totalPages = useMemo(() => {
    const pages = Math.ceil(filteredData.length / itemsPerPage);
    return pages > 0 ? pages : 1;
  }, [filteredData.length]);

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const visiblePages = () => {
    const pages = [];
    const maxVisible = 7;

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  // LFD-Anzeige für Listenzeile (aus min_lfd_nr + position_count)
  const getListLfdCell = (rekla) => {
    const display = lfdDisplayFromMinCount(rekla?.min_lfd_nr, rekla?.position_count);
    return display ? `#${display}` : '#';
  };

  // LFD-Anzeige im Modal (primär aus Positionen, fallback auf reklamation.min/count falls vorhanden)
  const getModalLfdCell = (detail) => {
    if (!detail) return '#';
    const positionen = detail?.positionen || [];
    const byPos = lfdDisplayFromPositions(positionen);
    if (byPos) return `#${byPos}`;

    const r = detail?.reklamation;
    const byAgg = lfdDisplayFromMinCount(r?.min_lfd_nr, r?.position_count);
    return byAgg ? `#${byAgg}` : '#';
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
    <div
      className="min-h-screen bg-[#3A3838] relative overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}
    >
      {/* Rahmen / Layout (unverändert lassen!) */}
      <div className="absolute top-[15mm] left-[15mm] right-[15mm] bottom-[15mm] border border-white/30 pointer-events-none" />
      <div className="absolute top-[15mm] left-[15mm] right-[15mm] h-[11px] bg-white pointer-events-none" />
      <div className="absolute top-[15mm] left-[15mm] bottom-[15mm] w-[11px] bg-white pointer-events-none" />

      {/* Header rechts */}
      <div className="absolute top-[22px] right-[40px] text-gray-200 text-xl">
        Angemeldet als: {storedUser?.name || '—'}
      </div>

      {/* Menü */}
      <div className="absolute top-[155px] left-[92px] z-20 flex flex-col gap-8">
        <div
          className="cursor-pointer flex items-center gap-4 text-white hover:text-gray-300 transition-all group"
          onClick={() => setShowCreateModal(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          <span className="text-2xl font-medium">Reklamation anlegen</span>
        </div>

        {isAdminOrSupervisor && (
          <div
            className="cursor-pointer flex items-center gap-4 text-white hover:text-gray-300 transition-all group"
            onClick={openEditModal}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              <path
                d="M14 5.5 l-2.5 3"
                stroke="white"
                strokeWidth="3"
                strokeDasharray="30"
                strokeDashoffset="30"
                className="transition-all duration-200 group-hover:animate-[pencilScribble_1.6s_ease-in-out_infinite]"
              />
            </svg>
            <span className="text-2xl font-medium">Reklamation bearbeiten</span>
          </div>
        )}

        <div
          className="cursor-pointer flex items-center gap-4 text-white hover:text-gray-300 transition-all group"
          onClick={() => setShowFilterModal(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="white" viewBox="0 0 24 24">
            <path d="M3 4h18v2H3V4zm2 4h14v2H5V8zm2 4h10v2H7v-2zm2 4h6v2H9v-2z" />
          </svg>
          <span className="text-2xl font-medium">Filter</span>
        </div>
      </div>

      <h1
        className="absolute text-6xl font-bold drop-shadow-[3px_3px_6px_rgba(0,0,0,0.6)] text-white z-10"
        style={{ top: '100px', left: '92px' }}
      >
        {headlineText}
      </h1>

      {/* Tabelle */}
      <div className="pt-64 px-[80px]">
        <div className="grid grid-cols-[100px_180px_140px_1fr_120px] text-left font-bold text-gray-300 border-b border-gray-500 pb-2 mb-6">
          <div>lfd. Nr.</div>
          <div>Rekla-Nr.</div>
          <div>Datum</div>
          <div>Lieferant</div>
          <div className="text-right">Status</div>
        </div>

        {pagedData.map((rekla) => (
          <div
            key={rekla.id}
            className="grid grid-cols-[100px_180px_140px_1fr_120px] bg-white text-black px-4 py-3 mb-2 rounded-lg shadow cursor-pointer hover:bg-gray-100 transition"
            onClick={() => {
              setActiveReklaId(rekla.id);
              if (!reklaDetails[rekla.id]) loadDetails(rekla.id);
            }}
          >
            <div className="font-bold">{getListLfdCell(rekla)}</div>
            <div>{rekla.rekla_nr}</div>
            <div>{formatDate(rekla.datum)}</div>
            <div className="truncate pr-2">{rekla.lieferant}</div>
            <div className={`text-right font-semibold ${getStatusColor(rekla.status)}`}>
              {rekla.status}
            </div>
          </div>
        ))}

        {/* Pagination */}
        <div className="flex justify-center items-center gap-3 mt-8 text-lg">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-1 disabled:opacity-50"
          >
            «
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 disabled:opacity-50"
          >
            ‹
          </button>

          {visiblePages().map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-4 py-2 rounded ${
                page === currentPage
                  ? 'bg-white text-black font-bold'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 disabled:opacity-50"
          >
            ›
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 disabled:opacity-50"
          >
            »
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {activeReklaId && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setActiveReklaId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white text-black rounded-xl shadow-2xl w-[calc(100%-160px)] max-w-7xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-8">
              {!reklaDetails[activeReklaId] ? (
                <div className="text-center py-20 text-2xl text-gray-600">
                  Lade Details...
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-8 border-b pb-4">
                    <h2 className="text-3xl font-bold">Reklamationsdetails</h2>
                    <button
                      onClick={() => setActiveReklaId(null)}
                      className="text-4xl leading-none hover:text-red-600 transition"
                    >
                      ×
                    </button>
                  </div>

                  {/* Kopfzeile */}
                  <div className="grid grid-cols-[110px_220px_160px_1fr_220px_140px] gap-4 mb-3 text-lg font-bold text-gray-700 border-b border-gray-300 pb-3">
                    <div>lfd. Nr.</div>
                    <div>Rekla-Nr.</div>
                    <div>Datum</div>
                    <div>Lieferant</div>
                    <div>Art</div>
                    <div className="text-right">Status</div>
                  </div>

                  {/* Wertezeile */}
                  <div className="grid grid-cols-[110px_220px_160px_1fr_220px_140px] gap-4 mb-8 text-lg">
                    <div className="font-bold">
                      {getModalLfdCell(reklaDetails[activeReklaId])}
                    </div>
                    <div>{reklaDetails[activeReklaId]?.reklamation?.rekla_nr}</div>
                    <div>{formatDate(reklaDetails[activeReklaId]?.reklamation?.datum)}</div>
                    <div className="truncate">{reklaDetails[activeReklaId]?.reklamation?.lieferant}</div>
                    <div className="break-words">
                      {reklaDetails[activeReklaId]?.reklamation?.art || '-'}
                    </div>
                    <div
                      className={`text-right font-semibold ${getStatusColor(
                        reklaDetails[activeReklaId]?.reklamation?.status
                      )}`}
                    >
                      {reklaDetails[activeReklaId]?.reklamation?.status}
                    </div>
                  </div>

                  {/* Positionen */}
                  {reklaDetails[activeReklaId].positionen?.length > 0 && (
                    <div className="mt-6">
                      <p className="font-bold text-xl mb-4">
                        Positionen ({reklaDetails[activeReklaId].positionen.length})
                      </p>

                      <div className="space-y-3">
                        {reklaDetails[activeReklaId].positionen.map((pos) => (
                          <div
                            key={pos.id}
                            className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-baseline justify-between gap-4">
                              <div className="font-semibold text-lg">
                                {pos.artikelnummer || '-'}
                              </div>
                              <div className="font-bold text-gray-700">
                                {pos.lfd_nr !== null && pos.lfd_nr !== undefined ? `#${pos.lfd_nr}` : '#'}
                              </div>
                            </div>

                            <div className="text-sm text-gray-600">
                              EAN: {pos.ean || '-'}
                            </div>

                            <div className="mt-2 text-sm">
                              <span className="font-medium">Reklamierte Menge:</span>{' '}
                              {pos.rekla_menge || '-'} {pos.rekla_einheit || ''}
                              <br />
                              <span className="font-medium">Bestellte Menge:</span>{' '}
                              {pos.bestell_menge || '-'} {pos.bestell_einheit || ''}
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

      {/* Modals */}
      {showCreateModal && (
        <CreateReklamationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {showEditModal && (
        <EditReklamationModal
          onClose={() => setShowEditModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {showFilterModal && (
        <FilterModal
          onClose={() => setShowFilterModal(false)}
          onApply={handleFilterApply}
          currentFilters={filters}
        />
      )}
    </div>
  );
}
