import { loadSchoolClassList } from "../storage/class-storage.js";
import { getMemberPetRows, getStoredMembers } from "../storage/member-storage.js";

const SELECTED_REPORT_PETS_STORAGE_KEY = "appReportSelectedPets";
const SENT_REPORTS_BY_DATE_STORAGE_KEY = "appReportSentPetKeysByDate";

const FILTERS = {
  kindergarten: "kindergarten",
  hotel: "hotel",
  unreported: "unreported",
};
const SCHOOL_CLASS_FILTER_ALL = "all";

const webPetSelectButton = document.querySelector(".web-report-compose-shell .web-report-pet-select-button");
const webPetEditButton = document.querySelector(".web-report-compose-shell [data-action='editReportPets']");
const webPetSelectBox = document.querySelector(".web-report-compose-shell .web-report-pet-select-box");
const webReportBodyInput = document.querySelector(".web-report-compose-shell [data-field='reportBody']");
const webReportAiFab = document.querySelector(".web-report-compose-shell [data-action='createReportWithAi']");
const summaryElements = document.querySelectorAll("[data-field='selectedReportPetSummary']");

let allMemberPets = [];
let selectedPetIds = new Set();
let draftSelectedPetIds = new Set();
let activeFilters = new Set([FILTERS.kindergarten]);
let selectedSchoolClassId = SCHOOL_CLASS_FILTER_ALL;
let schoolClassList = [];
let todaySentReportPetKeys = new Set();
let modalElement = null;

resetComposeStateIfRequested();
restoreSelectedPets();
syncSelectedPetSummary();
bindWebPetSelect();

function bindWebPetSelect() {
  webPetSelectButton?.addEventListener("click", (event) => {
    event.preventDefault();
    openPetSelectModal();
  });
  webPetEditButton?.addEventListener("click", openPetSelectModal);
  webReportBodyInput?.addEventListener("input", syncAiFabState);
}

function openPetSelectModal() {
  allMemberPets = getMemberPetRows(getStoredMembers());
  schoolClassList = loadSchoolClassList();
  todaySentReportPetKeys = getTodaySentReportPetKeys(getTodayDateKey());
  draftSelectedPetIds = new Set(selectedPetIds);

  modalElement = createPetSelectModal();
  document.body.append(modalElement);
  document.body.classList.add("has-web-report-pet-modal");
  syncPetSelectModal();
}

function closePetSelectModal() {
  modalElement?.remove();
  modalElement = null;
  document.body.classList.remove("has-web-report-pet-modal");
}

function createPetSelectModal() {
  const overlay = document.createElement("div");
  overlay.className = "web-report-pet-modal-overlay";
  overlay.dataset.modal = "reportPetSelect";

  const dialog = document.createElement("section");
  dialog.className = "web-report-pet-modal";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "webReportPetSelectTitle");

  const header = document.createElement("header");
  header.className = "web-report-pet-modal-header";

  const title = document.createElement("h2");
  title.id = "webReportPetSelectTitle";
  title.textContent = "반려견 선택";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "web-report-pet-modal-close";
  closeButton.dataset.action = "closeReportPetModal";
  closeButton.setAttribute("aria-label", "반려견 선택 닫기");
  closeButton.textContent = "×";

  header.append(title, closeButton);

  const layout = document.createElement("div");
  layout.className = "web-report-pet-modal-layout";

  layout.append(createAvailablePetSection(), createSelectedPetSection());
  dialog.append(header, layout);
  overlay.append(dialog);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closePetSelectModal();
    }
  });
  closeButton.addEventListener("click", closePetSelectModal);

  return overlay;
}

