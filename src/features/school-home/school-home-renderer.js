import { createEmptyStateElement } from "../../components/empty-state.js";
import { createBusinessNavigation, createDefaultAppBottomNavigation } from "../../components/navigation.js";
import { createReservationSearchFilter } from "../../components/reservation-search-filter.js";
import { createWebHeaderActions } from "../../components/web-header-actions.js";
import { createSchoolClassSnapshot, getSchoolClassCapacityTotal, loadSchoolClassList } from "../../storage/class-storage.js";
import { addMemberPetToSchoolClass, getMemberPetRows, saveStoredMembers } from "../../storage/member-storage.js";
import { appendStoredSchoolReservations, createSchoolReservationId, getSchoolHomeInitialView, saveStoredSchoolReservations } from "../../storage/school-home-storage.js";
import { applySchoolReservationCancellation, applySchoolReservationRegistration, isActiveSchoolReservation, settlePastSchoolReservations } from "../../services/school-reservation-count-service.js";
import { createElement } from "../../utils/dom.js";
import { bindImeAwareInput } from "../../utils/ime-input.js";
import {
  createReservationRegistrationState,
  getCalendarMatrix,
  getTodayDateKey,
  getMonthLabel,
  getFilteredReservationsByDate,
  getSelectedDateSummary,
  shiftMonth,
} from "./school-home-state.js";

const DEFAULT_PROFILE_IMAGE = "assets/images/defaultProfile_dog.svg";
const DAYCARE_ICON_PATH = "assets/icons/menuIcon_daycare_on.svg";
const SETTING_ICON_PATH = "assets/icons/menuIcon_setting.svg";
const ALARM_ICON_PATH = "assets/icons/iconTime.svg";
const PROFILE_ICON_PATH = "assets/icons/menuIcon_profile.svg";
const SEARCH_ICON_PATH = "assets/icons/searchIcon.svg";
const CHEVRON_LEFT_ICON_PATH = "assets/icons/iconChevronLeft.svg";
const CHEVRON_RIGHT_ICON_PATH = "assets/icons/iconChevronRight.svg";
const CLOSE_ICON_PATH = "assets/icons/iconClose.svg";
const DAYOFF_ICON_PATH = "assets/icons/iconDayoff.svg";
const CALENDAR_ICON_PATH = "assets/icons/iconCalendar.svg";
const CHECK_ICON_PATH = "assets/icons/iconCheck.svg";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const OTHER_CLASS_GROUP_ID = "__other__";
const OTHER_CLASS_LABEL = "기타";
const DELETED_CLASS_GROUP_PREFIX = "deleted-class:";
const REGISTRATION_CLASS_WEEKDAYS = [
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
  { key: "sat", label: "토" },
  { key: "sun", label: "일" },
];
const HEADER_ICON_ACTIONS = {
  설정: "openSettings",
  알림: "openNotifications",
  계정: "openProfile",
  검색: "openSearch",
};

export function renderSchoolHome(rootElement, schoolHomeState) {
  settlePastReservationUsage(schoolHomeState);
  rootElement.innerHTML = "";
  rootElement.append(createSchoolHomeScreen(schoolHomeState));
}

function settlePastReservationUsage(schoolHomeState) {
  const settledReservationUsage = settlePastSchoolReservations({
    members: schoolHomeState.members,
    reservations: schoolHomeState.reservations,
    todayDateKey: getTodayDateKey(),
  });

  if (!settledReservationUsage.hasChanges) {
    return;
  }

  schoolHomeState.members = settledReservationUsage.members;
  schoolHomeState.reservations = settledReservationUsage.reservations;
  saveStoredMembers(schoolHomeState.members);
  saveStoredSchoolReservations(schoolHomeState.reservations);
}

function rerender(schoolHomeState) {
  renderSchoolHome(document.querySelector("#app"), schoolHomeState);
}

function createSchoolHomeScreen(schoolHomeState) {
  const screen = createElement("main", {
    className: "school-home-screen",
    dataset: { screen: "schoolHome" },
  });
  screen.append(createSchoolHomeWebShell(schoolHomeState));
  screen.append(schoolHomeState.isReservationSearchScreenOpen
    ? createReservationSearchAppScreen(schoolHomeState)
    : createSchoolHomeAppShell(schoolHomeState));
  if (schoolHomeState.reservationRegistration?.isOpen) {
    screen.append(createReservationRegistrationModal(schoolHomeState));
  }
  if (schoolHomeState.isReservationCancelAlertOpen) {
    screen.append(createReservationCancelAlert({
      onClose: () => {
        schoolHomeState.isReservationCancelAlertOpen = false;
        rerender(schoolHomeState);
      },
      onConfirm: () => {
        schoolHomeState.isReservationCancelAlertOpen = false;
        cancelSelectedWebReservations(schoolHomeState);
      },
    }));
  }
  return screen;
}

function createSchoolHomeWebShell(schoolHomeState) {
  const shell = createElement("section", {
    className: "school-home-web-shell",
    dataset: { area: "schoolHomeWeb" },
  });
  shell.append(createWebHeader());

  const content = createElement("div", { className: "school-home-web-layout" });
  content.append(createSchoolNavigation("web"));
  content.append(createSchoolWebContent(schoolHomeState));
  shell.append(content);
  return shell;
}

