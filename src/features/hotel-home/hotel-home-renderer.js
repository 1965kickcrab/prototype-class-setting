import { createEmptyStateElement } from "../../components/empty-state.js";
import { createBusinessNavigation } from "../../components/navigation.js";
import { createReservationSearchFilter } from "../../components/reservation-search-filter.js";
import { createElement } from "../../utils/dom.js";
import {
  getCalendarCountsByDate,
  createMonthDate,
  getCalendarMatrix,
  getDateKey,
  getFilteredReservationsByDate,
  getMonthLabel,
  getReservationGroups,
  getReservationsByDate,
  getSelectedDateSummary,
  sortReservationsForApp,
  shiftMonth,
} from "./hotel-home-state.js";

const DEFAULT_PROFILE_IMAGE = "assets/images/defaultProfile_dog.svg";
const HOTEL_ICON_PATH = "assets/icons/menuIcon_hotel_on.svg";
const SETTING_ICON_PATH = "assets/icons/menuIcon_setting.svg";
const ALARM_ICON_PATH = "assets/icons/iconTime.svg";
const PROFILE_ICON_PATH = "assets/icons/menuIcon_profile.svg";
const SEARCH_ICON_PATH = "assets/icons/searchIcon.svg";
const CHEVRON_LEFT_ICON_PATH = "assets/icons/iconChevronLeft.svg";
const CHEVRON_RIGHT_ICON_PATH = "assets/icons/iconChevronRight.svg";
const CLOSE_ICON_PATH = "assets/icons/iconClose.svg";
const CHECKIN_ICON_PATH = "assets/icons/iconCheckin.svg";
const CHECKOUT_ICON_PATH = "assets/icons/iconCheckout.svg";

const FILTER_OPTIONS = [
  { key: "checkin", label: "입실" },
  { key: "checkout", label: "퇴실" },
  { key: "staying", label: "숙박" },
];
const HEADER_ICON_ACTIONS = {
  설정: "openSettings",
  알림: "openNotifications",
  계정: "openProfile",
  검색: "openSearch",
};

export function renderHotelHome(rootElement, hotelHomeState) {
  rootElement.innerHTML = "";
  rootElement.append(createHotelHomeScreen(hotelHomeState));
}

function rerender(hotelHomeState) {
  renderHotelHome(document.querySelector("#app"), hotelHomeState);
}

function createHotelHomeScreen(hotelHomeState) {
  const screen = createElement("main", {
    className: "hotel-home-screen",
    dataset: { screen: "hotelHome" },
  });

  screen.append(createHotelHomeWebShell(hotelHomeState));
  screen.append(hotelHomeState.isReservationSearchScreenOpen
    ? createReservationSearchAppScreen(hotelHomeState)
    : createHotelHomeAppShell(hotelHomeState));

  return screen;
}

function createHotelHomeWebShell(hotelHomeState) {
  const shell = createElement("section", {
    className: "hotel-home-web-shell",
    dataset: { area: "hotelHomeWeb" },
  });
  shell.append(createWebHeader());

  const layout = createElement("div", { className: "hotel-home-web-layout" });
  layout.append(createNavigation("web"));
  layout.append(createWebContent(hotelHomeState));
  shell.append(layout);

  return shell;
}

function createHotelHomeAppShell(hotelHomeState) {
  const shell = createElement("section", {
    className: "hotel-home-app-shell",
    dataset: { area: "hotelHomeApp" },
  });

  shell.append(createAppHeader(hotelHomeState));
  shell.append(createCalendarSection(hotelHomeState, "app"));
  shell.append(createAppReservationSection(hotelHomeState));

  return shell;
}

function createWebHeader() {
  const header = createElement("header", {
    className: "member-header",
    dataset: { area: "header" },
  });

  header.append(createElement("strong", { className: "brand-name", textContent: "다이얼독 비즈" }));
  header.append(createElement("h1", { textContent: "호텔링" }));
  header.append(createElement("span", { className: "header-utility", textContent: "설정  알림  계정" }));
  return header;
}

