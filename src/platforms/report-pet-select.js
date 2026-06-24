import { loadSchoolClassList } from "../storage/class-storage.js";
import { getHotelHomeReservations } from "../storage/hotel-home-storage.js";
import { getMemberPetRows, getStoredMembers } from "../storage/member-storage.js";
import { getSchoolHomeReservations } from "../storage/school-home-storage.js";

const STORAGE_KEYS = {
  selectedPets: "appReportSelectedPets",
  sentReportsByDate: "appReportSentPetKeysByDate",
};

const FILTER_TYPES = {
  reservation: "reservation",
  class: "class",
};

const RESERVATION_FILTERS = [
  { label: "예약자", value: "reserved" },
  { label: "알림장 미전송", value: "unreported" },
  { label: "전체", value: "all" },
];

const state = {
  reservationFilter: "reserved",
  classFilter: "all",
};

const dom = {
  list: document.querySelector("[data-area='petList']"),
  empty: document.querySelector("[data-area='petListEmpty']"),
  completeButton: document.querySelector("[data-action='completeReportPetSelection']"),
  selectAllButton: document.querySelector("[data-action='selectAllReportPets']"),
  reservationFilterButton: document.querySelector("[data-action='toggleReservationFilter']"),
  classFilterButton: document.querySelector("[data-action='toggleClassFilter']"),
  reservationFilterLabel: document.querySelector("[data-field='reservationFilterLabel']"),
  classFilterLabel: document.querySelector("[data-field='classFilterLabel']"),
  filterSheetOverlay: document.querySelector("[data-area='filterBottomSheet']"),
  filterSheetTitle: document.querySelector("[data-field='filterBottomSheetTitle']"),
  filterSheetOptions: document.querySelector("[data-area='filterBottomSheetOptions']"),
  closeFilterSheetButton: document.querySelector("[data-action='closeFilterBottomSheet']"),
};

let optionElements = [];
let allMemberPets = [];
let selectedPetIds = new Set();
let todayReservedPetKeys = new Set();
let todaySentReportPetKeys = new Set();

init();

function init() {
  const todayDateKey = getTodayDateKey();
  const memberPets = getMemberPetRows(getStoredMembers());
  allMemberPets = memberPets;
  todayReservedPetKeys = getTodayReservedPetKeys(memberPets, todayDateKey);
  todaySentReportPetKeys = getTodaySentReportPetKeys(todayDateKey);

  restoreSelectedPets();
  bindEvents();
  syncViewState();
}

function bindEvents() {
  dom.reservationFilterButton?.addEventListener("click", () => {
    openFilterSheet(FILTER_TYPES.reservation);
  });

  dom.classFilterButton?.addEventListener("click", () => {
    openFilterSheet(FILTER_TYPES.class);
  });

  dom.filterSheetOverlay?.addEventListener("click", (event) => {
    if (event.target === dom.filterSheetOverlay) {
      closeFilterSheet();
    }
  });

  dom.closeFilterSheetButton?.addEventListener("click", closeFilterSheet);
  dom.selectAllButton?.addEventListener("click", toggleVisiblePetSelection);
  dom.completeButton?.addEventListener("click", completeSelection);
}

function renderPetOptions(memberPets) {
  if (!dom.list) {
    return;
  }

  dom.list.replaceChildren(...memberPets.map(createPetOption));
  optionElements = [...dom.list.querySelectorAll(".app-report-pet-option")];

  optionElements.forEach((option) => {
    option.querySelector("input")?.addEventListener("change", (event) => {
      updateSelectedPetId(event.target.value, event.target.checked);
      syncViewState();
    });
  });
}