function createWebHeader() {
  const header = createElement("header", {
    className: "web-global-header",
    dataset: { area: "header" },
  });

  header.append(createElement("strong", { className: "brand-name", textContent: "다이얼독 비즈" }));
  header.append(createElement("h1", { textContent: "유치원" }));
  header.append(createWebHeaderActions());

  return header;
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

function createSchoolNavigation(platform) {
  return createBusinessNavigation({
    className: platform === "web" ? "business-navigation school-navigation web" : "school-navigation app",
    dataset: { area: "navigation", platform },
    profile: {
      imageSrc: DEFAULT_PROFILE_IMAGE,
      title: "다이얼독",
      subtitle: "애견유치원",
    },
    footerText: "개인정보 처리방침  이용약관  문의",
    items: [
      { label: "대시보드", href: "./index.html" },
      { label: "유치원", selected: true, href: "./index.html" },
      { label: "호텔링" },
      { label: "알림장", href: "./report.html" },
      { label: "회원", href: "./member-home.html" },
      { label: "이용권" }
    ]
  });
}
function createSchoolWebContent(schoolHomeState) {
  const content = createElement("section", {
    className: "content",
    dataset: { area: "content", feature: "schoolHome", platform: "web" },
  });
  const titleBar = createElement("div", { className: "school-web-title-bar" });
  const titleGroup = createElement("div", { className: "school-web-title-group" });
  titleGroup.append(createElement("h1", { textContent: "유치원" }));
  titleGroup.append(createSchoolClassFilterBar(schoolHomeState));
  titleBar.append(titleGroup);

  const actions = createElement("div", { className: "school-web-title-actions" });
  const registerButton = createElement("button", {
    className: "primary-button school-register-button",
    type: "button",
    textContent: "예약 등록",
    dataset: { action: "openReservationRegistration" },
  });
  registerButton.addEventListener("click", () => {
    openReservationRegistrationModal(schoolHomeState);
  });
  actions.append(registerButton);
  titleBar.append(actions);

  const sectionGroup = createElement("div", { className: "web-sections", dataset: { area: "webSections", feature: "schoolHome" } });
  sectionGroup.append(createSchoolCalendarPanel(schoolHomeState, "web"));
  sectionGroup.append(createSchoolReservationPanel(schoolHomeState, "web"));

  content.append(titleBar);
  content.append(sectionGroup);
  return content;
}

function createSchoolClassFilterBar(schoolHomeState) {
  const classList = loadSchoolClassList();
  const bar = createElement("section", {
    className: "school-class-filter-bar",
    dataset: { area: "schoolClassFilter", state: schoolHomeState.selectedSchoolClassId ? "filtered" : "all" },
  });

  const list = createElement("div", { className: "school-class-filter-list" });
  list.append(createSchoolClassFilterButton(schoolHomeState, { id: "", name: "전체" }));

  classList.forEach((schoolClass) => {
    list.append(createSchoolClassFilterButton(schoolHomeState, {
      id: schoolClass.id,
      name: schoolClass.name || "-",
    }));
  });

  bar.append(list);
  return bar;
}

function createSchoolClassFilterButton(schoolHomeState, schoolClass) {
  const isSelected = schoolHomeState.selectedSchoolClassId === schoolClass.id;
  const button = createElement("button", {
    className: isSelected ? "school-class-filter-button is-selected" : "school-class-filter-button",
    type: "button",
    dataset: {
      action: "filterSchoolClass",
      entityId: schoolClass.id || "all",
      state: isSelected ? "selected" : "idle",
    },
  });
  button.append(createElement("span", { textContent: schoolClass.name }));
  button.addEventListener("click", () => {
    schoolHomeState.selectedSchoolClassId = schoolClass.id;
    schoolHomeState.selectedReservationIds = [];
    rerender(schoolHomeState);
  });
  return button;
}

function createSchoolCalendarPanel(schoolHomeState, platform) {
  const panel = createElement("section", {
    className: "calendar-panel",
    dataset: { area: "calendarPanel", feature: "schoolHome", platform },
  });
  panel.append(createCalendarHeader(schoolHomeState, platform));
  panel.append(createCalendarGrid(schoolHomeState, platform));
  return panel;
}

function createCalendarHeader(schoolHomeState, platform) {
  const header = createElement("div", {
    className: "calendar-header",
    dataset: { area: "calendarHeader", feature: "schoolHome", platform },
  });

  if (platform === "web") {
    const left = createElement("div", { className: "calendar-controls" });
    left.append(createMonthMoveButton("prev", schoolHomeState, "이전 달"));
    left.append(createElement("strong", { className: "calendar-month-label", textContent: getMonthLabel(schoolHomeState.currentMonth) }));
    left.append(createMonthMoveButton("next", schoolHomeState, "다음 달"));

    const todayButton = createElement("button", {
      className: "calendar-today-button",
      type: "button",
      textContent: "오늘",
    });
    todayButton.addEventListener("click", () => {
      resetToInitialView(schoolHomeState);
    });
    left.append(todayButton);
    header.append(left);

    header.append(createReservationSearchFilter(schoolHomeState, {
      className: "reservation-search-filter calendar-search-filter",
      searchInputClassName: "filter-search-input reservation-search-input calendar-search-input",
      rerender,
      onSearchInput: (state) => {
        rerender(state);
      },
    }));
    return header;
  }

  const controls = createElement("div", { className: "calendar-controls", dataset: { platform: "app" } });
  controls.append(createMonthMoveButton("prev", schoolHomeState, "이전 달"));
  controls.append(createElement("strong", { className: "calendar-month-label", textContent: getMonthLabel(schoolHomeState.currentMonth) }));
  controls.append(createMonthMoveButton("next", schoolHomeState, "다음 달"));
  header.append(controls);
  return header;
}

function createAppHeader(schoolHomeState) {
  const header = createElement("header", {
    className: "school-app-header",
    dataset: { area: "header", platform: "app" },
  });

  const searchButton = createHeaderIconButton(SEARCH_ICON_PATH, "검색");
  searchButton.addEventListener("click", () => {
    schoolHomeState.isReservationSearchScreenOpen = true;
    schoolHomeState.isReservationSearchMenuOpen = false;
    rerender(schoolHomeState);
  });
  const appHeaderRow = createElement("div", { className: "school-app-header-row" });
  const left = createElement("div", { className: "school-app-nav-left" });
  const iconBox = createElement("div", { className: "school-app-nav-icon-box" });
  iconBox.append(createElement("img", { src: DAYCARE_ICON_PATH, alt: "" }));
  left.append(iconBox);
  const title = createElement("div", { className: "school-app-nav-title" });
  const titleRow = createElement("button", {
    className: "school-app-header-title-row",
    type: "button",
    ariaLabel: "모드 전환",
  });
  titleRow.append(createElement("strong", { textContent: "유치원" }));
  titleRow.append(createElement("img", { src: "assets/icons/iconDropdown.svg", alt: "" }));
  titleRow.addEventListener("click", () => {
    schoolHomeState.isModeMenuOpen = !schoolHomeState.isModeMenuOpen;
    rerender(schoolHomeState);
  });
  title.append(titleRow);
  title.append(createElement("span", { textContent: `정원 ${getSchoolCapacityCount()}` }));
  if (schoolHomeState.isModeMenuOpen) {
    title.append(createAppModeMenu([
      { label: "유치원", href: "./index.html", selected: true },
    ]));
  }
  left.append(title);

  const utility = createElement("div", { className: "school-app-nav-actions" });
  const registerButton = createElement("button", {
    className: "primary-button school-app-register-button",
    type: "button",
    textContent: "예약 등록",
  });
  registerButton.addEventListener("click", () => {
    window.location.href = "./school-reservation-create.html";
  });
  utility.append(registerButton);
  utility.append(searchButton);

  appHeaderRow.append(left);
  appHeaderRow.append(utility);
  header.append(appHeaderRow);
  return header;
}

function createMonthMoveButton(direction, schoolHomeState, label) {
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
    const nextMonth = shiftMonth(schoolHomeState.currentMonth, direction === "prev" ? -1 : 1);
    schoolHomeState.currentMonth = nextMonth;
    schoolHomeState.selectedDate = `${nextMonth}-01`;
    schoolHomeState.selectedReservationIds = [];
    rerender(schoolHomeState);
  });
  return button;
}

function createCalendarGrid(schoolHomeState, platform) {
  const matrix = getCalendarMatrix(schoolHomeState.currentMonth);
  const grid = createElement("section", {
    className: "calendar-grid",
    dataset: { area: "calendarGrid", feature: "schoolHome", platform },
  });

  const weekHeader = createElement("div", { className: "calendar-weekdays" });
  ["일", "월", "화", "수", "목", "금", "토"].forEach((dayLabel, dayIndex) => {
    weekHeader.append(createElement("span", {
      className: dayIndex === 0 || dayIndex === 6 ? "calendar-weekday is-weekend" : "calendar-weekday",
      textContent: dayLabel,
    }));
  });
  grid.append(weekHeader);

  const body = createElement("div", { className: "calendar-body" });
  matrix.forEach((week) => {
    const row = createElement("div", { className: "calendar-row" });
    week.forEach((cell) => {
      row.append(createCalendarDateButton(schoolHomeState, cell, platform));
    });
    body.append(row);
  });
  grid.append(body);
  return grid;
}

function createCalendarDateButton(schoolHomeState, cell, platform) {
  const reservations = getFilteredReservationsByDate(schoolHomeState, cell.dateKey);
  const activeReservations = reservations.filter(isActiveSchoolReservation);
  const reservationCount = activeReservations.length;
  const isSelected = cell.dateKey === schoolHomeState.selectedDate;
  const hasReservations = reservationCount > 0;
  const classNames = [
    "calendar-date",
    cell.isCurrentMonth ? "" : "is-muted",
    isSelected ? "is-selected" : "",
    cell.isHoliday ? "is-holiday" : "",
    hasReservations ? "has-reservations" : "",
  ].filter(Boolean).join(" ");
  const button = createElement("button", {
    className: classNames,
    type: "button",
    dataset: {
      action: "selectSchoolDate",
      entityId: cell.dateKey,
      state: getCalendarDateState({ isSelected, isHoliday: cell.isHoliday, hasReservations }),
    },
  });

  if (platform === "web") {
    button.append(...createWebCalendarDateContent(schoolHomeState, cell.dayNumber, activeReservations, cell.isHoliday));
  } else {
    button.append(...createAppCalendarDateContent(cell.dayNumber, reservationCount, getSchoolCapacityCount(), cell.isHoliday));
  }

  button.addEventListener("click", () => {
    schoolHomeState.currentMonth = `${cell.dateKey.slice(0, 7)}`;
    schoolHomeState.selectedDate = cell.dateKey;
    schoolHomeState.selectedReservationIds = [];
    rerender(schoolHomeState);
  });

  return button;
}

function createWebCalendarDateContent(schoolHomeState, dayNumber, reservations, isHoliday) {
  const reservationCount = reservations.length;
  const content = [];
  const dateBox = createElement("span", { className: "calendar-date-box" });
  dateBox.append(createElement("span", { className: "calendar-date-number", textContent: String(dayNumber) }));
  if (isHoliday) {
    dateBox.append(createElement("span", {
      className: "calendar-date-holiday is-holiday",
      textContent: "휴무",
    }));
  }
  content.push(dateBox);

  if (reservationCount > 0) {
    content.push(createCalendarClassSummary(schoolHomeState, reservations));
  }

  return content;
}

