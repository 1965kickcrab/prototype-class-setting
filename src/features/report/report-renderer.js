import { createBusinessNavigation, createDefaultAppBottomNavigation } from "../../components/navigation.js";
import { createWebHeaderActions } from "../../components/web-header-actions.js";
import { createElement } from "../../utils/dom.js";

const DEFAULT_DOG_IMAGE = "assets/images/defaultProfile_dog.svg";
const REPORT_ENTRIES_STORAGE_KEY = "appReportEntries";
const MENU_FOLD_ICON_PATH = "assets/icons/menuFold.svg";
const MENU_FOLD_OPEN_ICON_PATH = "assets/icons/menuFold_fold.svg";

const webReportState = {
  isFilterPanelOpen: false,
  isPetFilterMenuOpen: false,
  petFilter: "",
  dateFilter: "",
};

export function renderAppReport(rootElement) {
  rootElement.innerHTML = "";
  rootElement.append(createAppReportScreen(readReportEntries()));
}

function createAppReportScreen(entries) {
  const filteredEntries = filterWebReportEntries(entries);
  const screen = createElement("main", {
    className: "app-report-root",
    dataset: { screen: "report", state: entries.length ? "list" : "empty" },
  });

  screen.append(createWebReportShell(filteredEntries, entries));
  screen.append(createAppReportShell(entries));
  return screen;
}

function createWebReportShell(entries, allEntries) {
  const shell = createElement("section", {
    className: "web-report-shell",
    dataset: { area: "reportWeb", platform: "web" },
  });
  shell.append(createWebHeader());

  const layout = createElement("div", { className: "web-report-layout" });
  layout.append(createReportNavigation());
  layout.append(createWebReportContent(entries, allEntries));
  shell.append(layout);
  return shell;
}

function createAppReportShell(entries) {
  const shell = createElement("section", {
    className: "app-report-screen",
    dataset: { area: "reportApp", platform: "app", state: entries.length ? "list" : "empty" },
  });

  shell.append(createHeader());
  shell.append(createContent(entries));
  shell.append(createWriteFab());
  shell.append(createDefaultAppBottomNavigation({
    className: "mobile-bottom-nav app-report-bottom-nav",
    dataset: { area: "bottomNavigation" },
    selectedLabel: "알림장",
  }));
  return shell;
}

function createWebHeader() {
  const header = createElement("header", {
    className: "web-global-header web-report-header",
    dataset: { area: "header", platform: "web" },
  });
  header.append(createElement("strong", { className: "brand-name", textContent: "다이얼독 비즈" }));
  header.append(createElement("h1", { textContent: "알림장" }));
  header.append(createWebHeaderActions());
  return header;
}

function createReportNavigation() {
  return createBusinessNavigation({
    className: "business-navigation report-navigation web",
    dataset: { area: "navigation", platform: "web" },
    profile: {
      imageSrc: DEFAULT_DOG_IMAGE,
      title: "다이얼독",
      subtitle: "애견유치원",
    },
    footerText: "개인정보 처리방침  이용약관  문의",
    items: [
      { label: "대시보드", href: "./school-home/index.html" },
      { label: "유치원", href: "./school-home/index.html" },
      { label: "호텔링" },
      { label: "알림장", selected: true, href: "./report/report.html" },
      { label: "회원", href: "./member-home/member-home.html" },
      { label: "이용권" },
    ],
  });
}

function createWebReportContent(entries, allEntries) {
  const content = createElement("section", {
    className: "web-report-content",
    dataset: { area: "content", feature: "report", platform: "web", state: entries.length ? "list" : "empty" },
  });

  const titleBar = createElement("div", { className: "web-report-title-bar" });
  titleBar.append(createElement("h1", { textContent: "알림장" }));

  const actions = createElement("div", { className: "web-report-title-actions" });
  const writeButton = createElement("button", {
    className: "primary-button web-report-write-button",
    type: "button",
    textContent: "알림장 작성",
    dataset: { action: "createReport" },
  });
  writeButton.addEventListener("click", () => {
    window.location.href = "./report/report-create.html?reset=true";
  });
  actions.append(writeButton);
  titleBar.append(actions);

  content.append(titleBar);
  content.append(createWebReportToolbar());
  if (webReportState.isFilterPanelOpen) {
    content.append(createWebReportFilterPanel(allEntries));
  }
  content.append(entries.length ? createWebReportList(entries) : createWebReportEmptyState());
  return content;
}

