import { useState } from 'react';

const VIEWS = [
  { id: 'pruefen', label: 'Prüfen', count: 3 },
  { id: 'sammelueberweisungen', label: 'Sammelüberweisungen', count: 4 },
  { id: 'monatsuebersicht', label: 'Monatsübersicht' },
];

const STATUS_STYLES = {
  neu: 'border-sky-200 bg-sky-50 text-sky-800',
  abweichung: 'border-amber-200 bg-amber-50 text-amber-900',
  bestaetigt: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  offen: 'border-slate-200 bg-slate-50 text-slate-600',
};

const CHECK_ROWS = [
  {
    date: '08. Nov',
    weekday: 'Sonntag',
    type: 'EC Cash',
    description: 'Qlik-Werte für alle vier Filialen vollständig',
    amount: '48.276,18 €',
    status: 'neu',
    statusLabel: 'Neu eingegangen',
  },
  {
    date: '07. Nov',
    weekday: 'Samstag',
    type: 'Kreditkarte',
    description: 'Münster weicht um 42,80 € vom Vergleichswert ab',
    amount: '16.904,62 €',
    status: 'abweichung',
    statusLabel: 'Abweichung',
  },
  {
    date: '06. Nov',
    weekday: 'Freitag',
    type: 'EC Cash',
    description: 'Von Mirko geprüft · 07.11.2026, 09:14 Uhr',
    amount: '52.118,90 €',
    status: 'bestaetigt',
    statusLabel: 'Bestätigt',
  },
  {
    date: '06. Nov',
    weekday: 'Freitag',
    type: 'Kreditkarte',
    description: 'Qlik-Import steht noch aus',
    amount: '–',
    status: 'offen',
    statusLabel: 'Ausstehend',
  },
];

const TRANSFERS = {
  FirstData: [
    {
      date: '09.11.2026',
      reference: 'FD-2026-11-09-1842',
      amount: '96.413,27 €',
      match: '05.–07. Nov · EC Cash · 4 Filialen',
      difference: '0,00 €',
      confidence: 'Passender Vorschlag',
    },
    {
      date: '06.11.2026',
      reference: 'FD-2026-11-06-1779',
      amount: '41.820,14 €',
      match: '03.–04. Nov · EC Cash · 3 Filialen',
      difference: '18,40 €',
      confidence: 'Bitte prüfen',
    },
  ],
  TeleCash: [
    {
      date: '09.11.2026',
      reference: 'TC-8841902',
      amount: '31.602,90 €',
      match: '05.–07. Nov · Kreditkarte · 4 Filialen',
      difference: '0,00 €',
      confidence: 'Passender Vorschlag',
    },
    {
      date: '05.11.2026',
      reference: 'TC-8839471',
      amount: '14.718,52 €',
      match: 'Noch keine eindeutige Kombination gefunden',
      difference: '–',
      confidence: 'Offen',
    },
  ],
};

const MONTH_ROWS = [
  ['08.11.2026', '48.276,18 €', '12.804,22 €', 'Neu'],
  ['07.11.2026', '51.940,70 €', '16.904,62 €', 'Abweichung'],
  ['06.11.2026', '52.118,90 €', '15.331,08 €', 'Bestätigt'],
  ['05.11.2026', '46.702,41 €', '14.981,82 €', 'Bestätigt'],
  ['04.11.2026', '43.506,09 €', '13.776,30 €', 'Bestätigt'],
];