function createCalendarClassSummary(schoolHomeState, reservations) {
  const summary = createElement("span", {
    className: "calendar-meta calendar-class-summary",
  });

  if (schoolHomeState.selectedSchoolClassId) {
    const hasClassDefinition = hasSchoolClassDefinition(schoolHomeState.selectedSchoolClassId);
    summary.append(createCalendarClassCountBadge({
      name: hasClassDefinition ? getClassNameById(schoolHomeState.selectedSchoolClassId) : OTHER_CLASS_LABEL,
      count: reservations.length,
      hasClassDefinition,
      isClosed: hasClassDefinition && isClassCapacityClosed(schoolHomeState.selectedSchoolClassId, reservations.length),
    }));
    return summary;
  }

  getReservationClassGroups(reservations).slice(0, 3).forEach((classGroup) => {
    summary.append(createCalendarClassCountBadge(classGroup));
  });
  return summary;
}

function createCalendarClassCountBadge(classGroup) {
  const badge = createElement("span", {
    className: classGroup.isClosed ? "calendar-class-count is-closed" : "calendar-class-count",
  });
  badge.append(createElement("span", {
    textContent: `${classGroup.name} ${classGroup.count}`,
  }));
  return badge;
}

function createAppCalendarDateContent(dayNumber, reservationCount, capacityCount, isHoliday = false) {
  const content = [];
  const dateBox = createElement("span", { className: "calendar-date-box", dataset: { platform: "app" } });
  dateBox.append(createElement("span", { className: "calendar-date-number", textContent: String(dayNumber) }));
  if (isHoliday) {
    dateBox.append(createElement("span", {
      className: "calendar-date-holiday is-holiday",
      textContent: "휴무",
    }));
  }
  content.push(dateBox);

  content.push(createElement("span", {
    className: "calendar-capacity-text",
    textContent: `${reservationCount}/${capacityCount}`,
  }));
  return content;
}

function getCalendarDateState({ isSelected, isHoliday, hasReservations }) {
  if (isSelected) {
    return "selected";
  }

  if (isHoliday && hasReservations) {
    return "holidayReserved";
  }

  if (hasReservations) {
    return "reserved";
  }

  if (isHoliday) {
    return "holiday";
  }

  return "idle";
}

function createSchoolReservationPanel(schoolHomeState, platform) {
  const summary = getSelectedDateSummary(schoolHomeState);
  const panel = createElement("section", {
    className: platform === "web" ? "school-reservation-panel web" : "school-reservation-panel app",
    dataset: {
      area: "reservationPanel",
      platform,
      state: summary.isHoliday && !summary.hasReservations ? "holiday" : summary.reservations.length > 0 ? "list" : "empty",
    },
  });

  if (platform === "web") {
    const header = createElement("div", { className: "school-reservation-panel-header" });
    const title = createElement("div", { className: "school-reservation-title" });
    const titleRow = createElement("div", { className: "school-reservation-title-row" });
    titleRow.append(createElement("span", { textContent: summary.dateText }));
    title.append(titleRow);
    title.append(createElement("strong", {
      className: summary.isHoliday ? "school-reservation-count is-holiday" : "school-reservation-count",
      textContent: summary.isHoliday ? "휴무" : `예약 ${summary.reservationCount}`,
    }));
    header.append(title);
    const actions = createElement("div", { className: "school-reservation-panel-actions" });
    actions.append(createHideCanceledReservationsToggle(schoolHomeState));
    const cancelButton = createElement("button", {
      className: "school-reservation-cancel-button",
      type: "button",
      textContent: "예약 취소",
    });
    cancelButton.disabled = getCancelableSelectedReservationIds(schoolHomeState).length === 0;
    cancelButton.addEventListener("click", () => {
      schoolHomeState.isReservationCancelAlertOpen = true;
      rerender(schoolHomeState);
    });
    actions.append(cancelButton);
    header.append(actions);
    panel.append(header);
    panel.append(createWebReservationBody(schoolHomeState, summary));
    return panel;
  }

  const content = createElement("div", { className: "school-app-sheet" });
  const title = createElement("div", { className: "school-app-sheet-title" });
  title.append(createElement("span", { textContent: summary.dateText }));
  title.append(createElement("strong", {
    className: summary.isHoliday ? "school-reservation-count is-holiday" : "school-reservation-count",
    textContent: summary.isHoliday ? "휴무" : `예약 ${summary.reservationCount}`,
  }));
  content.append(title);
  const appCancelButton = createElement("button", {
    className: "school-reservation-cancel-button",
    type: "button",
    textContent: "예약 취소",
  });
  appCancelButton.addEventListener("click", () => {
    schoolHomeState.isReservationCancelAlertOpen = true;
    rerender(schoolHomeState);
  });
  content.append(appCancelButton);
  const activeClassId = getActiveAppClassTabId(schoolHomeState, summary);
  content.append(createAppClassTabs(schoolHomeState, summary, activeClassId));
  content.append(createAppReservationBody(schoolHomeState, summary, getAppReservationsForActiveClass(summary, activeClassId)));
  panel.append(content);
  return panel;
}

function createWebReservationBody(schoolHomeState, summary) {
  const visibleReservations = getVisibleWebReservations(schoolHomeState, summary.reservations);
  const cancelableReservations = visibleReservations.filter((reservation) => !isCanceledReservation(reservation));

  if (summary.isHoliday && !summary.hasReservations) {
    return createHolidayEmptyState("일요일은 휴무입니다.", "휴무 확인용 상태입니다.");
  }

  if (visibleReservations.length === 0 && hasActiveReservationFilters(schoolHomeState)) {
    return createEmptyStateElement({
      title: "조건과 일치하는 결과가 없습니다.",
    });
  }

  const wrapper = createElement("div", { className: "school-reservation-table-wrapper" });
  const table = createElement("div", { className: "school-reservation-table" });
  const header = createElement("div", { className: "school-reservation-table-row is-header" });
  const allCheckbox = createElement("input", { type: "checkbox" });
  allCheckbox.disabled = cancelableReservations.length === 0;
  allCheckbox.checked = cancelableReservations.length > 0 && cancelableReservations.every((reservation) => {
    return schoolHomeState.selectedReservationIds.includes(reservation.id);
  });
  allCheckbox.addEventListener("change", () => {
    schoolHomeState.selectedReservationIds = allCheckbox.checked ? cancelableReservations.map((reservation) => reservation.id) : [];
    rerender(schoolHomeState);
  });
  const checkboxCell = createElement("label", { className: "school-reservation-checkbox-cell" });
  checkboxCell.append(allCheckbox);
  header.append(checkboxCell);
  ["상태", "클래스", "반려견", "견종", "보호자"].forEach((labelText) => {
    header.append(createElement("strong", { textContent: labelText }));
  });
  table.append(header);

  if (visibleReservations.length === 0) {
    table.append(createWebReservationPlaceholderRow(hasActiveReservationFilters(schoolHomeState)));
  } else {
    visibleReservations.forEach((reservation) => {
      table.append(createWebReservationRow(schoolHomeState, reservation));
    });
  }

  wrapper.append(table);
  return wrapper;
}

function createWebReservationPlaceholderRow(isFilteredEmpty = false) {
  const row = createElement("div", {
    className: "school-reservation-table-row school-reservation-table-placeholder-row",
    dataset: { state: "empty" },
  });
  row.append(createElement("span", {
    className: "school-reservation-table-placeholder",
    textContent: isFilteredEmpty ? "조건과 일치하는 결과가 없습니다." : "등록된 예약이 없습니다.",
  }));
  return row;
}

function createHideCanceledReservationsToggle(schoolHomeState) {
  const label = createElement("label", {
    className: "school-reservation-hide-canceled-toggle",
    dataset: {
      action: "toggleCanceledReservations",
      state: schoolHomeState.shouldHideCanceledReservations ? "checked" : "unchecked",
    },
  });
  const checkbox = createElement("input", {
    type: "checkbox",
    dataset: { field: "hideCanceledReservations" },
  });
  checkbox.checked = schoolHomeState.shouldHideCanceledReservations;
  checkbox.addEventListener("change", () => {
    schoolHomeState.shouldHideCanceledReservations = checkbox.checked;
    schoolHomeState.selectedReservationIds = getCancelableSelectedReservationIds(schoolHomeState);
    rerender(schoolHomeState);
  });
  label.append(checkbox);
  label.append(createElement("span", { textContent: "취소 내역 숨기기" }));
  return label;
}

