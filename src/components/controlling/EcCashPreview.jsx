// src/components/controlling/EcCashPreview.jsx

export default function EcCashPreview() {
  return (
    <div className="h-[340px] rounded-xl border border-white/10 bg-black/20 p-6">
      <div className="h-full rounded-lg border border-white/10 bg-[#f5f2eb] text-[#1f1f1f] overflow-hidden">
        <div className="bg-[#d9d9d9] border-b border-black/20 px-4 py-3 font-bold">
          Controlling EC Cash / Kreditkarte 2026
        </div>

        <div className="p-4">
          <div className="grid grid-cols-[110px_repeat(9,1fr)] text-xs border border-black/30">
            {[
              'Datum',
              'Telgte IST',
              'Telgte SOLL',
              'Ahaus IST',
              'Ahaus SOLL',
              'Vreden IST',
              'Vreden SOLL',
              'Münster IST',
              'Münster SOLL',
              'Gesamt Überweisung',
            ].map((label) => (
              <div
                key={label}
                className="bg-white border-r border-b border-black/30 px-2 py-2 font-bold text-center"
              >
                {label}
              </div>
            ))}

            {Array.from({ length: 6 }, (_, rowIndex) =>
              Array.from({ length: 10 }, (_, cellIndex) => (
                <div
                  key={`${rowIndex}-${cellIndex}`}
                  className="bg-white border-r border-b border-black/20 px-2 py-2 text-right text-black/40"
                >
                  {cellIndex === 0
                    ? `${String(rowIndex + 1).padStart(2, '0')}.01.2026`
                    : '-'}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}