function createWebReportToolbar() {
  const toolbar = createElement("div", {
    className: "web-report-toolbar",
    dataset: { area: "reportFilterRow", state: webReportState.isFilterPanelOpen ? "open" : "closed" },
  });
  toolbar.append(createWebReportFilterToggle());
  return toolbar;
}

function createWebReportFilterToggle() {
  const button = createElement("button", {
    className: "filter-toggle-button web-report-filter-toggle",
    type: "button",
    dataset: {
      action: "toggleReportFilterPanel",
      state: webReportState.isFilterPanelOpen ? "open" : "closed",
    },
    childNodes: [
      createElement("span", { textContent: "필터" }),
      createFoldIcon(webReportState.isFilterPanelOpen),
    ],
  });

  button.addEventListener("click", () => {
    webReportState.isFilterPanelOpen = !webReportState.isFilterPanelOpen;
    if (!webReportState.isFilterPanelOpen) {
      webReportState.isPetFilterMenuOpen = false;
    }
    rerenderAppReport();
  });

  return button;
}

function createWebReportFilterPanel(entries) {
  const panel = createElement("div", {
    className: "filter-detail-panel web-report-filter-panel",
    dataset: { area: "filterDetail", feature: "report" },
  });

  const fields = createElement("div", {
    className: "filter-fields web-report-filter-fields",
    dataset: { area: "reportFilterFields" },
  });
  fields.append(createWebReportPetFilterField(entries));
  fields.append(createWebReportDateFilterField());

  panel.append(fields);
  panel.append(createWebReportResetFilterButton());
  return panel;
}

function createWebReportPetFilterField(entries) {
  const field = createElement("div", {
    className: "filter-field web-report-filter-field",
    dataset: { field: "reportPet" },
  });
  const button = createElement("button", {
    className: "web-report-filter-menu-button",
    type: "button",
    textContent: getSelectedPetFilterLabel(),
    dataset: {
      action: "toggleReportPetFilter",
      state: webReportState.isPetFilterMenuOpen ? "open" : "closed",
    },
  });

  button.addEventListener("click", () => {
    webReportState.isPetFilterMenuOpen = !webReportState.isPetFilterMenuOpen;
    rerenderAppReport();
  });

  field.append(button);

  if (webReportState.isPetFilterMenuOpen) {
    const menu = createElement("div", {
      className: "web-report-filter-menu",
      dataset: { area: "reportPetFilterOptions" },
    });
    getPetFilterOptions(entries).forEach((option) => {
      menu.append(createPetFilterOption(option));
    });
    field.append(menu);
  }

  return field;
}

function createWebReportDateFilterField() {
  const field = createElement("label", {
    className: "filter-field web-report-filter-field",
    dataset: { field: "reportDate" },
  });
  const input = createElement("input", {
    className: "form-input web-report-filter-input",
    type: "date",
    value: webReportState.dateFilter,
    dataset: { field: "reportDateFilter" },
  });
  input.addEventListener("change", (event) => {
    webReportState.dateFilter = event.target.value;
    webReportState.isPetFilterMenuOpen = false;
    rerenderAppReport();
  });
  field.append(input);
  return field;
}

function createWebReportResetFilterButton() {
  const button = createElement("button", {
    className: "reset-filter-button web-report-reset-filter-button",
    type: "button",
    textContent: "초기화",
    dataset: { action: "resetReportFilters" },
  });
  button.addEventListener("click", () => {
    webReportState.petFilter = "";
    webReportState.dateFilter = "";
    webReportState.isPetFilterMenuOpen = false;
    rerenderAppReport();
  });
  return button;
}