function createAppHeader(hotelHomeState) {
  const header = createElement("header", {
    className: "hotel-app-header",
    dataset: { area: "header", platform: "app" },
  });

  const left = createElement("div", { className: "hotel-app-header-left" });
  const iconBox = createElement("div", { className: "hotel-app-header-icon-box" });
  iconBox.append(createElement("img", { src: HOTEL_ICON_PATH, alt: "" }));

  const title = createElement("div", { className: "hotel-app-header-title" });
  const titleRow = createElement("button", {
    className: "hotel-app-header-title-row",
    type: "button",
    ariaLabel: "모드 전환",
  });
  titleRow.append(createElement("strong", { textContent: "호텔링" }));
  titleRow.append(createElement("img", { src: "assets/icons/iconDropdown.svg", alt: "" }));
  titleRow.addEventListener("click", () => {
    hotelHomeState.isModeMenuOpen = !hotelHomeState.isModeMenuOpen;
    rerender(hotelHomeState);
  });
  title.append(titleRow);
  title.append(createElement("span", { textContent: `정원 ${getCapacityCount(hotelHomeState)}` }));
  if (hotelHomeState.isModeMenuOpen) {
    title.append(createAppModeMenu([
      { label: "유치원", href: "./index.html" },
      { label: "호텔", href: "./hotel-home.html", selected: true },
    ]));
  }

  left.append(iconBox);
  left.append(title);

  const actions = createElement("div", { className: "hotel-app-header-actions" });
  actions.append(createElement("button", {
    className: "secondary-button hotel-app-register-button",
    type: "button",
    textContent: "예약 등록",
  }));
  const searchButton = createHeaderIconButton(SEARCH_ICON_PATH, "검색");
  searchButton.addEventListener("click", () => {
    hotelHomeState.isReservationSearchScreenOpen = true;
    hotelHomeState.isReservationSearchMenuOpen = false;
    rerender(hotelHomeState);
  });
  actions.append(searchButton);

  header.append(left);
  header.append(actions);

  return header;
}

function createNavigation(platform) {
  return createBusinessNavigation({
    className: platform === "web" ? "business-navigation hotel-navigation web" : "hotel-navigation app",
    dataset: { area: "navigation", platform },
    profile: {
      imageSrc: DEFAULT_PROFILE_IMAGE,
      title: "다이얼독",
      subtitle: "애견유치원",
    },
    footerText: "개인정보 처리방침  이용약관  문의",
    items: [
      { label: "대시보드", href: "./index.html" },
      { label: "유치원", href: "./index.html" },
      { label: "호텔링", selected: true, href: "./hotel-home.html" },
      { label: "알림장", href: "./report.html" },
      { label: "회원", href: "./member-home.html" },
      { label: "이용권" }
    ]
  });
}
function createWebContent(hotelHomeState) {
  const content = createElement("section", {
    className: "content",
    dataset: { area: "content", feature: "hotelHome", platform: "web", state: getWebContentState(hotelHomeState) },
  });

  const titleBar = createElement("div", { className: "hotel-web-title-bar" });
  const titleGroup = createElement("div", { className: "hotel-web-title-group" });
  titleGroup.append(createElement("h1", { textContent: "호텔링" }));
  titleGroup.append(createElement("button", {
    className: "secondary-button hotel-capacity-button",
    type: "button",
    textContent: `정원 ${getCapacityCount(hotelHomeState)}`,
  }));

  titleBar.append(titleGroup);
  titleBar.append(createElement("button", {
    className: "primary-button hotel-register-button",
    type: "button",
    textContent: "예약 등록",
  }));

  const sections = createElement("div", {
    className: hotelHomeState.isDetailPanelOpen ? "web-sections is-detail-open" : "web-sections",
    dataset: { area: "webSections", feature: "hotelHome" },
  });
  sections.append(createCalendarSection(hotelHomeState, "web"));

  if (hotelHomeState.isDetailPanelOpen) {
    sections.append(createWebDetailPanel(hotelHomeState));
  }

  content.append(titleBar);
  content.append(sections);
  return content;
}

