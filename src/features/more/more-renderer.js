import { createDefaultAppBottomNavigation } from "../../components/navigation.js";
import { createElement } from "../../utils/dom.js";

const DEFAULT_PROFILE_IMAGE = "assets/images/defaultProfile_dog.svg";

const MENU_GROUPS = [
  ["자주 묻는 질문"],
  ["전화 문의", "카톡 문의"],
  ["공지사항 & 새소식", "개인정보 처리 방침", "서비스 이용 약관"],
];

export function renderMore(rootElement) {
  rootElement.innerHTML = "";
  rootElement.append(createMoreScreen());
}

function createMoreScreen() {
  const screen = createElement("main", {
    className: "more-app-screen",
    dataset: { screen: "more", state: "ready" },
  });

  screen.append(createMoreHeader());
  screen.append(createProfileSection());
  screen.append(createShortcutSection());
  screen.append(createMenuSection());
  screen.append(createDefaultAppBottomNavigation({
    className: "mobile-bottom-nav",
    dataset: { area: "bottomNavigation" },
    selectedLabel: "더보기",
  }));

  return screen;
}

function createMoreHeader() {
  const header = createElement("header", {
    className: "more-app-header",
    dataset: { area: "header" },
  });

  const notificationButton = createElement("button", {
    className: "more-notification-button",
    type: "button",
    ariaLabel: "알림",
    dataset: { action: "openNotification" },
  });
  notificationButton.append(createElement("img", {
    src: "assets/icons/menuIcon_notification.svg",
    alt: "",
  }));
  header.append(notificationButton);

  return header;
}

function createProfileSection() {
  const section = createElement("section", {
    className: "more-profile-section",
    dataset: { area: "profile" },
  });

  const avatar = createElement("div", { className: "more-profile-avatar" });
  avatar.append(createElement("img", {
    src: DEFAULT_PROFILE_IMAGE,
    alt: "",
  }));

  const text = createElement("div", { className: "more-profile-text" });
  text.append(createElement("span", { textContent: "아이디" }));
  text.append(createElement("strong", { textContent: "wldnjs596" }));

  section.append(avatar);
  section.append(text);
  return section;
}

function createShortcutSection() {
  const section = createElement("section", {
    className: "more-shortcut-grid",
    dataset: { area: "shortcuts" },
  });

  section.append(createShortcutButton({
    label: "유치원",
    icon: "assets/icons/menuIcon_daycare_on.svg",
    action: "openSchoolSettings",
    href: "./center-settings/class.html",
  }));
  section.append(createShortcutButton({
    label: "이용권",
    icon: "assets/icons/menuIcon_ticket_on.svg",
    action: "openTickets",
  }));

  return section;
}

function createShortcutButton({ label, icon, action, href }) {
  const button = createElement("button", {
    className: "more-shortcut-button",
    type: "button",
    dataset: { action, target: label },
  });

  button.append(createElement("img", { src: icon, alt: "" }));
  button.append(createElement("span", { textContent: label }));

  if (href) {
    button.addEventListener("click", () => {
      window.location.href = href;
    });
  }

  return button;
}

function createMenuSection() {
  const section = createElement("section", {
    className: "more-menu-section",
    dataset: { area: "menuList" },
  });

  MENU_GROUPS.forEach((items) => {
    const group = createElement("div", { className: "more-menu-group" });
    items.forEach((label) => {
      group.append(createMenuItem(label));
    });
    section.append(group);
  });

  section.append(createElement("button", {
    className: "more-logout-button",
    type: "button",
    textContent: "로그아웃",
    dataset: { action: "logout" },
  }));

  return section;
}

function createMenuItem(label) {
  const button = createElement("button", {
    className: "more-menu-item",
    type: "button",
    dataset: { action: "openMenu", target: label },
  });
  button.append(createElement("span", { textContent: label }));
  button.append(createElement("span", { className: "more-menu-chevron", textContent: "›" }));
  return button;
}
