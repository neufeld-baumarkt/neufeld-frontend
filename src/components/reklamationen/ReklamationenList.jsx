// src/components/reklamationen/ReklamationenList.jsx
import React from "react";

export default function ReklamationenList({
  pagedData,
  formatLfdDisplay,
  formatDate,
  getStatusColor,
  onRowClick,

  currentPage,
  totalPages,
  visiblePages,
  setCurrentPage,
}) {
  // List-Grid: exakt wie in deinem Ist-Stand
  const LIST_GRID =
    "grid-cols-[100px_140px_120px_minmax(0,1fr)_minmax(0,1fr)_120px]";

  return (
    <div className="pt-64 px-[80px]">
      {/* Header */}
      <div
        className={`grid ${LIST_GRID} text-left font-bold text-gray-300 border-b border-gray-500 pb-2 mb-6`}
      >
        <div>lfd. Nr.</div>
        <div>Datum</div>
        <div>Filiale</div>
        <div>Rekla-Nr.</div>
        <div>Lieferant</div>
        <div className="text-right">Status</div>
      </div>

      {pagedData.map((rekla) => (
        <div
          key={rekla.id}
          className={`grid ${LIST_GRID} bg-white text-black px-4 py-3 mb-2 rounded-lg shadow cursor-pointer hover:bg-gray-100 transition`}
          onClick={() => onRowClick(rekla)}
        >
          <div className="font-bold">
            {formatLfdDisplay({
              min_lfd_nr: rekla.min_lfd_nr,
              position_count: rekla.position_count,
            })}
          </div>
          <div>{formatDate(rekla.datum)}</div>
          <div>{rekla.filiale || "-"}</div>
          <div
            className="whitespace-nowrap overflow-hidden text-ellipsis pr-2"
            title={rekla.rekla_nr || ""}
          >
            {rekla.rekla_nr || "-"}
          </div>
          <div
            className="whitespace-nowrap overflow-hidden text-ellipsis pr-2"
            title={rekla.lieferant || ""}
          >
            {rekla.lieferant || "-"}
          </div>
          <div className={`text-right font-semibold ${getStatusColor(rekla.status)}`}>
            {rekla.status}
          </div>
        </div>
      ))}

      <div className="flex justify-center items-center gap-3 mt-8 text-lg">
        <button
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
          className="px-3 py-1 disabled:opacity-50"
        >
          «
        </button>
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 disabled:opacity-50"
        >
          ‹
        </button>

        {visiblePages().map((page) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`px-4 py-2 rounded ${
              page === currentPage
                ? "bg-white text-black font-bold"
                : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 disabled:opacity-50"
        >
          ›
        </button>
        <button
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 disabled:opacity-50"
        >
          »
        </button>
      </div>
    </div>
  );
}
