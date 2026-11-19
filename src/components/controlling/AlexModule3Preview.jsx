const HEADERS = ['Datum', 'Art', 'Telgte', 'Ahaus', 'Vreden', 'Münster'];

export default function AlexModule3Preview() {
  return <div className="h-[340px] rounded-xl border border-white/10 bg-black/20 p-6">
    <div className="h-full overflow-hidden rounded-lg border border-white/10 bg-[#f5f2eb] text-[#1f1f1f]">
      <div className="border-b border-black/20 bg-[#d9d9d9] px-4 py-3 font-bold">Controlling EZ / AZ · Klassik und V2</div>
      <div className="p-4">
        <div className="grid grid-cols-[90px_48px_repeat(4,1fr)] border border-black/30 text-[10px]">
          {HEADERS.map((label) => <div key={label} className="border-b border-r border-black/30 bg-white px-1 py-2 text-center font-bold">{label}</div>)}
          {Array.from({ length: 10 }, (_, rowIndex) => HEADERS.map((_, cellIndex) => {
            const movement = rowIndex % 2 === 0 ? 'EZ' : 'AZ';
            return <div key={`${rowIndex}-${cellIndex}`} className={`border-b border-r border-black/20 px-1 py-1.5 text-center ${movement === 'EZ' ? 'bg-emerald-50' : 'bg-white'}`}>
              {cellIndex === 0 ? (rowIndex % 2 === 0 ? `${String(Math.floor(rowIndex / 2) + 1).padStart(2, '0')}.` : '') : cellIndex === 1 ? movement : movement === 'EZ' ? 'Qlik ↔ Tageskasse' : 'manuell'}
            </div>;
          }))}
        </div>
      </div>
    </div>
  </div>;
}
