import { useEffect, useState } from "react";
import axios from "axios";

export default function Reklamationen() {
  const [reklas, setReklas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("https://neufeld-backend.onrender.com/api/reklamationen?filiale=Vreden")
      .then((res) => {
        setReklas(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fehler beim Laden:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Lade Reklamationen...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Reklamationen – Vreden</h1>
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
  );
}
