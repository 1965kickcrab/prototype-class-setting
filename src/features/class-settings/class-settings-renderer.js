import { createElement } from "../../utils/dom.js";
import { bindImeAwareInput } from "../../utils/ime-input.js";
import {
  createSchoolClass,
  deleteSchoolClass,
  ensureDefaultSchoolClass,
  getDefaultSchoolClass,
  loadSchoolClassList,
  updateSchoolClass,
} from "../../storage/class-storage.js";
import { getMemberPetKey, getMemberPetRows, getStoredMembers, setSchoolClassMemberPets } from "../../storage/member-storage.js";
import { reassignStoredSchoolReservationsClass } from "../../storage/school-home-storage.js";

const BACK_ICON_PATH = "../assets/icons/iconBack.svg";
const SCHOOL_ICON_PATH = "../assets/icons/menuIcon_daycare.svg";
const SCHOOL_ACTIVE_ICON_PATH = "../assets/icons/menuIcon_daycare_on.svg";
const CHEVRON_ICON_PATH = "../assets/icons/iconChevronRight.svg";
const CHEVRON_RIGHT_ICON_PATH = "../assets/icons/iconChevronRight.svg";
const CLOSE_ICON_PATH = "../assets/icons/iconClose.svg";

const WEEKDAYS = [
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
  { key: "sat", label: "토" },
  { key: "sun", label: "일" },
];

const SETTINGS_GROUPS = [
  {
    key: "school",
    label: "유치원",
    iconPath: SCHOOL_ICON_PATH,
    activeIconPath: SCHOOL_ACTIVE_ICON_PATH,
    items: [
      { key: "school-business", label: "영업 & 휴무", href: "./business-schedule.html" },
      { key: "school-class", label: "클래스", href: "./class.html", selected: true },
    ],
  },
];

const classSettingsState = {
  openGroupKey: "school",
  selectedItemKey: "school-class",
  modalMode: "",
  editingClassId: "",
  activeModalTab: "basic",
  memberSearchQuery: "",
  draft: createEmptyClassDraft(),
  errors: {},
};

export function renderClassSettings(rootElement) {
  rootElement.innerHTML = "";
  rootElement.append(createClassSettingsScreen(rootElement, loadSchoolClassList()));
}

function rerender(rootElement) {
  renderClassSettings(rootElement);
}

function createClassSettingsScreen(rootElement, schoolClassList) {
  const screen = createElement("main", {
    className: "center-settings-screen class-settings-screen",
    dataset: { screen: "classSettings" },
  });

  screen.append(createHeader());

  const layout = createElement("div", { className: "center-settings-layout" });
  layout.append(createSettingsSidebar(rootElement));
  layout.append(createClassSettingsContent(rootElement, schoolClassList));
  screen.append(layout);

  if (classSettingsState.modalMode) {
    screen.append(createClassModal(rootElement));
  }

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
  const isOpen = classSettingsState.openGroupKey === group.key;
  const hasSelectedItem = group.items.some((item) => item.key === classSettingsState.selectedItemKey);
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
    classSettingsState.openGroupKey = isOpen ? "" : group.key;
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
  const isSelected = item.key === classSettingsState.selectedItemKey;
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

    classSettingsState.openGroupKey = group.key;
    classSettingsState.selectedItemKey = item.key;
    rerender(rootElement);
  });

  return button;
}

function createClassSettingsContent(rootElement, schoolClassList) {
  const content = createElement("section", {
    className: "class-settings-content",
    dataset: { area: "content" },
  });

  const header = createElement("div", { className: "class-settings-title-bar" });
  header.append(createElement("h2", { textContent: "클래스" }));
  const addButton = createElement("button", {
    className: "primary-button class-add-button",
    type: "button",
    textContent: "클래스 추가",
    dataset: { action: "openCreateClassModal" },
  });
  addButton.addEventListener("click", () => {
    openClassModal(rootElement, "create");
  });
  header.append(addButton);

  content.append(header);
  content.append(createClassList(rootElement, schoolClassList));
  return content;
}

function createClassList(rootElement, schoolClassList) {
  const section = createElement("section", {
    className: "surface-panel class-list-panel",
    dataset: { area: "schoolClassList", state: schoolClassList.length ? "list" : "empty" },
  });

  const table = createElement("div", { className: "class-list-table" });
  const header = createElement("div", { className: "class-list-row is-header" });
  ["반 이름", "담당", "정원", "영업일", ""].forEach((label) => {
    header.append(createElement("strong", { textContent: label }));
  });
  table.append(header);

  schoolClassList.forEach((schoolClass) => {
    table.append(createClassListRow(rootElement, schoolClass));
  });

  section.append(table);
  return section;
}

