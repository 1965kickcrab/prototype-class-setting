import { loadSchoolClassList } from "../../storage/class-storage.js";
import { createElement } from "../../utils/dom.js";

const BACK_ICON_PATH = "assets/icons/iconBack.svg";
const CHEVRON_RIGHT_ICON_PATH = "assets/icons/iconChevronRight.svg";
const WEEKDAY_LABELS = {
  mon: "월",
  tue: "화",
  wed: "수",
  thu: "목",
  fri: "금",
  sat: "토",
  sun: "일",
};

export function renderAppClassSettings(rootElement) {
  rootElement.innerHTML = "";
  rootElement.append(createAppClassSettingsScreen(loadSchoolClassList()));
}

function createAppClassSettingsScreen(schoolClassList) {
  const screen = createElement("main", {
    className: "app-class-screen",
    dataset: { screen: "appClassSettings", platform: "app" },
  });

  screen.append(createHeader());
  screen.append(createContent(schoolClassList));
  return screen;
}

function createHeader() {
  const header = createElement("header", {
    className: "app-class-header",
    dataset: { area: "header" },
  });

  const backButton = createElement("button", {
    className: "app-class-back-button",
    type: "button",
    ariaLabel: "뒤로가기",
    dataset: { action: "goBack" },
  });
  backButton.append(createElement("img", { className: "button-icon", src: BACK_ICON_PATH, alt: "" }));
  backButton.addEventListener("click", () => {
    window.location.href = "./app-more.html";
  });

  const registerButton = createElement("button", {
    className: "primary-button app-class-register-button",
    type: "button",
    textContent: "클래스 등록",
    dataset: { action: "openClassRegistration" },
  });
  registerButton.addEventListener("click", () => {
    window.location.href = "./app-class-registration.html";
  });

  header.append(backButton);
  header.append(createElement("h1", { textContent: "클래스 관리" }));
  header.append(registerButton);
  return header;
}

function createContent(schoolClassList) {
  const content = createElement("section", {
    className: "app-class-content",
    dataset: { area: "content", state: schoolClassList.length ? "list" : "empty" },
  });

  const list = createElement("section", {
    className: "app-class-list",
    dataset: { area: "schoolClassList" },
  });

  schoolClassList.forEach((schoolClass) => {
    list.append(createClassItem(schoolClass));
  });

  content.append(list);
  return content;
}

function createClassItem(schoolClass) {
  const item = createElement("button", {
    className: "app-class-item",
    type: "button",
    dataset: { entityId: schoolClass.id },
  });
  item.addEventListener("click", () => {
    window.location.href = `./app-class-detail.html?id=${encodeURIComponent(schoolClass.id)}`;
  });

  const body = createElement("div", { className: "app-class-item-body" });
  body.append(createElement("strong", { textContent: formatOptionalValue(schoolClass.name) }));
  body.append(createElement("span", { textContent: `담당 ${formatOptionalValue(schoolClass.manager)}` }));

  const meta = createElement("dl", { className: "app-class-meta" });
  meta.append(createClassMeta("정원", formatCapacity(schoolClass.capacity)));
  meta.append(createClassMeta("영업일", formatBusinessDays(schoolClass.businessDays)));
  body.append(meta);

  item.append(body);
  item.append(createElement("img", { className: "app-class-chevron", src: CHEVRON_RIGHT_ICON_PATH, alt: "" }));
  return item;
}

function createClassMeta(label, value) {
  const group = createElement("div", { className: "app-class-meta-group" });
  group.append(createElement("dt", { textContent: label }));
  group.append(createElement("dd", { textContent: value }));
  return group;
}

function formatOptionalValue(value) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function formatCapacity(capacity) {
  return capacity ? `${capacity}마리` : "-";
}

function formatBusinessDays(businessDays) {
  if (!Array.isArray(businessDays) || businessDays.length === 0) {
    return "-";
  }

  return businessDays.map((weekdayKey) => WEEKDAY_LABELS[weekdayKey]).filter(Boolean).join(", ");
}