function createCalendarSection(hotelHomeState, platform) {
  const section = createElement("section", {
    className: "calendar-panel",
    dataset: { area: "calendarPanel", feature: "hotelHome", platform },
  });

  section.append(createCalendarHeader(hotelHomeState, platform));
  section.append(createCalendarGrid(hotelHomeState, platform));
  return section;
}

function createCalendarHeader(hotelHomeState, platform) {
  const header = createElement("div", {
    className: "calendar-header",
    dataset: { area: "calendarHeader", feature: "hotelHome", platform },
  });

  const left = createElement("div", { className: "calendar-controls" });
  left.append(createMonthMoveButton("prev", hotelHomeState, "이전 달"));
  left.append(createElement("strong", { className: "calendar-month-label", textContent: getMonthLabel(hotelHomeState.currentMonth) }));
  left.append(createMonthMoveButton("next", hotelHomeState, "다음 달"));

  header.append(left);

  if (platform === "web") {
    header.append(createReservationSearchFilter(hotelHomeState, {
      className: "reservation-search-filter calendar-search-filter",
      searchInputClassName: "filter-search-input reservation-search-input calendar-search-input",
      rerender,
      onSearchInput: (state) => {
        rerender(state);
      },
    }));
  }

  return header;
}

function createCalendarGrid(hotelHomeState, platform) {
  const grid = createElement("section", {
    className: "calendar-grid",
    dataset: { area: "calendarGrid", feature: "hotelHome", platform },
  });

  const weekHeader = createElement("div", { className: "calendar-weekdays" });
  ["일", "월", "화", "수", "목", "금", "토"].forEach((dayLabel, dayIndex) => {
    weekHeader.append(createElement("span", {
      className: dayIndex === 0 ? "calendar-weekday is-holiday" : "calendar-weekday",
      textContent: dayLabel,
    }));
  });
  grid.append(weekHeader);

  const body = createElement("div", { className: "calendar-body" });
  getCalendarMatrix(hotelHomeState.currentMonth).forEach((week) => {
    const row = createElement("div", { className: "calendar-row" });
    week.forEach((cell) => {
      row.append(createCalendarDateButton(hotelHomeState, cell, platform));
    });
    body.append(row);
  });
  grid.append(body);

  return grid;
}

function createCalendarDateButton(hotelHomeState, cell, platform) {
  const reservations = getFilteredReservationsByDate(hotelHomeState, cell.dateKey);
  const counts = getCalendarCountsByDate(reservations, cell.dateKey);
  const isSelected = cell.dateKey === hotelHomeState.selectedDate;
  const isDimmed = hotelHomeState.isDetailPanelOpen && hotelHomeState.selectedDate && cell.dateKey !== hotelHomeState.selectedDate && platform === "web";
  const button = createElement("button", {
    className: [
      "calendar-date",
      cell.isCurrentMonth ? "" : "is-muted",
      cell.isToday ? "is-today" : "",
      reservations.length > 0 ? "has-reservations" : "",
      isSelected ? "is-selected" : "",
      isDimmed ? "is-dimmed" : "",
    ].filter(Boolean).join(" "),
    type: "button",
    dataset: {
      action: "selectDate",
      entityId: cell.dateKey,
      state: isSelected ? "selected" : reservations.length > 0 ? "reserved" : "idle",
    },
  });

  const dateNumber = createElement("span", { className: "calendar-day-number", textContent: String(cell.dayNumber) });
  button.append(dateNumber);

  if (platform === "web" && reservations.length > 0) {
    button.append(createCalendarCountSummary(counts));
  }

  button.addEventListener("click", () => {
    hotelHomeState.currentMonth = cell.dateKey.slice(0, 7);
    hotelHomeState.selectedDate = cell.dateKey;
    hotelHomeState.isDetailPanelOpen = platform === "web";
    hotelHomeState.selectedReservationIds = [];
    rerender(hotelHomeState);
  });

  return button;
}