function createClassListRow(rootElement, schoolClass) {
  const row = createElement("button", {
    className: "class-list-row",
    type: "button",
    dataset: { action: "editSchoolClass", entityId: schoolClass.id },
  });
  row.addEventListener("click", () => {
    openClassModal(rootElement, "edit", schoolClass);
  });

  row.append(createElement("span", { textContent: formatOptionalValue(schoolClass.name) }));
  row.append(createElement("span", { textContent: formatOptionalValue(schoolClass.manager) }));
  row.append(createElement("span", { textContent: formatOptionalValue(schoolClass.capacity) }));
  row.append(createElement("span", { textContent: formatBusinessDays(schoolClass.businessDays) }));
  const actionIcon = createElement("span", { className: "class-row-action" });
  actionIcon.append(createElement("img", { src: CHEVRON_RIGHT_ICON_PATH, alt: "" }));
  row.append(actionIcon);
  return row;
}

function createClassModal(rootElement) {
  const isEditMode = classSettingsState.modalMode === "edit";
  const overlay = createElement("section", {
    className: "class-modal-overlay",
    dataset: { area: "classModal", modal: "schoolClass", state: "open" },
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeClassModal(rootElement);
    }
  });

  const modal = createElement("form", { className: "class-modal" });
  modal.addEventListener("submit", (event) => {
    event.preventDefault();
    submitClassModal(rootElement);
  });

  const header = createElement("div", { className: "class-modal-header" });
  header.append(createElement("h2", { textContent: isEditMode ? "클래스 수정" : "클래스 생성" }));
  const closeButton = createElement("button", {
    className: "modal-close-button close-button",
    type: "button",
    ariaLabel: "닫기",
    dataset: { action: "closeClassModal" },
  });
  closeButton.append(createElement("img", { className: "button-icon", src: CLOSE_ICON_PATH, alt: "" }));
  closeButton.addEventListener("click", () => {
    closeClassModal(rootElement);
  });
  header.append(closeButton);
  modal.append(header);

  modal.append(createClassModalTabs(rootElement));

  const body = createElement("div", { className: "class-modal-body" });
  if (classSettingsState.activeModalTab === "detail") {
    body.append(createClassModalSection([
      createClassMemberField(rootElement),
    ]));
  } else {
    body.append(createClassModalSection([
      createTextField(rootElement, "name", "반 이름", "최대 20글자", { maxLength: 20 }),
      createTextField(rootElement, "manager", "담당", "최대 10글자", { maxLength: 10 }),
      createCapacityField(rootElement),
      createBusinessDaysField(rootElement),
    ]));
  }
  modal.append(body);

  const footer = createElement("div", { className: "class-modal-footer" });

  if (isEditMode) {
    const deleteButton = createElement("button", {
      className: "danger-button class-modal-delete-button",
      type: "button",
      textContent: "삭제",
      dataset: { action: "deleteClassModal" },
    });
    deleteButton.addEventListener("click", () => {
      if (confirm("클래스를 삭제하시겠습니까?\n연결된 예약은 유치원 기본 클래스로 이동합니다.")) {
        deleteSchoolClass(classSettingsState.editingClassId);
        ensureDefaultSchoolClass();
        reassignStoredSchoolReservationsClass(classSettingsState.editingClassId, getDefaultSchoolClass());
        setSchoolClassMemberPets(classSettingsState.editingClassId, []);
        closeClassModal(rootElement);
      }
    });
    footer.append(deleteButton);
  } else {
    const cancelButton = createElement("button", {
      className: "secondary-button class-modal-cancel-button",
      type: "button",
      textContent: "취소",
      dataset: { action: "cancelClassModal" },
    });
    cancelButton.addEventListener("click", () => {
      closeClassModal(rootElement);
    });
    footer.append(cancelButton);
  }

  const submitButton = createElement("button", {
    className: "primary-button class-modal-submit-button",
    type: "submit",
    textContent: "저장",
    dataset: { action: "submitClassModal" },
  });
  submitButton.disabled = !canSubmitClassModal();
  footer.append(submitButton);
  modal.append(footer);

  overlay.append(modal);
  return overlay;
}

