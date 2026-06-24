import { loadSchoolClassList } from "../../storage/class-storage.js";
import { addMemberPetToSchoolClass } from "../../storage/member-storage.js";
import { appendStoredSchoolReservations, createSchoolReservationId } from "../../storage/school-home-storage.js";
import { getCalendarMatrix, getMonthLabel, shiftMonth } from "../school-home/school-home-state.js";
import { createElement } from "../../utils/dom.js";
import { clearSchoolReservationDraft, loadSchoolReservationDraft, saveSchoolReservationDraft } from "./school-reservation-draft.js";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function renderSchoolReservationCreate(rootElement) {
  rootElement.innerHTML = "";
  rootElement.append(createReservationCreateScreen(rootElement, loadSchoolReservationDraft()));
}

function createReservationCreateScreen(rootElement, draft) {
  const screen = createElement("main", {
    className: "school-reservation-create-screen",
    dataset: { screen: "schoolReservationCreate" },
  });

  screen.append(createHeader());
  screen.append(createFormContent(rootElement, draft));

  if (isReservationDraftReady(draft)) {
    screen.append(createFooter(rootElement, draft));
  }

  return screen;
}

function createHeader() {
  const header = createElement("header", { className: "school-reservation-create-header" });
  const backButton = createElement("button", {
    className: "school-reservation-back-button",
    type: "button",
    textContent: "<",
    ariaLabel: "유치원으로 돌아가기",
  });
  backButton.addEventListener("click", () => {
    window.location.href = "./index.html";
  });

  header.append(backButton);
  header.append(createElement("h1", { textContent: "유치원 예약 등록" }));
  header.append(createElement("span", { className: "school-reservation-header-spacer" }));
  return header;
}

function createFormContent(rootElement, draft) {
  const content = createElement("section", { className: "school-reservation-create-content" });
  content.append(createMemberSection(draft));
  content.append(createClassSection(rootElement, draft));
  content.append(createDateSection(rootElement, draft));
  return content;
}

function createMemberSection(draft) {
  const section = createElement("section", { className: "school-reservation-form-section" });
  section.append(createElement("h2", { textContent: "회원" }));

  if (draft.memberPet && getReservableCount(draft.memberPet) < 0) {
    const warning = createElement("div", { className: "school-reservation-warning" });
    warning.append(createElement("span", { textContent: "!" }));
    warning.append(createElement("strong", { textContent: "초과 등록한 회원입니다." }));
    section.append(warning);
  }

  const button = createElement("button", {
    className: "school-reservation-member-button",
    type: "button",
    dataset: { action: "openMemberSearch" },
  });
  button.append(createElement("span", { className: "school-reservation-search-icon", textContent: "⌕" }));
  button.append(createElement("span", {
    textContent: draft.memberPet ? getSelectedMemberInputText(draft.memberPet) : "회원 조회 / 검색",
  }));
  button.addEventListener("click", () => {
    saveSchoolReservationDraft(draft);
    window.location.href = "./school-reservation-member-search.html";
  });
  section.append(button);
  return section;
}

function createClassSection(rootElement, draft) {
  const section = createElement("section", { className: "school-reservation-form-section" });
  section.append(createElement("h2", { textContent: "클래스" }));

  const classList = loadSchoolClassList();
  const list = createElement("div", { className: "school-reservation-class-list" });
  classList.forEach((schoolClass) => {
    const isSelected = draft.selectedClassId === schoolClass.id;
    const button = createElement("button", {
      className: isSelected ? "school-reservation-class-option is-selected" : "school-reservation-class-option",
      type: "button",
      textContent: schoolClass.name || "-",
      dataset: { action: "selectClass", entityId: schoolClass.id, state: isSelected ? "selected" : "idle" },
    });
    button.addEventListener("click", () => {
      draft.selectedClassId = schoolClass.id;
      saveSchoolReservationDraft(draft);
      renderSchoolReservationCreate(rootElement);
    });
    list.append(button);
  });
  section.append(list);
  return section;
}

function createDateSection(rootElement, draft) {
  const section = createElement("section", { className: "school-reservation-date-section" });
  const titleRow = createElement("div", { className: "school-reservation-date-title" });
  titleRow.append(createElement("h2", { textContent: "날짜 선택" }));
  titleRow.append(createElement("span", { textContent: "• 휴무" }));
  section.append(titleRow);

  const controls = createElement("div", { className: "school-reservation-month-controls" });
  controls.append(createMonthButton(rootElement, draft, -1, "이전 달"));
  controls.append(createElement("strong", { textContent: formatMonthLabel(draft.currentMonth) }));
  controls.append(createMonthButton(rootElement, draft, 1, "다음 달"));
  section.append(controls);
  section.append(createCalendar(rootElement, draft));
  return section;
}

