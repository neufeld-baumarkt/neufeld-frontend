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
      result = result.filter(r => r.rekla_nr.toLowerCase().includes(search));
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
    setCurrentPage(1);
  };

  const openEditModal = () => {
    setShowEditModal(true);
  };

  return (
    <div className="relative w-screen min-h-screen bg-[#3A3838] text-white overflow-hidden">
      {/* ... (ganzes Layout unverändert bis zu den Modals) ... */}

      {/* ANLEGE-MODAL */}
      {showCreateModal && (
        <CreateReklamationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* EDIT-MODAL – JETZT KORREKT */}
      {showEditModal && (
        <EditReklamationModal
          onClose={() => setShowEditModal(false)}
          onSuccess={handleCreateSuccess} // Reload nach Save/Delete
        />
      )}

      {/* FILTER-MODAL */}
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