function createPetOption(memberPet) {
  const memberId = String(memberPet.memberId || "").trim();
  const petId = String(memberPet.petId || "").trim();
  const optionValue = `${memberId}:${petId}`;
  const petName = memberPet.petName || memberPet.dogName || "-";
  const breed = memberPet.breed || "-";
  const schoolClassIds = Array.isArray(memberPet.schoolClassIds) ? memberPet.schoolClassIds : [];

  const option = document.createElement("label");
  option.className = "app-report-pet-option";
  option.dataset.isReservedToday = todayReservedPetKeys.has(optionValue) ? "true" : "false";
  option.dataset.isReportSentToday = todaySentReportPetKeys.has(optionValue) ? "true" : "false";
  option.dataset.classIds = schoolClassIds.join(" ");
  option.dataset.petName = petName;
  option.dataset.breed = breed;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.name = "reportPet";
  checkbox.value = optionValue;
  checkbox.checked = selectedPetIds.has(optionValue);

  const text = document.createElement("span");
  const breedText = document.createElement("small");
  breedText.textContent = `(${breed})`;
  text.append(document.createTextNode(`${petName} `), breedText);

  option.append(checkbox, text);
  return option;
}

function restoreSelectedPets() {
  selectedPetIds = new Set(readSelectedPets().map((pet) => pet.id));
}

function openFilterSheet(filterType) {
  if (!dom.filterSheetOverlay || !dom.filterSheetTitle || !dom.filterSheetOptions) {
    return;
  }

  const options = getFilterOptions(filterType);
  const selectedValue = getSelectedFilterValue(filterType);
  dom.filterSheetTitle.textContent = filterType === FILTER_TYPES.reservation ? "예약자" : "클래스";
  dom.filterSheetOptions.replaceChildren(...options.map((option) => createFilterSheetOption(filterType, option, selectedValue)));
  dom.filterSheetOverlay.hidden = false;
  dom.filterSheetOverlay.dataset.state = "open";
}

function createFilterSheetOption(filterType, option, selectedValue) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = option.value === selectedValue
    ? "app-report-filter-sheet-option is-selected"
    : "app-report-filter-sheet-option";
  button.textContent = option.label;
  button.addEventListener("click", () => {
    selectFilterOption(filterType, option);
  });
  return button;
}

function getFilterOptions(filterType) {
  if (filterType === FILTER_TYPES.reservation) {
    return RESERVATION_FILTERS;
  }

  return [
    { label: "전체", value: "all" },
    ...loadSchoolClassList().map((schoolClass) => ({
      label: schoolClass.name,
      value: schoolClass.id,
    })),
  ];
}

function getSelectedFilterValue(filterType) {
  return filterType === FILTER_TYPES.reservation ? state.reservationFilter : state.classFilter;
}

function selectFilterOption(filterType, option) {
  if (filterType === FILTER_TYPES.reservation) {
    state.reservationFilter = option.value;
    setText(dom.reservationFilterLabel, option.label);
  } else {
    state.classFilter = option.value;
    setText(dom.classFilterLabel, option.value === "all" ? "클래스" : option.label);
  }

  closeFilterSheet();
  syncViewState();
}

function closeFilterSheet() {
  if (!dom.filterSheetOverlay) {
    return;
  }

  dom.filterSheetOverlay.hidden = true;
  dom.filterSheetOverlay.dataset.state = "closed";
}

function syncViewState() {
  renderPetOptions(getFilteredMemberPets());
  syncSelectedOptionStyles();
  syncCompleteButton();
  syncSelectAllButton();
  syncEmptyState();
}

function syncSelectedOptionStyles() {
  optionElements.forEach((option) => {
    const checkbox = option.querySelector("input");
    option.classList.toggle("is-selected", Boolean(checkbox?.checked));
  });
}

function syncCompleteButton() {
  if (!dom.completeButton) {
    return;
  }

  const hasSelectedPets = getSelectedPets().length > 0;
  dom.completeButton.disabled = !hasSelectedPets;
  dom.completeButton.dataset.state = hasSelectedPets ? "enabled" : "disabled";
}

function syncSelectAllButton() {
  if (dom.selectAllButton) {
    dom.selectAllButton.textContent = areAllVisibleOptionsSelected() ? "전체 해제" : "전체 선택";
  }
}

function syncEmptyState() {
  if (!dom.empty) {
    return;
  }

  const isEmpty = getFilteredMemberPets().length === 0;
  dom.empty.hidden = !isEmpty;
  dom.empty.classList.toggle("is-hidden", !isEmpty);
}

