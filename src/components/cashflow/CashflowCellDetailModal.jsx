function formatEuro(value) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value || 0));
}

export default function CashflowCellDetailModal({
  isOpen,
  onClose,
  cell,
  buchungen = [],
}) {
  if (!isOpen || !cell) return null;

  const summe = buchungen.reduce(
    (total, buchung) => total + Number(buchung.betrag || 0),
    0
  );

  const offeneBuchungen = buchungen.filter(
    (buchung) => buchung.status === 'angekuendigt'
  ).length;

  return (
    <div
      className="fixed inset-0 z-[75] bg-black/60 px-4 flex items-center justify-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[1100px] max-h-[82vh] rounded-2xl border border-white/10 bg-[#2f2d2d] shadow-[6px_6px_18px_rgba(0,0,0,0.75)] overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between gap-6">
          <div>
            <div className="text-2xl font-bold text-white">
              {cell.tag} · {cell.kategorieName}
            </div>

            <div className="text-white/60 mt-1">
              KW {cell.kw} · {buchungen.length} Buchung
              {buchungen.length === 1 ? '' : 'en'} · Summe {formatEuro(summe)}
            </div>

            {offeneBuchungen > 0 && (
              <div className="text-orange-300 text-sm mt-2">
                {offeneBuchungen} angekündigte Buchung
                {offeneBuchungen === 1 ? '' : 'en'} offen
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            Schließen
          </button>
        </div>

        <div className="p-6 overflow-auto max-h-[calc(82vh-110px)]">
          {buchungen.length === 0 ? (
            <div className="text-center text-white/50 py-10">
              Keine Buchungen in dieser Zelle.
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-black/35 border-b border-white/10 text-xs font-bold text-white/60">
                <div className="col-span-2">Betrag</div>
                <div className="col-span-2">Filiale</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Typ</div>
                <div className="col-span-4">Notiz</div>
              </div>

              <div className="divide-y divide-white/10">
                {buchungen.map((buchung) => {
                  const isOpen = buchung.status === 'angekuendigt';

                  return (
                    <div
                      key={buchung.id}
                      className="grid grid-cols-12 gap-3 px-5 py-4 text-sm hover:bg-white/5 transition"
                    >
                      <div className={`col-span-2 font-bold ${isOpen ? 'text-orange-300' : 'text-white'}`}>
                        {formatEuro(buchung.betrag)}
                      </div>

                      <div className="col-span-2 text-white/85">
                        {buchung.filiale || '—'}
                      </div>

                      <div className={`col-span-2 font-semibold ${isOpen ? 'text-orange-300' : 'text-white/80'}`}>
                        {buchung.status || '—'}
                      </div>

                      <div className="col-span-2 text-white/75">
                        {buchung.eintrag_typ || 'betrag'}
                      </div>

                      <div className="col-span-4 text-white/75 truncate">
                        {buchung.notiz || '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}