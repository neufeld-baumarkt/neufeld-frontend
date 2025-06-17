import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Reklamationen() {
  const [reklas, setReklas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem("user"));
  } catch (e) {
    console.warn("❗ Benutzer konnte nicht geladen werden:", e);
  }
  const displayName = user?.name || "Unbekannt";

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      setError("Token nicht gefunden – bitte neu anmelden");
      setLoading(false);
      return;
    }

    axios
      .get("https://neufeld-backend.onrender.com/api/reklamationen", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then((res) => {
        setReklas(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fehler beim Laden:", err);
        setError("Zugriff fehlgeschlagen oder abgelaufen.");
        setLoading(false);
      });
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    navigate("/");
  };

  const handleZurueck = () => {
    navigate("/start");
  };

  if (loading) return <p className="text-white p-6">Lade Reklamationen...</p>;
  if (error) return <p className="text-red-500 p-6">{error}</p>;

  return (
    <div className="relative w-screen h-screen bg-[#3A3838] overflow-hidden">
      <div className="absolute top-0 left-0 w-full bg-[#800000]" style={{ height: "57px" }}></div>
      <div className="absolute top-0 left-0 h-full bg-[#800000]" style={{ width: "57px" }}></div>
      <div className="absolute top-[57px] left-[57px] right-0 bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: "7px" }}></div>
      <div className="absolute top-[57px] left-[57px] bottom-0 bg-white" style={{ width: "7px" }}></div>
      <div className="absolute bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.6)]" style={{ height: '11px', top: '165px', left: '95px', right: '80px' }}></div>

      <div className="relative z-10 text-white p-8 ml-[60px] mt-[50px]">
        <h1 className="text-7xl font-bold drop-shadow-[3px_3px_6px_rgba(0,0,0,0.6)]">
          Reklamationen {user?.filiale !== 'alle' ? `Filiale ${user.filiale}` : '– Übersicht'}
        </h1>
      </div>

      <div className="absolute top-[20px] text-1xl font-semibold text-white cursor-pointer select-none"
           style={{ right: '40px', textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}
           onClick={() => setMenuOpen(!menuOpen)}>
        Angemeldet als: {displayName}
        {menuOpen && (
          <div className="absolute right-0 mt-2 bg-white/80 text-black rounded shadow z-50 px-4 py-2 backdrop-blur-sm"
               style={{ minWidth: '160px' }}>
            <div onClick={handleLogout} className="hover:bg-gray-100 cursor-pointer flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#444" viewBox="0 0 24 24">
                <path d="M16 13v-2H7V8l-5 4 5 4v-3h9z" />
                <path d="M20 3h-8v2h8v14h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
              </svg>
              <span>Abmelden</span>
            </div>
          </div>
        )}
      </div>

      <div className="absolute top-[230px] left-[95px] right-[80px] bottom-0 overflow-y-auto">
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <span className="text-white underline cursor-pointer" onClick={() => alert("Maske Reklamation anlegen folgt...")}>➕ Reklamation anlegen</span>
            <span className="text-white underline cursor-pointer" onClick={() => alert("Maske Reklamation bearbeiten folgt...")}>✏️ Reklamation bearbeiten</span>
            <span className="text-white underline cursor-pointer" onClick={handleZurueck}>⬅️ Zurück zum Hauptmenü</span>
          </div>

          <h1 className="text-2xl font-bold mb-4 text-white">Reklamationen</h1>
          <ul className="space-y-2">
            {reklas.map((rekla) => (
              <li
                key={rekla.id}
                className="p-4 rounded-xl shadow border bg-white flex justify-between"
              >
                <div>
                  <p className="font-semibold">{rekla.rekla_nr} – {rekla.art}</p>
                  <p className="text-sm text-gray-500">{rekla.datum} • {rekla.lieferant}</p>
                </div>
                <div className="text-right text-sm font-bold text-blue-600">
                  {rekla.status}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
