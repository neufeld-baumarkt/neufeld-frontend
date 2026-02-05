// src/pages/Reklamationen.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import CreateReklamationModal from '../components/CreateReklamationModal';
import EditReklamationModal from '../components/EditReklamationModal';
import FilterModal from '../components/FilterModal';
import ReklamationDetailModal from '../components/reklamationen/ReklamationDetailModal';
import ReklamationenList from '../components/reklamationen/ReklamationenList';

import {
  filterAndSortReklas,
  paginateReklas,
  getVisiblePages,
} from '../lib/reklamationen/reklamationenLogic';

import {
  formatDate,
  formatLfdDisplay,
  getStatusColor,
} from '../lib/reklamationen/reklamationenFormat';

const PAGE_SIZE = 10;

/** Inline-Modal: Lieferanten verwalten (nur Admin/Supervisor) */
function LieferantenManagerModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]); // [{id, bezeichnung, aktiv}]
  const [query, setQuery] = useState('');
  const [newValue, setNewValue] = useState('');
  const [savingNew, setSavingNew] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const token = sessionStorage.getItem('token');
  const baseUrl = import.meta.env.VITE_API_URL;

  const authHeaders = token ? { headers: { Authorization: `Bearer ${token}` } } : null;

  const load = async () => {
    if (!open) return;
    if (!token) {
      toast.error('Kein Token gefunden. Bitte neu einloggen.');
      return;
    }
    if (!baseUrl) {
      toast.error('VITE_API_URL fehlt.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${baseUrl}/api/lieferanten/manage`, authHeaders);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      const msg = e?.response?.data?.error || 'Lieferanten konnten nicht geladen werden.';
      toast.error(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setQuery('');
      setNewValue('');
      setEditId(null);
      setEditValue('');
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = (() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter((x) => String(x?.bezeichnung || '').toLowerCase().includes(q));
  })();

  const create = async () => {
    const val = String(newValue || '').trim();
    if (!val) return toast.error('Bitte Bezeichnung eingeben.');
    setSavingNew(true);
    try {
      await axios.post(`${baseUrl}/api/lieferanten`, { bezeichnung: val }, authHeaders);
      toast.success('Lieferant angelegt.');
      setNewValue('');
      await load();
    } catch (e) {
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.error ||
        (status === 409 ? 'Lieferant existiert bereits.' : 'Anlegen fehlgeschlagen.');
      toast.error(msg);
    } finally {
      setSavingNew(false);
    }
  };

  const startEdit = (it) => {
    setEditId(it.id);
    setEditValue(String(it.bezeichnung || ''));
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditValue('');
  };

  const saveEditRow = async (id) => {
    const val = String(editValue || '').trim();
    if (!val) return toast.error('Bezeichnung darf nicht leer sein.');
    setSavingEdit(true);
    try {
      await axios.patch(`${baseUrl}/api/lieferanten/${id}`, { bezeichnung: val }, authHeaders);
      toast.success('Bezeichnung gespeichert.');
      cancelEdit();
      await load();
    } catch (e) {
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.error ||
        (status === 409 ? 'Bezeichnung existiert bereits.' : 'Speichern fehlgeschlagen.');
      toast.error(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleAktiv = async (it) => {
    if (busyId) return;
    setBusyId(it.id);
    try {
      await axios.patch(`${baseUrl}/api/lieferanten/${it.id}`, { aktiv: !it.aktiv }, authHeaders);
      toast.success(it.aktiv ? 'Deaktiviert.' : 'Aktiviert.');
      await load();
    } catch (e) {
      const msg = e?.response?.data?.error || 'Status konnte nicht geändert werden.';
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white text-black rounded-xl shadow-2xl w-[calc(100%-80px)] max-w-5xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 md:p-8">
          <div className="flex justify-between items-start mb-6 border-b pb-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Lieferanten verwalten</h2>
              <div className="text-sm text-black/60 mt-1">Admin &amp; Supervisor</div>
            </div>
            <button onClick={onClose} className="text-3xl leading-none hover:text-red-600">×</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className="block font-semibold mb-1">Suche</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Lieferant suchen…"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Neu anlegen</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 border rounded-lg px-3 py-2"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Bezeichnung"
                />
                <button
                  onClick={create}
                  disabled={savingNew}
                  className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
                  title="Anlegen"
                >
                  {savingNew ? '…' : '+'}
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-center text-lg">Lade Lieferanten…</div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 gap-2 bg-black text-white px-4 py-3 text-sm font-semibold">
                <div className="col-span-1">ID</div>
                <div className="col-span-7">Bezeichnung</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2 text-right">Aktion</div>
              </div>

              {filtered.length === 0 ? (
                <div className="p-6 text-center text-black/60">Keine Treffer.</div>
              ) : (
                filtered.map((it) => {
                  const editing = editId === it.id;
                  const toggling = busyId === it.id;

                  return (
                    <div key={it.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-t items-center">
                      <div className="col-span-1 text-black/70">{it.id}</div>

                      <div className="col-span-7">
                        {!editing ? (
                          <div className="flex items-center gap-3">
                            <div className="font-semibold">{it.bezeichnung}</div>
                            <button
                              className="text-sm px-2 py-1 border rounded-md hover:bg-black hover:text-white"
                              onClick={() => startEdit(it)}
                            >
                              Umbenennen
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              className="flex-1 border rounded-lg px-3 py-2"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                            />
                            <button
                              onClick={() => saveEditRow(it.id)}
                              disabled={savingEdit}
                              className="px-3 py-2 rounded-lg bg-black text-white disabled:opacity-50"
                            >
                              {savingEdit ? '…' : 'OK'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={savingEdit}
                              className="px-3 py-2 rounded-lg border"
                            >
                              Abbrechen
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="col-span-2">
                        <span
                          className={
                            it.aktiv
                              ? 'inline-block px-2 py-1 rounded-md bg-green-100 text-green-800 text-sm'
                              : 'inline-block px-2 py-1 rounded-md bg-gray-200 text-gray-700 text-sm'
                          }
                        >
                          {it.aktiv ? 'aktiv' : 'inaktiv'}
                        </span>
                      </div>

                      <div className="col-span-2 text-right">
                        <button
                          onClick={() => toggleAktiv(it)}
                          disabled={toggling}
                          className="px-3 py-2 rounded-lg border hover:bg-black hover:text-white disabled:opacity-50"
                        >
                          {toggling ? '…' : it.aktiv ? 'Deaktivieren' : 'Aktivieren'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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

  // ✅ NEU: Lieferanten-Verwaltung
  const [showLieferantenModal, setShowLieferantenModal] = useState(false);

  // ✅ Notiz-State
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
  const canManageLieferanten = ['admin', 'supervisor'].includes(userRole.toLowerCase());

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
      toast.error('Reklamationen konnten nicht geladen werden.');
    }
  };

  useEffect(() => {
    fetchReklamationen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast.error('Detaildaten konnten nicht geladen werden.');
    }
  };

  // ✅ Notiz-Draft automatisch setzen, sobald Details geladen sind (aber NICHT während offen+tippen)
  useEffect(() => {
    if (!activeReklaId) return;
    const details = reklaDetails[activeReklaId];
    if (!details?.reklamation) return;
    if (showNotiz) return;
    setNotizDraft(details.reklamation.notiz ?? '');
  }, [activeReklaId, reklaDetails, showNotiz]);

  // ✅ Notiz speichern per PATCH
  const saveNotiz = async (e) => {
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

  // ✅ M3: Filter+Sort auslagern (pure functions)
  const applyFilters = (data, newFilters) => {
    const result = filterAndSortReklas(data, newFilters);
    setFilteredReklas(result);
    setCurrentPage(1);
  };

  const handleFilterApply = (newFilters) => {
    setFilters(newFilters);
    applyFilters(reklas, newFilters);
  };

  // ✅ M3: Pagination auslagern (pure functions)
  const { pagedData, totalPages } = paginateReklas(filteredReklas, currentPage, PAGE_SIZE);

  const visiblePages = () => getVisiblePages(currentPage, totalPages);

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

  const handleRowClick = (rekla) => {
    setActiveReklaId(rekla.id);

    // ✅ Notiz-Zustand beim Öffnen resetten
    setShowNotiz(false);
    setNotizDraft('');

    if (!reklaDetails[rekla.id]) loadDetails(rekla.id);
  };

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
      <div className="absolute top-[57px] left-[57px] right-0 bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '7px' }}></div>
      <div className="absolute top-[57px] left-[57px] bottom-0 bg-white" style={{ width: '7px' }}></div>
      <div className="absolute bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '11px', top: '165px', left: '95px', right: '80px' }}></div>

      <div
        className="absolute top-[20px] text-xl font-semibold text-white cursor-pointer select-none"
        style={{ right: '40px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        Angemeldet als: {displayName}
        {menuOpen && (
          <div className="absolute right-0 mt-2 bg-white/90 text-black rounded shadow-lg z-50 px-5 py-4 backdrop-blur-sm" style={{ minWidth: '180px' }}>
            <div onClick={handleLogout} className="hover:bg-gray-100 cursor-pointer flex items-center gap-3 py-2 px-2 rounded transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#444" viewBox="0 0 24 24">
                <path d="M16 13v-2H7V8l-5 4 5 4v-3h9z" />
                <path d="M20 3h-8v2h8v14h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
              </svg>
              <span>Abmelden</span>
            </div>
          </div>
        )}
      </div>

      <div
        className="absolute top-[180px] left-[90px] cursor-pointer flex items-center gap-4 text-white hover:text-gray-300 transition-all group"
        onClick={handleZurueck}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="36" height="36"
          fill="white"
          viewBox="0 0 24 24"
          className="transition-all duration-200 group-hover:animate-[arrowWiggle_1s_ease-in-out_infinite]"
        >
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
        <span className="text-2xl font-medium">Zurück zum Hauptmenü</span>
      </div>

      <div className="absolute top-[180px] right-[80px] flex gap-12 items-center text-white">
        <div
          className="cursor-pointer flex items-center gap-4 text-white hover:text-gray-300 transition-all group"
          onClick={() => setShowCreateModal(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36" height="36"
            fill="white"
            viewBox="0 0 24 24"
            className="transition-all duration-200 group-hover:animate-[plusPulse_1.4s_ease-in-out_infinite]"
          >
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          <span className="text-2xl font-medium">Reklamation anlegen</span>
        </div>

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

        {/* ✅ NEU: Button nur Admin/Supervisor (Layout nicht angefasst, nur ein zusätzlicher Button-Block) */}
        {canManageLieferanten && (
          <div
            className="cursor-pointer flex items-center gap-4 text-white hover:text-gray-300 transition-all group"
            onClick={() => setShowLieferantenModal(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="white">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 1h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 7.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.3.6.22l2.39-.96c.51.4 1.05.71 1.63.94l.36 2.54c.04.24.25.42.49.42h3.8c.24 0 .45-.18.49-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96c.22.08.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z"/>
            </svg>
            <span className="text-2xl font-medium">Lieferanten verwalten</span>
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

      {/* ✅ LISTE (ausgelagert) */}
      <ReklamationenList
        pagedData={pagedData}
        formatLfdDisplay={formatLfdDisplay}
        formatDate={formatDate}
        getStatusColor={getStatusColor}
        onRowClick={handleRowClick}
        currentPage={currentPage}
        totalPages={totalPages}
        visiblePages={visiblePages}
        setCurrentPage={setCurrentPage}
      />

      {/* ✅ NEU: Lieferanten-Manager Modal */}
      {showLieferantenModal && (
        <LieferantenManagerModal
          open={showLieferantenModal}
          onClose={() => setShowLieferantenModal(false)}
        />
      )}

      {/* Detail-Modal (ausgelagert) */}
      {activeReklaId && (
        <ReklamationDetailModal
          activeReklaId={activeReklaId}
          setActiveReklaId={setActiveReklaId}
          reklaDetails={reklaDetails}
          showNotiz={showNotiz}
          setShowNotiz={setShowNotiz}
          notizDraft={notizDraft}
          setNotizDraft={setNotizDraft}
          notizSaving={notizSaving}
          saveNotiz={saveNotiz}
          canWriteNotiz={canWriteNotiz}
          formatDate={formatDate}
          getStatusColor={getStatusColor}
        />
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
    </div>
  );
}