function createWebReportEmptyState() {
  const empty = createElement("section", {
    className: "surface-panel web-report-empty",
    dataset: { area: "reportListEmpty" },
  });
  empty.append(createElement("p", { textContent: "알림장 목록이 비어있습니다" }));
  return empty;
}

function createWebReportList(entries) {
  const list = createElement("section", {
    className: "surface-panel web-report-list",
    dataset: { area: "reportList" },
  });

  const header = createElement("div", { className: "web-report-list-header" });
  ["발송일", "반려견", "내용", "상태"].forEach((label) => {
    header.append(createElement("span", { textContent: label }));
  });
  list.append(header);

  entries.forEach((entry) => {
    list.append(createWebReportRow(entry));
  });
  return list;
}

function createWebReportRow(entry) {
  const row = createElement("article", {
    className: "web-report-row",
    dataset: { entity: "report", entityId: entry.id || "" },
  });
  row.append(createElement("span", { className: "web-report-row-date", textContent: entry.dateLabel || "-" }));
  row.append(createElement("strong", { textContent: formatReportPetName(entry) }));
  row.append(createElement("span", { className: "web-report-row-body", textContent: entry.body || "-" }));
  row.append(createElement("span", { className: "web-report-row-status", textContent: entry.statusLabel || "전송 완료" }));
  return row;
}

function createHeader() {
  const header = createElement("header", {
    className: "app-report-header",
    dataset: { area: "header" },
  });

  header.append(createElement("h1", { textContent: "알림장" }));

  const archiveButton = createElement("button", {
    className: "app-report-archive-button",
    type: "button",
    ariaLabel: "알림장 보관함",
    dataset: { action: "openReportArchive" },
  });
  archiveButton.append(createElement("img", {
    className: "app-report-archive-icon",
    src: "assets/icons/iconBox.svg",
    alt: "",
  }));
  header.append(archiveButton);

  return header;
}

function createContent(entries) {
  const content = createElement("section", {
    className: "app-report-content",
    dataset: { area: "content", state: entries.length ? "list" : "empty" },
  });

  if (entries.length === 0) {
    content.append(createEmptyState());
    return content;
  }

  const list = createElement("section", {
    className: "app-report-list",
    dataset: { area: "reportList" },
  });

  groupEntriesByMonth(entries).forEach((group) => {
    list.append(createMonthSection(group));
  });

  content.append(list);
  return content;
}

function createMonthSection(group) {
  const section = createElement("section", {
    className: "app-report-month-section",
    dataset: { month: group.monthLabel },
  });
  const header = createElement("button", {
    className: "app-report-month-header",
    type: "button",
    dataset: { action: "toggleReportMonth", target: group.monthLabel },
  });
  header.append(createElement("span", { textContent: group.monthLabel }));
  header.append(createElement("span", { className: "app-report-month-chevron", textContent: "⌄" }));
  section.append(header);

  group.entries.forEach((entry) => {
    section.append(createReportItem(entry));
  });

  return section;
}

function createReportItem(entry) {
  const classNames = ["app-report-item"];
  if (entry.isHighlighted) {
    classNames.push("is-highlighted");
  }
  if (entry.mediaType) {
    classNames.push("has-media");
  }

  const item = createElement("article", {
    className: classNames.join(" "),
    dataset: { entity: "report", entityId: entry.id || "" },
  });

  const body = createElement("div", { className: "app-report-item-body" });
  const meta = createElement("p", { className: "app-report-meta" });
  meta.append(createElement("span", { textContent: entry.dateLabel || "-" }));

  if (entry.isUnread) {
    meta.append(createElement("span", { className: "app-report-dot", textContent: "·" }));
    meta.append(createElement("img", {
      className: "app-report-unread-icon",
      src: "assets/icons/iconUnread.svg",
      alt: "",
    }));
    meta.append(createElement("span", { textContent: "읽지 않음" }));
  }

  body.append(meta);
  body.append(createElement("h2", { textContent: formatReportPetName(entry) }));

  if (entry.body) {
    body.append(createElement("p", { className: "app-report-summary", textContent: entry.body }));
  }

  item.append(body);

  if (entry.mediaType) {
    item.append(createReportMedia(entry.mediaType));
  }

  return item;
}

