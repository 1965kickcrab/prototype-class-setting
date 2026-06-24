import { createElement } from "../utils/dom.js";
import { sanitizeTagList } from "../services/member-tag-service.js";

export function renderMemberTagChips(container, tags, options = {}) {
  container.innerHTML = "";
  const visibleCount = Number.isFinite(options.maxVisible) ? options.maxVisible : Infinity;
  const memberTags = sanitizeTagList(tags);
  const visibleTags = memberTags.slice(0, visibleCount);

  visibleTags.forEach((memberTagName) => {
    const chip = createElement("span", {
      className: options.className || "member-tag-input-chip",
      textContent: memberTagName,
      dataset: {
        entity: "memberTag",
        entityId: memberTagName,
      },
    });
    container.append(chip);
  });

  if (memberTags.length > visibleTags.length) {
    container.append(createElement("span", {
      className: options.className || "member-tag-input-chip",
      textContent: `+${memberTags.length - visibleTags.length}`,
      dataset: { entity: "memberTagOverflow" },
    }));
  }

  container.dataset.state = memberTags.length ? "list" : "empty";
  return container;
}
