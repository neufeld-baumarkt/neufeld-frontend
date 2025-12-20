// src/pages/Reklamationen.jsx – Mit Filter-Button und Modal
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import CreateReklamationModal from '../components/CreateReklamationModal';
import FilterModal from '../components/FilterModal'; // NEU

const PAGE_SIZE = 10;

export default function Reklamationen() {
  const [reklas, setReklas] = useState([]);
  const [filteredReklas, setFilteredReklas] = useState([]); // Gefilterte Liste
  const [currentPage, setCurrentPage] = useState(1);
  const [activeReklaId, setActiveReklaId] = useState(null);
  const [reklaDetails, setReklaDetails] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false); // NEU
  const [filters, setFilters] = useState({ // NEU
    filiale: 'Alle',
    status: 'Alle',
    reklaNr: '',
    sortDatum: 'desc'
  });

  // User aus Session
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
      applyFilters(data, filters); // Filter sofort anwenden
    } catch (error) {
      console.error('Fehler beim Laden der Reklamationen:', error);
    }
  };

  useEffect(() => {
    fetchReklamationen();
  }, []);

  // Detaildaten laden
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

  // NEU: Filter und Sortierung anwenden
  const applyFilters = (data, newFilters) => {
    let result = [...data];

    if (newFilters.filiale !== 'Alle') {
      result = result.filter(r => r.filiale === newFilters.filiale);
    }

    if (newFilters.status !== 'Alle') {
      result = result.filter(r => r.status === newFilters.status);
    }

    if (newFilters.reklaNr) {
      const lowerSearch = newFilters.reklaNr.toLowerCase();
      result = result.filter(r => r.rekla_nr.toLowerCase().includes(lowerSearch));
    }

    // Sortierung nach Datum
    result.sort((a, b) => {
      const dateA = new Date(a.datum);
      const dateB = new Date(b.datum);
      return newFilters.sortDatum === 'asc' ? dateA - dateB : dateB - dateA;
    });

    setFilteredReklas(result);
    setCurrentPage(1);
  };

  // NEU: Filter aus Modal übernehmen
  const handleFilterApply = (newFilters) => {
    setFilters(newFilters);
    applyFilters(reklas, newFilters);
  };

  // Pagination
  const pagedData = filteredReklas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalPages = Math.ceil(filteredReklas.length / PAGE_SIZE);
  const visiblePages = () => {
    const start = Math.floor((currentPage - 1) / 5) * 5 + 1;
    return Array.from({ length: Math.min(5, totalPages - start + 1) }, (_, i) => start + i);
  };

  const formatDate = (isoDate) => {
    if (!isoDate) return "-";
    return new Date(isoDate).toLocaleDateString('de-DE');
  };

  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case 'angelegt': return 'text-blue-600';
      case 'bearbeitet': case 'in bearbeitung': return 'text-yellow-600';
      case 'freigegeben': return 'text-green-600';
      case 'abgelehnt': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const handleZurueck = () => { window.location.href = "/start"; };
  const handleLogout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    window.location.href = "/";
  };

  const handleCreateSuccess = () => {
    fetchReklamationen();
  };

  return (
    <div className="relative w-screen min-h-screen bg-[#3A3838] text-white overflow-hidden">
      {/* ... dein kompletter Header, Rahmen, Userinfo, Zurück-Button ... */}

      {/* RECHTE BUTTONS – Filter-Button hinzugefügt */}
      <div className="absolute top-[180px] right-[80px] flex gap-12 items-center text-white">
        <div
          className="cursor-pointer flex items-center gap-4 text-white hover:text-gray-300 transition-all group"
          onClick={() => setShowCreateModal(true)}
        >
          {/* Anlegen-Button – unverändert */}
        </div>

        {/* NEU: FILTER-BUTTON */}
        <div
          className="cursor-pointer flex items-center gap-4 text-white hover:text-gray-300 transition-all group"
          onClick={() => setShowFilterModal(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="white" viewBox="0 0 24 24">
            <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
          </svg>
          <span className="text-2xl font-medium">Filter</span>
        </div>
      </div>

      {/* ... Überschrift, Tabelle, Pagination – Tabelle nutzt pagedData von filteredReklas ... */}

      {/* DETAIL-MODAL – unverändert */}

      {/* ANLEGE-MODAL – unverändert */}

      {/* NEU: FILTER-MODAL */}
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