function StatusBadge({ status, children }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${STATUS_STYLES[status]}`}>
      <span className="h-2 w-2 rounded-full bg-current opacity-70" />
      {children}
    </span>
  );
}

function Header({ activeView, onChangeView }) {
  return (
    <>
      <div className="bg-gradient-to-r from-[#650000] to-[#8d1010] px-6 py-5 text-white lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-white/15 px-2 py-1 text-[11px] font-black uppercase tracking-[0.18em]">
                Entwurf V2.0
              </span>
              <span className="text-xs font-semibold text-white/65">Beispieldaten · keine Buchungen</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight lg:text-3xl">EC-Cash / Kreditkarten</h2>
            <p className="mt-1 text-sm text-white/70">Prüfen, Abweichungen klären und Sammelüberweisungen zuordnen</p>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" className="rounded-lg border border-white/20 bg-black/10 px-4 py-2.5 text-left text-sm font-bold">
              <span className="mr-5 text-white/55">Monat</span>
              November 2026 <span className="ml-2 text-white/50">⌄</span>
            </button>
            <button type="button" className="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/15">
              Aktualisieren
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white px-4 lg:px-8">
        <div className="flex gap-1 overflow-x-auto">
          {VIEWS.map((view) => {
            const active = view.id === activeView;
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => onChangeView(view.id)}
                className={`relative whitespace-nowrap px-4 py-4 text-sm font-black transition ${
                  active ? 'text-[#800000]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {view.label}
                {view.count ? (
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${active ? 'bg-[#800000] text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {view.count}
                  </span>
                ) : null}
                {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 bg-[#800000]" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function ReviewView() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-black text-slate-900">Was wartet auf Alex und Mirko?</div>
          <div className="mt-1 text-sm text-slate-500">Nur neue Werte und Auffälligkeiten zuerst – der Tagesabschluss läuft unabhängig weiter.</div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-lg bg-sky-50 px-3 py-2 text-sky-800">2 neue Werte</span>
          <span className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">1 Abweichung</span>
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600">1 ausstehend</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[110px_1fr_150px_150px_110px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500 lg:grid">
          <div>Geschäftstag</div>
          <div>Prüfpunkt</div>
          <div className="text-right">Qlik gesamt</div>
          <div>Status</div>
          <div />
        </div>

        {CHECK_ROWS.map((row) => (
          <div key={`${row.date}-${row.type}`} className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 hover:bg-slate-50/70 lg:grid-cols-[110px_1fr_150px_150px_110px] lg:items-center lg:gap-4">
            <div>
              <div className="font-black text-slate-900">{row.date}</div>
              <div className="text-xs text-slate-400">{row.weekday}</div>
            </div>
            <div>
              <div className="font-black text-slate-900">{row.type}</div>
              <div className="mt-1 text-sm text-slate-500">{row.description}</div>
            </div>
            <div className="text-left font-black tabular-nums text-slate-900 lg:text-right">{row.amount}</div>
            <div><StatusBadge status={row.status}>{row.statusLabel}</StatusBadge></div>
            <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:border-[#800000] hover:text-[#800000]">
              Ansehen
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-sky-100 bg-sky-50/70 px-5 py-4 text-sm text-sky-950 md:flex-row md:items-center md:justify-between">
        <div><span className="font-black">Bewusste Kontrolle:</span> Unauffällige Werte können nach Sichtprüfung gemeinsam bestätigt werden.</div>
        <button type="button" className="rounded-lg bg-sky-900 px-4 py-2 font-black text-white shadow-sm">2 Werte bestätigen</button>
      </div>
    </div>
  );
}

function TransferGroup({ provider, rows }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div>
          <h3 className="text-lg font-black text-slate-900">{provider}</h3>
          <p className="text-sm text-slate-500">{rows.length} Sammelüberweisungen warten auf Entscheidung</p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">{rows.length} offen</span>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row) => {
          const exact = row.difference === '0,00 €';
          return (
            <div key={row.reference} className="p-5">
              <div className="grid gap-4 xl:grid-cols-[190px_1fr_150px_220px] xl:items-center">
                <div>
                  <div className="text-xs font-bold text-slate-400">{row.date}</div>
                  <div className="mt-1 font-black text-slate-900">{row.amount}</div>
                  <div className="mt-1 text-xs text-slate-400">{row.reference}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">Vorschlag der Match-Engine</div>
                  <div className="mt-1 text-sm font-bold text-slate-800">{row.match}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400">Differenz</div>
                  <div className={`mt-1 font-black ${exact ? 'text-emerald-700' : 'text-amber-800'}`}>{row.difference}</div>
                  <div className="text-xs text-slate-400">{row.confidence}</div>
                </div>
                <div className="flex gap-2 xl:justify-end">
                  <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-600">Anpassen</button>
                  <button type="button" className={`rounded-lg px-3 py-2 text-sm font-black text-white ${exact ? 'bg-emerald-700' : 'bg-[#800000]'}`}>Prüfen</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TransfersView() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="text-sm font-black text-slate-900">Automatische Vorschläge, menschliche Entscheidung</div>
        <div className="mt-1 text-sm text-slate-500">Die Match-Engine ordnet vor. Verbindlich wird eine Zuordnung erst nach Bestätigung durch Alex oder Mirko.</div>
      </div>
      <TransferGroup provider="FirstData" rows={TRANSFERS.FirstData} />
      <TransferGroup provider="TeleCash" rows={TRANSFERS.TeleCash} />
    </div>
  );
}

function MonthlyView() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-black text-slate-900">Vertraute Monatskontrolle</div>
          <div className="mt-1 text-sm text-slate-500">Kompakte Übersicht; die vollständige Excel-Struktur bleibt für Export und Detailprüfung erhalten.</div>
        </div>
        <button type="button" className="rounded-lg bg-[#800000] px-4 py-2.5 text-sm font-black text-white">Monat als Excel exportieren</button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Datum</th>
                <th className="px-5 py-3 text-right">EC Cash · Qlik</th>
                <th className="px-5 py-3 text-right">Kreditkarte · Qlik</th>
                <th className="px-5 py-3">Prüfstatus</th>
                <th className="px-5 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {MONTH_ROWS.map(([date, ec, credit, status]) => {
                const style = status === 'Bestätigt' ? 'bestaetigt' : status === 'Abweichung' ? 'abweichung' : 'neu';
                return (
                  <tr key={date} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-black text-slate-900">{date}</td>
                    <td className="px-5 py-4 text-right font-bold tabular-nums text-slate-700">{ec}</td>
                    <td className="px-5 py-4 text-right font-bold tabular-nums text-slate-700">{credit}</td>
                    <td className="px-5 py-4"><StatusBadge status={style}>{status}</StatusBadge></td>
                    <td className="px-5 py-4 text-right"><button type="button" className="font-black text-[#800000]">4 Filialen →</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function EcCashV2Preview() {
  return (
    <div className="h-[340px] overflow-hidden rounded-xl border border-white/10 bg-[#eef0f2] text-slate-900">
      <div className="bg-gradient-to-r from-[#650000] to-[#8d1010] px-5 py-4 text-white">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/65">Entwurf V2.0</div>
        <div className="mt-1 text-xl font-black">EC-Cash / Kreditkarten</div>
      </div>
      <div className="flex gap-5 border-b border-slate-200 bg-white px-5 py-3 text-xs font-black">
        <span className="text-[#800000]">Prüfen <b className="ml-1 rounded-full bg-[#800000] px-2 py-0.5 text-white">3</b></span>
        <span className="text-slate-400">Sammelüberweisungen</span>
        <span className="text-slate-400">Monatsübersicht</span>
      </div>
      <div className="space-y-2 p-4">
        {CHECK_ROWS.slice(0, 3).map((row) => (
          <div key={`${row.date}-${row.type}`} className="grid grid-cols-[70px_1fr_105px] items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs shadow-sm">
            <div className="font-black">{row.date}</div>
            <div><div className="font-black">{row.type}</div><div className="truncate text-slate-400">{row.description}</div></div>
            <StatusBadge status={row.status}>{row.statusLabel}</StatusBadge>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EcCashV2Prototype() {
  const [activeView, setActiveView] = useState('pruefen');

  return (
    <div className="min-h-full overflow-hidden rounded-2xl border border-white/10 bg-[#eef0f2] text-slate-900 shadow-[6px_6px_18px_rgba(0,0,0,0.7)]">
      <Header activeView={activeView} onChangeView={setActiveView} />
      <main className="p-4 lg:p-7">
        {activeView === 'pruefen' ? <ReviewView /> : null}
        {activeView === 'sammelueberweisungen' ? <TransfersView /> : null}
        {activeView === 'monatsuebersicht' ? <MonthlyView /> : null}
      </main>
    </div>
  );
}