function createCalendarCountSummary(counts) {
  const summary = createElement("div", { className: "calendar-counts" });
  [
    { label: "총 숙박", count: counts.totalCount },
    { label: "입실", count: counts.checkinCount },
    { label: "퇴실", count: counts.checkoutCount },
  ].forEach((item) => {
    const row = createElement("small", { className: "calendar-day-count" });
    row.append(createElement("span", { textContent: item.label }));
    row.append(createElement("strong", { textContent: String(item.count) }));
    summary.append(row);
  });
  return summary;
}

function createWebDetailPanel(hotelHomeState) {
  const summary = getSelectedDateSummary(hotelHomeState);
  const filteredReservations = getFilteredReservationsByDate(hotelHomeState);
  const filteredGroups = getReservationGroups(filteredReservations);
  const panel = createElement("section", {
    className: "hotel-detail-panel",
    dataset: {
      area: "detailPanel",
      state: filteredReservations.length > 0 ? "list" : "empty",
    },
  });

  panel.append(createWebDetailHeader(hotelHomeState, summary));

  if (filteredReservations.length === 0) {
    panel.append(createDetailEmptyState(hotelHomeState));
    return panel;
  }

  const body = createElement("div", { className: "hotel-detail-body" });
  filteredGroups.forEach((group) => {
    if (group.reservations.length === 0) {
      return;
    }

    body.append(createWebReservationGroup(hotelHomeState, group));
  });
  panel.append(body);

  return panel;
}

function createWebDetailHeader(hotelHomeState, summary) {
  const header = createElement("div", { className: "hotel-detail-header" });
  const title = createElement("div", { className: "hotel-detail-title" });
  title.append(createElement("span", { textContent: summary.dateText || "-" }));
  title.append(createElement("strong", { textContent: `숙박 ${summary.reservationCount}` }));

  const actions = createElement("div", { className: "hotel-detail-actions" });
  const closeButton = createElement("button", {
    className: "close-button small-icon-button",
    type: "button",
    ariaLabel: "닫기",
    dataset: { action: "closeHotelDetail" },
  });
  closeButton.append(createElement("img", { className: "button-icon", src: CLOSE_ICON_PATH, alt: "" }));
  closeButton.addEventListener("click", () => {
    hotelHomeState.isDetailPanelOpen = false;
    hotelHomeState.selectedReservationIds = [];
    rerender(hotelHomeState);
  });

  const actionButton = createElement("button", {
    className: getSelectedReservationCount(hotelHomeState) > 0
      ? "hotel-detail-register-button is-active"
      : "hotel-detail-register-button",
    type: "button",
    textContent: "예약 취소",
    dataset: {
      action: "cancelReservations",
      state: getSelectedReservationCount(hotelHomeState) > 0 ? "active" : "disabled",
    },
  });
  actionButton.disabled = getSelectedReservationCount(hotelHomeState) === 0;

  actions.append(closeButton);
  actions.append(actionButton);
  header.append(title);
  header.append(actions);

  return header;
}

function createWebReservationGroup(hotelHomeState, group) {
  const section = createElement("section", {
    className: "hotel-detail-group",
    dataset: { area: "reservationGroup", state: group.key },
  });
  section.append(createGroupBadge(group.label, group.reservations.length));
  section.append(createWebReservationTable(hotelHomeState, group));
  return section;
}