function getVisibleWebReservations(schoolHomeState, reservations) {
  if (!schoolHomeState.shouldHideCanceledReservations) {
    return reservations;
  }

  return reservations.filter((reservation) => !isCanceledReservation(reservation));
}

function getCancelableSelectedReservationIds(schoolHomeState) {
  const selectedReservationIds = new Set(schoolHomeState.selectedReservationIds || []);
  return (schoolHomeState.reservations || [])
    .filter((reservation) => selectedReservationIds.has(reservation.id) && !isCanceledReservation(reservation))
    .map((reservation) => reservation.id);
}

function cancelSelectedWebReservations(schoolHomeState) {
  const cancelableReservationIds = new Set(getCancelableSelectedReservationIds(schoolHomeState));
  if (cancelableReservationIds.size === 0) {
    return;
  }

  const reservationsToCancel = (schoolHomeState.reservations || []).filter((reservation) => {
    return cancelableReservationIds.has(reservation.id);
  });
  schoolHomeState.members = applySchoolReservationCancellation(schoolHomeState.members, reservationsToCancel);
  saveStoredMembers(schoolHomeState.members);
  schoolHomeState.reservations = (schoolHomeState.reservations || []).map((reservation) => {
    if (!cancelableReservationIds.has(reservation.id)) {
      return reservation;
    }

    return {
      ...reservation,
      status: "취소",
    };
  });
  schoolHomeState.selectedReservationIds = [];
  saveStoredSchoolReservations(schoolHomeState.reservations);
  rerender(schoolHomeState);
}

function isCanceledReservation(reservation) {
  return reservation?.status === "취소";
}

function createReservationCancelAlert({ onClose, onConfirm }) {
  const overlay = createElement("section", {
    className: "school-reservation-alert-overlay",
    dataset: { area: "reservationCancelAlert", modal: "reservationCancelAlert", state: "open" },
  });
  const alert = createElement("div", { className: "school-reservation-alert" });
  alert.append(createElement("p", {
    className: "school-reservation-alert-body",
    textContent: "예약을 삭제하시겠습니까?\n삭제된 예약은 복구할 수 없습니다.",
  }));

  const actions = createElement("div", { className: "school-reservation-alert-actions" });
  const closeButton = createElement("button", {
    className: "school-reservation-alert-close-button",
    type: "button",
    textContent: "닫기",
    dataset: { action: "closeReservationCancelAlert" },
  });
  closeButton.addEventListener("click", onClose);

  const confirmButton = createElement("button", {
    className: "school-reservation-alert-confirm-button",
    type: "button",
    textContent: "예약 취소",
    dataset: { action: "confirmReservationCancel" },
  });
  confirmButton.addEventListener("click", onConfirm);

  actions.append(closeButton, confirmButton);
  alert.append(actions);
  overlay.append(alert);
  return overlay;
}

function createWebReservationRow(schoolHomeState, reservation) {
  const isCanceled = isCanceledReservation(reservation);
  const row = createElement("div", {
    className: isCanceled ? "school-reservation-table-row is-canceled" : "school-reservation-table-row",
    dataset: {
      action: "selectReservationRow",
      entityId: reservation.id,
      state: isCanceled ? "canceled" : schoolHomeState.selectedReservationIds.includes(reservation.id) ? "selected" : "idle",
    },
  });
  const checkbox = createElement("input", { type: "checkbox" });
  const checkboxCell = createElement("label", { className: "school-reservation-checkbox-cell" });
  if (!isCanceled) {
    checkbox.checked = schoolHomeState.selectedReservationIds.includes(reservation.id);
    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    checkbox.addEventListener("change", () => {
      schoolHomeState.selectedReservationIds = checkbox.checked
        ? [...schoolHomeState.selectedReservationIds, reservation.id]
        : schoolHomeState.selectedReservationIds.filter((reservationId) => reservationId !== reservation.id);
      rerender(schoolHomeState);
    });
    checkboxCell.append(checkbox);
  }
  row.append(checkboxCell);
  row.append(createElement("span", { className: "school-reservation-status", textContent: reservation.status }));
  row.append(createWebReservationClassMenu(schoolHomeState, reservation));
  row.append(createElement("span", { textContent: reservation.petName }));
  row.append(createElement("span", { textContent: reservation.breed }));
  row.append(createElement("span", { textContent: reservation.guardianName }));
  return row;
}

function createWebReservationClassMenu(schoolHomeState, reservation) {
  const wrapper = createElement("span", {
    className: "school-reservation-class-menu",
    dataset: { entityId: reservation.id, state: schoolHomeState.activeClassMenuReservationId === reservation.id ? "open" : "closed" },
  });
  const button = createElement("button", {
    className: "school-reservation-class",
    type: "button",
    textContent: getReservationClassName(reservation),
    dataset: { action: "openReservationClassMenu", entityId: reservation.id },
  });
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    schoolHomeState.activeClassMenuReservationId = schoolHomeState.activeClassMenuReservationId === reservation.id ? "" : reservation.id;
    rerender(schoolHomeState);
  });
  wrapper.append(button);

  if (schoolHomeState.activeClassMenuReservationId === reservation.id) {
    const menu = createElement("div", {
      className: "school-reservation-class-options",
      dataset: { area: "reservationClassOptions", entityId: reservation.id },
    });
    menu.append(createWebReservationClassOption(schoolHomeState, reservation, null));
    loadSchoolClassList().forEach((schoolClass) => {
      menu.append(createWebReservationClassOption(schoolHomeState, reservation, schoolClass));
    });
    wrapper.append(menu);
  }

  return wrapper;
}

function createWebReservationClassOption(schoolHomeState, reservation, schoolClass) {
  const classId = schoolClass?.id || "";
  const isSelected = String(reservation.classId || "") === classId;
  const button = createElement("button", {
    className: isSelected ? "school-reservation-class-option is-selected" : "school-reservation-class-option",
    type: "button",
    textContent: schoolClass?.name || "미지정",
    dataset: {
      action: "selectReservationClass",
      entityId: reservation.id,
      classId,
      state: isSelected ? "selected" : "idle",
    },
  });
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    updateReservationClass(schoolHomeState, reservation.id, schoolClass);
  });
  return button;
}

function updateReservationClass(schoolHomeState, reservationId, schoolClass) {
  schoolHomeState.reservations = (schoolHomeState.reservations || []).map((reservation) => {
    if (reservation.id !== reservationId) {
      return reservation;
    }

    return {
      ...reservation,
      classId: schoolClass?.id || null,
      className: schoolClass?.name || "",
      classSnapshot: createSchoolClassSnapshot(schoolClass),
    };
  });
  schoolHomeState.activeClassMenuReservationId = "";
  saveStoredSchoolReservations(schoolHomeState.reservations);
  rerender(schoolHomeState);
}

function createAppClassTabs(schoolHomeState, summary, activeClassId) {
  const tabs = getAppClassTabs(summary);
  const list = createElement("div", {
    className: "school-app-class-tabs",
    dataset: { area: "classTabs", state: tabs.length ? "enabled" : "empty" },
  });

  tabs.forEach((tab) => {
    const isSelected = tab.id === activeClassId;
    const button = createElement("button", {
      className: isSelected ? "school-app-class-tab is-selected" : "school-app-class-tab",
      type: "button",
      dataset: {
        action: "selectClassTab",
        entityId: tab.id,
        state: isSelected ? "selected" : "idle",
      },
      ariaLabel: `${tab.name} ${tab.count}`,
    });
    button.append(createElement("span", { textContent: tab.name }));
    button.append(createElement("strong", { textContent: String(tab.count) }));
    button.addEventListener("click", () => {
      schoolHomeState.appSelectedSchoolClassId = tab.id;
      rerender(schoolHomeState);
    });
    list.append(button);
  });

  return list;
}

function createAppReservationBody(schoolHomeState, summary, reservations = summary.reservations) {
  if (summary.isHoliday && !summary.hasReservations) {
    return createHolidayEmptyState("일요일은 휴무입니다.", "휴무 확인용 상태입니다.");
  }

  if (reservations.length === 0) {
    return createEmptyStateElement({
      title: hasActiveReservationFilters(schoolHomeState) ? "조건과 일치하는 결과가 없습니다." : "등록된 예약이 없습니다.",
    });
  }

  const list = createElement("div", { className: "app-reservation-list", dataset: { feature: "schoolHome", state: "list" } });
  reservations.forEach((reservation) => {
    const item = createElement("article", { className: "app-reservation-item", dataset: { feature: "schoolHome", entityId: reservation.id } });
    item.append(createElement("strong", { textContent: reservation.petName }));
    item.append(createElement("span", { textContent: reservation.breed }));
    const more = createElement("button", {
      className: "tiny-icon-button",
      type: "button",
      ariaLabel: `${reservation.petName} 더보기`,
      dataset: { action: "openReservationDetail", entityId: reservation.id },
    });
    more.append(createElement("img", { className: "button-icon", src: CHEVRON_RIGHT_ICON_PATH, alt: "" }));
    more.addEventListener("click", () => {
      window.location.href = `./school-reservation-detail.html?id=${encodeURIComponent(reservation.id)}`;
    });
    item.append(more);
    list.append(item);
  });
  return list;
}