function createClassModalTabs(rootElement) {
  const tabs = createElement("div", {
    className: "class-modal-tabs",
    role: "tablist",
    dataset: { area: "classModalTabs" },
  });
  [
    { key: "basic", label: "기본 정보" },
    { key: "detail", label: "상세 정보" },
  ].forEach((tab) => {
    const isSelected = classSettingsState.activeModalTab === tab.key;
    const button = createElement("button", {
      className: isSelected ? "class-modal-tab is-selected" : "class-modal-tab",
      type: "button",
      role: "tab",
      textContent: tab.label,
      dataset: {
        action: "switchClassModalTab",
        tab: tab.key,
        state: isSelected ? "selected" : "idle",
      },
    });
    button.setAttribute("aria-selected", String(isSelected));
    button.addEventListener("click", () => {
      classSettingsState.activeModalTab = tab.key;
      rerender(rootElement);
    });
    tabs.append(button);
  });
  return tabs;
}

function createClassModalSection(children) {
  const section = createElement("section", { className: "class-modal-section" });
  const content = createElement("div", { className: "class-modal-section-content" });
  children.forEach((child) => {
    content.append(child);
  });
  section.append(content);
  return section;
}

function createTextField(rootElement, fieldName, labelText, placeholder, options = {}) {
  const field = createElement("label", {
    className: classSettingsState.errors[fieldName] ? "class-form-field has-error" : "class-form-field",
  });
  field.append(createElement("span", { className: "class-form-label", textContent: labelText }));
  const input = createElement("input", {
    className: "form-input class-form-input",
    type: "text",
    value: classSettingsState.draft[fieldName],
    placeholder,
    dataset: { field: fieldName },
  });
  if (options.maxLength) {
    input.maxLength = options.maxLength;
  }
  input.addEventListener("input", (event) => {
    classSettingsState.draft[fieldName] = event.target.value;
    classSettingsState.errors[fieldName] = "";
    syncClassModalSubmitButton();
  });
  if (fieldName === "name") {
    input.addEventListener("blur", () => {
      validateClassNameAvailability(rootElement);
    });
  }
  field.append(input);
  field.append(createErrorMessage(fieldName));
  return field;
}

function createCapacityField(rootElement) {
  const field = createElement("label", {
    className: classSettingsState.errors.capacity ? "class-form-field has-error" : "class-form-field",
  });
  field.append(createElement("span", { className: "class-form-label", textContent: "정원" }));
  const input = createElement("input", {
    className: "form-input class-form-input",
    type: "number",
    value: classSettingsState.draft.capacity,
    placeholder: "1 ~ 99",
    dataset: { field: "capacity" },
  });
  input.min = "1";
  input.max = "99";
  input.step = "1";
  input.addEventListener("keydown", (event) => {
    if (["e", "E", "+", "-", "."].includes(event.key)) {
      event.preventDefault();
    }
  });
    input.addEventListener("input", (event) => {
      const numericValue = event.target.value.replace(/\D/g, "");
      event.target.value = numericValue;
      classSettingsState.draft.capacity = numericValue;
      classSettingsState.errors.capacity = "";
      syncClassModalSubmitButton();
    });
    input.addEventListener("blur", (event) => {
      if (!event.target.value) {
        classSettingsState.draft.capacity = "";
        syncClassModalSubmitButton();
        return;
      }

      const normalizedCapacity = String(Math.min(Math.max(Number(event.target.value), 1), 99));
      event.target.value = normalizedCapacity;
      classSettingsState.draft.capacity = normalizedCapacity;
      syncClassModalSubmitButton();
    });
  const inputRow = createElement("div", { className: "class-capacity-input-row" });
  inputRow.append(createElement("span", { className: "class-capacity-affix", textContent: "하루에" }));
  inputRow.append(input);
  inputRow.append(createElement("span", { className: "class-capacity-affix", textContent: "마리만 예약 가능" }));
  field.append(inputRow);
  field.append(createErrorMessage("capacity"));
  return field;
}

