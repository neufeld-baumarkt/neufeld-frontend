// src/components/LieferantenManagerModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

function safeParseUser() {
  try {
    return JSON.parse(sessionStorage.getItem('user'));
  } catch {
    return null;
  }
}

function getToken() {
  return sessionStorage.getItem('token') || '';
}

function isAdminOrSupervisor(user) {
  const role = String(user?.role || '');
  return role === 'Admin' || role === 'Supervisor';
}

export default function LieferantenManagerModal({ open, onClose, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]); // [{id, bezeichnung, aktiv}]
  const [query, setQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const user = useMemo(() => safeParseUser(), []);
  const canManage = isAdminOrSupervisor(user);

  const baseUrl = import.meta.env.VITE_API_URL;

  const authConfig = useMemo(() => {
    const token = getToken();
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  }, []);

  async function load() {
    if (!open) return;
    if (!baseUrl) {
      toast.error('VITE_API_URL fehlt.');
      return;
    }
    if (!authConfig?.headers?.Authorization) {
      toast.error('Kein Token gefunden. Bitte neu einloggen.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${baseUrl}/api/lieferanten/manage`, authConfig);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      const msg = e?.response?.data?.error || 'Lieferanten konnten nicht geladen werden.';
      toast.error(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      // reset UI state on open
      setQuery('');
      setNewName('');
      setEditId(null);
      setEditValue('');
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter((x) => String(x?.bezeichnung || '').toLowerCase().includes(q));
  }, [items, query]);

  async function handleCreate() {
    if (savingNew) return;
    const name = String(newName || '').trim();
    if (!name) {
      toast.error('Bitte Bezeichnung eingeben.');
      return;
    }

    setSavingNew(true);
    try {
      await axios.post(
        `${baseUrl}/api/lieferanten`,
        { bezeichnung: name },
        authConfig
      );
      toast.success('Lieferant angelegt.');
      setNewName('');
      await load();
      onUpdated?.();
    } catch (e) {
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.error ||
        (status === 409 ? 'Lieferant existiert bereits.' : 'Anlegen fehlgeschlagen.');
      toast.error(msg);
    } finally {
      setSavingNew(false);
    }
  }

  function startEdit(item) {
    setEditId(item.id);
    setEditValue(String(item.bezeichnung || ''));
  }

  function cancelEdit() {
    setEditId(null);
    setEditValue('');
  }

  async function saveEdit(id) {
    if (savingEdit) return;
    const value = String(editValue || '').trim();
    if (!value) {
      toast.error('Bezeichnung darf nicht leer sein.');
      return;
    }

    setSavingEdit(true);
    try {
      await axios.patch(
        `${baseUrl}/api/lieferanten/${id}`,
        { bezeichnung: value },
        authConfig
      );
      toast.success('Bezeichnung gespeichert.');
      cancelEdit();
      await load();
      onUpdated?.();
    } catch (e) {
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.error ||
        (status === 409 ? 'Bezeichnung existiert bereits.' : 'Speichern fehlgeschlagen.');
      toast.error(msg);
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleAktiv(item) {
    if (togglingId) return;
    setTogglingId(item.id);
    try {
      await axios.patch(
        `${baseUrl}/api/lieferanten/${item.id}`,
        { aktiv: !item.aktiv },
        authConfig
      );
      toast.success(item.aktiv ? 'Deaktiviert.' : 'Aktiviert.');
      await load();
      onUpdated?.();
    } catch (e) {
      const msg = e?.response?.data?.error || 'Status konnte nicht geändert werden.';
      toast.error(msg);
    } finally {
      setTogglingId(null);
    }
  }

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
              <div className="text-sm text-black/60 mt-1">
                Nur Admin &amp; Supervisor
              </div>
            </div>
            <button onClick={onClose} className="text-3xl leading-none hover:text-red-600">
              ×
            </button>
          </div>

          {!canManage ? (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
              Keine Berechtigung. (Nur Admin/Supervisor)
            </div>
          ) : (
            <>
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
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Bezeichnung"
                    />
                    <button
                      onClick={handleCreate}
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
                    filtered.map((item) => {
                      const isEditing = editId === item.id;
                      const isToggling = togglingId === item.id;

                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-12 gap-2 px-4 py-3 border-t items-center"
                        >
                          <div className="col-span-1 text-black/70">{item.id}</div>

                          <div className="col-span-7">
                            {!isEditing ? (
                              <div className="flex items-center gap-3">
                                <div className="font-semibold">{item.bezeichnung}</div>
                                <button
                                  className="text-sm px-2 py-1 border rounded-md hover:bg-black hover:text-white"
                                  onClick={() => startEdit(item)}
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
                                  onClick={() => saveEdit(item.id)}
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
                                item.aktiv
                                  ? 'inline-block px-2 py-1 rounded-md bg-green-100 text-green-800 text-sm'
                                  : 'inline-block px-2 py-1 rounded-md bg-gray-200 text-gray-700 text-sm'
                              }
                            >
                              {item.aktiv ? 'aktiv' : 'inaktiv'}
                            </span>
                          </div>

                          <div className="col-span-2 text-right">
                            <button
                              onClick={() => toggleAktiv(item)}
                              disabled={isToggling}
                              className="px-3 py-2 rounded-lg border hover:bg-black hover:text-white disabled:opacity-50"
                            >
                              {isToggling ? '…' : item.aktiv ? 'Deaktivieren' : 'Aktivieren'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