function createAvailablePetSection() {
  const section = document.createElement("section");
  section.className = "web-report-pet-modal-section web-report-pet-modal-available";

  const heading = document.createElement("div");
  heading.className = "web-report-pet-modal-section-head";
  heading.innerHTML = `
    <div class="web-report-pet-modal-title"
      <span>선택 가능 반려견</span>
      <strong data-field="availableReportPetCount">(0)</strong>
    </div>
  `;

  const selectAllLabel = document.createElement("label");
  selectAllLabel.className = "web-report-pet-modal-select-all";
  const selectAllInput = document.createElement("input");
  selectAllInput.type = "checkbox";
  selectAllInput.dataset.action = "toggleAllVisibleReportPets";
  const selectAllText = document.createElement("span");
  selectAllText.textContent = "전체선택";
  selectAllLabel.append(selectAllInput, selectAllText);
  heading.append(selectAllLabel);

  const filters = document.createElement("div");
  filters.className = "web-report-pet-modal-filters";
  filters.append(
    createKindergartenFilter(),
    createFilterCheckbox(FILTERS.hotel, "호텔링", false),
    createFilterCheckbox(FILTERS.unreported, "알림장 미전송", false),
  );

  const list = document.createElement("div");
  list.className = "web-report-pet-modal-list";
  list.dataset.area = "availableReportPets";

  const empty = document.createElement("p");
  empty.className = "web-report-pet-modal-empty";
  empty.dataset.area = "availableReportPetsEmpty";
  empty.textContent = "선택 가능한 반려견이 없습니다.";

  list.append(empty);
  section.append(heading, filters, list);
  return section;
}

function createSelectedPetSection() {
  const section = document.createElement("section");
  section.className = "web-report-pet-modal-section web-report-pet-modal-selected";

  const heading = document.createElement("div");
  heading.className = "web-report-pet-modal-section-head";
  heading.innerHTML = `
    <div class="web-report-pet-modal-title">
      <span>선택한 반려견 수</span>
      <strong data-field="selectedReportPetModalCount">(0)</strong>
    </div>
  `;

  const list = document.createElement("div");
  list.className = "web-report-pet-modal-selected-list";
  list.dataset.area = "selectedReportPets";

  const empty = document.createElement("p");
  empty.className = "web-report-pet-modal-empty";
  empty.dataset.area = "selectedReportPetsEmpty";
  empty.textContent = "선택한 반려견이 없습니다.";

  const footer = document.createElement("footer");
  footer.className = "web-report-pet-modal-footer";

  const completeButton = document.createElement("button");
  completeButton.type = "button";
  completeButton.className = "primary-button web-report-pet-modal-complete";
  completeButton.dataset.action = "completeReportPetModalSelection";
  completeButton.textContent = "선택 완료";
  footer.append(completeButton);

  list.append(empty);
  section.append(heading, list, footer);
  completeButton.addEventListener("click", completePetSelection);

  return section;
}

function createFilterCheckbox(value, label, checked) {
  const field = document.createElement("label");
  field.className = "web-report-pet-modal-filter";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.value = value;
  input.checked = checked;
  input.dataset.action = "filterReportPets";

  const text = document.createElement("span");
  text.textContent = label;

  input.addEventListener("change", () => {
    updateActiveFilter(value, input.checked);
    syncPetSelectModal();
  });

  field.append(input, text);
  return field;
}

function createKindergartenFilter() {
  const field = document.createElement("div");
  field.className = "web-report-pet-modal-filter web-report-pet-modal-class-filter";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.value = FILTERS.kindergarten;
  input.checked = activeFilters.has(FILTERS.kindergarten);
  input.dataset.action = "filterReportPets";

  const menuButton = document.createElement("button");
  menuButton.type = "button";
  menuButton.className = "web-report-pet-modal-class-filter-button";
  menuButton.dataset.action = "toggleReportPetClassFilter";
  menuButton.setAttribute("aria-haspopup", "menu");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.textContent = `유치원 · ${getSchoolClassFilterLabel()}`;

  const menu = document.createElement("div");
  menu.className = "web-report-pet-modal-class-filter-menu";
  menu.dataset.area = "reportPetClassFilterMenu";
  menu.hidden = true;
  menu.append(...getSchoolClassFilterOptions().map(createSchoolClassFilterOption));

  input.addEventListener("change", () => {
    updateActiveFilter(FILTERS.kindergarten, input.checked);
    syncPetSelectModal();
  });

  menuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = menu.hidden;
    closeSchoolClassFilterMenus();
    menu.hidden = !isOpen;
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  field.append(input, menuButton, menu);
  return field;
}

