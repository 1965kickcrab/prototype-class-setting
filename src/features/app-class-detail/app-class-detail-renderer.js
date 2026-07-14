import {
  deleteSchoolClass,
  loadSchoolClassList,
  updateSchoolClass,
} from "../../storage/class-storage.js";
import { getMemberPetKey, getMemberPetRows, getStoredMembers, setSchoolClassMemberPets } from "../../storage/member-storage.js";
import { detachStoredSchoolReservationsClass } from "../../storage/school-home-storage.js";
import { createElement } from "../../utils/dom.js";

const BACK_ICON_PATH = "assets/icons/iconBack.svg";
const WEEKDAYS = [
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
  { key: "sat", label: "토" },
  { key: "sun", label: "일" },
];

const detailState = {
  classId: "",
  draft: createEmptyDraft(),
  errors: {},
  memberSearchQuery: "",
  activeTab: "basic",
  isInitialized: false,
};

export function renderAppClassDetail(rootElement) {
  const queryParams = new URLSearchParams(window.location.search);
  const classId = queryParams.get("id") || "";
  const schoolClass = loadSchoolClassList().find((classItem) => classItem.id === classId) || null;

  if (!detailState.isInitialized || detailState.classId !== classId) {
    detailState.classId = classId;
    detailState.draft = schoolClass ? createClassDraft(schoolClass) : createEmptyDraft();
    detailState.errors = {};
    detailState.memberSearchQuery = "";
    detailState.activeTab = "basic";
    detailState.isInitialized = true;
  }

  rootElement.innerHTML = "";
  rootElement.append(createAppClassEditScreen(rootElement, schoolClass));
}

function rerender(rootElement) {
  renderAppClassDetail(rootElement);
}

function createAppClassEditScreen(rootElement, schoolClass) {
  const screen = createElement("main", {
    className: "app-class-screen app-class-registration-screen app-class-detail-screen",
    dataset: { screen: "appClassDetail", platform: "app", state: schoolClass ? "edit" : "missing" },
  });

  screen.append(createHeader(rootElement, schoolClass));
  screen.append(schoolClass ? createForm(rootElement) : createMissingState());
  if (schoolClass) {
    screen.append(createFixedSubmitButton(rootElement));
  }
  return screen;
}

function createHeader(rootElement, schoolClass) {
  const header = createElement("header", {
    className: "app-class-header app-class-registration-header",
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
    window.location.href = "./app-class-settings.html";
  });

  const deleteButton = createElement("button", {
    className: "app-class-save-button app-class-delete-button",
    type: "button",
    textContent: "삭제",
    dataset: { action: "deleteClass" },
  });
  deleteButton.addEventListener("click", () => {
    deleteClass();
  });

  header.append(backButton);
  header.append(createElement("h1", { textContent: "클래스 수정" }));
  header.append(schoolClass ? deleteButton : createElement("span", { className: "app-class-header-spacer" }));
  return header;
}

function createFixedSubmitButton(rootElement) {
  const submitButton = createElement("button", {
    className: "app-class-edit-submit-button",
    type: "button",
    textContent: "수정",
    dataset: { action: "submitClassEdit" },
  });
  updateSubmitButtonState(submitButton);
  submitButton.addEventListener("click", () => {
    submitClassEdit(rootElement);
  });
  return submitButton;
}

function createForm(rootElement) {
  const form = createElement("form", {
    className: "app-class-registration-form",
    dataset: { area: "content" },
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitClassEdit(rootElement);
  });

  form.append(createTabs(rootElement));

  if (detailState.activeTab === "detail") {
    form.append(createClassMemberField(rootElement));
    return form;
  }

  form.append(createTextField(rootElement, "name", "반 이름", "최대 20글자", 20));
  form.append(createTextField(rootElement, "manager", "담당", "최대 10글자", 10));
  form.append(createCapacityField(rootElement));
  form.append(createBusinessDaysField(rootElement));
  return form;
}

