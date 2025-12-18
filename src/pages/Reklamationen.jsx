// src/pages/Reklamationen.jsx – "Reklamation bearbeiten"-Button öffnet jetzt das Edit-Modal (leer)
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import CreateReklamationModal from '../components/CreateReklamationModal';
import EditReklamationModal from '../components/EditReklamationModal'; // NEU: Import

const PAGE_SIZE = 10;

export default function Reklamationen() {
  const [reklas, setReklas] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeReklaId, setActiveReklaId] = useState(null);
  const [reklaDetails, setReklaDetails] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false); // NEU: für das Bearbeiten-Modal

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

  // Bearbeiten erlaubt? Nein bei role "Filiale"
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
      setReklas(response.data);
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

  const pagedData = reklas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalPages = Math.ceil(reklas.length / PAGE_SIZE);
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

  // NEU: Öffnet das Edit-Modal (leer)
  const openEditModal = () => {
    setShowEditModal(true);
  };

  return (
    <div className="relative w-screen min-h-screen bg-[#3A3838] text-white overflow-hidden">
      {/* HOVER-ONLY ANIMATIONS */}
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

      {/* Rahmen-Design */}
      <div className="absolute top-0 left-0 w-full bg-[#800000]" style={{ height: '57px' }}></div>
      <div className="absolute top-0 left-0 h-full bg-[#800000]" style={{ width: '57px' }}></div>
      <div className="absolute top-[57px] left-[57px] right-0 bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '7px' }}></div>
      <div className="absolute top-[57px] left-[57px] bottom-0 bg-white" style={{ width: '7px' }}></div>
      <div className="absolute bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '11px', top: '165px', left: '95px', right: '80px' }}></div>

      {/* Userinfo Dropdown */}
      <div
        className="absolute top-[20px] text-xl font-semibold text-white cursor-pointer select-none"
        style={{ right: '40px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        Angemeldet als: {displayName}
        {/* Dropdown bleibt gleich */}
      </div>

      {/* ZURÜCK BUTTON */}
      <div
        className="absolute top-[180px] left-[90px] cursor-pointer flex items-center gap-4 text-white hover:text-gray-300 transition-all group"
        onClick={handleZurueck}
      >
        {/* Zurück-Button bleibt gleich */}
      </div>

      {/* RECHTE BUTTONS */}
      <div className="absolute top-[180px] right-[80px] flex gap-12 items-center text-white">
        {/* ANLEGEN BUTTON */}
        <div
          className="cursor-pointer flex items-center gap-4 text-white hover:text-gray-300 transition-all group"
          onClick={() => setShowCreateModal(true)}
        >
          {/* Anlegen-Button bleibt gleich */}
        </div>

        {/* BEARBEITEN BUTTON – jetzt öffnet Edit-Modal */}
        {canEdit && (
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
      </div>

      {/* Überschrift */}
      <h1 className="absolute text-6xl font-bold drop-shadow-[3px_3px_6px_rgba(0,0,0,0.6)] text-white z-10"
          style={{ top: '100px', left: '92px' }}>
        {headlineText}
      </h1>

      {/* TABELLE + PAGINATION – unverändert */}
      <div className="pt-64 px-[80px]">
        {/* Dein kompletter Tabellen-Code bleibt exakt gleich */}
      </div>

      {/* DETAIL-MODAL – unverändert */}
      {activeReklaId && (
        // dein kompletter Detail-Modal
      )}

      {/* ANLEGE-MODAL */}
      {showCreateModal && (
        <CreateReklamationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* NEU: EDIT-MODAL – öffnet leer */}
      {showEditModal && (
        <EditReklamationModal
          initialData={{}} // leer – später kommt die Suche
          onClose={() => setShowEditModal(false)}
          onSubmit={() => {
            alert('Speichern kommt später – Modal öffnet sich korrekt?');
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}