function createSchoolClassFilterOption(option) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = option.value === selectedSchoolClassId
    ? "web-report-pet-modal-class-filter-option is-selected"
    : "web-report-pet-modal-class-filter-option";
  button.dataset.value = option.value;
  button.textContent = option.label;

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    selectedSchoolClassId = option.value;
    activeFilters.add(FILTERS.kindergarten);
    syncPetSelectModal();
    closeSchoolClassFilterMenus();
  });

  return button;
}

function syncPetSelectModal() {
  if (!modalElement) {
    return;
  }

  const visibleMemberPets = getFilteredMemberPets();
  const selectedMemberPets = getDraftSelectedPets();
  const availableList = modalElement.querySelector("[data-area='availableReportPets']");
  const availableEmpty = modalElement.querySelector("[data-area='availableReportPetsEmpty']");
  const selectedList = modalElement.querySelector("[data-area='selectedReportPets']");
  const selectedEmpty = modalElement.querySelector("[data-area='selectedReportPetsEmpty']");
  const availableCount = modalElement.querySelector("[data-field='availableReportPetCount']");
  const selectedCount = modalElement.querySelector("[data-field='selectedReportPetModalCount']");
  const selectAllInput = modalElement.querySelector("[data-action='toggleAllVisibleReportPets']");

  syncKindergartenFilterControl();
  renderPetModalList(availableList, availableEmpty, visibleMemberPets, "available");
  renderPetModalList(selectedList, selectedEmpty, selectedMemberPets, "selected");
  if (availableCount) {
    availableCount.textContent = `(${visibleMemberPets.length})`;
  }
  if (selectedCount) {
    selectedCount.textContent = `(${selectedMemberPets.length})`;
  }
  if (selectAllInput) {
    const allVisibleSelected = visibleMemberPets.length > 0
      && visibleMemberPets.every((memberPet) => draftSelectedPetIds.has(getMemberPetOptionValue(memberPet)));
    selectAllInput.checked = allVisibleSelected;
    selectAllInput.onchange = () => {
      updateVisiblePetSelection(visibleMemberPets, selectAllInput.checked);
      syncPetSelectModal();
    };
  }
}

function syncKindergartenFilterControl() {
  const input = modalElement?.querySelector(".web-report-pet-modal-class-filter input");
  const menuButton = modalElement?.querySelector("[data-action='toggleReportPetClassFilter']");
  const options = modalElement?.querySelectorAll(".web-report-pet-modal-class-filter-option");

  if (input) {
    input.checked = activeFilters.has(FILTERS.kindergarten);
  }
  if (menuButton) {
    menuButton.textContent = `유치원 · ${getSchoolClassFilterLabel()}`;
  }

  options?.forEach((option) => {
    option.classList.toggle("is-selected", option.dataset.value === selectedSchoolClassId);
  });
}