function createReportMedia(mediaType) {
  const media = createElement("div", { className: "app-report-media" });
  media.append(createElement("img", { src: DEFAULT_DOG_IMAGE, alt: "" }));

  if (mediaType === "video") {
    media.append(createElement("span", { className: "app-report-play-icon", textContent: "▶" }));
  }

  return media;
}

function createEmptyState() {
  return createElement("p", {
    className: "app-report-empty",
    textContent: "알림장 목록이 비어있습니다",
  });
}

function createWriteFab() {
  const button = createElement("button", {
    className: "app-report-write-fab",
    type: "button",
    dataset: { action: "createReport" },
  });
  button.addEventListener("click", () => {
    window.location.href = "./report/report-create.html?reset=true";
  });
  button.append(createElement("span", { className: "app-report-fab-icon", textContent: "+" }));
  button.append(createElement("span", { textContent: "알림장 작성" }));
  return button;
}

function groupEntriesByMonth(entries) {
  const groups = [];

  entries.forEach((entry) => {
    let group = groups.find((candidate) => candidate.monthLabel === entry.monthLabel);
    if (!group) {
      group = { monthLabel: entry.monthLabel || "날짜 미지정", entries: [] };
      groups.push(group);
    }
    group.entries.push(entry);
  });

  return groups;
}

function formatReportPetName(entry) {
  const petName = entry.petName || entry.name || "-";
  const breed = entry.breed || "";
  return breed ? `${petName} (${breed})` : petName;
}

function filterWebReportEntries(entries) {
  const petFilter = normalizeFilterText(webReportState.petFilter);
  const dateFilter = normalizeDateFilter(webReportState.dateFilter);

  return entries.filter((entry) => {
    const matchesPet = !petFilter || normalizeFilterText(getEntryPetName(entry)) === petFilter;
    const matchesDate = !dateFilter || getEntryDateKeys(entry).includes(dateFilter);
    return matchesPet && matchesDate;
  });
}


function getPetFilterOptions(entries) {
  const options = [{ label: "전체", value: "" }];
  const seenPetNames = new Set();

  entries.forEach((entry) => {
    const petName = getEntryPetName(entry);
    const normalizedPetName = normalizeFilterText(petName);
    if (!normalizedPetName || seenPetNames.has(normalizedPetName)) {
      return;
    }

    seenPetNames.add(normalizedPetName);
    options.push({ label: petName, value: petName });
  });

  return options;
}

function createPetFilterOption(option) {
  const isSelected = normalizeFilterText(webReportState.petFilter) === normalizeFilterText(option.value);
  const button = createElement("button", {
    className: isSelected ? "web-report-filter-menu-option is-selected" : "web-report-filter-menu-option",
    type: "button",
    textContent: option.label,
    dataset: {
      action: "selectReportPetFilter",
      state: isSelected ? "selected" : "idle",
    },
  });
  button.addEventListener("click", () => {
    webReportState.petFilter = option.value;
    webReportState.isPetFilterMenuOpen = false;
    rerenderAppReport();
  });
  return button;
}

function getSelectedPetFilterLabel() {
  return webReportState.petFilter || "전체";
}

function getEntryPetName(entry) {
  return String(entry.petName || entry.name || "").trim();
}

function getEntryDateKeys(entry) {
  return [entry.date, entry.dateLabel].map(normalizeDateFilter).filter(Boolean);
}

function normalizeFilterText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeDateFilter(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(0, 8) : "";
}

function createFoldIcon(isOpen) {
  return createElement("img", {
    className: "fold-icon",
    src: isOpen ? MENU_FOLD_OPEN_ICON_PATH : MENU_FOLD_ICON_PATH,
    alt: "",
  });
}

function rerenderAppReport() {
  renderAppReport(document.querySelector("#app"));
}

function readReportEntries() {
  try {
    const entries = JSON.parse(localStorage.getItem(REPORT_ENTRIES_STORAGE_KEY) || "[]");
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}
