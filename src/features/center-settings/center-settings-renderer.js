import { createElement } from "../../utils/dom.js";

const BACK_ICON_PATH = "assets/icons/iconBack.svg";
const SCHOOL_ICON_PATH = "assets/icons/menuIcon_daycare.svg";
const SCHOOL_ACTIVE_ICON_PATH = "assets/icons/menuIcon_daycare_on.svg";
const HOTEL_ICON_PATH = "assets/icons/menuIcon_hotel.svg";
const CHEVRON_ICON_PATH = "assets/icons/iconChevronRight.svg";

const SETTINGS_GROUPS = [
  {
    key: "school",
    label: "유치원",
    iconPath: SCHOOL_ICON_PATH,
    activeIconPath: SCHOOL_ACTIVE_ICON_PATH,
    items: [
      { key: "school-business", label: "영업 & 휴무", href: "./center-settings/business-schedule.html", selected: true },
      { key: "school-class", label: "클래스", href: "./center-settings/class.html" },
    ],
  },
  {
    key: "hotel",
    label: "호텔링",
    iconPath: HOTEL_ICON_PATH,
    activeIconPath: HOTEL_ICON_PATH,
    items: [
      { key: "hotel-business", label: "영업 & 휴무" },
      { key: "hotel-pricing", label: "요금제" },
    ],
  },
];

const settingsNavigationState = {
  openGroupKey: "school",
  selectedItemKey: "school-business",
};

export function renderCenterSettings(rootElement) {
  rootElement.innerHTML = "";
  rootElement.append(createCenterSettingsScreen(rootElement));
}

function rerender(rootElement) {
  renderCenterSettings(rootElement);
}

function createCenterSettingsScreen(rootElement) {
  const screen = createElement("main", {
    className: "center-settings-screen",
    dataset: { screen: "centerSettings", platform: "web" },
  });

  screen.append(createHeader());

  const layout = createElement("div", { className: "center-settings-layout" });
  layout.append(createSettingsSidebar(rootElement));
  layout.append(createSettingsContent());
  screen.append(layout);

  return screen;
}

function createHeader() {
  const header = createElement("header", {
    className: "center-settings-header",
    dataset: { area: "header" },
  });

  const backButton = createElement("button", {
    className: "center-settings-back-button",
    type: "button",
    ariaLabel: "이전 화면",
    dataset: { action: "goBack" },
  });
  backButton.append(createElement("img", { className: "button-icon", src: BACK_ICON_PATH, alt: "" }));
  backButton.addEventListener("click", () => {
    history.back();
  });

  header.append(backButton);
  header.append(createElement("h1", { textContent: "센터 설정" }));
  return header;
}

function createSettingsSidebar(rootElement) {
  const sidebar = createElement("aside", {
    className: "center-settings-sidebar",
    dataset: { area: "settingsNavigation" },
  });

  const nav = createElement("nav", { className: "center-settings-nav" });
  nav.setAttribute("aria-label", "센터 설정 메뉴");

  SETTINGS_GROUPS.forEach((group) => {
    nav.append(createSettingsDrawerGroup(rootElement, group));
  });

  sidebar.append(nav);
  return sidebar;
}

function createSettingsDrawerGroup(rootElement, group) {
  const isOpen = settingsNavigationState.openGroupKey === group.key;
  const hasSelectedItem = group.items.some((item) => item.key === settingsNavigationState.selectedItemKey);
  const groupElement = createElement("section", {
    className: isOpen ? "center-settings-drawer is-open" : "center-settings-drawer",
    dataset: { group: group.key, state: isOpen ? "open" : "closed" },
  });

  const trigger = createElement("button", {
    className: hasSelectedItem ? "center-settings-drawer-trigger is-active" : "center-settings-drawer-trigger",
    type: "button",
    dataset: { action: "toggleSettingGroup", state: isOpen ? "open" : "closed", service: group.label },
  });
  trigger.setAttribute("aria-expanded", String(isOpen));

  trigger.append(createElement("img", {
    className: "center-settings-drawer-icon",
    src: hasSelectedItem ? group.activeIconPath : group.iconPath,
    alt: "",
  }));
  trigger.append(createElement("span", { className: "center-settings-drawer-label", textContent: group.label }));
  trigger.append(createElement("img", { className: "center-settings-drawer-chevron", src: CHEVRON_ICON_PATH, alt: "" }));
  trigger.addEventListener("click", () => {
    settingsNavigationState.openGroupKey = isOpen ? "" : group.key;
    rerender(rootElement);
  });
  groupElement.append(trigger);

  if (isOpen) {
    const list = createElement("div", {
      className: "center-settings-submenu",
      dataset: { area: "settingSubmenu", service: group.label },
    });

    group.items.forEach((item) => {
      list.append(createSettingsSubmenuButton(rootElement, group, item));
    });

    groupElement.append(list);
  }

  return groupElement;
}

function createSettingsSubmenuButton(rootElement, group, item) {
  const isSelected = item.key === settingsNavigationState.selectedItemKey;
  const button = createElement("button", {
    className: isSelected ? "center-settings-submenu-item is-selected" : "center-settings-submenu-item",
    type: "button",
    textContent: item.label,
    dataset: {
      action: "selectSettingMenu",
      state: isSelected ? "selected" : "idle",
      service: group.label,
      menu: item.key,
    },
  });

  button.addEventListener("click", () => {
    if (item.href) {
      window.location.href = item.href;
      return;
    }

    settingsNavigationState.openGroupKey = group.key;
    settingsNavigationState.selectedItemKey = item.key;
    rerender(rootElement);
  });

  return button;
}

function createSettingsContent() {
  const content = createElement("section", {
    className: "center-settings-content",
    dataset: { area: "content" },
  });

  content.append(createElement("div", {
    className: "center-settings-content-surface",
    dataset: { state: "empty" },
  }));

  return content;
}
