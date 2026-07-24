import { createElement } from "../utils/dom.js";

const HEADER_ICON_PATHS = {
  back: "assets/icons/iconChevronLeft.svg",
  close: "assets/icons/iconClose.svg",
};

export function createHeaderIconButton({ className, icon, iconPath, ariaLabel, dataset }) {
  const button = createElement("button", {
    className,
    type: "button",
    ariaLabel,
    dataset,
  });

  button.append(createElement("img", {
    className: "button-icon",
    src: iconPath || HEADER_ICON_PATHS[icon],
    alt: "",
  }));
  return button;
}