function createBusinessDaysField(rootElement) {
  const field = createElement("fieldset", {
    className: classSettingsState.errors.businessDays ? "class-form-field class-day-field has-error" : "class-form-field class-day-field",
  });
  field.append(createElement("legend", { className: "class-form-label", textContent: "영업일" }));
  field.append(createElement("p", {
    className: "class-form-description",
    textContent: "회원은 영업일 내에서만 예약할 수 있습니다.",
  }));

  const options = createElement("div", { className: "class-weekday-options" });
  WEEKDAYS.forEach((weekday) => {
    const isChecked = classSettingsState.draft.businessDays.includes(weekday.key);
    const label = createElement("label", {
      className: isChecked ? "class-weekday-option is-selected" : "class-weekday-option",
      dataset: { state: isChecked ? "selected" : "idle" },
    });
    const checkbox = createElement("input", {
      type: "checkbox",
      value: weekday.key,
      dataset: { field: "businessDays" },
    });
    checkbox.checked = isChecked;
    checkbox.addEventListener("change", () => {
      classSettingsState.errors.businessDays = "";
      classSettingsState.draft.businessDays = checkbox.checked
        ? [...classSettingsState.draft.businessDays, weekday.key]
        : classSettingsState.draft.businessDays.filter((businessDay) => businessDay !== weekday.key);
      rerender(rootElement);
    });
    label.append(checkbox);
    label.append(createElement("span", { textContent: weekday.label }));
    options.append(label);
  });
  field.append(options);
  field.append(createErrorMessage("businessDays"));
  return field;
}

function createClassMemberField(rootElement) {
  const field = createElement("section", {
    className: "class-form-field class-member-field",
    dataset: { field: "classMembers" },
  });
  const selectedMemberPetKeys = new Set(classSettingsState.draft.memberPetKeys || []);
  const label = createElement("span", { className: "class-form-label class-member-label" });
  label.append(createElement("span", { textContent: "소속 회원" }));
  label.append(createElement("strong", {
    className: "class-member-count",
    textContent: `${selectedMemberPetKeys.size}마리 선택`,
  }));
  field.append(label);

  const memberPets = getMemberPetRows(getStoredMembers());
  if (memberPets.length === 0) {
    field.append(createElement("p", {
      className: "class-member-empty",
      textContent: "등록된 회원이 없습니다.",
    }));
    return field;
  }

  field.append(createClassMemberSearch(rootElement));
  field.append(createClassMemberList(rootElement, memberPets));
  return field;
}

function createClassMemberSearch(rootElement) {
  const search = createElement("input", {
    className: "form-input class-member-search-input",
    type: "search",
    value: classSettingsState.memberSearchQuery || "",
    placeholder: "반려견 / 견종 / 보호자 검색",
    dataset: { field: "classMemberSearch" },
  });
  bindImeAwareInput(search, {
    onInput: (event, meta) => {
      classSettingsState.memberSearchQuery = event.target.value;

      if (meta.isComposing) {
        syncClassMemberList(rootElement);
        return;
      }

      rerender(rootElement);
      focusClassMemberSearch();
    },
  });
  return search;
}

function createClassMemberList(rootElement, memberPets) {
  const visibleMemberPets = getVisibleClassMemberPets(memberPets);
  const list = createElement("div", {
    className: "class-member-list",
    dataset: { area: "classMemberList", state: visibleMemberPets.length ? "list" : "empty" },
  });

  if (visibleMemberPets.length === 0) {
    list.append(createElement("p", {
      className: "class-member-empty",
      textContent: "조회 결과가 없습니다.",
    }));
    return list;
  }

  const selectedMemberPetKeys = new Set(classSettingsState.draft.memberPetKeys || []);
  visibleMemberPets.forEach((memberPet) => {
    const memberPetKey = getMemberPetKey(memberPet.memberId, memberPet.petId);
    const isSelected = selectedMemberPetKeys.has(memberPetKey);
    const option = createElement("label", {
      className: isSelected ? "class-member-option is-selected" : "class-member-option",
      dataset: {
        entity: "memberPet",
        entityId: memberPetKey,
        state: isSelected ? "selected" : "idle",
      },
    });
    const checkbox = createElement("input", {
      type: "checkbox",
      value: memberPetKey,
      dataset: { field: "classMembers" },
    });
    checkbox.checked = isSelected;
    checkbox.addEventListener("change", () => {
      classSettingsState.draft.memberPetKeys = checkbox.checked
        ? [...selectedMemberPetKeys, memberPetKey]
        : (classSettingsState.draft.memberPetKeys || []).filter((selectedKey) => selectedKey !== memberPetKey);
      rerender(rootElement);
    });
    option.append(checkbox);
    option.append(createElement("strong", { textContent: memberPet.petName || memberPet.dogName || "-" }));
    option.append(createElement("span", { textContent: formatMemberPetMeta(memberPet) }));
    list.append(option);
  });
  return list;
}

