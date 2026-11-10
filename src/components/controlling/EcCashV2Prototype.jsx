import { useCallback, useEffect, useMemo, useState } from 'react';

const VIEWS = [
  { id: 'pruefen', step: '01', label: 'Qlik-Werte prüfen', shortLabel: 'Prüfen', description: 'Tageswerte ansehen und bewusst bestätigen' },
  { id: 'sammelueberweisungen', step: '02', label: 'Überweisungen zuordnen', shortLabel: 'Sammelüberweisungen', description: 'FirstData und TeleCash abgleichen' },
  { id: 'monatsuebersicht', step: '03', label: 'Monat überblicken', shortLabel: 'Monatsübersicht', description: 'EC und Kreditkarten kompakt vergleichen' },
];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const PAYMENT_LABELS = { EC_CASH: 'EC-Kartenzahlungen', KREDITKARTE: 'Kreditkartenzahlungen' };
const STATUS_LABELS = { OFFEN: 'Neu', IN_PRUEFUNG: 'In Prüfung', BESTAETIGT: 'Bestätigt', KORRIGIERT: 'Korrigiert', VERTAGT: 'Vertagt', EXTERN_BESTAETIGT: 'Über Transfer bestätigt', ABWEICHEND: 'Abweichung', vorgeschlagen: 'Vorschlag', bestaetigt: 'Bestätigt', abgelehnt: 'Abgelehnt', vertagt: 'Vertagt', offen: 'Offen' };

function api(path, options = {}) {
  const baseUrl = import.meta.env.VITE_API_URL;
  if (!baseUrl) return Promise.reject(new Error('VITE_API_URL fehlt.'));
  return fetch(`${baseUrl}/api/controlling${path}`, {
    ...options,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token') || ''}`, ...(options.headers || {}) },
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Die Anfrage ist fehlgeschlagen.');
    return payload;
  });
}

const euro = (cents) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Math.abs(Number(cents) || 0) / 100);
const atNoon = (value) => new Date(`${value}T12:00:00`);
const shortDate = (value) => value ? new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(atNoon(value)) : '–';
const weekday = (value) => value ? new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(atNoon(value)) : '';
const withPositiveRevenueItems = (overview) => ({
  ...overview,
  items: (overview?.items || []).filter((item) => Number(item?.qlikTotalCents) > 0),
});

function StatusBadge({ status }) {
  const tone = status === 'ABWEICHEND'
    ? 'border-amber-300 bg-amber-100 text-amber-950'
    : ['VERTAGT', 'vertagt'].includes(status)
      ? 'border-slate-300 bg-slate-100 text-slate-700'
      : ['BESTAETIGT', 'EXTERN_BESTAETIGT', 'bestaetigt'].includes(status)
        ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
        : ['OFFEN', 'IN_PRUEFUNG', 'vorgeschlagen'].includes(status)
          ? 'border-sky-300 bg-sky-100 text-sky-900'
          : 'border-slate-200 bg-slate-50 text-slate-600';
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${tone}`}>{STATUS_LABELS[status] || status}</span>;
}

function Header({ activeView, setActiveView, year, setYear, month, setMonth, refresh, summary }) {
  return <>
    <div className="bg-gradient-to-br from-[#570000] via-[#750000] to-[#971616] px-5 py-6 text-white lg:px-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">Alex Modul 2 · geführte Ansicht</div>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">EC-Cash &amp; Kreditkarten</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">Qlik liefert die Werte. Alex und Mirko prüfen bewusst. Abweichungen bleiben sichtbar, blockieren den Tagesabschluss aber nie.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/15 bg-black/10 p-2">
          <select aria-label="Monat" value={month} onChange={(event) => setMonth(Number(event.target.value))} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm font-bold text-white">{MONTHS.map((name, index) => <option className="text-slate-900" value={index + 1} key={name}>{name}</option>)}</select>
          <input aria-label="Jahr" type="number" min="2020" max="2100" value={year} onChange={(event) => setYear(Number(event.target.value))} className="w-24 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm font-bold text-white" />
          <button type="button" onClick={refresh} className="rounded-lg bg-white px-4 py-2.5 text-sm font-black text-[#720000] shadow-sm transition hover:bg-white/90">Neu laden</button>
        </div>
      </div>
    </div>
    <div className="border-b border-slate-200 bg-white px-4 py-3 lg:px-8">
      <div className="grid gap-2 md:grid-cols-3">
        {VIEWS.map((view) => {
          const active = activeView === view.id;
          const count = view.id === 'pruefen' ? (summary?.newCount || 0) + (summary?.deviationCount || 0) : 0;
          return <button key={view.id} type="button" onClick={() => setActiveView(view.id)} className={`flex min-h-[76px] items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${active ? 'border-[#800000] bg-[#800000] text-white shadow-md' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'}`}>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${active ? 'bg-white text-[#800000]' : 'bg-slate-200 text-slate-600'}`}>{view.step}</span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-black">{view.label}</span><span className={`mt-0.5 block text-xs ${active ? 'text-white/70' : 'text-slate-500'}`}>{view.description}</span></span>
            {count ? <span className={`rounded-full px-2.5 py-1 text-xs font-black ${active ? 'bg-white text-[#800000]' : 'bg-amber-100 text-amber-900'}`}>{count}</span> : null}
          </button>;
        })}
      </div>
    </div>
  </>;
}

