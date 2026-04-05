import React from 'react';

export default function BestellModalBevermann({ isOpen, lieferant, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-10"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#2F2D2D] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-4">
          Bevermann Bestellung
        </h2>

        <div className="text-white/70 mb-4">
          Lieferant: {lieferant?.name || '-'}
        </div>

        <button
          onClick={onClose}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded"
        >
          Schließen
        </button>
      </div>
    </div>
  );
}