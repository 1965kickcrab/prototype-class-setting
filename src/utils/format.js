export function formatText(value) {
  const text = String(value || "").trim();
  return text || "-";
}