function getActiveAppClassTabId(schoolHomeState, summary) {
  const tabs = getAppClassTabs(summary);
  if (tabs.length === 0) {
    schoolHomeState.appSelectedSchoolClassId = "";
    return "";
  }

  const selectedClassId = String(schoolHomeState.appSelectedSchoolClassId || "");
  if (tabs.some((tab) => tab.id === selectedClassId)) {
    return selectedClassId;
  }

  schoolHomeState.appSelectedSchoolClassId = tabs[0].id;
  return tabs[0].id;
}

function getAppReservationsForActiveClass(summary, activeClassId) {
  const activeReservations = summary.activeReservations || [];
  if (!activeClassId) {
    return activeReservations;
  }

  return activeReservations.filter((reservation) => getReservationClassGroupId(reservation) === activeClassId);
}

function getAppClassTabs(summary) {
  const classList = loadSchoolClassList();
  const classNameById = new Map(classList.map((schoolClass) => [schoolClass.id, schoolClass.name || "-"]));
  const countsByClassId = new Map();

  (summary.activeReservations || []).forEach((reservation) => {
    const classId = getReservationClassGroupId(reservation);
    countsByClassId.set(classId, (countsByClassId.get(classId) || 0) + 1);
  });

  const classTabs = classList
    .map((schoolClass) => {
      const count = countsByClassId.get(schoolClass.id) || 0;
      return {
        id: schoolClass.id,
        name: schoolClass.name || "-",
        count,
      };
    })
    .filter((tab) => tab.count > 0);

  countsByClassId.forEach((count, classId) => {
    if (count <= 0 || classNameById.has(classId)) {
      return;
    }

    classTabs.push({
      id: classId,
      name: getReservationClassGroupName(summary.reservations, classId),
      count,
    });
  });

  return classTabs;
}

function getReservationClassGroupId(reservation) {
  const classId = String(reservation?.classId || "").trim();
  if (hasSchoolClassDefinition(classId)) {
    return classId;
  }

  const snapshotId = String(reservation?.classSnapshot?.id || "").trim();
  return snapshotId ? `${DELETED_CLASS_GROUP_PREFIX}${snapshotId}` : OTHER_CLASS_GROUP_ID;
}

function getReservationClassGroupName(reservations, groupId) {
  const reservation = (reservations || []).find((item) => getReservationClassGroupId(item) === groupId);
  return reservation ? getReservationClassName(reservation) : OTHER_CLASS_LABEL;
}

function hasActiveReservationFilters(schoolHomeState) {
  return Boolean(
    String(schoolHomeState.searchTerm || "").trim()
    || (schoolHomeState.selectedMemberTagNames || []).length
    || schoolHomeState.selectedSchoolClassId
  );
}

function createHolidayEmptyState(title, description) {
  const state = createEmptyStateElement({ title, description });
  state.className = "empty-state school-holiday-empty-state";
  const icon = createElement("img", { className: "school-holiday-icon", src: DAYOFF_ICON_PATH, alt: "" });
  state.prepend(icon);
  return state;
}

function createSchoolHomeAppShell(schoolHomeState) {
  const shell = createElement("section", {
    className: "school-home-app-shell",
    dataset: { area: "schoolHomeApp" },
  });
  shell.append(createAppHeader(schoolHomeState));
  shell.append(createSchoolCalendarPanel(schoolHomeState, "app"));
  shell.append(createSchoolReservationPanel(schoolHomeState, "app"));
  shell.append(createAppBottomNavigation());
  return shell;
}

function createAppBottomNavigation() {
  return createDefaultAppBottomNavigation({
    className: "mobile-bottom-nav",
    selectedLabel: "일정",
  });
}

function createReservationRegistrationModal(schoolHomeState) {
  const state = schoolHomeState.reservationRegistration;
  const overlay = createElement("section", {
    className: "school-registration-modal-overlay",
    dataset: { area: "reservationRegistrationModal", modal: "reservationRegistration", state: "open" },
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeReservationRegistrationModal(schoolHomeState);
    }
  });

  const modal = createElement("div", { className: "school-registration-modal" });
  const header = createElement("header", { className: "school-registration-modal-header" });
  header.append(createElement("h2", { textContent: "예약 등록" }));
  const closeButton = createElement("button", {
    className: "school-registration-modal-close",
    type: "button",
    ariaLabel: "닫기",
    dataset: { action: "closeReservationRegistration" },
  });
  closeButton.append(createElement("img", { className: "button-icon", src: CLOSE_ICON_PATH, alt: "" }));
  closeButton.addEventListener("click", () => {
    closeReservationRegistrationModal(schoolHomeState);
  });
  header.append(closeButton);
  modal.append(header);

  const body = createElement("div", { className: "school-registration-modal-body" });
  body.append(createRegistrationMemberField(schoolHomeState));
  body.append(createRegistrationClassField(schoolHomeState));
  body.append(createRegistrationCalendarSection(schoolHomeState));
  body.append(createRegistrationCountSection(schoolHomeState));
  modal.append(body);

  const footer = createElement("footer", { className: "school-registration-modal-footer" });
  const canSubmit = canSubmitReservationRegistration(schoolHomeState);
  const submitButton = createElement("button", {
    className: "primary-button school-registration-submit-button",
    type: "button",
    textContent: "등록",
    dataset: { action: "submitReservationRegistration", state: canSubmit ? "enabled" : "disabled" },
  });
  submitButton.disabled = !canSubmit;
  submitButton.addEventListener("click", () => {
    if (!canSubmit) {
      return;
    }

    submitReservationRegistration(schoolHomeState);
  });
  footer.append(submitButton);
  modal.append(footer);

  overlay.append(modal);
  return overlay;
}

function createRegistrationMemberField(schoolHomeState) {
  const state = schoolHomeState.reservationRegistration;
  const field = createElement("section", {
    className: state.errors.member ? "school-registration-field has-error" : "school-registration-field",
    dataset: { field: "member" },
  });
  field.append(createElement("label", { className: "school-registration-label", textContent: "회원" }));

  const control = createElement("div", { className: "school-registration-member-control" });
  const input = createElement("input", {
    className: "school-registration-input school-registration-member-input",
    type: "text",
    value: state.memberQuery,
    placeholder: "반려견 / 보호자 검색",
    dataset: { field: "member" },
  });
  input.addEventListener("focus", () => {
    if (state.isMemberSuggestionOpen) {
      return;
    }

    state.isMemberSuggestionOpen = true;
    rerenderAndFocusRegistrationMemberInput(schoolHomeState);
  });
  bindImeAwareInput(input, {
    onInput: (event, meta) => {
      state.memberQuery = event.target.value;
      state.selectedMemberPet = null;
      state.selectedClassId = "";
      state.isMemberSuggestionOpen = true;
      state.errors.member = "";

      if (meta.isComposing) {
        return;
      }

      rerenderAndFocusRegistrationMemberInput(schoolHomeState);
    },
  });
  control.append(input);

  if (state.memberQuery) {
    const clearButton = createElement("button", {
      className: "school-registration-member-clear",
      type: "button",
      ariaLabel: "회원 검색어 지우기",
      textContent: "×",
    });
    clearButton.addEventListener("click", () => {
      state.memberQuery = "";
      state.selectedMemberPet = null;
      state.selectedClassId = "";
      state.isMemberSuggestionOpen = true;
      rerenderAndFocusRegistrationMemberInput(schoolHomeState);
    });
    control.append(clearButton);
  }

  if (state.isMemberSuggestionOpen) {
    control.append(createMemberSuggestionList(schoolHomeState));
  }

  field.append(control);
  field.append(createRegistrationError(state.errors.member));
  return field;
}