function createWebReservationTable(hotelHomeState, group) {
  const table = createElement("div", { className: "hotel-detail-table" });
  const header = createElement("div", { className: "hotel-detail-table-row is-header" });
  const selectableReservations = group.reservations;
  const selectAll = createElement("input", { type: "checkbox" });
  selectAll.checked = selectableReservations.length > 0 && selectableReservations.every((reservation) => {
    return hotelHomeState.selectedReservationIds.includes(reservation.id);
  });
  selectAll.addEventListener("change", () => {
    const keptIds = hotelHomeState.selectedReservationIds.filter((reservationId) => {
      return !selectableReservations.some((reservation) => reservation.id === reservationId);
    });
    hotelHomeState.selectedReservationIds = selectAll.checked
      ? [...keptIds, ...selectableReservations.map((reservation) => reservation.id)]
      : keptIds;
    rerender(hotelHomeState);
  });

  const checkboxCell = createElement("label", { className: "hotel-detail-checkbox-cell" });
  checkboxCell.append(selectAll);
  header.append(checkboxCell);

  const labels = group.key === "staying"
    ? ["상태", "반려견", "시간"]
    : ["정산", "반려견", "시간"];
  labels.forEach((labelText) => {
    header.append(createElement("strong", { textContent: labelText }));
  });
  header.append(createElement("span", { textContent: "" }));
  table.append(header);

  group.reservations.forEach((reservation) => {
    table.append(createWebReservationRow(hotelHomeState, reservation));
  });

  return table;
}

function createWebReservationRow(hotelHomeState, reservation) {
  const row = createElement("div", {
    className: "hotel-detail-table-row",
    dataset: {
      entityId: reservation.id,
      state: hotelHomeState.selectedReservationIds.includes(reservation.id) ? "selected" : "idle",
    },
  });

  const checkbox = createElement("input", { type: "checkbox" });
  checkbox.checked = hotelHomeState.selectedReservationIds.includes(reservation.id);
  checkbox.addEventListener("change", () => {
    hotelHomeState.selectedReservationIds = checkbox.checked
      ? [...hotelHomeState.selectedReservationIds, reservation.id]
      : hotelHomeState.selectedReservationIds.filter((reservationId) => reservationId !== reservation.id);
    rerender(hotelHomeState);
  });

  const checkboxCell = createElement("label", { className: "hotel-detail-checkbox-cell" });
  checkboxCell.append(checkbox);

  const petInfo = createElement("div", { className: "hotel-detail-pet-info" });
  petInfo.append(createElement("strong", { textContent: reservation.petName }));
  petInfo.append(createElement("span", { textContent: reservation.breed }));

  row.append(checkboxCell);
  row.append(createElement("span", {
    className: "hotel-detail-status",
    textContent: reservation.status,
    dataset: { state: getReservationStatusState(reservation.status) },
  }));
  row.append(petInfo);
  row.append(createElement("span", { textContent: reservation.time || "-" }));

  const more = createElement("button", {
    className: "tiny-icon-button",
    type: "button",
    ariaLabel: `${reservation.petName} 상세`,
    dataset: { action: "openReservationDetail", entityId: reservation.id },
  });
  more.append(createElement("img", { className: "button-icon", src: CHEVRON_RIGHT_ICON_PATH, alt: "" }));
  row.append(more);

  return row;
}

function createAppReservationSection(hotelHomeState) {
  const summary = getSelectedDateSummary(hotelHomeState);
  const filteredReservations = sortReservationsForApp(getFilteredReservationsByDate(hotelHomeState));
  const section = createElement("section", {
    className: "app-reservation-section",
    dataset: {
      area: "reservationSection",
      feature: "hotelHome",
      platform: "app",
      state: filteredReservations.length > 0 ? "list" : "empty",
    },
  });

  section.append(createAppReservationHeader(hotelHomeState, summary));

  if (filteredReservations.length === 0) {
    section.append(createAppEmptyState(hotelHomeState));
    return section;
  }

  const list = createElement("div", { className: "app-reservation-list", dataset: { area: "reservationList", feature: "hotelHome" } });
  filteredReservations.forEach((reservation) => {
    list.append(createAppReservationItem(reservation));
  });
  section.append(list);
  return section;
}

