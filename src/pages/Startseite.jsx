import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import {
  Plus,
  Filter,
  Edit3,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle,
} from 'lucide-react';

function Startseite() {
  // --- Bestehender Auth-Teil (unverändert) ---
  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem('user'));
  } catch (e) {
    console.warn('❗ Benutzer konnte nicht geladen werden:', e);
  }
  const displayName = user?.name || 'Unbekannt';
  const role = user?.role || 'Unbekannt';

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuGridOpen, setMenuGridOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    navigate('/');
  };

  const handleNavigate = (path) => {
    setMenuGridOpen(false);
    navigate(path);
  };

  // --- Neuer Teil: Reklamationen Dashboard ---
  const [reklamationen, setReklamationen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // etwas weniger, da wir oben viel Platz haben

  useEffect(() => {
    const fetchReklamationen = async () => {
      try {
        const response = await fetch('/api/reklamationen', {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('token')}`,
          },
        });

        if (!response.ok) throw new Error('Fehler beim Laden');
        const data = await response.json();
        setReklamationen(data);
        setLoading(false);
      } catch (err) {
        toast.error('Fehler beim Laden der Reklamationen');
        setLoading(false);
      }
    };

    fetchReklamationen();
  }, []);

  const stats = useMemo(() => {
    const offen = reklamationen.filter(
      (r) => r.status !== 'Erledigt' && r.status !== 'Abgeschlossen'
    ).length;

    const kritisch = reklamationen.filter(
      (r) =>
        r.status === 'Reklamation eingereicht' ||
        r.status === 'In Bearbeitung beim Lieferanten'
    ).length;

    const heute = new Date().toISOString().slice(0, 10);
    const neuHeute = reklamationen.filter(
      (r) => r.datum?.slice(0, 10) === heute
    ).length;

    return { offen, kritisch, neuHeute };
  }, [reklamationen]);

  const filteredData = useMemo(() => {
    return reklamationen.filter(
      (r) =>
        r.rekla_nr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.lieferant?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reklamationen, searchTerm]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Erledigt':
      case 'Abgeschlossen':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Reklamation eingereicht':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'In Bearbeitung beim Lieferanten':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Erledigt':
      case 'Abgeschlossen':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'Reklamation eingereicht':
        return <AlertCircle size={16} className="text-red-600" />;
      case 'In Bearbeitung beim Lieferanten':
        return <Clock size={16} className="text-yellow-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#3A3838] overflow-hidden flex flex-col">
      <Toaster position="top-right" />

      {/* --- Klassischer Header-Bereich (unverändert) --- */}
      <div className="absolute top-0 left-0 w-full bg-[#800000]" style={{ height: '57px' }}></div>
      <div className="absolute top-0 left-0 h-full bg-[#800000]" style={{ width: '57px' }}></div>
      <div className="absolute top-[57px] left-[57px] right-0 bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '7px' }}></div>
      <div className="absolute top-[57px] left-[57px] bottom-0 bg-white" style={{ width: '7px' }}></div>
      <div className="absolute bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '11px', top: '165px', left: '95px', right: '80px' }}></div>

      <div className="relative z-10 text-white p-8 ml-[60px] mt-[50px]">
        <h1 className="text-7xl font-bold drop-shadow-[3px_3px_6px_rgba(0,0,0,0.6)]">Neufeld Baumarkt GmbH</h1>
      </div>

      <div className="absolute top-[130px] text-2xl font-semibold text-white" style={{ right: '85px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}>
        Management Tool 3.0
      </div>
      <div className="absolute top-[175px] text-xl font-semibold text-white" style={{ right: '85px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}>
        by Peter Neufeld
      </div>

      {/* Logout Dropdown */}
      <div
        className="absolute top-[20px] text-lg font-semibold text-white cursor-pointer select-none"
        style={{ right: '40px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        Angemeldet als: {displayName}
        {menuOpen && (
          <div className="absolute right-0 mt-2 bg-white/90 text-black rounded shadow-xl z-50 px-4 py-3 backdrop-blur-sm" style={{ minWidth: '180px' }}>
            <div onClick={handleLogout} className="hover:bg-gray-200 cursor-pointer flex items-center gap-3 py-2 px-2 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#800000" viewBox="0 0 24 24">
                <path d="M16 13v-2H7V8l-5 4 5 4v-3h9z" />
                <path d="M20 3h-8v2h8v14h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
              </svg>
              <span className="font-medium">Abmelden</span>
            </div>
          </div>
        )}
      </div>

      {/* Hauptmenü Button */}
      <div className="absolute text-4xl font-bold text-white flex items-center gap-3" style={{ marginLeft: '100px', marginTop: '30px' }}>
        <button onClick={() => setMenuGridOpen(!menuGridOpen)} className="p-2 rounded hover:bg-white/20 transition">
          <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </button>
        Hauptmenü
      </div>

      {/* Hauptmenü Grid */}
      <div
        className={`absolute top-[230px] left-[155px] bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl z-50 overflow-hidden transition-all duration-300 ${
          menuGridOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'
        }`}
        onMouseLeave={() => setMenuGridOpen(false)}
      >
        <div className="grid grid-cols-1 gap-6 px-8 py-6 text-black">
          <div className="group cursor-pointer flex items-center gap-4" onClick={() => handleNavigate('/reklamationen')}>
            <img src="/icons/reklamation.png" alt="Reklamation" className="w-12 h-12" />
            <span className="text-lg font-bold group-hover:text-[#800000] transition">Reklamationen</span>
          </div>
          <div className="group cursor-pointer flex items-center gap-4" onClick={() => handleNavigate('/stoerungen')}>
            <img src="/icons/technik.png" alt="Technik" className="w-12 h-12" />
            <span className="text-lg font-bold group-hover:text-[#800000] transition">Technikstörungen</span>
          </div>
          <div className="group cursor-pointer flex items-center gap-4" onClick={() => handleNavigate('/budgetliste')}>
            <img src="/icons/budget.png" alt="Budget" className="w-12 h-12" />
            <span className="text-lg font-bold group-hover:text-[#800000] transition">Budgetliste</span>
          </div>
          <div className="group cursor-pointer flex items-center gap-4" onClick={() => handleNavigate('/materialshop')}>
            <img src="/icons/materialshop.png" alt="Materialshop" className="w-12 h-12" />
            <span className="text-lg font-bold group-hover:text-[#800000] transition">Materialshop</span>
          </div>
        </div>
      </div>

      {/* --- NEU: Reklamations-Dashboard unter dem Header --- */}
      <div className="flex-1 overflow-y-auto mt-[280px] px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-6 shadow-lg">
              <p className="text-lg font-semibold text-orange-800">Offene Reklamationen</p>
              <p className="text-5xl font-bold text-orange-900 mt-2">{stats.offen}</p>
            </div>
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 shadow-lg">
              <p className="text-lg font-semibold text-red-800">Kritisch / Beim Lieferanten</p>
              <p className="text-5xl font-bold text-red-900 mt-2">{stats.kritisch}</p>
            </div>
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
              <p className="text-lg font-semibold text-blue-800">Neu heute</p>
              <p className="text-5xl font-bold text-blue-900 mt-2">{stats.neuHeute}</p>
            </div>
          </div>

          {/* Suche + Buttons */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-4 text-gray-500" size={24} />
              <input
                type="text"
                placeholder="Suche nach Rekla-Nr. oder Lieferant..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-12 pr-6 py-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#800000] focus:ring-4 focus:ring-[#800000]/20"
              />
            </div>

            <div className="flex gap-4">
              <button className="px-8 py-4 bg-[#800000] text-white text-lg font-bold rounded-xl hover:bg-[#990000] flex items-center gap-3 shadow-lg">
                <Plus size={28} />
                Neue Reklamation
              </button>
              {role !== 'Filiale' && (
                <button className="p-4 border-2 border-[#800000] rounded-xl hover:bg-[#800000]/10">
                  <Edit3 size={28} className="text-[#800000]" />
                </button>
              )}
            </div>
          </div>

          {/* Tabelle */}
          {loading ? (
            <div className="text-center text-2xl text-white py-20">Lade Reklamationen...</div>
          ) : (
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#800000] text-white">
                    <tr>
                      <th className="px-6 py-5 text-left text-lg font-bold">Datum</th>
                      <th className="px-6 py-5 text-left text-lg font-bold">Rekla-Nr.</th>
                      <th className="px-6 py-5 text-left text-lg font-bold">Filiale</th>
                      <th className="px-6 py-5 text-left text-lg font-bold">Lieferant</th>
                      <th className="px-6 py-5 text-left text-lg font-bold">Status</th>
                      <th className="px-6 py-5 text-left text-lg font-bold">Betrag</th>
                      <th className="px-6 py-5 text-left text-lg font-bold">Aktion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-gray-200">
                    {paginatedData.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-5 text-lg">{new Date(r.datum).toLocaleDateString('de-DE')}</td>
                        <td className="px-6 py-5 text-lg font-bold text-[#800000]">{r.rekla_nr}</td>
                        <td className="px-6 py-5 text-lg">{r.filiale}</td>
                        <td className="px-6 py-5 text-lg">{r.lieferant}</td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-lg font-bold border-2 ${getStatusColor(r.status)}`}>
                            {getStatusIcon(r.status)}
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-lg font-semibold">
                          {r.betrag?.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </td>
                        <td className="px-6 py-5">
                          <button className="text-[#800000] font-bold text-lg hover:underline">Ansehen</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-6 flex justify-center gap-4 border-t-2 border-gray-200">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-3 rounded-xl bg-gray-200 disabled:opacity-50 hover:bg-gray-300"
                  >
                    <ChevronLeft size={28} />
                  </button>
                  <span className="text-xl font-bold self-center">
                    Seite {currentPage} von {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-3 rounded-xl bg-gray-200 disabled:opacity-50 hover:bg-gray-300"
                  >
                    <ChevronRight size={28} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Startseite;