function toggleVisiblePetSelection() {
  const shouldSelectAll = !areAllVisibleOptionsSelected();
  getFilteredMemberPets().forEach((memberPet) => {
    updateSelectedPetId(getMemberPetOptionValue(memberPet), shouldSelectAll);
  });
  syncViewState();
}

function completeSelection() {
  if (dom.completeButton?.disabled) {
    return;
  }

  sessionStorage.setItem(STORAGE_KEYS.selectedPets, JSON.stringify(getSelectedPets()));
  window.location.href = "./report-create.html";
}

function matchesReservationFilter(memberPet) {
  if (state.reservationFilter === "all") {
    return true;
  }

  const petKey = getMemberPetOptionValue(memberPet);
  if (state.reservationFilter === "reserved") {
    return todayReservedPetKeys.has(petKey);
  }

  if (state.reservationFilter === "unreported") {
    return !todaySentReportPetKeys.has(petKey);
  }

  return true;
}

function matchesClassFilter(memberPet) {
  if (state.classFilter === "all") {
    return true;
  }

  const schoolClassIds = Array.isArray(memberPet.schoolClassIds) ? memberPet.schoolClassIds : [];
  return schoolClassIds.includes(state.classFilter);
}

function areAllVisibleOptionsSelected() {
  const filteredMemberPets = getFilteredMemberPets();
  return filteredMemberPets.length > 0 && filteredMemberPets.every((memberPet) => selectedPetIds.has(getMemberPetOptionValue(memberPet)));
}

function getFilteredMemberPets() {
  return allMemberPets.filter((memberPet) => matchesReservationFilter(memberPet) && matchesClassFilter(memberPet));
}

function getSelectedPets() {
  return allMemberPets
    .filter((memberPet) => selectedPetIds.has(getMemberPetOptionValue(memberPet)))
    .map((memberPet) => ({
      id: getMemberPetOptionValue(memberPet),
      name: memberPet.petName || memberPet.dogName || "-",
      breed: memberPet.breed || "-",
    }));
}

function updateSelectedPetId(petId, isSelected) {
  if (!petId) {
    return;
  }

  if (isSelected) {
    selectedPetIds.add(petId);
    return;
  }

  selectedPetIds.delete(petId);
}

function getMemberPetOptionValue(memberPet) {
  const memberId = String(memberPet.memberId || "").trim();
  const petId = String(memberPet.petId || "").trim();
  return `${memberId}:${petId}`;
}

function readSelectedPets() {
  try {
    const selectedPets = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.selectedPets) || "[]");
    return Array.isArray(selectedPets) ? selectedPets : [];
  } catch {
    return [];
  }
}

function getTodayReservedPetKeys(memberPets, dateKey) {
  const reservedPetKeys = new Set();

  getSchoolHomeReservations()
    .filter((reservation) => reservation.date === dateKey)
    .forEach((reservation) => {
      const memberId = String(reservation.memberId || "").trim();
      const petId = String(reservation.petId || "").trim();
      if (memberId && petId) {
        reservedPetKeys.add(`${memberId}:${petId}`);
      }
    });

  const memberPetKeyByProfile = new Map();
  memberPets.forEach((memberPet) => {
    memberPetKeyByProfile.set(createPetProfileKey(memberPet), `${memberPet.memberId}:${memberPet.petId}`);
  });

  getHotelHomeReservations()
    .filter((reservation) => reservation.date === dateKey)
    .forEach((reservation) => {
      const memberPetKey = memberPetKeyByProfile.get(createPetProfileKey(reservation));
      if (memberPetKey) {
        reservedPetKeys.add(memberPetKey);
      }
    });

  return reservedPetKeys;
}

function getTodaySentReportPetKeys(dateKey) {
  try {
    const sentReportsByDate = JSON.parse(localStorage.getItem(STORAGE_KEYS.sentReportsByDate) || "{}");
    const sentPetKeys = sentReportsByDate?.[dateKey];
    return new Set(Array.isArray(sentPetKeys) ? sentPetKeys : []);
  } catch {
    return new Set();
  }
}

function createPetProfileKey(value) {
  return [
    normalizeLookupText(value?.petName || value?.dogName),
    normalizeLookupText(value?.breed),
  ].join(":");
}

function normalizeLookupText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
