// src/lib/reklamationen/reklamationenFormat.js

// List-Grid: exakt wie im Ist-Stand (nur ausgelagert)
export const LIST_GRID =
  "grid-cols-[42px_100px_140px_120px_minmax(0,1fr)_minmax(0,1fr)_120px]";

export function formatDate(isoDate) {
  if (!isoDate) return "-";
  return new Date(isoDate).toLocaleDateString("de-DE");
}

// Erwartet: min_lfd_nr + position_count (kann String sein)
export function formatLfdDisplay({ min_lfd_nr, position_count }) {
  if (min_lfd_nr === null || min_lfd_nr === undefined) return "#";
  const count = Number(position_count ?? 0);
  if (!Number.isFinite(count) || count <= 0) return `#${min_lfd_nr}`;
  if (count === 1) return `#${min_lfd_nr}`;
  return `#${min_lfd_nr}+${count - 1}`;
}

export function getStatusColor(status) {
  switch ((status || "").toLowerCase()) {
    case "angelegt":
      return "text-blue-600";
    case "bearbeitet":
    case "in bearbeitung":
      return "text-yellow-600";
    case "freigegeben":
      return "text-green-600";
    case "abgelehnt":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
}