function syncClassMemberList(rootElement) {
  const list = document.querySelector("[data-area='classMemberList']");
  if (!list) {
    return;
  }

  list.replaceWith(createClassMemberList(rootElement, getMemberPetRows(getStoredMembers())));
}

function focusClassMemberSearch() {
  window.setTimeout(() => {
    const search = document.querySelector(".class-member-search-input");
    if (!search) {
      return;
    }

    search.focus();
    search.setSelectionRange(search.value.length, search.value.length);
  }, 0);
}

function getVisibleClassMemberPets(memberPets) {
  const query = normalizeClassMemberSearchText(classSettingsState.memberSearchQuery);
  if (!query) {
    return memberPets;
  }

  return memberPets.filter((memberPet) => {
    return [
      memberPet.petName,
      memberPet.dogName,
      memberPet.breed,
      memberPet.guardianName,
      memberPet.phoneNumber,
    ].some((value) => normalizeClassMemberSearchText(value).includes(query));
  });
}

function normalizeClassMemberSearchText(value) {
  return String(value || "").trim().toLowerCase();
}

function createErrorMessage(fieldName) {
  return createElement("span", {
    className: "class-form-error",
    textContent: classSettingsState.errors[fieldName] || "",
  });
}

function openClassModal(rootElement, modalMode, schoolClass = null) {
  classSettingsState.modalMode = modalMode;
  classSettingsState.editingClassId = schoolClass?.id || "";
  classSettingsState.activeModalTab = "basic";
  classSettingsState.memberSearchQuery = "";
  classSettingsState.draft = schoolClass ? createClassDraft(schoolClass) : createEmptyClassDraft();
  classSettingsState.errors = {};
  rerender(rootElement);
}

function closeClassModal(rootElement) {
  classSettingsState.modalMode = "";
  classSettingsState.editingClassId = "";
  classSettingsState.activeModalTab = "basic";
  classSettingsState.memberSearchQuery = "";
  classSettingsState.draft = createEmptyClassDraft();
  classSettingsState.errors = {};
  rerender(rootElement);
}

function submitClassModal(rootElement) {
  if (!canSubmitClassModal()) {
    return;
  }

  const validationResult = validateClassDraft(classSettingsState.draft, classSettingsState.editingClassId);
  if (!validationResult.ok) {
    classSettingsState.errors = validationResult.errors;
    classSettingsState.activeModalTab = "basic";
    rerender(rootElement);
    return;
  }

  if (classSettingsState.modalMode === "edit") {
    const updatedClass = updateSchoolClass(classSettingsState.editingClassId, validationResult.classData);
    if (updatedClass) {
      setSchoolClassMemberPets(updatedClass.id, classSettingsState.draft.memberPetKeys);
    }
  } else {
    const createdClass = createSchoolClass(validationResult.classData);
    setSchoolClassMemberPets(createdClass.id, classSettingsState.draft.memberPetKeys);
  }

  closeClassModal(rootElement);
}

function validateClassNameAvailability(rootElement) {
  if (isDuplicateClassName(classSettingsState.draft.name, classSettingsState.editingClassId)) {
    classSettingsState.errors.name = "이미 존재하는 반 이름입니다.";
    rerender(rootElement);
  }
}

function syncClassModalSubmitButton() {
  const submitButton = document.querySelector("[data-action='submitClassModal']");
  if (!submitButton) {
    return;
  }

  submitButton.disabled = !canSubmitClassModal();
}

function canSubmitClassModal() {
  return hasClassModalChanges() && !hasClassModalErrors();
}

function hasClassModalErrors() {
  return Object.values(classSettingsState.errors || {}).some(Boolean);
}

function hasClassModalChanges() {
  const baselineDraft = getBaselineClassModalDraft();
  return JSON.stringify(createComparableClassDraft(classSettingsState.draft)) !== JSON.stringify(createComparableClassDraft(baselineDraft));
}

function getBaselineClassModalDraft() {
  if (classSettingsState.modalMode !== "edit") {
    return createEmptyClassDraft();
  }

  const schoolClass = loadSchoolClassList().find((classItem) => classItem.id === classSettingsState.editingClassId);
  return schoolClass ? createClassDraft(schoolClass) : createEmptyClassDraft();
}

