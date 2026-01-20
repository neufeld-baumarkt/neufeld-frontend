// src/components/budget/FilialePicker.jsx
import React from 'react';

const FILIALEN = ['Ahaus', 'Münster', 'Telgte', 'Vreden'];

export default function FilialePicker({ isSuperUser, filiale, setFiliale }) {
  if (!isSuperUser) return null;

  return (
    <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
      <span className="text-lg font-semibold">Filiale</span>
      <select
        value={filiale}
        onChange={(e) => setFiliale(e.target.value)}
        className="px-3 py-2 rounded-lg bg-white/10 text-white outline-none"
      >
        {FILIALEN.map((f) => (
          <option key={f} value={f} className="text-black">
            {f}
          </option>
        ))}
      </select>
    </div>
  );
}
