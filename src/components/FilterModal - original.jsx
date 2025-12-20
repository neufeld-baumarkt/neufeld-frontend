// src/components/FilterModal.jsx – Filter-Modal für die Reklamationsliste
import React, { useState } from 'react';

const FilterModal = ({ onClose, onApply, currentFilters }) => {
  const [tempFilters, setTempFilters] = useState(currentFilters || {
    filiale: 'Alle',
    status: 'Alle',
    reklaNr: '',
    sortDatum: 'desc', // default: neueste zuerst
  });

  const handleChange = (field, value) => {
    setTempFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onApply(tempFilters);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6 text-center">Filter & Sortierung</h2>

        <div className="space-y-5">
          <div>
            <label className="block font-semibold mb-1">Filiale</label>
            <select
              value={tempFilters.filiale}
              onChange={(e) => handleChange('filiale', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
            >
              <option value="Alle">Alle Filialen</option>
              <option value="Ahaus">Ahaus</option>
              <option value="Münster">Münster</option>
              <option value="Telgte">Telgte</option>
              <option value="Vreden">Vreden</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Status</label>
            <select
              value={tempFilters.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
            >
              <option value="Alle">Alle Status</option>
              <option value="Angelegt">Angelegt</option>
              <option value="In Bearbeitung">In Bearbeitung</option>
              <option value="Freigegeben">Freigegeben</option>
              <option value="Abgelehnt">Abgelehnt</option>
              <option value="Erledigt">Erledigt</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Rekla-Nr. (Teil-Suche)</label>
            <input
              type="text"
              value={tempFilters.reklaNr}
              onChange={(e) => handleChange('reklaNr', e.target.value)}
              placeholder="z. B. KR-2025"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Sortierung nach Datum</label>
            <select
              value={tempFilters.sortDatum}
              onChange={(e) => handleChange('sortDatum', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
            >
              <option value="desc">Neueste zuerst</option>
              <option value="asc">Älteste zuerst</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
          >
            Abbrechen
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Anwenden
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;