function createAppReservationHeader(hotelHomeState, summary) {
  const header = createElement("div", { className: "app-reservation-header" });
  const title = createElement("div", { className: "app-reservation-title" });
  title.append(createElement("span", { textContent: summary.dateText || getFallbackAppDate(hotelHomeState) }));
  title.append(createElement("strong", { textContent: `총 숙박 ${summary.reservationCount}` }));

  const tabs = createElement("div", { className: "hotel-app-filter-tabs", dataset: { area: "filterTabs" } });
  FILTER_OPTIONS.forEach((filterOption) => {
    const button = createElement("button", {
      className: hotelHomeState.activeFilters.includes(filterOption.key) ? "hotel-app-filter-tab is-selected" : "hotel-app-filter-tab",
      type: "button",
      textContent: filterOption.label,
      dataset: { action: "setFilter", state: hotelHomeState.activeFilters.includes(filterOption.key) ? "selected" : "idle" },
    });
    button.addEventListener("click", () => {
      hotelHomeState.activeFilters = toggleFilterSelection(hotelHomeState.activeFilters, filterOption.key);
      rerender(hotelHomeState);
    });
    tabs.append(button);
  });

  header.append(title);
  header.append(tabs);
  return header;
}

function toggleFilterSelection(activeFilters, filterKey) {
  if (activeFilters.includes(filterKey)) {
    return activeFilters.filter((value) => value !== filterKey);
  }

  return [...activeFilters, filterKey];
}

function createAppReservationItem(reservation) {
  const article = createElement("article", {
    className: "app-reservation-item",
    dataset: { feature: "hotelHome", entityId: reservation.id, state: reservation.type },
  });

  const movement = createElement("div", { className: "app-reservation-movement" });
  if (reservation.type === "checkin") {
    movement.append(createElement("img", { src: CHECKIN_ICON_PATH, alt: "" }));
    movement.append(createElement("span", { textContent: `입실 ${reservation.time}` }));
  } else if (reservation.type === "checkout") {
    movement.append(createElement("img", { src: CHECKOUT_ICON_PATH, alt: "" }));
    movement.append(createElement("span", { textContent: `퇴실 ${reservation.time}` }));
  } else {
    movement.append(createElement("span", { textContent: "숙박" }));
  }

  const info = createElement("div", { className: "app-reservation-info" });
  info.append(createElement("strong", { textContent: reservation.petName }));
  info.append(createElement("span", { textContent: reservation.breed }));

  const more = createElement("button", {
    className: "tiny-icon-button",
    type: "button",
    ariaLabel: `${reservation.petName} 상세`,
    dataset: { action: "openReservationDetail", entityId: reservation.id },
  });
  more.append(createElement("img", { className: "button-icon", src: CHEVRON_RIGHT_ICON_PATH, alt: "" }));

  article.append(movement);
  article.append(info);
  article.append(more);
  return article;
}

function createAppModeMenu(items) {
  const menu = createElement("div", {
    className: "hotel-app-mode-menu",
    dataset: { area: "modeMenu" },
  });

  items.forEach((item) => {
    const button = createElement("button", {
      className: item.selected ? "hotel-app-mode-option is-selected" : "hotel-app-mode-option",
      type: "button",
      textContent: item.label,
      dataset: { action: "switchMode", state: item.selected ? "selected" : "idle" },
    });
    button.addEventListener("click", () => {
      if (item.href) {
        window.location.href = item.href;
      }
    });
    menu.append(button);
  });

  return menu;
}

