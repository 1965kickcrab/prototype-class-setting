import { createElement } from "../utils/dom.js";

export function createEmptyStateElement({ title, description }) {
  const emptyState = createElement("section", {
    className: "empty-state",
    dataset: { state: "empty" },
  });

  const lines = [title, description].filter((value) => String(value || "").trim());

  if (lines.length > 0) {
    emptyState.append(createElement("p", { textContent: lines.join("\n") }));
  }

  return emptyState;
}