function createMemberSuggestionList(schoolHomeState) {
  const suggestions = getFilteredMemberSuggestions(schoolHomeState);
  const list = createElement("div", {
    className: "school-registration-member-suggestions",
    dataset: { area: "memberSuggestions", state: suggestions.length ? "list" : "empty" },
  });

  if (!suggestions.length) {
    list.append(createElement("p", { textContent: "검색 결과가 없습니다." }));
    return list;
  }

  suggestions.forEach((memberPet) => {
    const button = createElement("button", {
      className: "school-registration-member-option",
      type: "button",
      dataset: { action: "selectReservationMember", entityId: memberPet.petId || memberPet.id },
    });
    button.append(createElement("strong", { textContent: getMemberPetDisplayName(memberPet) }));
    button.append(createElement("span", { textContent: getMemberPetMetaText(memberPet) }));
    button.addEventListener("click", () => {
      schoolHomeState.reservationRegistration.selectedMemberPet = memberPet;
      schoolHomeState.reservationRegistration.memberQuery = getSelectedMemberInputText(memberPet);
      schoolHomeState.reservationRegistration.selectedClassId = getAutoSelectedMemberSchoolClassId(memberPet);
      schoolHomeState.reservationRegistration.isMemberSuggestionOpen = false;
      schoolHomeState.reservationRegistration.selectedDates = schoolHomeState.reservationRegistration.selectedDates.filter((dateKey) => {
        return !isExistingReservationDate(schoolHomeState, dateKey)
          && canKeepReservationRegistrationDate(schoolHomeState, dateKey);
      });
      schoolHomeState.reservationRegistration.errors.member = "";
      schoolHomeState.reservationRegistration.errors.selectedDates = "";
      rerender(schoolHomeState);
    });
    list.append(button);
  });

  return list;
}

function createRegistrationClassField(schoolHomeState) {
  const state = schoolHomeState.reservationRegistration;
  const field = createElement("section", {
    className: state.errors.classId ? "school-registration-field has-error" : "school-registration-field",
    dataset: { field: "class" },
  });
  field.append(createElement("label", { className: "school-registration-label", textContent: "클래스" }));

  const select = createElement("select", {
    className: "school-registration-input school-registration-class-select",
    dataset: { field: "classId" },
  });
  select.append(createElement("option", { value: "", textContent: "미지정" }));
  loadSchoolClassList().forEach((schoolClass) => {
    const option = createElement("option", {
      value: schoolClass.id,
      textContent: formatRegistrationClassOptionLabel(schoolClass),
    });
    option.selected = schoolClass.id === state.selectedClassId;
    select.append(option);
  });
  select.addEventListener("change", (event) => {
    state.selectedClassId = event.target.value;
    state.selectedDates = state.selectedDates.filter((dateKey) => {
      return !isExistingReservationDate(schoolHomeState, dateKey)
        && canKeepReservationRegistrationDate(schoolHomeState, dateKey);
    });
    state.errors.classId = "";
    state.errors.selectedDates = "";
    rerender(schoolHomeState);
  });
  field.append(select);
  field.append(createRegistrationError(state.errors.classId));
  return field;
}

function createRegistrationCalendarSection(schoolHomeState) {
  const state = schoolHomeState.reservationRegistration;
  const section = createElement("section", { className: "school-registration-calendar-section" });

  const header = createElement("div", { className: "school-registration-calendar-header" });
  header.append(createElement("h3", { textContent: "날짜" }));
  const controls = createElement("div", { className: "school-registration-calendar-controls" });
  controls.append(createRegistrationMonthButton(schoolHomeState, "prev", "이전 달"));
  controls.append(createElement("strong", { textContent: getMonthLabel(state.currentMonth) }));
  controls.append(createRegistrationMonthButton(schoolHomeState, "next", "다음 달"));
  header.append(controls);
  section.append(header);

  section.append(createRegistrationCalendarGrid(schoolHomeState));
  section.append(createRegistrationError(state.errors.selectedDates));
  return section;
}

function createRegistrationMonthButton(schoolHomeState, direction, label) {
  const button = createElement("button", {
    className: "school-registration-month-button",
    type: "button",
    ariaLabel: label,
    dataset: { action: "moveReservationRegistrationMonth", direction },
  });
  button.append(createElement("img", {
    className: "button-icon",
    src: direction === "prev" ? CHEVRON_LEFT_ICON_PATH : CHEVRON_RIGHT_ICON_PATH,
    alt: "",
  }));
  button.addEventListener("click", () => {
    const offset = direction === "prev" ? -1 : 1;
    schoolHomeState.reservationRegistration.currentMonth = shiftMonth(schoolHomeState.reservationRegistration.currentMonth, offset);
    rerender(schoolHomeState);
  });
  return button;
}

function createRegistrationCalendarGrid(schoolHomeState) {
  const grid = createElement("div", { className: "school-registration-calendar-grid" });
  const weekdays = createElement("div", { className: "school-registration-weekdays" });
  WEEKDAYS.forEach((weekday) => {
    weekdays.append(createElement("span", { textContent: weekday }));
  });
  grid.append(weekdays);

  getCalendarMatrix(schoolHomeState.reservationRegistration.currentMonth).forEach((week) => {
    const row = createElement("div", { className: "school-registration-calendar-row" });
    week.forEach((cell) => {
      row.append(createRegistrationDateButton(schoolHomeState, cell));
    });
    grid.append(row);
  });

  return grid;
}

function createRegistrationDateButton(schoolHomeState, cell) {
  const state = schoolHomeState.reservationRegistration;
  const isSelected = state.selectedDates.includes(cell.dateKey);
  const shouldShowExistingReservations = Boolean(state.selectedMemberPet && state.selectedClassId);
  const isAlreadyReserved = shouldShowExistingReservations && isExistingReservationDate(schoolHomeState, cell.dateKey);
  const isCapacityFull = shouldShowExistingReservations && isClassCapacityFullForDate(schoolHomeState, cell.dateKey);
  const isCapacityBlocked = !isSelected && isCapacityFull && !state.allowOverCapacity;
  const isDateSelectable = canSelectReservationRegistrationDate(state);
  const classNames = [
    "school-registration-date",
    cell.isCurrentMonth ? "" : "is-muted",
    cell.isHoliday ? "is-holiday" : "",
    isSelected ? "is-selected" : "",
    isAlreadyReserved ? "is-reserved" : "",
    isCapacityBlocked ? "is-capacity-full" : "",
    isDateSelectable ? "" : "is-disabled",
  ].filter(Boolean).join(" ");
  const button = createElement("button", {
    className: classNames,
    type: "button",
    dataset: {
      action: "toggleReservationRegistrationDate",
      entityId: cell.dateKey,
      state: !isDateSelectable || isCapacityBlocked ? "disabled" : isAlreadyReserved ? "reserved" : isSelected ? "selected" : "idle",
    },
  });
  button.disabled = !isDateSelectable || isAlreadyReserved || isCapacityBlocked;
  button.append(createElement("span", { className: "school-registration-date-number", textContent: String(cell.dayNumber) }));
  if (cell.isHoliday) {
    button.append(createElement("span", { className: "school-registration-date-holiday", textContent: "휴무" }));
  }
  if (isCapacityBlocked) {
    button.append(createElement("span", { className: "school-registration-date-capacity", textContent: "마감" }));
  }
  if (isAlreadyReserved || isSelected) {
    const check = createElement("span", { className: "school-registration-date-check" });
    check.append(createElement("img", { src: CHECK_ICON_PATH, alt: "" }));
    button.append(check);
  }
  button.addEventListener("click", () => {
    if (!isDateSelectable || isAlreadyReserved || isCapacityBlocked) {
      return;
    }

    state.selectedDates = isSelected
      ? state.selectedDates.filter((dateKey) => dateKey !== cell.dateKey)
      : [...state.selectedDates, cell.dateKey].sort();
    state.errors.selectedDates = "";
    rerender(schoolHomeState);
  });
  return button;
}