function createReservationSearchAppScreen(hotelHomeState) {
  const screen = createElement("section", {
    className: "app-reservation-search-screen",
    dataset: { area: "reservationSearchScreen", platform: "app", service: "hotel" },
  });
  screen.append(createReservationSearchAppHeader(hotelHomeState, "호텔링 예약 검색"));
  screen.append(createReservationSearchFilter(hotelHomeState, {
    className: "reservation-search-filter app-reservation-search-filter",
    searchFieldClassName: "filter-field filter-search-field reservation-search-field member-search-suggestion-field app-reservation-search-field",
    searchInputClassName: "filter-search-input reservation-search-input app-reservation-search-input",
    searchInputSelector: ".app-reservation-search-screen .reservation-search-input",
    tagFilterPresentation: "bottomSheet",
    tagSearchInputSelector: ".reservation-tag-bottom-sheet .member-tag-search-input",
    placeholder: "예약자 / 반려견 검색",
    rerender,
    onSearchInput: (state) => {
      rerender(state);
    },
  }));
  screen.append(createReservationSearchResultList(
    getFilteredReservationSearchResults(hotelHomeState),
    "hotelHome"
  ));
  return screen;
}

function createReservationSearchAppHeader(hotelHomeState, titleText) {
  const header = createElement("header", { className: "app-reservation-search-header" });
  const backButton = createHeaderIconButton(CHEVRON_LEFT_ICON_PATH, "뒤로");
  backButton.addEventListener("click", () => {
    hotelHomeState.isReservationSearchScreenOpen = false;
    hotelHomeState.isReservationSearchMenuOpen = false;
    hotelHomeState.isTagMenuOpen = false;
    rerender(hotelHomeState);
  });
  header.append(backButton);
  header.append(createElement("h1", { textContent: titleText }));
  header.append(createElement("span", { className: "header-spacer" }));
  return header;
}

function createReservationSearchResultList(reservations, featureName) {
  const list = createElement("section", {
    className: "app-reservation-search-results",
    dataset: { area: "reservationSearchResults", feature: featureName, state: reservations.length ? "list" : "empty" },
  });

  if (!reservations.length) {
    list.append(createEmptyStateElement({ title: "조건과 일치하는 결과가 없습니다." }));
    return list;
  }

  reservations.forEach((reservation) => {
    list.append(createReservationSearchResultItem(reservation, featureName));
  });
  return list;
}

function createReservationSearchResultItem(reservation, featureName) {
  const item = createElement("article", {
    className: "app-reservation-search-item",
    dataset: { entity: "reservation", entityId: reservation.id, feature: featureName, state: reservation.type },
  });
  const row = createElement("div", { className: "app-reservation-search-item-main" });
  row.append(createElement("strong", { textContent: reservation.petName || "-" }));
  row.append(createElement("span", {
    textContent: [reservation.breed || "-", reservation.weight || "-kg", reservation.guardianName || "-"].join(" / "),
  }));
  const more = createElement("button", {
    className: "tiny-icon-button",
    type: "button",
    ariaLabel: `${reservation.petName || "예약"} 상세`,
    dataset: { action: "openReservationDetail", entityId: reservation.id },
  });
  more.append(createElement("img", { className: "button-icon", src: CHEVRON_RIGHT_ICON_PATH, alt: "" }));
  row.append(more);
  item.append(row);
  item.append(createElement("span", {
    className: "app-reservation-search-date",
    textContent: `${formatReservationSearchDate(reservation.date)} 예약`,
  }));
  return item;
}

function getFilteredReservationSearchResults(hotelHomeState) {
  const searchTerm = normalizeReservationSearchText(hotelHomeState.searchTerm);
  return [...(hotelHomeState.reservations || [])]
    .filter((reservation) => {
      if (!searchTerm) {
        return true;
      }
      return [reservation.guardianName, reservation.petName].some((fieldValue) => {
        return normalizeReservationSearchText(fieldValue).includes(searchTerm);
      });
    })
    .filter((reservation) => {
      if (!hotelHomeState.selectedMemberTagNames?.length) {
        return true;
      }
      const reservationTags = [...(reservation.ownerTags || []), ...(reservation.petTags || [])];
      return hotelHomeState.selectedMemberTagNames.every((memberTagName) => reservationTags.includes(memberTagName));
    })
    .sort((leftReservation, rightReservation) => String(leftReservation.date || "").localeCompare(String(rightReservation.date || "")));
}