function createMonthButton(rootElement, draft, offset, label) {
  const button = createElement("button", {
    className: "school-reservation-month-button",
    type: "button",
    textContent: offset < 0 ? "<" : ">",
    ariaLabel: label,
  });
  button.addEventListener("click", () => {
    draft.currentMonth = shiftMonth(draft.currentMonth, offset);
    saveSchoolReservationDraft(draft);
    renderSchoolReservationCreate(rootElement);
  });
  return button;
}

function createCalendar(rootElement, draft) {
  const calendar = createElement("section", { className: "school-reservation-calendar" });
  const weekdays = createElement("div", { className: "school-reservation-weekdays" });
  WEEKDAYS.forEach((weekday, index) => {
    weekdays.append(createElement("span", {
      className: index === 0 || index === 6 ? "is-muted" : "",
      textContent: weekday,
    }));
  });
  calendar.append(weekdays);

  getCalendarMatrix(draft.currentMonth).forEach((week) => {
    const row = createElement("div", { className: "school-reservation-calendar-row" });
    week.forEach((cell) => {
      row.append(createDateButton(rootElement, draft, cell));
    });
    calendar.append(row);
  });
  return calendar;
}

function createDateButton(rootElement, draft, cell) {
  const isSelected = draft.selectedDates.includes(cell.dateKey);
  const classNames = [
    "school-reservation-date-button",
    cell.isCurrentMonth ? "" : "is-muted",
    cell.isHoliday ? "is-holiday" : "",
    isSelected ? "is-selected" : "",
  ].filter(Boolean).join(" ");
  const button = createElement("button", {
    className: classNames,
    type: "button",
    dataset: { action: "toggleDate", entityId: cell.dateKey, state: isSelected ? "selected" : "idle" },
  });
  button.append(createElement("span", { textContent: String(cell.dayNumber) }));
  if (cell.isHoliday) {
    button.append(createElement("i", { textContent: "" }));
  }
  button.addEventListener("click", () => {
    if (!cell.isCurrentMonth || cell.isHoliday) {
      return;
    }

    draft.selectedDates = isSelected
      ? draft.selectedDates.filter((dateKey) => dateKey !== cell.dateKey)
      : [...draft.selectedDates, cell.dateKey].sort();
    saveSchoolReservationDraft(draft);
    renderSchoolReservationCreate(rootElement);
  });
  return button;
}

function createFooter(rootElement, draft) {
  const footer = createElement("footer", { className: "school-reservation-create-footer" });
  const count = draft.selectedDates.length;
  const reservableCount = getReservableCount(draft.memberPet);
  const isOver = reservableCount < 0 || count > reservableCount;
  const countGroup = createElement("div", { className: "school-reservation-footer-count" });
  countGroup.append(createElement("span", { textContent: "예약 횟수" }));
  countGroup.append(createElement("strong", {
    className: isOver ? "is-warning" : "",
    textContent: `총 ${count} / ${Math.max(reservableCount, 0)}회`,
  }));
  footer.append(countGroup);

  const submitButton = createElement("button", {
    className: isOver ? "school-reservation-submit-button is-warning" : "school-reservation-submit-button",
    type: "button",
    textContent: isOver ? "초과 등록" : "등록",
  });
  submitButton.addEventListener("click", () => {
    submitReservation(rootElement, draft);
  });
  footer.append(submitButton);
  return footer;
}

function submitReservation(rootElement, draft) {
  if (!isReservationDraftReady(draft)) {
    return;
  }

  const selectedClass = loadSchoolClassList().find((schoolClass) => schoolClass.id === draft.selectedClassId);
  if (!selectedClass) {
    return;
  }

  const reservations = draft.selectedDates.map((dateKey) => {
    return createReservationFromDraft(dateKey, selectedClass, draft.memberPet);
  });
  addMemberPetToSchoolClass(draft.memberPet.memberId || draft.memberPet.id, draft.memberPet.petId, selectedClass.id);
  appendStoredSchoolReservations(reservations);
  clearSchoolReservationDraft();
  window.location.href = "./index.html";
}

function createReservationFromDraft(dateKey, schoolClass, memberPet) {
  return {
    id: createSchoolReservationId(),
    date: dateKey,
    classId: schoolClass.id,
    className: schoolClass.name,
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
    totalReservableCount: getReservableCount(memberPet),
    status: "예약",
  };
}

function isReservationDraftReady(draft) {
  return Boolean(draft.memberPet && draft.selectedClassId && draft.selectedDates.length);
}

function getReservableCount(memberPet) {
  return Number(memberPet?.remainingCountByType?.school ?? memberPet?.totalReservableCountByType?.school ?? 0);
}

function getSelectedMemberInputText(memberPet) {
  const petName = memberPet.petName || memberPet.dogName || "-";
  const breed = memberPet.breed ? ` (${memberPet.breed})` : "";
  const weight = memberPet.weight ? `${memberPet.weight}kg` : "";
  return [petName + breed, weight, memberPet.guardianName || ""].filter(Boolean).join(" / ");
}

function formatMonthLabel(currentMonth) {
  return getMonthLabel(currentMonth).replace("년 ", ". ").replace("월", "");
}