function ReviewView({ items, summary, decide, busy }) {
  const [expanded, setExpanded] = useState('');
  const defer = (item) => { const note = window.prompt('Warum wird die Prüfung vertagt?'); if (!note) return; const deferredUntil = window.prompt('Wiedervorlage (JJJJ-MM-TT):'); if (deferredUntil) decide(item, { action: 'defer', note, deferredUntil }); };
  return <div className="space-y-5">
    <section className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4"><div className="text-xs font-black uppercase tracking-wide text-sky-700">Neu eingegangen</div><div className="mt-2 text-3xl font-black text-sky-950">{summary?.newCount || 0}</div><div className="mt-1 text-xs text-sky-800">wartet auf Sichtung</div></div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="text-xs font-black uppercase tracking-wide text-amber-700">Mit Abweichung</div><div className="mt-2 text-3xl font-black text-amber-950">{summary?.deviationCount || 0}</div><div className="mt-1 text-xs text-amber-800">sichtbar, aber nicht blockierend</div></div>
      <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-black uppercase tracking-wide text-slate-500">Wiedervorlage</div><div className="mt-2 text-3xl font-black text-slate-900">{summary?.deferredCount || 0}</div><div className="mt-1 text-xs text-slate-500">bewusst vertagt</div></div>
    </section>

    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 font-black text-white">✓</span>
      <div><b>Der Tagesabschluss bleibt immer frei.</b><div className="mt-0.5 text-emerald-800">Diese Prüfung dokumentiert die Kontrolle von Alex und Mirko. Sie sperrt keinen operativen Ablauf.</div></div>
    </div>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4"><h3 className="font-black text-slate-900">Tageswerte zur Prüfung</h3><p className="mt-1 text-sm text-slate-500">Ein Gesamtwert je Tag und Zahlungsart. Filialdetails bleiben jederzeit einsehbar.</p></div>
      {items.length === 0 ? <Empty text="Für diesen Monat liegen noch keine zugeordneten Qlik-Werte vor." /> : items.map((item) => {
        const key = `${item.datum}-${item.paymentType}`;
        const open = expanded === key;
        const hasDeviation = item.comparisonStatus === 'ABWEICHEND';
        return <div key={key} className={`border-b border-slate-100 last:border-0 ${hasDeviation ? 'bg-amber-50/40' : ''}`}>
          <div className="grid gap-4 px-5 py-5 lg:grid-cols-[115px_1fr_160px_190px_270px] lg:items-center">
            <div><div className="text-base font-black">{shortDate(item.datum)}</div><div className="text-xs text-slate-400">{weekday(item.datum)}</div></div>
            <div><div className="font-black">{PAYMENT_LABELS[item.paymentType]}</div><div className="mt-1 text-sm text-slate-500">Qlik-Summe aus {item.branches.length} Filialen</div></div>
            <div className="text-xl font-black tabular-nums lg:text-right">{euro(item.qlikTotalCents)}</div>
            <div className="flex flex-wrap gap-1.5"><StatusBadge status={item.reviewStatus} />{hasDeviation ? <StatusBadge status="ABWEICHEND" /> : null}</div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <button type="button" onClick={() => setExpanded(open ? '' : key)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50">{open ? 'Details schließen' : 'Filialen ansehen'}</button>
              <button disabled={busy} type="button" onClick={() => decide(item, { action: 'confirm' })} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50">Geprüft &amp; bestätigen</button>
              <button disabled={busy} type="button" onClick={() => defer(item)} className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2.5 text-xs font-black text-amber-950 hover:bg-amber-100 disabled:opacity-50">Später prüfen</button>
            </div>
          </div>
          {open ? <div className="grid gap-3 border-t border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">{item.branches.map((branch) => <div key={branch.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><b>{branch.filiale}</b><StatusBadge status={branch.reviewStatus} /></div><div className="mt-4 text-xl font-black">{euro(branch.qlikAmountCents)}</div><div className="mt-1 text-xs text-slate-500">Vergleichswert: {branch.comparisonAmountCents == null ? 'nicht vorhanden' : euro(branch.comparisonAmountCents)}</div>{branch.reviewedBy ? <div className="mt-3 border-t pt-2 text-xs text-slate-400">Geprüft von {branch.reviewedBy}</div> : null}</div>)}</div> : null}
        </div>;
      })}
    </section>
  </div>;
}

function TransferForm({ create, busy }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ provider: 'FirstData', paymentType: 'EC_CASH', buchungsdatum: new Date().toISOString().slice(0, 10), amount: '', referenz: '' });
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-[#800000] px-4 py-2.5 text-sm font-black text-white">Überweisung erfassen</button>;
  const fieldClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/15';
  return <form onSubmit={async (event) => { event.preventDefault(); await create(form); setOpen(false); }} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="mb-4"><div className="font-black">Neue Sammelüberweisung</div><div className="mt-1 text-sm text-slate-500">Nur Bankbuchung erfassen – die Zuordnung schlägt anschließend die Match-Engine vor.</div></div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <label className="text-xs font-black text-slate-600">Anbieter<select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className={fieldClass}><option>FirstData</option><option>TeleCash</option></select></label>
      <label className="text-xs font-black text-slate-600">Zahlungsart<select value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })} className={fieldClass}><option value="EC_CASH">EC-Kartenzahlungen</option><option value="KREDITKARTE">Kreditkartenzahlungen</option></select></label>
      <label className="text-xs font-black text-slate-600">Buchungsdatum<input required type="date" value={form.buchungsdatum} onChange={(e) => setForm({ ...form, buchungsdatum: e.target.value })} className={fieldClass} /></label>
      <label className="text-xs font-black text-slate-600">Betrag<input required inputMode="decimal" placeholder="z. B. 1.234,56" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={fieldClass} /></label>
      <label className="text-xs font-black text-slate-600">Bankreferenz<input placeholder="optional" value={form.referenz} onChange={(e) => setForm({ ...form, referenz: e.target.value })} className={fieldClass} /></label>
    </div>
    <div className="mt-4 flex gap-2 justify-end"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">Abbrechen</button><button disabled={busy} className="rounded-lg bg-[#800000] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">Überweisung speichern</button></div>
  </form>;
}

function CandidateEditor({ transfer, close, save }) {
  const [rows, setRows] = useState([]); const [error, setError] = useState('');
  useEffect(() => { api(`/v2/transfers/${transfer.id}/candidates`).then((data) => setRows(data.candidates)).catch((e) => setError(e.message)); }, [transfer.id]);
  const selected = rows.filter((row) => row.selected);
  return <div className="mt-4 rounded-lg border bg-slate-50 p-4"><div className="mb-3 flex justify-between"><b>Vorschlag manuell anpassen</b><button type="button" onClick={close}>✕</button></div>{error ? <ErrorBox text={error} /> : null}<div className="grid max-h-64 gap-2 overflow-y-auto md:grid-cols-2">{rows.map((row) => <label key={row.id} className="flex cursor-pointer items-center gap-3 rounded border bg-white p-3"><input type="checkbox" checked={row.selected} onChange={(e) => setRows((old) => old.map((item) => item.id === row.id ? { ...item, selected: e.target.checked } : item))} /><span className="flex-1"><b>{shortDate(row.datum)} · {row.filiale}</b></span><b>{euro(row.amountCents)}</b></label>)}</div><div className="mt-3 flex items-center justify-between"><b>Auswahl: {euro(selected.reduce((sum, row) => sum + row.amountCents, 0))}</b><button disabled={!selected.length} type="button" onClick={() => save(selected.map((row) => ({ paymentDayId: row.id })))} className="rounded bg-[#800000] px-3 py-2 font-black text-white disabled:opacity-50">Übernehmen</button></div></div>;
}

function TransferGroup({ provider, rows, busy, suggest, decide, match }) {
  const [editing, setEditing] = useState('');
  const decision = (row, action) => { let note = ''; let deferredUntil = null; if (action === 'confirm' && row.differenzCents !== 0) { note = window.prompt('Bitte begründe die Differenz:') || ''; if (!note) return; } if (action === 'defer') { note = window.prompt('Warum wird vertagt?') || ''; if (!note) return; deferredUntil = window.prompt('Wiedervorlage (JJJJ-MM-TT):'); if (!deferredUntil) return; } decide(row.id, { action, note, deferredUntil }); };
  return <section className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="border-b bg-slate-50 px-5 py-4"><h3 className="text-lg font-black">{provider}</h3><p className="text-sm text-slate-500">{rows.length} Überweisungen im gewählten Monat</p></div><div className="divide-y">{rows.length === 0 ? <Empty text={`Keine ${provider}-Überweisungen vorhanden.`} /> : rows.map((row) => { const editable = row.match_id && ['vorgeschlagen', 'vertagt'].includes(row.match_status); return <div key={row.id} className="p-5"><div className="grid gap-4 xl:grid-cols-[190px_1fr_160px_300px] xl:items-center"><div><div className="text-xs text-slate-400">{shortDate(row.buchungsdatum)} · {PAYMENT_LABELS[row.payment_type]}</div><div className="mt-1 font-black">{euro(row.betragCents)}</div><div className="text-xs text-slate-400">{row.referenz || 'ohne Referenz'}</div></div><div className="rounded-lg border bg-slate-50 px-4 py-3"><div className="text-[11px] font-black uppercase text-slate-400">Match-Engine</div><div className="mt-1 text-sm font-bold">{row.items?.length ? `${row.items.length} Filial-Tageswerte vorgeschlagen` : 'Noch kein Vorschlag'}</div></div><div><StatusBadge status={row.match_status || row.status} /><div className={`mt-2 font-black ${(row.differenzCents || 0) === 0 ? 'text-emerald-700' : 'text-amber-800'}`}>Differenz: {row.differenzCents == null ? '–' : euro(row.differenzCents)}</div></div><div className="flex flex-wrap gap-2 xl:justify-end">{!row.match_id ? <button disabled={busy} onClick={() => suggest(row.id)} className="rounded bg-[#800000] px-3 py-2 text-sm font-black text-white">Vorschlag erzeugen</button> : editable ? <><button onClick={() => setEditing(editing === row.id ? '' : row.id)} className="rounded border px-3 py-2 text-sm font-black">Anpassen</button><button disabled={busy} onClick={() => decision(row, 'confirm')} className="rounded bg-emerald-700 px-3 py-2 text-sm font-black text-white">Bestätigen</button><button disabled={busy} onClick={() => decision(row, 'defer')} className="rounded border border-amber-300 px-3 py-2 text-sm font-black">Vertagen</button><button disabled={busy} onClick={() => decision(row, 'reject')} className="rounded border px-3 py-2 text-sm font-black">Ablehnen</button></> : <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">Zuordnung abgeschlossen</span>}</div></div>{editing === row.id ? <CandidateEditor transfer={row} close={() => setEditing('')} save={(items) => match(row.id, items).then(() => setEditing(''))} /> : null}</div>; })}</div></section>;
}

function TransfersView({ transfers, busy, create, suggest, decide, match }) { return <div className="space-y-5"><div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="text-lg font-black">Bankbuchung erfassen und Vorschlag prüfen</div><div className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Die Match-Engine sucht passende Qlik-Tageswerte und bereitet eine Zuordnung vor. Verbindlich wird sie erst, wenn Alex oder Mirko bestätigt.</div></div>{!transfers.length ? <TransferForm create={create} busy={busy} /> : null}</div>{transfers.length ? <div className="mt-4"><TransferForm create={create} busy={busy} /></div> : null}</div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-white p-4"><div className="text-xs font-black uppercase text-slate-400">Bankbuchungen</div><div className="mt-2 text-2xl font-black">{transfers.length}</div></div><div className="rounded-xl border bg-white p-4"><div className="text-xs font-black uppercase text-slate-400">Mit Vorschlag</div><div className="mt-2 text-2xl font-black">{transfers.filter((row) => row.match_id).length}</div></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-xs font-black uppercase text-emerald-700">Entschieden</div><div className="mt-2 text-2xl font-black text-emerald-950">{transfers.filter((row) => ['bestaetigt', 'abgelehnt'].includes(row.match_status || row.status)).length}</div></div></div>{['FirstData', 'TeleCash'].map((provider) => <TransferGroup key={provider} provider={provider} rows={transfers.filter((row) => String(row.provider).toLowerCase() === provider.toLowerCase())} busy={busy} suggest={suggest} decide={decide} match={match} />)}</div>; }

function MonthlyView({ items }) {
  const rows = useMemo(() => { const map = new Map(); items.forEach((item) => { const row = map.get(item.datum) || { datum: item.datum }; row[item.paymentType] = item; map.set(item.datum, row); }); return [...map.values()].sort((a, b) => b.datum.localeCompare(a.datum)); }, [items]);
  const ecTotal = rows.reduce((sum, row) => sum + (Number(row.EC_CASH?.qlikTotalCents) || 0), 0);
  const creditCardTotal = rows.reduce((sum, row) => sum + (Number(row.KREDITKARTE?.qlikTotalCents) || 0), 0);
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-black uppercase tracking-wide text-slate-400">Tage mit Werten</div><div className="mt-2 text-2xl font-black">{rows.length}</div></div>
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4"><div className="text-xs font-black uppercase tracking-wide text-sky-700">EC-Kartenzahlungen</div><div className="mt-2 text-2xl font-black text-sky-950">{euro(ecTotal)}</div></div>
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4"><div className="text-xs font-black uppercase tracking-wide text-violet-700">Kreditkartenzahlungen</div><div className="mt-2 text-2xl font-black text-violet-950">{euro(creditCardTotal)}</div></div>
    </div>
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="border-b bg-slate-50 px-5 py-4"><div className="font-black">Tagesübersicht des Monats</div><div className="mt-1 text-sm text-slate-500">Beträge werden bewusst ohne Vorzeichen dargestellt.</div></div><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-sm"><thead><tr className="border-b bg-white text-left text-[11px] font-black uppercase text-slate-500"><th className="px-5 py-3">Datum</th><th className="px-5 py-3 text-right">EC-Karten · Qlik</th><th className="px-5 py-3 text-right">Kreditkarten · Qlik</th><th className="px-5 py-3">Prüfstatus</th></tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan="4"><Empty text="Keine Monatswerte vorhanden." /></td></tr> : rows.map((row) => <tr key={row.datum} className="border-b last:border-0 hover:bg-slate-50"><td className="px-5 py-4 font-black">{shortDate(row.datum)}</td><td className="px-5 py-4 text-right font-bold">{row.EC_CASH ? euro(row.EC_CASH.qlikTotalCents) : '–'}</td><td className="px-5 py-4 text-right font-bold">{row.KREDITKARTE ? euro(row.KREDITKARTE.qlikTotalCents) : '–'}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-1">{row.EC_CASH ? <StatusBadge status={row.EC_CASH.reviewStatus} /> : null}{row.KREDITKARTE ? <StatusBadge status={row.KREDITKARTE.reviewStatus} /> : null}</div></td></tr>)}</tbody></table></div></div>
  </div>;
}

function Empty({ text }) { return <div className="px-5 py-10 text-center text-sm font-bold text-slate-400">{text}</div>; }
function ErrorBox({ text }) { return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{text}</div>; }

export function EcCashV2Preview() { return <div className="h-[340px] overflow-hidden rounded-xl border border-white/10 bg-[#eef0f2] text-slate-900"><div className="bg-gradient-to-r from-[#650000] to-[#8d1010] px-5 py-4 text-white"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/65">Alex Modul 2 · V2.0</div><div className="mt-1 text-xl font-black">EC-Cash / Kreditkarten</div></div><div className="flex gap-5 border-b bg-white px-5 py-3 text-xs font-black"><span className="text-[#800000]">Prüfen</span><span className="text-slate-400">Sammelüberweisungen</span><span className="text-slate-400">Monatsübersicht</span></div><div className="p-4"><div className="rounded-xl border bg-white p-5"><div className="font-black">Qlik-Werte aus der Datenbank</div><div className="mt-2 text-sm text-slate-500">Vier Filialen · bewusste Bestätigung · Tagesabschluss bleibt frei</div></div></div></div>; }

export default function EcCashV2Prototype() {
  const now = new Date(); const [activeView, setActiveView] = useState('pruefen'); const [year, setYear] = useState(now.getFullYear()); const [month, setMonth] = useState(now.getMonth() + 1); const [overview, setOverview] = useState({ items: [], summary: {} }); const [transfers, setTransfers] = useState([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async ({ showLoading = true } = {}) => { if (showLoading) setLoading(true); setError(''); try { const query = `?jahr=${year}&monat=${month}`; const [o, t] = await Promise.all([api(`/v2/overview${query}`), api(`/v2/transfers${query}`)]); setOverview(withPositiveRevenueItems(o)); setTransfers(t.transfers || []); } catch (e) { setError(e.message); } finally { if (showLoading) setLoading(false); } }, [year, month]);
  useEffect(() => { load(); }, [load]);
  const mutate = async (request) => { setBusy(true); setError(''); try { await request(); await load({ showLoading: false }); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const review = (item, body) => mutate(() => api('/v2/reviews', { method: 'PATCH', body: JSON.stringify({ ...body, datum: item.datum, paymentType: item.paymentType }) })); const create = (body) => mutate(() => api('/v2/transfers', { method: 'POST', body: JSON.stringify(body) })); const suggest = (id) => mutate(() => api(`/v2/transfers/${id}/suggest`, { method: 'POST' })); const decide = (id, body) => mutate(() => api(`/v2/transfers/${id}/decision`, { method: 'POST', body: JSON.stringify(body) })); const match = (id, items) => mutate(() => api(`/v2/transfers/${id}/match`, { method: 'PUT', body: JSON.stringify({ items }) }));
  return <div className="min-h-full overflow-hidden rounded-2xl border border-white/10 bg-[#eef0f2] text-slate-900 shadow-[6px_6px_18px_rgba(0,0,0,0.7)]"><Header activeView={activeView} setActiveView={setActiveView} year={year} setYear={setYear} month={month} setMonth={setMonth} refresh={load} summary={overview.summary} /><main className="p-4 lg:p-7">{error ? <div className="mb-4"><ErrorBox text={error} /></div> : null}{overview.summary?.unresolvedPaymentTypeCount ? <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><b>{overview.summary.unresolvedPaymentTypeCount} Qlik-Zahlarten sind noch ungeklärt.</b> Sie werden nicht automatisch zugeordnet.</div> : null}{loading ? <Empty text="Daten werden aus der Datenbank geladen …" /> : activeView === 'pruefen' ? <ReviewView items={overview.items || []} summary={overview.summary} decide={review} busy={busy} /> : activeView === 'sammelueberweisungen' ? <TransfersView transfers={transfers} busy={busy} create={create} suggest={suggest} decide={decide} match={match} /> : <MonthlyView items={overview.items || []} />}</main></div>;
}
