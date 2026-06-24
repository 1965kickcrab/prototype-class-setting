export function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);

  if (options.className) {
    element.className = options.className;
  }

  if (options.textContent !== undefined) {
    element.textContent = options.textContent;
  }

  if (options.type) {
    element.type = options.type;
  }

  if (options.value !== undefined) {
    element.value = options.value;
  }

  if (options.placeholder) {
    element.placeholder = options.placeholder;
  }

  if (options.src) {
    element.src = options.src;
  }

  if (options.alt !== undefined) {
    element.alt = options.alt;
  }

  if (options.ariaLabel) {
    element.setAttribute("aria-label", options.ariaLabel);
  }

  if (options.dataset) {
    Object.entries(options.dataset).forEach(([key, value]) => {
      element.dataset[key] = value;
    });
  }

  if (options.childNodes) {
    element.append(...options.childNodes);
  }

  if ((tagName === "input" || tagName === "textarea" || tagName === "select") && !element.name) {
    const fallbackName = options.name || options.dataset?.field || options.type || tagName;
    element.name = String(fallbackName).trim().replace(/\s+/g, "-") || tagName;
  }

  return element;
}