function closeSchoolClassFilterMenus() {
  modalElement?.querySelectorAll("[data-area='reportPetClassFilterMenu']").forEach((menu) => {
    menu.hidden = true;
  });
  modalElement?.querySelectorAll("[data-action='toggleReportPetClassFilter']").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

function renderPetModalList(listElement, emptyElement, memberPets, variant) {
  if (!listElement || !emptyElement) {
    return;
  }

  const listChildren = [
    ...memberPets.map((memberPet) => createPetCard(memberPet, variant)),
    emptyElement,
  ];

  emptyElement.hidden = memberPets.length > 0;
  listElement.replaceChildren(...listChildren);
}

function createPetCard(memberPet, variant) {
  const petId = getMemberPetOptionValue(memberPet);
  const isSelected = draftSelectedPetIds.has(petId);
  const button = document.createElement("button");
  button.type = "button";
  button.className = [
    "web-report-pet-modal-card",
    variant === "selected" ? "is-removable" : "",
    isSelected ? "is-selected" : "",
  ].filter(Boolean).join(" ");
  button.dataset.petId = petId;

  const status = document.createElement("span");
  status.className = "web-report-pet-modal-avatar";
  status.textContent = isSelected && variant !== "selected" ? "✓" : "●";

  const text = document.createElement("span");
  text.className = "web-report-pet-modal-card-text";

  const name = document.createElement("strong");
  name.textContent = memberPet.petName || memberPet.dogName || "-";

  const breed = document.createElement("small");
  breed.textContent = memberPet.breed || "-";

  text.append(name, breed);
  button.append(status, text);

  if (variant === "selected") {
    const remove = document.createElement("span");
    remove.className = "web-report-pet-modal-remove";
    remove.textContent = "×";
    button.append(remove);
  }

  button.addEventListener("click", () => {
    updateSelectedPetId(petId, variant === "selected" ? false : !isSelected);
    syncPetSelectModal();
  });

  return button;
}

function completePetSelection() {
  selectedPetIds = new Set(draftSelectedPetIds);
  sessionStorage.setItem(SELECTED_REPORT_PETS_STORAGE_KEY, JSON.stringify(getSelectedPets()));
  syncSelectedPetSummary();
  closePetSelectModal();
}

function restoreSelectedPets() {
  selectedPetIds = new Set(readSelectedPets().map((pet) => pet.id));
}

function syncSelectedPetSummary() {
  const selectedPets = readSelectedPets();
  summaryElements.forEach((summaryElement) => {
    summaryElement.textContent = summaryElement.dataset.summaryFormat === "count"
      ? formatSelectedPetCount(selectedPets)
      : formatSelectedPetSummary(selectedPets);
  });
  renderSelectedPetList(selectedPets);
  syncAiFabState(selectedPets);
}

function renderSelectedPetList(selectedPets = readSelectedPets()) {
  const hasSelectedPets = selectedPets.length > 0;

  if (webPetSelectBox) {
    webPetSelectBox.classList.toggle("is-selected", hasSelectedPets);
    webPetSelectBox.replaceChildren(
      ...(hasSelectedPets
        ? selectedPets.map(createSelectedPetPreviewCard)
        : [webPetSelectButton].filter(Boolean)),
    );
  }
  if (webPetEditButton) {
    webPetEditButton.hidden = !hasSelectedPets;
  }
}

function createSelectedPetPreviewCard(pet) {
  const card = document.createElement("div");
  card.className = "web-report-selected-pet-card";

  const avatar = document.createElement("span");
  avatar.className = "web-report-selected-pet-avatar";
  avatar.textContent = "●";

  const text = document.createElement("span");
  text.className = "web-report-selected-pet-text";

  const name = document.createElement("strong");
  name.textContent = pet.name || "-";

  const breed = document.createElement("small");
  breed.textContent = pet.breed || "-";

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "web-report-selected-pet-remove";
  removeButton.setAttribute("aria-label", `${pet.name || "반려견"} 선택 해제`);
  removeButton.textContent = "×";
  removeButton.addEventListener("click", () => {
    removeSelectedPet(pet.id);
  });

  text.append(name, breed);
  card.append(avatar, text, removeButton);
  return card;
}

function removeSelectedPet(petId) {
  selectedPetIds.delete(petId);
  const selectedPets = readSelectedPets().filter((pet) => pet.id !== petId);
  sessionStorage.setItem(SELECTED_REPORT_PETS_STORAGE_KEY, JSON.stringify(selectedPets));
  syncSelectedPetSummary();
}

function syncAiFabState(selectedPets = readSelectedPets()) {
  if (!webReportAiFab) {
    return;
  }

  const hasSelectedPets = selectedPets.length > 0;
  const hasBody = Boolean(webReportBodyInput?.value.trim());
  const isEnabled = hasSelectedPets || hasBody;

  webReportAiFab.disabled = !isEnabled;
  webReportAiFab.dataset.state = isEnabled ? "enabled" : "disabled";
  webReportAiFab.setAttribute("aria-disabled", String(!isEnabled));
}

function getFilteredMemberPets() {
  return allMemberPets.filter((memberPet) => {
    const petKey = getMemberPetOptionValue(memberPet);
    const hasKindergartenFilter = activeFilters.has(FILTERS.kindergarten);
    const hasHotelFilter = activeFilters.has(FILTERS.hotel);
    const hasServiceFilter = hasKindergartenFilter || hasHotelFilter;
    const matchesKindergarten = matchesKindergartenFilter(memberPet);
    const matchesService = !hasServiceFilter || matchesKindergarten || hasHotelFilter;
    const matchesUnreported = !activeFilters.has(FILTERS.unreported) || !todaySentReportPetKeys.has(petKey);
    return matchesService && matchesUnreported;
  });
}

function matchesKindergartenFilter(memberPet) {
  if (!activeFilters.has(FILTERS.kindergarten)) {
    return false;
  }

  if (selectedSchoolClassId === SCHOOL_CLASS_FILTER_ALL) {
    return true;
  }

  const schoolClassIds = Array.isArray(memberPet.schoolClassIds) ? memberPet.schoolClassIds : [];
  return schoolClassIds.includes(selectedSchoolClassId);
}

function getDraftSelectedPets() {
  return allMemberPets.filter((memberPet) => draftSelectedPetIds.has(getMemberPetOptionValue(memberPet)));
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

function updateActiveFilter(filter, isActive) {
  if (isActive) {
    activeFilters.add(filter);
    return;
  }

  activeFilters.delete(filter);
}

function getSchoolClassFilterOptions() {
  return [
    { label: "전체", value: SCHOOL_CLASS_FILTER_ALL },
    ...schoolClassList.map((schoolClass) => ({
      label: schoolClass.name,
      value: schoolClass.id,
    })),
  ];
}

function getSchoolClassFilterLabel() {
  if (selectedSchoolClassId === SCHOOL_CLASS_FILTER_ALL) {
    return "전체";
  }

  return schoolClassList.find((schoolClass) => schoolClass.id === selectedSchoolClassId)?.name || "전체";
}

function updateVisiblePetSelection(memberPets, isSelected) {
  memberPets.forEach((memberPet) => {
    updateSelectedPetId(getMemberPetOptionValue(memberPet), isSelected);
  });
}

function updateSelectedPetId(petId, isSelected) {
  if (!petId) {
    return;
  }

  if (isSelected) {
    draftSelectedPetIds.add(petId);
    return;
  }

  draftSelectedPetIds.delete(petId);
}

function readSelectedPets() {
  try {
    const selectedPets = JSON.parse(sessionStorage.getItem(SELECTED_REPORT_PETS_STORAGE_KEY) || "[]");
    return Array.isArray(selectedPets) ? selectedPets : [];
  } catch {
    return [];
  }
}

function getMemberPetOptionValue(memberPet) {
  const memberId = String(memberPet.memberId || "").trim();
  const petId = String(memberPet.petId || "").trim();
  return `${memberId}:${petId}`;
}

function getTodaySentReportPetKeys(dateKey) {
  try {
    const sentReportsByDate = JSON.parse(localStorage.getItem(SENT_REPORTS_BY_DATE_STORAGE_KEY) || "{}");
    const sentPetKeys = sentReportsByDate?.[dateKey];
    return new Set(Array.isArray(sentPetKeys) ? sentPetKeys : []);
  } catch {
    return new Set();
  }
}

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatSelectedPetSummary(selectedPets) {
  const firstPet = selectedPets[0];
  if (!firstPet) {
    return "반려견 선택";
  }

  const firstPetLabel = `${firstPet.name} (${firstPet.breed})`;
  if (selectedPets.length === 1) {
    return firstPetLabel;
  }

  return `${firstPetLabel} 외 ${selectedPets.length - 1}마리`;
}

function formatSelectedPetCount(selectedPets) {
  return `(${selectedPets.length}마리)`;
}

function resetComposeStateIfRequested() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("reset") !== "true") {
    return;
  }

  sessionStorage.removeItem(SELECTED_REPORT_PETS_STORAGE_KEY);
  params.delete("reset");

  const nextUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", nextUrl);
}