function createTabs(rootElement) {
  const tabs = createElement("div", {
    className: "app-class-registration-tabs",
    role: "tablist",
    dataset: { area: "classEditTabs" },
  });

  [
    { key: "basic", label: "기본 정보" },
    { key: "detail", label: "상세 정보" },
  ].forEach((tab) => {
    const isSelected = detailState.activeTab === tab.key;
    const button = createElement("button", {
      className: isSelected ? "app-class-registration-tab is-selected" : "app-class-registration-tab",
      type: "button",
      role: "tab",
      textContent: tab.label,
      dataset: { tab: tab.key, state: isSelected ? "selected" : "idle" },
    });
    button.setAttribute("aria-selected", String(isSelected));
    button.addEventListener("click", () => {
      detailState.activeTab = tab.key;
      rerender(rootElement);
    });
    tabs.append(button);
  });

  return tabs;
}

function createTextField(rootElement, fieldName, labelText, placeholder, maxLength) {
  const field = createElement("label", {
    className: detailState.errors[fieldName] ? "app-class-form-field has-error" : "app-class-form-field",
  });
  field.append(createElement("span", { className: "app-class-form-label", textContent: labelText }));
  const input = createElement("input", {
    className: "app-class-form-input",
    type: "text",
    value: detailState.draft[fieldName],
    placeholder,
    dataset: { field: fieldName },
  });
  input.maxLength = maxLength;
  input.addEventListener("input", (event) => {
    detailState.draft[fieldName] = event.target.value;
    detailState.errors[fieldName] = "";
    syncSubmitButtonState(rootElement);
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
    className: detailState.errors.capacity ? "app-class-form-field has-error" : "app-class-form-field",
  });
  field.append(createElement("span", { className: "app-class-form-label", textContent: "정원" }));
  const input = createElement("input", {
    className: "app-class-form-input",
    type: "number",
    value: detailState.draft.capacity,
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
    detailState.draft.capacity = numericValue;
    detailState.errors.capacity = "";
    syncSubmitButtonState(rootElement);
  });
  input.addEventListener("blur", (event) => {
    if (!event.target.value) {
      detailState.draft.capacity = "";
      return;
    }
    const normalizedCapacity = String(Math.min(Math.max(Number(event.target.value), 1), 99));
    event.target.value = normalizedCapacity;
    detailState.draft.capacity = normalizedCapacity;
    syncSubmitButtonState(rootElement);
  });
  field.append(input);
  field.append(createErrorMessage("capacity"));
  return field;
}

