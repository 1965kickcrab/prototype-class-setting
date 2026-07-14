import { createSchoolClassSnapshot, loadSchoolClassList } from "../../storage/class-storage.js";
import { addMemberPetToSchoolClass } from "../../storage/member-storage.js";
import { appendStoredSchoolReservations, createSchoolReservationId, getSchoolHomeReservations } from "../../storage/school-home-storage.js";
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
  list.append(createClassOption(rootElement, draft, null));
  classList.forEach((schoolClass) => {
    list.append(createClassOption(rootElement, draft, schoolClass));
  });
  section.append(list);
  return section;
}

function createClassOption(rootElement, draft, schoolClass) {
  const classId = schoolClass?.id || "";
  const isSelected = draft.selectedClassId === classId;
  const button = createElement("button", {
    className: isSelected ? "school-reservation-class-option is-selected" : "school-reservation-class-option",
    type: "button",
    textContent: schoolClass?.name || "미지정",
    dataset: { action: "selectClass", entityId: classId, state: isSelected ? "selected" : "idle" },
  });
  button.addEventListener("click", () => {
    draft.selectedClassId = classId;
    draft.selectedDates = draft.selectedDates.filter((dateKey) => {
      return !isExistingReservationDate(draft, dateKey) && canKeepReservationDate(draft, dateKey);
    });
    saveSchoolReservationDraft(draft);
    renderSchoolReservationCreate(rootElement);
  });
  return button;
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
  const isAlreadyReserved = isReservationDraftReadyForDateChecks(draft) && isExistingReservationDate(draft, cell.dateKey);
  const isCapacityFull = isReservationDraftReadyForDateChecks(draft) && isClassCapacityFullForDate(draft.selectedClassId, cell.dateKey);
  const isCapacityBlocked = !isSelected && isCapacityFull && !draft.allowOverCapacity;
  const classNames = [
    "school-reservation-date-button",
    cell.isCurrentMonth ? "" : "is-muted",
    cell.isHoliday ? "is-holiday" : "",
    isSelected ? "is-selected" : "",
    isAlreadyReserved ? "is-reserved" : "",
    isCapacityBlocked ? "is-capacity-full" : "",
  ].filter(Boolean).join(" ");
  const button = createElement("button", {
    className: classNames,
    type: "button",
    dataset: {
      action: "toggleDate",
      entityId: cell.dateKey,
      state: isAlreadyReserved ? "reserved" : isCapacityBlocked ? "disabled" : isSelected ? "selected" : "idle",
    },
  });
  button.append(createElement("span", { textContent: String(cell.dayNumber) }));
  if (cell.isHoliday) {
    button.append(createElement("i", { textContent: "" }));
  }
  if (isAlreadyReserved || isCapacityBlocked) {
    button.append(createElement("small", { textContent: isAlreadyReserved ? "예약" : "마감" }));
  }
  button.addEventListener("click", () => {
    if (!cell.isCurrentMonth || cell.isHoliday || isAlreadyReserved || isCapacityBlocked) {
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
  const isCapacityExceeded = hasReservationCapacityExceeded(draft);
  const countGroup = createElement("div", { className: "school-reservation-footer-count" });
  countGroup.append(createElement("span", { textContent: "예약 횟수" }));
  countGroup.append(createElement("strong", {
    className: isOver || isCapacityExceeded ? "is-warning" : "",
    textContent: `총 ${count} / ${Math.max(reservableCount, 0)}회`,
  }));
  footer.append(countGroup);
  footer.append(createOverCapacityCheckbox(rootElement, draft));

  const submitButton = createElement("button", {
    className: isOver || isCapacityExceeded ? "school-reservation-submit-button is-warning" : "school-reservation-submit-button",
    type: "button",
    textContent: isCapacityExceeded ? "정원 초과" : isOver ? "초과 등록" : "등록",
  });
  submitButton.disabled = isCapacityExceeded;
  submitButton.addEventListener("click", () => {
    submitReservation(rootElement, draft);
  });
  footer.append(submitButton);
  return footer;
}

function createOverCapacityCheckbox(rootElement, draft) {
  const label = createElement("label", {
    className: "school-reservation-over-capacity",
    dataset: { field: "allowOverCapacity", state: draft.allowOverCapacity ? "checked" : "unchecked" },
  });
  const checkbox = createElement("input", {
    type: "checkbox",
    dataset: { action: "toggleOverCapacityReservation" },
  });
  checkbox.checked = draft.allowOverCapacity;
  checkbox.addEventListener("change", () => {
    draft.allowOverCapacity = checkbox.checked;
    draft.selectedDates = draft.selectedDates.filter((dateKey) => canKeepReservationDate(draft, dateKey));
    saveSchoolReservationDraft(draft);
    renderSchoolReservationCreate(rootElement);
  });
  label.append(checkbox);
  label.append(createElement("span", { textContent: "초과 예약" }));
  return label;
}

function submitReservation(rootElement, draft) {
  if (!isReservationDraftReady(draft)) {
    return;
  }

  const selectedClass = loadSchoolClassList().find((schoolClass) => schoolClass.id === draft.selectedClassId) || null;

  if (hasDuplicateReservationDates(draft) || hasReservationCapacityExceeded(draft)) {
    return;
  }

  const reservations = draft.selectedDates.map((dateKey) => {
    return createReservationFromDraft(dateKey, selectedClass, draft.memberPet);
  });
  if (selectedClass) {
    addMemberPetToSchoolClass(draft.memberPet.memberId || draft.memberPet.id, draft.memberPet.petId, selectedClass.id);
  }
  appendStoredSchoolReservations(reservations);
  clearSchoolReservationDraft();
  window.location.href = "./index.html";
}

function createReservationFromDraft(dateKey, schoolClass, memberPet) {
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
    totalReservableCount: getReservableCount(memberPet),
    status: "예약",
  };
}

function isReservationDraftReady(draft) {
  return Boolean(draft.memberPet && draft.selectedDates.length);
}

function isReservationDraftReadyForDateChecks(draft) {
  return Boolean(draft.memberPet);
}

function hasDuplicateReservationDates(draft) {
  return draft.selectedDates.some((dateKey) => isExistingReservationDate(draft, dateKey));
}

function isExistingReservationDate(draft, dateKey) {
  if (!draft.memberPet) {
    return false;
  }

  const memberId = draft.memberPet.memberId || draft.memberPet.id;
  const petId = draft.memberPet.petId;
  return getSchoolHomeReservations().some((reservation) => {
    return reservation.date === dateKey
      && reservation.memberId === memberId
      && reservation.petId === petId
      && String(reservation.classId || "") === String(draft.selectedClassId || "");
  });
}

function canKeepReservationDate(draft, dateKey) {
  return draft.allowOverCapacity || !isClassCapacityFullForDate(draft.selectedClassId, dateKey);
}

function hasReservationCapacityExceeded(draft) {
  if (!draft.selectedClassId || draft.allowOverCapacity) {
    return false;
  }

  return draft.selectedDates.some((dateKey) => isClassCapacityFullForDate(draft.selectedClassId, dateKey));
}

function isClassCapacityFullForDate(classId, dateKey) {
  const capacity = getClassCapacityById(classId);
  if (capacity <= 0) {
    return false;
  }

  return getActiveReservationCountByClassDate(classId, dateKey) >= capacity;
}

function getActiveReservationCountByClassDate(classId, dateKey) {
  return getSchoolHomeReservations().filter((reservation) => {
    return reservation.date === dateKey
      && reservation.classId === classId
      && reservation.status !== "취소";
  }).length;
}

function getClassCapacityById(classId) {
  const capacity = Number(loadSchoolClassList().find((schoolClass) => schoolClass.id === classId)?.capacity);
  return Number.isFinite(capacity) ? capacity : 0;
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
