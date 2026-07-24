import { createElement } from "../utils/dom.js";

const DEFAULT_CENTER_SETTINGS_HREF = "./center-settings/business-schedule.html";

export function createWebHeaderActions(options = {}) {
  const actions = createElement("div", {
    className: "header-utility",
    dataset: { area: "headerUtility" },
  });

  [
    { label: "설정", action: "openCenterSettings", href: options.settingsHref || DEFAULT_CENTER_SETTINGS_HREF },
    { label: "알림", action: "openNotifications" },
    { label: "계정", action: "openAccount" },
  ].forEach((item) => {
    const button = createElement("button", {
      className: "header-utility-button",
      type: "button",
      textContent: item.label,
      dataset: { action: item.action },
    });

    if (item.href) {
      button.addEventListener("click", () => {
        window.location.href = item.href;
      });
    }

    actions.append(button);
  });

  return actions;
}
