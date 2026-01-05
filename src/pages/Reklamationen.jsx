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
  } catch {}

  const rawFiliale = user?.filiale || "";
  const userRole = user?.role || "";
  const isSuperUser =
    !rawFiliale ||
    rawFiliale.toLowerCase().trim() === "alle" ||
    ['supervisor', 'manager', 'admin'].includes(userRole.toLowerCase());

  const canEdit = userRole.toLowerCase() !== 'filiale';

  const formatLfdDisplay = ({ min_lfd_nr, position_count }) => {
    if (min_lfd_nr == null) return "#";
    const count = Number(position_count ?? 0);
    if (count <= 1) return `#${min_lfd_nr}`;
    return `#${min_lfd_nr}+${count - 1}`;
  };

  const fetchReklamationen = async () => {
    const token = sessionStorage.getItem('token');
    const res = await axios.get(
      `${import.meta.env.VITE_API_URL}/api/reklamationen`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setReklas(res.data);
    applyFilters(res.data, filters);
  };

  useEffect(() => { fetchReklamationen(); }, []);

  const applyFilters = (data, f) => {
    let r = [...data];
    if (f.filiale !== 'Alle') r = r.filter(x => x.filiale === f.filiale);
    if (f.status !== 'Alle') r = r.filter(x => x.status === f.status);
    if (f.reklaNr) r = r.filter(x => (x.rekla_nr || "").toLowerCase().includes(f.reklaNr.toLowerCase()));

    r.sort((a, b) => {
      const da = new Date(a.datum).getTime();
      const db = new Date(b.datum).getTime();
      if (da !== db) return f.sortDatum === 'asc' ? da - db : db - da;
      return (a.min_lfd_nr ?? 999999) - (b.min_lfd_nr ?? 999999);
    });

    setFilteredReklas(r);
    setCurrentPage(1);
  };

  const pagedData = filteredReklas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const formatDate = d => d ? new Date(d).toLocaleDateString('de-DE') : "-";

  const getStatusColor = s => ({
    angelegt: 'text-blue-600',
    'in bearbeitung': 'text-yellow-600',
    freigegeben: 'text-green-600',
    abgelehnt: 'text-red-600'
  })[(s || "").toLowerCase()] || 'text-gray-600';

  return (
    <div className="pt-64 px-[80px] text-white">

      {/* Header */}
      <div className="grid grid-cols-[100px_140px_120px_minmax(0,1fr)_minmax(0,1fr)_140px] font-bold text-gray-300 border-b border-gray-500 pb-2 mb-6">
        <div>lfd. Nr.</div>
        <div>Datum</div>
        <div>Filiale</div>
        <div>Rekla-Nr.</div>
        <div>Lieferant</div>
        <div className="text-right">Status</div>
      </div>

      {/* Rows */}
      {pagedData.map(r => (
        <div
          key={r.id}
          className="grid grid-cols-[100px_140px_120px_minmax(0,1fr)_minmax(0,1fr)_140px] bg-white text-black px-4 py-3 mb-2 rounded-lg shadow hover:bg-gray-100 cursor-pointer"
        >
          <div className="font-bold">
            {formatLfdDisplay(r)}
          </div>

          <div>{formatDate(r.datum)}</div>

          <div>{r.filiale || "-"}</div>

          <div
            className="truncate whitespace-nowrap"
            title={r.rekla_nr}
          >
            {r.rekla_nr}
          </div>

          <div
            className="truncate whitespace-nowrap"
            title={r.lieferant}
          >
            {r.lieferant}
          </div>

          <div className={`text-right font-semibold ${getStatusColor(r.status)}`}>
            {r.status}
          </div>
        </div>
      ))}
    </div>
  );
}
