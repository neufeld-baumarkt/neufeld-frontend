import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const ReklamationenKachel = () => {
  const navigate = useNavigate();

  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem('user'));
  } catch (e) {
    console.warn('Benutzer nicht geladen');
  }

  const role = user?.role || 'Unbekannt';
  const filiale = user?.filiale || null; // z. B. 'Vreden'

  const [reklamationen, setReklamationen] = useState([]);
  const [loading, setLoading] = useState(true);

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

        // Filter je nach Rolle
        let filtered = data;
        if (role === 'Filiale' && filiale) {
          filtered = data.filter(r => r.filiale === filiale);
        }
        // Supervisor/Admin sehen alles – später können wir "Neue" filtern

        setReklamationen(filtered);
        setLoading(false);
      } catch (err) {
        console.error('Fehler beim Laden der Reklamationen:', err);
        setLoading(false);
      }
    };

    fetchReklamationen();
  }, [role, filiale]);

  const counts = useMemo(() => {
    const angelegt = reklamationen.filter(r => r.status === 'Angelegt').length;
    const freigegeben = reklamationen.filter(r => r.status === 'Freigegeben').length;
    const erledigt = reklamationen.filter(r => r.status === 'Erledigt').length;
    const abgelehnt = reklamationen.filter(r => r.status === 'Abgelehnt').length;

    return { angelegt, freigegeben, erledigt, abgelehnt };
  }, [reklamationen]);

  const handleClick = () => {
    // Später können wir hier Filter übergeben, z. B. ?status=angelegt
    navigate('/reklamationen');
  };

  return (
    <div
      onClick={handleClick}
      className="absolute top-[100px] right-[80px] bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 cursor-pointer hover:shadow-3xl hover:scale-105 transition-all duration-300 z-20"
      style={{ width: '320px' }}
    >
      <h3 className="text-2xl font-bold text-[#800000] mb-4 text-center">Reklamationen</h3>

      {loading ? (
        <div className="text-center text-gray-600">Lade...</div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between text-lg">
            <span className="font-medium text-gray-700">Angelegt</span>
            <span className="font-bold text-[#800000]">{counts.angelegt}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="font-medium text-gray-700">Freigegeben</span>
            <span className="font-bold text-orange-600">{counts.freigegeben}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="font-medium text-gray-700">Erledigt</span>
            <span className="font-bold text-green-600">{counts.erledigt}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="font-medium text-gray-700">Abgelehnt</span>
            <span className="font-bold text-red-600">{counts.abgelehnt}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReklamationenKachel;