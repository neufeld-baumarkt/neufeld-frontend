import React from 'react';

export default function BudgetAnalyseKpis({ kpis }) {
  if (!kpis) return null;

  const getNumber = (value) => {
    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? 0 : numberValue;
  };

  const formatEuro = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '–';

    return Number(value).toLocaleString('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '–';

    return `${Number(value).toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} %`;
  };

  const budgetYtd = getNumber(kpis.budget_ytd_netto);
  const budgetSatzYtd = getNumber(kpis.budget_satz_ytd_prozent);
  const verbrauchAktionYtd = getNumber(kpis.verbrauch_aktion_ytd);
  const verbrauchGesamtYtd = getNumber(kpis.verbrauch_gesamt_ytd);
  const verbrauchBestellungYtd = getNumber(kpis.verbrauch_bestellung_ytd);

  const umsatzYtd =
    budgetYtd > 0 && budgetSatzYtd > 0
      ? budgetYtd / (budgetSatzYtd / 100)
      : 0;

  const sonderbestellungenYtd = Math.max(
    verbrauchGesamtYtd - verbrauchBestellungYtd - verbrauchAktionYtd,
    0
  );

  const aktionSatzYtd =
    umsatzYtd > 0 ? (verbrauchAktionYtd / umsatzYtd) * 100 : null;

  const sonderbestellungSatzYtd =
    umsatzYtd > 0 ? (sonderbestellungenYtd / umsatzYtd) * 100 : null;

  const getDifferenceStyle = (value) => {
    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
      return {
        valueClass: 'text-white',
        subClass: 'text-white/60',
      };
    }

    if (numberValue > 0) {
      return {
        valueClass: 'text-red-400',
        subClass: 'text-red-400',
      };
    }

    return {
      valueClass: 'text-green-400',
      subClass: 'text-green-400',
    };
  };

  const differenceStyle = getDifferenceStyle(kpis.differenz_verbrauch_zu_budget_ytd_netto);

  const cards = [
    {
      label: 'Budget YTD',
      icon: '💼',
      value: formatEuro(kpis.budget_ytd_netto),
      subValue: formatPercent(kpis.budget_satz_ytd_prozent),
      valueClass: 'text-white',
      subClass: 'text-blue-300',
    },
    {
      label: 'Verbrauch Bestellung YTD',
      icon: '🛒',
      value: formatEuro(kpis.verbrauch_bestellung_ytd),
      subValue: formatPercent(kpis.verbrauch_satz_ytd_prozent),
      valueClass: 'text-white',
      subClass: 'text-green-400',
    },
    {
      label: 'Verbrauch Aktion YTD',
      icon: '🏷️',
      value: formatEuro(kpis.verbrauch_aktion_ytd),
      subValue: formatPercent(aktionSatzYtd),
      valueClass: 'text-white',
      subClass: 'text-orange-400',
    },
    {
      label: 'Sonderbestellungen YTD',
      icon: '📦',
      value: formatEuro(sonderbestellungenYtd),
      subValue: formatPercent(sonderbestellungSatzYtd),
      valueClass: 'text-white',
      subClass: 'text-violet-300',
    },
    {
      label: 'Verbrauch Gesamt YTD',
      icon: '◔',
      value: formatEuro(kpis.verbrauch_gesamt_ytd),
      subValue: formatPercent(kpis.verbrauch_satz_ytd_inkl_aktionen_prozent),
      valueClass: 'text-white',
      subClass: 'text-purple-300',
    },
    {
      label: 'Budgetsatz YTD',
      icon: '%',
      value: formatPercent(kpis.budget_satz_ytd_prozent),
      subValue: 'Budgetquote',
      valueClass: 'text-white',
      subClass: 'text-cyan-300',
    },
    {
      label: 'Verbrauchssatz YTD',
      icon: '%',
      value: formatPercent(kpis.verbrauch_satz_ytd_inkl_aktionen_prozent),
      subValue: 'inkl. Aktionen',
      valueClass: 'text-white',
      subClass: 'text-yellow-300',
    },
    {
      label: 'Differenz Budget ↔ Verbrauch',
      icon: '⚖️',
      value: formatEuro(kpis.differenz_verbrauch_zu_budget_ytd_netto),
      subValue:
        Number(kpis.differenz_verbrauch_zu_budget_ytd_netto) > 0
          ? 'Budget überschritten'
          : 'Budget unterschritten',
      valueClass: differenceStyle.valueClass,
      subClass: differenceStyle.subClass,
    },
  ];

  return (
    <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className="min-h-[122px] rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-black/20 p-4 shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl">
              {card.icon}
            </div>

            <div className="min-w-0">
              <div className="text-xs font-semibold leading-tight text-white/80">
                {card.label}
              </div>

              <div className={`mt-3 text-2xl font-bold tracking-tight ${card.valueClass}`}>
                {card.value}
              </div>

              {card.subValue && (
                <div className={`mt-2 text-sm font-semibold ${card.subClass}`}>
                  {card.subValue}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}