function createBusinessDaysField(rootElement) {
  const field = createElement("fieldset", {
    className: detailState.errors.businessDays
      ? "app-class-form-field app-class-day-field has-error"
      : "app-class-form-field app-class-day-field",
  });
  field.append(createElement("legend", { className: "app-class-form-label", textContent: "영업일" }));

  const options = createElement("div", { className: "app-class-weekday-options" });
  WEEKDAYS.forEach((weekday) => {
    const isChecked = detailState.draft.businessDays.includes(weekday.key);
    const label = createElement("label", {
      className: isChecked ? "app-class-weekday-option is-selected" : "app-class-weekday-option",
      dataset: { state: isChecked ? "selected" : "idle" },
    });
    const checkbox = createElement("input", {
      type: "checkbox",
      value: weekday.key,
      dataset: { field: "businessDays" },
    });
    checkbox.checked = isChecked;
    checkbox.addEventListener("change", () => {
      detailState.errors.businessDays = "";
      detailState.draft.businessDays = checkbox.checked
        ? [...detailState.draft.businessDays, weekday.key]
        : detailState.draft.businessDays.filter((businessDay) => businessDay !== weekday.key);
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
    className: "app-class-form-field app-class-member-field",
    dataset: { field: "classMembers" },
  });
  const selectedMemberPetKeys = new Set(detailState.draft.memberPetKeys || []);
  const label = createElement("div", { className: "app-class-member-label" });
  label.append(createElement("span", { className: "app-class-form-label", textContent: "소속 회원" }));
  const memberPets = getMemberPetRows(getStoredMembers());
  const actions = createElement("div", { className: "app-class-member-actions" });
  actions.append(createElement("strong", {
    className: "app-class-member-count",
    textContent: `${selectedMemberPetKeys.size}마리 선택`,
  }));
  actions.append(createMemberSelectAllButton(rootElement, memberPets, selectedMemberPetKeys));
  label.append(actions);
  field.append(label);

  if (memberPets.length === 0) {
    field.append(createElement("p", {
      className: "app-class-member-empty",
      textContent: "등록된 회원이 없습니다.",
    }));
    return field;
  }

  const searchInput = createElement("input", {
    className: "app-class-member-search",
    type: "search",
    value: detailState.memberSearchQuery,
    placeholder: "반려견 / 견종 / 보호자 검색",
    dataset: { field: "classMemberSearch" },
  });
  searchInput.addEventListener("input", (event) => {
    detailState.memberSearchQuery = event.target.value;
    rerender(rootElement);
  });
  field.append(searchInput);
  field.append(createClassMemberList(rootElement, memberPets));
  return field;
}

function createClassMemberList(rootElement, memberPets) {
  const visibleMemberPets = getVisibleMemberPets(memberPets);
  const list = createElement("div", {
    className: "app-class-member-list",
    dataset: { area: "classMemberList", state: visibleMemberPets.length ? "list" : "empty" },
  });

  if (visibleMemberPets.length === 0) {
    list.append(createElement("p", {
      className: "app-class-member-empty",
      textContent: "조회 결과가 없습니다.",
    }));
    return list;
  }

  const selectedMemberPetKeys = new Set(detailState.draft.memberPetKeys || []);
  visibleMemberPets.forEach((memberPet) => {
    const memberPetKey = getMemberPetKey(memberPet.memberId, memberPet.petId);
    const isSelected = selectedMemberPetKeys.has(memberPetKey);
    const option = createElement("label", {
      className: isSelected ? "app-class-member-option is-selected" : "app-class-member-option",
      dataset: { entity: "memberPet", entityId: memberPetKey, state: isSelected ? "selected" : "idle" },
    });
    const checkbox = createElement("input", {
      type: "checkbox",
      value: memberPetKey,
      dataset: { field: "classMembers" },
    });
    checkbox.checked = isSelected;
    checkbox.addEventListener("change", () => {
      detailState.draft.memberPetKeys = checkbox.checked
        ? [...selectedMemberPetKeys, memberPetKey]
        : (detailState.draft.memberPetKeys || []).filter((selectedKey) => selectedKey !== memberPetKey);
      rerender(rootElement);
    });
    option.append(checkbox);

    const text = createElement("span", { className: "app-class-member-option-text" });
    text.append(createElement("strong", { textContent: memberPet.petName || memberPet.dogName || "-" }));
    text.append(createElement("small", { textContent: formatMemberPetMeta(memberPet) }));
    option.append(text);
    list.append(option);
  });

  return list;
}

function createMemberSelectAllButton(rootElement, memberPets, selectedMemberPetKeys) {
  const isAllSelected = areAllMemberPetsSelected(memberPets, selectedMemberPetKeys);
  const button = createElement("button", {
    className: "app-class-member-select-all-button",
    type: "button",
    textContent: isAllSelected ? "전체 해제" : "전체 선택",
    dataset: { action: "toggleAllClassMembers", state: isAllSelected ? "selected" : "idle" },
  });
  button.disabled = memberPets.length === 0;
  button.addEventListener("click", () => {
    detailState.draft.memberPetKeys = isAllSelected ? [] : getMemberPetKeys(memberPets);
    rerender(rootElement);
  });
  return button;
}

function areAllMemberPetsSelected(memberPets, selectedMemberPetKeys) {
  return memberPets.length > 0 && getMemberPetKeys(memberPets).every((memberPetKey) => {
    return selectedMemberPetKeys.has(memberPetKey);
  });
}

function getMemberPetKeys(memberPets) {
  return memberPets.map((memberPet) => getMemberPetKey(memberPet.memberId, memberPet.petId));
}

function createErrorMessage(fieldName) {
  return createElement("p", {
    className: "app-class-form-error",
    textContent: detailState.errors[fieldName] || "",
  });
}

function createMissingState() {
  const content = createElement("section", {
    className: "app-class-registration-form",
    dataset: { area: "content", state: "missing" },
  });
  content.append(createElement("p", {
    className: "app-class-member-empty",
    textContent: "클래스 정보를 찾을 수 없습니다.",
  }));
  return content;
}

function submitClassEdit(rootElement) {
  const errors = validateDraft();
  detailState.errors = errors;

  if (Object.keys(errors).length > 0) {
    detailState.activeTab = "basic";
    rerender(rootElement);
    return;
  }

  const updatedClass = updateSchoolClass(detailState.classId, {
    name: detailState.draft.name,
    manager: detailState.draft.manager,
    capacity: detailState.draft.capacity,
    businessDays: detailState.draft.businessDays,
  });

  if (updatedClass) {
    setSchoolClassMemberPets(updatedClass.id, detailState.draft.memberPetKeys);
  }

  window.location.href = "./app-class-settings.html";
}

function syncSubmitButtonState(rootElement) {
  const submitButton = rootElement.querySelector('[data-action="submitClassEdit"]');
  if (submitButton) {
    updateSubmitButtonState(submitButton);
  }
}

function updateSubmitButtonState(submitButton) {
  const isSubmittable = Object.keys(validateDraft()).length === 0;
  submitButton.disabled = !isSubmittable;
  submitButton.dataset.state = isSubmittable ? "enabled" : "disabled";
}

function deleteClass() {
  const deletedClass = loadSchoolClassList().find((schoolClass) => schoolClass.id === detailState.classId);
  if (!deletedClass || !confirm("클래스를 삭제하시겠습니까?\n연결된 예약은 클래스 미지정으로 전환되며, 당시 클래스와 정원 정보는 보존됩니다.")) {
    return;
  }

  deleteSchoolClass(deletedClass.id);
  detachStoredSchoolReservationsClass(deletedClass);
  setSchoolClassMemberPets(deletedClass.id, []);
  window.location.href = "./app-class-settings.html";
}

function validateDraft() {
  const errors = {};
  const name = detailState.draft.name.trim();
  const manager = detailState.draft.manager.trim();
  const capacityText = String(detailState.draft.capacity ?? "").trim();
  const capacity = capacityText ? Number(capacityText) : null;

  if (!name) {
    errors.name = "반 이름을 입력해 주세요.";
  }

  if (!errors.name && isDuplicateClassName(name, detailState.classId)) {
    errors.name = "이미 존재하는 반 이름입니다.";
  }

  if (manager.length > 10) {
    errors.manager = "담당은 최대 10글자까지 입력할 수 있습니다.";
  }

  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 99)) {
    errors.capacity = "정원은 1마리부터 99마리까지 입력해 주세요.";
  }

  if (!Array.isArray(detailState.draft.businessDays) || detailState.draft.businessDays.length === 0) {
    errors.businessDays = "영업일은 최소 1개 이상 선택해 주세요.";
  }

  return errors;
}

function validateClassNameAvailability(rootElement) {
  if (isDuplicateClassName(detailState.draft.name, detailState.classId)) {
    detailState.errors.name = "이미 존재하는 반 이름입니다.";
    rerender(rootElement);
  }
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

function createEmptyDraft() {
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

function getVisibleMemberPets(memberPets) {
  const query = detailState.memberSearchQuery.trim().toLowerCase();
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
    ].some((value) => String(value || "").toLowerCase().includes(query));
  });
}

function formatMemberPetMeta(memberPet) {
  return [memberPet.breed, memberPet.guardianName].filter(Boolean).join(" / ") || "-";
}

function getDefaultBusinessDays() {
  return WEEKDAYS.map((weekday) => weekday.key);
}