function createRegistrationCountSection(schoolHomeState) {
  const state = schoolHomeState.reservationRegistration;
  const selectedCount = state.selectedDates.length;
  const reservableCount = getReservationTicketReservableCount(schoolHomeState);
  const overCount = Math.max(0, selectedCount - reservableCount);
  const hasCapacityExceeded = hasReservationRegistrationCapacityExceeded(schoolHomeState);
  const section = createElement("section", { className: "school-registration-count-section" });
  section.append(createElement("strong", { textContent: "예약 횟수" }));
  section.append(createElement("span", {
    className: overCount > 0 ? "school-registration-count is-over" : "school-registration-count",
    textContent: `총 ${selectedCount} / ${reservableCount} 회`,
  }));
  if (overCount > 0) {
    section.append(createElement("span", {
      className: "school-registration-count-over",
      textContent: `${overCount}회 초과`,
    }));
  }
  if (hasCapacityExceeded) {
    section.append(createElement("span", {
      className: "school-registration-count-over",
      textContent: "정원 초과",
    }));
  }
  section.append(createOverCapacityCheckbox(schoolHomeState));
  return section;
}

function createOverCapacityCheckbox(schoolHomeState) {
  const state = schoolHomeState.reservationRegistration;
  const label = createElement("label", {
    className: "school-registration-over-capacity",
    dataset: { field: "allowOverCapacity", state: state.allowOverCapacity ? "checked" : "unchecked" },
  });
  const checkbox = createElement("input", {
    type: "checkbox",
    dataset: { action: "toggleOverCapacityReservation" },
  });
  checkbox.checked = state.allowOverCapacity;
  checkbox.addEventListener("change", () => {
    state.allowOverCapacity = checkbox.checked;
    state.selectedDates = state.selectedDates.filter((dateKey) => canKeepReservationRegistrationDate(schoolHomeState, dateKey));
    state.errors.selectedDates = "";
    rerender(schoolHomeState);
  });
  label.append(checkbox);
  label.append(createElement("span", { textContent: "초과 예약" }));
  return label;
}

function createRegistrationError(message) {
  return createElement("span", {
    className: "school-registration-error",
    textContent: message || "",
  });
}

function openReservationRegistrationModal(schoolHomeState) {
  schoolHomeState.reservationRegistration = createReservationRegistrationState(schoolHomeState.currentMonth);
  schoolHomeState.reservationRegistration.isOpen = true;
  rerender(schoolHomeState);
}

function closeReservationRegistrationModal(schoolHomeState) {
  schoolHomeState.reservationRegistration = createReservationRegistrationState(schoolHomeState.currentMonth);
  rerender(schoolHomeState);
}

function canSelectReservationRegistrationDate(state) {
  return Boolean(state.selectedMemberPet);
}

function canSubmitReservationRegistration(schoolHomeState) {
  const state = schoolHomeState.reservationRegistration;
  return Boolean(
    state.selectedMemberPet
    && state.selectedDates.length > 0
    && !hasReservationRegistrationCapacityExceeded(schoolHomeState)
  );
}

function resetReservationRegistrationModal(schoolHomeState, currentMonth) {
  schoolHomeState.reservationRegistration = createReservationRegistrationState(currentMonth || schoolHomeState.currentMonth);
  schoolHomeState.reservationRegistration.isOpen = true;
  rerenderAndFocusRegistrationMemberInput(schoolHomeState);
}

function rerenderAndFocusRegistrationMemberInput(schoolHomeState) {
  rerender(schoolHomeState);
  window.setTimeout(() => {
    const input = document.querySelector(".school-registration-member-input");
    if (!input) {
      return;
    }

    input.focus();
    const nextSelectionPosition = input.value.length;
    input.setSelectionRange(nextSelectionPosition, nextSelectionPosition);
  }, 0);
}

function submitReservationRegistration(schoolHomeState) {
  const state = schoolHomeState.reservationRegistration;
  const errors = {};
  const selectedClass = getSelectedSchoolClass(state.selectedClassId);
  const selectedMemberPet = state.selectedMemberPet;

  if (!selectedMemberPet) {
    errors.member = "회원을 선택해 주세요.";
  }

  if (!state.selectedDates.length) {
    errors.selectedDates = "예약 날짜를 선택해 주세요.";
  }

  if (selectedMemberPet) {
    const duplicateDates = state.selectedDates.filter((dateKey) => {
      return isExistingReservationDate(schoolHomeState, dateKey, state.selectedClassId);
    });

    if (duplicateDates.length) {
      errors.selectedDates = "같은 반려견은 같은 날짜/클래스에 1회만 예약할 수 있습니다.";
    }
  }

  if (!state.allowOverCapacity && hasReservationRegistrationCapacityExceeded(schoolHomeState)) {
    errors.selectedDates = "정원을 초과한 날짜가 있습니다. 초과 예약을 선택해 주세요.";
  }

  if (Object.keys(errors).length) {
    state.errors = errors;
    rerender(schoolHomeState);
    return;
  }

  const newReservations = state.selectedDates.map((dateKey) => {
    return createReservationFromSelection(dateKey, selectedClass, selectedMemberPet);
  });
  schoolHomeState.members = applySchoolReservationRegistration(
    schoolHomeState.members,
    selectedMemberPet.memberId || selectedMemberPet.id,
    selectedMemberPet.petId,
    newReservations.length,
  );
  saveStoredMembers(schoolHomeState.members);
  if (selectedClass) {
    schoolHomeState.members = addMemberPetToSchoolClass(
      selectedMemberPet.memberId || selectedMemberPet.id,
      selectedMemberPet.petId,
      selectedClass.id,
    );
  }
  appendStoredSchoolReservations(newReservations);
  schoolHomeState.reservations = [...schoolHomeState.reservations, ...newReservations];
  schoolHomeState.selectedDate = state.selectedDates[0] || schoolHomeState.selectedDate;
  resetReservationRegistrationModal(schoolHomeState, state.currentMonth);
}

function createReservationFromSelection(dateKey, schoolClass, memberPet) {
  return {
    id: createSchoolReservationId(),
    date: dateKey,
    classId: schoolClass?.id || null,
    className: schoolClass?.name || "",
    classSnapshot: createSchoolClassSnapshot(schoolClass),
    memberId: memberPet.memberId || memberPet.id,
    petId: memberPet.petId,
    petName: memberPet.petName || memberPet.dogName || "",
    breed: memberPet.breed || "",
    guardianName: memberPet.guardianName || "",
    phoneNumber: memberPet.phoneNumber || "",
    address: memberPet.address || "",
    addressDetail: memberPet.addressDetail || "",
    ownerTags: Array.isArray(memberPet.ownerTags) ? [...memberPet.ownerTags] : [],
    petTags: Array.isArray(memberPet.petTags) ? [...memberPet.petTags] : [],
    birthDate: memberPet.birthDate || "",
    animalRegistrationNumber: memberPet.animalRegistrationNumber || "",
    coatColor: memberPet.coatColor || "",
    weight: memberPet.weight || "",
    gender: memberPet.gender || "",
    neuteredStatus: memberPet.neuteredStatus || "",
    memo: memberPet.memo || "",
    status: "예약",
    isCountReserved: true,
    isRemainingConsumed: false,
  };
}

function getFilteredMemberSuggestions(schoolHomeState) {
  const query = normalizeRegistrationSearchText(schoolHomeState.reservationRegistration.memberQuery);
  const memberPetRows = getMemberPetRows(schoolHomeState.members);

  if (!query) {
    return memberPetRows.slice(0, 8);
  }

  return memberPetRows.filter((memberPet) => {
    return [
      memberPet.petName,
      memberPet.dogName,
      memberPet.breed,
      memberPet.guardianName,
      memberPet.phoneNumber,
    ].some((value) => normalizeRegistrationSearchText(value).includes(query));
  }).slice(0, 8);
}

function getSelectedSchoolClass(classId) {
  return loadSchoolClassList().find((schoolClass) => schoolClass.id === classId) || null;
}

function getAutoSelectedMemberSchoolClassId(memberPet) {
  const memberClassIds = Array.isArray(memberPet.schoolClassIds) ? memberPet.schoolClassIds : [];
  if (memberClassIds.length === 0) {
    return "";
  }

  const classIds = new Set(loadSchoolClassList().map((schoolClass) => schoolClass.id));
  return memberClassIds.find((classId) => classIds.has(classId)) || "";
}

function isExistingReservationDate(schoolHomeState, dateKey, classId = schoolHomeState.reservationRegistration.selectedClassId) {
  const selectedMemberPet = schoolHomeState.reservationRegistration.selectedMemberPet;
  const selectedClassId = String(classId || "").trim();
  if (!selectedMemberPet) {
    return false;
  }

  const memberId = selectedMemberPet.memberId || selectedMemberPet.id;
  const petId = selectedMemberPet.petId;
  return (schoolHomeState.reservations || []).some((reservation) => {
    return reservation.date === dateKey
      && reservation.memberId === memberId
      && reservation.petId === petId
      && String(reservation.classId || "") === selectedClassId
      && isActiveSchoolReservation(reservation);
  });
}