function createComparableClassDraft(draft) {
  return {
    name: normalizeDraftText(draft.name),
    manager: normalizeDraftText(draft.manager),
    capacity: normalizeDraftCapacity(draft.capacity),
    businessDays: normalizeDraftBusinessDays(draft.businessDays),
    memberPetKeys: normalizeDraftMemberPetKeys(draft.memberPetKeys),
  };
}

function normalizeDraftText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeDraftCapacity(value) {
  const text = String(value ?? "").trim();
  return text ? text : "";
}

function normalizeDraftBusinessDays(businessDays) {
  const selectedDays = Array.isArray(businessDays) ? businessDays : [];
  return WEEKDAYS.map((weekday) => weekday.key).filter((weekdayKey) => selectedDays.includes(weekdayKey));
}

function normalizeDraftMemberPetKeys(memberPetKeys) {
  return Array.isArray(memberPetKeys) ? [...new Set(memberPetKeys.map(String))].sort() : [];
}

function validateClassDraft(draft, excludedClassId = "") {
  const errors = {};
  const name = String(draft.name || "").trim().replace(/\s+/g, " ");
  const manager = String(draft.manager || "").trim().replace(/\s+/g, " ");
  const capacityText = String(draft.capacity ?? "").trim();
  const capacity = capacityText ? Number(capacityText) : null;
  const businessDays = Array.isArray(draft.businessDays) ? [...draft.businessDays] : [];

  if (!name) {
    errors.name = "반 이름을 입력해 주세요.";
  }

  if (name.length > 20) {
    errors.name = "반 이름은 최대 20글자까지 입력할 수 있습니다.";
  }

  if (!errors.name && isDuplicateClassName(name, excludedClassId)) {
    errors.name = "이미 존재하는 반 이름입니다.";
  }

  if (manager.length > 10) {
    errors.manager = "담당은 최대 10글자까지 입력할 수 있습니다.";
  }

  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 99)) {
    errors.capacity = "정원은 1 ~ 99 사이 숫자로 입력해 주세요.";
  }

  if (businessDays.length === 0) {
    errors.businessDays = "영업일은 최소 1개 이상 선택해 주세요.";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    classData: {
      name,
      manager,
      capacity,
      businessDays,
    },
  };
}

function isDuplicateClassName(className, excludedClassId = "") {
  const normalizedClassName = normalizeClassName(className);
  const targetExcludedClassId = String(excludedClassId || "").trim();
  if (!normalizedClassName) {
    return false;
  }

  return loadSchoolClassList().some((schoolClass) => {
    return schoolClass.id !== targetExcludedClassId && normalizeClassName(schoolClass.name) === normalizedClassName;
  });
}

function normalizeClassName(className) {
  return String(className || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function createEmptyClassDraft() {
  return {
    name: "",
    manager: "",
    capacity: "",
    businessDays: getDefaultBusinessDays(),
    memberPetKeys: [],
  };
}

function createClassDraft(schoolClass) {
  return {
    name: schoolClass.name || "",
    manager: schoolClass.manager || "",
    capacity: schoolClass.capacity === null || schoolClass.capacity === "" ? "" : String(schoolClass.capacity),
    businessDays: Array.isArray(schoolClass.businessDays) ? [...schoolClass.businessDays] : [],
    memberPetKeys: getClassMemberPetKeys(schoolClass.id),
  };
}

function getClassMemberPetKeys(classId) {
  return getMemberPetRows(getStoredMembers())
    .filter((memberPet) => {
      return Array.isArray(memberPet.schoolClassIds) && memberPet.schoolClassIds.includes(classId);
    })
    .map((memberPet) => getMemberPetKey(memberPet.memberId, memberPet.petId));
}

function formatMemberPetMeta(memberPet) {
  return [memberPet.breed, memberPet.guardianName].filter(Boolean).join(" / ") || "-";
}

function formatOptionalValue(value) {
  return value === "" || value === null || value === undefined ? "-" : String(value);
}

function formatBusinessDays(businessDays) {
  if (!Array.isArray(businessDays) || businessDays.length === 0) {
    return "-";
  }

  return WEEKDAYS
    .filter((weekday) => businessDays.includes(weekday.key))
    .map((weekday) => weekday.label)
    .join(", ");
}

function getDefaultBusinessDays() {
  return WEEKDAYS.map((weekday) => weekday.key);
}