function formatReservationSearchDate(dateText) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekdays[date.getDay()]})`;
}

function normalizeReservationSearchText(value) {
  return String(value || "").trim().toLowerCase();
}
function createMonthMoveButton(direction, hotelHomeState, label) {
  const button = createElement("button", {
    className: "month-move-button",
    type: "button",
    ariaLabel: label,
    dataset: { action: "moveMonth", direction },
  });
  button.append(createElement("img", {
    className: "button-icon month-move-icon",
    src: direction === "prev" ? CHEVRON_LEFT_ICON_PATH : CHEVRON_RIGHT_ICON_PATH,
    alt: "",
  }));
  button.addEventListener("click", () => {
    const nextMonth = shiftMonth(hotelHomeState.currentMonth, direction === "prev" ? -1 : 1);
    hotelHomeState.currentMonth = nextMonth;
    hotelHomeState.selectedDate = "";
    hotelHomeState.isDetailPanelOpen = false;
    hotelHomeState.selectedReservationIds = [];
    rerender(hotelHomeState);
  });
  return button;
}

function createHeaderIconButton(iconPath, label) {
  const button = createElement("button", {
    className: "icon-button header-icon-button",
    type: "button",
    ariaLabel: label,
    dataset: { action: HEADER_ICON_ACTIONS[label] || "openHeaderAction" },
  });
  button.append(createElement("img", { className: "button-icon", src: iconPath, alt: "" }));
  if (label === "설정") {
    button.addEventListener("click", () => {
      window.location.href = "./center-settings/business-schedule.html";
    });
  }
  return button;
}

function createGroupBadge(label, count) {
  const badge = createElement("div", { className: "hotel-group-badge" });
  badge.append(createElement("span", { textContent: label }));
  badge.append(createElement("strong", { textContent: String(count) }));
  return badge;
}

function createDetailEmptyState(hotelHomeState) {
  const emptyState = createEmptyStateElement({
    title: hasActiveReservationFilters(hotelHomeState) ? "조건과 일치하는 결과가 없습니다." : "등록된 예약이 없습니다.",
  });
  emptyState.className = "empty-state hotel-detail-empty-state";
  return emptyState;
}

function createAppEmptyState(hotelHomeState) {
  const state = createElement("div", {
    className: "hotel-app-empty-state",
    dataset: { state: "empty" },
  });
  state.append(createElement("p", {
    textContent: hasActiveReservationFilters(hotelHomeState) ? "조건과 일치하는 결과가 없습니다." : "등록된 예약이 없습니다.",
  }));
  return state;
}

function hasActiveReservationFilters(hotelHomeState) {
  return Boolean(
    String(hotelHomeState.searchTerm || "").trim()
    || (hotelHomeState.selectedMemberTagNames || []).length
    || (hotelHomeState.activeFilters || []).length !== FILTER_OPTIONS.length
  );
}

function getSelectedReservationCount(hotelHomeState) {
  return hotelHomeState.selectedReservationIds.length;
}

function getReservationStatusState(status) {
  return String(status || "").trim() === "완료" ? "complete" : "pending";
}

function getCapacityCount(hotelHomeState) {
  const monthDate = createMonthDate(hotelHomeState.currentMonth);
  return monthDate.getMonth() === 6 ? 12 : 12;
}

function getWebContentState(hotelHomeState) {
  if (!hotelHomeState.selectedDate) {
    return getReservationsByDate(hotelHomeState.reservations, "2025-07-02").length > 0 ? "reserved" : "empty";
  }

  return getReservationsByDate(hotelHomeState.reservations, hotelHomeState.selectedDate).length > 0 ? "detailList" : "detailEmpty";
}

function getFallbackAppDate(hotelHomeState) {
  const fallbackDate = hotelHomeState.selectedDate || getDateKey(new Date(2025, 6, 2));
  const date = new Date(fallbackDate);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}