function canKeepReservationRegistrationDate(schoolHomeState, dateKey) {
  const state = schoolHomeState.reservationRegistration;
  return state.allowOverCapacity || !isClassCapacityFullForDate(schoolHomeState, dateKey);
}

function hasReservationRegistrationCapacityExceeded(schoolHomeState) {
  const state = schoolHomeState.reservationRegistration;
  if (!state.selectedClassId || state.allowOverCapacity) {
    return false;
  }

  return state.selectedDates.some((dateKey) => isClassCapacityFullForDate(schoolHomeState, dateKey));
}

function isClassCapacityFullForDate(schoolHomeState, dateKey, classId = schoolHomeState.reservationRegistration.selectedClassId) {
  const capacity = getClassCapacityById(classId);
  if (capacity <= 0) {
    return false;
  }

  return getActiveReservationCountByClassDate(schoolHomeState, classId, dateKey) >= capacity;
}

function getActiveReservationCountByClassDate(schoolHomeState, classId, dateKey) {
  return (schoolHomeState.reservations || []).filter((reservation) => {
    return reservation.date === dateKey
      && reservation.classId === classId
      && !isCanceledReservation(reservation);
  }).length;
}

function getMemberPetDisplayName(memberPet) {
  const petName = memberPet.petName || memberPet.dogName || "-";
  const breed = memberPet.breed || "-";
  return `${petName} (${breed})`;
}

function formatRegistrationClassOptionLabel(schoolClass) {
  const className = schoolClass.name || "-";
  const capacityLabel = schoolClass.capacity ? `정원 ${schoolClass.capacity}` : "정원 -";
  const weekdayLabel = REGISTRATION_CLASS_WEEKDAYS
    .filter((weekday) => schoolClass.businessDays?.includes(weekday.key))
    .map((weekday) => weekday.label)
    .join(", ");
  const meta = [capacityLabel, weekdayLabel].filter(Boolean).join(" / ");

  return meta ? `${className} (${meta})` : className;
}

function getReservationTicketReservableCount(schoolHomeState) {
  const memberPet = schoolHomeState?.reservationRegistration?.selectedMemberPet;
  const reservableCount = Number(
    memberPet?.totalReservableCountByType?.school
    ?? memberPet?.remainingCountByType?.school
    ?? 0,
  );

  return Number.isFinite(reservableCount) ? Math.max(reservableCount, 0) : 0;
}

function getMemberPetMetaText(memberPet) {
  return [memberPet.weight ? `${memberPet.weight}kg` : "", memberPet.guardianName || ""].filter(Boolean).join(" / ");
}

function getSelectedMemberInputText(memberPet) {
  return `${getMemberPetDisplayName(memberPet)} / ${getMemberPetMetaText(memberPet)}`;
}

function normalizeRegistrationSearchText(value) {
  return String(value || "").trim().toLowerCase();
}

function createReservationSearchAppScreen(schoolHomeState) {
  const screen = createElement("section", {
    className: "app-reservation-search-screen",
    dataset: { area: "reservationSearchScreen", platform: "app", service: "school" },
  });
  screen.append(createReservationSearchAppHeader(schoolHomeState, "유치원 예약 검색"));
  screen.append(createReservationSearchFilter(schoolHomeState, {
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
    getFilteredReservationSearchResults(schoolHomeState),
    "schoolHome"
  ));
  return screen;
}

function createReservationSearchAppHeader(schoolHomeState, titleText) {
  const header = createElement("header", { className: "app-reservation-search-header" });
  const backButton = createHeaderIconButton(CHEVRON_LEFT_ICON_PATH, "뒤로");
  backButton.addEventListener("click", () => {
    schoolHomeState.isReservationSearchScreenOpen = false;
    schoolHomeState.isReservationSearchMenuOpen = false;
    schoolHomeState.isTagMenuOpen = false;
    rerender(schoolHomeState);
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
    dataset: { entity: "reservation", entityId: reservation.id, feature: featureName },
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
  more.addEventListener("click", () => {
    window.location.href = `./school-reservation-detail.html?id=${encodeURIComponent(reservation.id)}`;
  });
  row.append(more);
  item.append(row);
  item.append(createElement("span", {
    className: "app-reservation-search-date",
    textContent: `${formatReservationSearchDate(reservation.date)} ${isActiveSchoolReservation(reservation) ? "예약" : "취소"}`,
  }));
  return item;
}

function getFilteredReservationSearchResults(schoolHomeState) {
  const searchTerm = normalizeReservationSearchText(schoolHomeState.searchTerm);
  return [...(schoolHomeState.reservations || [])]
    .filter((reservation) => {
      if (!searchTerm) {
        return true;
      }
      return [reservation.guardianName, reservation.petName].some((fieldValue) => {
        return normalizeReservationSearchText(fieldValue).includes(searchTerm);
      });
    })
    .filter((reservation) => {
      if (!schoolHomeState.selectedMemberTagNames?.length) {
        return true;
      }
      const reservationTags = [...(reservation.ownerTags || []), ...(reservation.petTags || [])];
      return schoolHomeState.selectedMemberTagNames.every((memberTagName) => reservationTags.includes(memberTagName));
    })
    .filter((reservation) => {
      if (!schoolHomeState.selectedSchoolClassId) {
        return true;
      }

      return reservation.classId === schoolHomeState.selectedSchoolClassId;
    })
    .sort((leftReservation, rightReservation) => String(leftReservation.date || "").localeCompare(String(rightReservation.date || "")));
}

function getReservationClassGroups(reservations) {
  const classGroups = new Map();
  (reservations || []).forEach((reservation) => {
    const classId = String(reservation.classId || "").trim();
    const groupId = getReservationClassGroupId(reservation);
    const hasClassDefinition = hasSchoolClassDefinition(classId);
    const currentGroup = classGroups.get(groupId) || {
      id: groupId,
      name: getReservationClassName(reservation),
      count: 0,
      hasClassDefinition,
    };
    currentGroup.count += 1;
    currentGroup.isClosed = hasClassDefinition && isClassCapacityClosed(classId, currentGroup.count);
    classGroups.set(groupId, currentGroup);
  });

  return Array.from(classGroups.values()).sort((leftGroup, rightGroup) => {
    return leftGroup.name.localeCompare(rightGroup.name, "ko");
  });
}

function getReservationClassName(reservation) {
  if (getReservationClassGroupId(reservation) === OTHER_CLASS_GROUP_ID) {
    return OTHER_CLASS_LABEL;
  }

  if (!String(reservation?.classId || "").trim()) {
    const snapshotName = String(reservation?.classSnapshot?.name || "").trim();
    return snapshotName ? `${snapshotName} (삭제됨)` : OTHER_CLASS_LABEL;
  }

  return reservation.className || getClassNameById(reservation.classId) || "미지정";
}

function isClassCapacityClosed(classId, reservationCount) {
  const capacity = getClassCapacityById(classId);
  return capacity > 0 && reservationCount >= capacity;
}

function getClassCapacityById(classId) {
  if (!classId) {
    return 0;
  }

  const capacity = Number(loadSchoolClassList().find((schoolClass) => schoolClass.id === classId)?.capacity);
  return Number.isFinite(capacity) ? capacity : 0;
}

function hasSchoolClassDefinition(classId) {
  if (!classId || classId === "unknown") {
    return false;
  }

  return loadSchoolClassList().some((schoolClass) => schoolClass.id === classId);
}

function getClassNameById(classId) {
  if (!classId) {
    return "";
  }

  return loadSchoolClassList().find((schoolClass) => schoolClass.id === classId)?.name || "미지정";
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

function createAppModeMenu(items) {
  const menu = createElement("div", {
    className: "school-app-mode-menu",
    dataset: { area: "modeMenu" },
  });

  items.forEach((item) => {
    const button = createElement("button", {
      className: item.selected ? "school-app-mode-option is-selected" : "school-app-mode-option",
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
function resetToInitialView(schoolHomeState) {
  const initialView = getSchoolHomeInitialView();
  schoolHomeState.currentMonth = initialView.currentMonth;
  schoolHomeState.selectedDate = initialView.selectedDate;
  schoolHomeState.selectedReservationIds = [];
  rerender(schoolHomeState);
}

function getSchoolCapacityCount() {
  return getSchoolClassCapacityTotal();
}
