// src/pages/Reklamationen.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
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

  const headlineText = isSuperUser
    ? "Reklamationsliste"
    : `Reklamationsliste – Filiale ${rawFiliale}`;

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
  }, []);

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
      result = result.filter(r => r.rekla_nr && r.rekla_nr.toLowerCase().includes(search));
    }
    result.sort((a, b) => {
      const dateA = new Date(a.datum);
      const dateB = new Date(b.datum);
      return newFilters.sortDatum === 'asc' ? dateA - dateB : dateB - dateA;
    });
    setFilteredReklas(result);
    setCurrentPage(1);
  };

  const handleFilterApply = (newFilters) => {
    setFilters(newFilters);
    applyFilters(reklas, newFilters);
  };

  const pagedData = filteredReklas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalPages = Math.ceil(filteredReklas.length / PAGE_SIZE);

  const visiblePages = () => {
    const start = Math.floor((currentPage - 1) / 5) * 5 + 1;
    return Array.from({ length: Math.min(5, totalPages - start + 1) }, (_, i) => start + i);
  };

  const formatDate = (isoDate) => {
    if (!isoDate) return "-";
    const date = new Date(isoDate);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Angelegt': return 'text-yellow-600';
      case 'Freigegeben': return 'text-green-600';
      case 'Erledigt': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  // Neue Funktion für die Lfd. Nr. Anzeige
  const formatLfdNr = (rekla) => {
    if (!rekla.min_lfd_nr) return '–';
    const base = rekla.min_lfd_nr;
    if (rekla.position_count > 1) {
      return `${base}+${rekla.position_count - 1}`;
    }
    return `${base}`;
  };

  const handleCreateSuccess = () => {
    fetchReklamationen();
    setShowCreateModal(false);
    setShowEditModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dein Original-Header – unverändert */}
      {/* ... (wie in deiner Datei) */}

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-[#800000] mb-8">{headlineText}</h1>

        {/* Buttons – unverändert */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#800000] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#600000] transition"
          >
            + Neue Reklamation
          </button>
          <button
            onClick={() => setShowFilterModal(true)}
            className="bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
          >
            Filter
          </button>
        </div>

        {/* Tabelle – hier die einzige Änderung: Neue Lfd. Nr.-Spalte */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#3A3838] text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium">Lfd. Nr.</th>
                  <th className="px-6 py-4 text-left text-sm font-medium">Rekla-Nr.</th>
                  <th className="px-6 py-4 text-left text-sm font-medium">Datum</th>
                  <th className="px-6 py-4 text-left text-sm font-medium">Lieferant</th>
                  <th className="px-6 py-4 text-left text-sm font-medium">Art</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedData.map((rekla) => (
                  <tr
                    key={rekla.id}
                    onClick={() => {
                      setActiveReklaId(rekla.id);
                      if (!reklaDetails[rekla.id]) loadDetails(rekla.id);
                    }}
                    className="hover:bg-gray-50 cursor-pointer transition"
                  >
                    <td className="px-6 py-4 font-bold text-[#800000]">
                      {formatLfdNr(rekla)}
                    </td>
                    <td className="px-6 py-4">{rekla.rekla_nr || '-'}</td>
                    <td className="px-6 py-4">{formatDate(rekla.datum)}</td>
                    <td className="px-6 py-4">{rekla.lieferant || '-'}</td>
                    <td className="px-6 py-4">{rekla.art || '-'}</td>
                    <td className={`px-6 py-4 text-right font-semibold ${getStatusColor(rekla.status)}`}>
                      {rekla.status || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination – unverändert */}
          {totalPages > 1 && (
            <div className="px-6 py-4 flex justify-between items-center border-t">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
              >
                Zurück
              </button>
              <div className="flex gap-2">
                {visiblePages().map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-4 py-2 rounded ${page === currentPage ? 'bg-[#800000] text-white' : 'bg-gray-300'}`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
              >
                Weiter
              </button>
            </div>
          )}
        </div>

        {/* Details-Modal, Modals – unverändert aus deiner Datei */}
        {activeReklaId && reklaDetails[activeReklaId] && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-3xl font-bold text-[#800000]">Reklamationsdetails</h2>
                <button
                  onClick={() => setActiveReklaId(null)}
                  className="text-gray-500 hover:text-gray-700 text-3xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-6 gap-4 mb-8 text-lg">
                <div className="font-bold">#</div>
                <div>Rekla-Nr.</div>
                <div>Datum</div>
                <div>Lieferant</div>
                <div>Art</div>
                <div className="text-right">Status</div>
              </div>
              <div className="grid grid-cols-6 gap-4 mb-8 text-lg">
                <div className="font-bold">#</div>
                <div>{reklaDetails[activeReklaId]?.reklamation?.rekla_nr}</div>
                <div>{formatDate(reklaDetails[activeReklaId]?.reklamation?.datum)}</div>
                <div>{reklaDetails[activeReklaId]?.reklamation?.lieferant}</div>
                <div>{reklaDetails[activeReklaId]?.reklamation?.art || "-"}</div>
                <div className={`text-right font-semibold ${getStatusColor(reklaDetails[activeReklaId]?.reklamation?.status)}`}>
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
                        <div className="font-semibold text-lg">{pos.artikelnummer}</div>
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
            </div>
          </div>
        )}

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
      </main>
    </div>
  );
}