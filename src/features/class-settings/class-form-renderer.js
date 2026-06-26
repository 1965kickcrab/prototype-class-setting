import { createElement } from "../../utils/dom.js";
import { bindImeAwareInput } from "../../utils/ime-input.js";
import { createSchoolClass, deleteSchoolClass, loadSchoolClassList, updateSchoolClass } from "../../storage/class-storage.js";
import { getMemberPetKey, getMemberPetRows, getStoredMembers, setSchoolClassMemberPets } from "../../storage/member-storage.js";

const WEEKDAYS = [
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
  { key: "sat", label: "토" },
  { key: "sun", label: "일" },
];

const classFormState = {
  mode: "create",
  classId: "",
  activeTab: "basic",
  memberSearchQuery: "",
  draft: createEmptyClassDraft(),
  errors: {},
};

export function renderClassForm(rootElement, options = {}) {
  const mode = options.mode === "edit" ? "edit" : "create";
  const schoolClass = mode === "edit" ? findSchoolClass(options.classId) : null;

  if (classFormState.mode !== mode || classFormState.classId !== (options.classId || "")) {
    classFormState.mode = mode;
    classFormState.classId = options.classId || "";
    classFormState.activeTab = "basic";
    classFormState.memberSearchQuery = "";
    classFormState.draft = schoolClass ? createClassDraft(schoolClass) : createEmptyClassDraft();
    classFormState.errors = {};
  }

  rootElement.innerHTML = "";
  rootElement.append(createClassFormScreen(rootElement, schoolClass));
}

function createClassFormScreen(rootElement, schoolClass) {
  const screen = createElement("main", {
    className: "app-page-shell is-flex class-form-app-screen",
    dataset: {
      screen: "classForm",
      mode: classFormState.mode,
      state: classFormState.mode === "edit" && !schoolClass ? "notFound" : "ready",
    },
  });

  screen.append(createClassFormHeader(rootElement));

  if (classFormState.mode === "edit" && !schoolClass) {
    screen.append(createElement("p", {
      className: "class-settings-app-empty",
      textContent: "클래스를 찾을 수 없습니다.",
    }));
    return screen;
  }

  screen.append(createClassFormTabs(rootElement));
  screen.append(createClassForm(rootElement));
  return screen;
}

function createClassFormHeader(rootElement) {
  const header = createElement("header", {
    className: "class-settings-app-header class-form-app-header",
    dataset: { area: "appHeader" },
  });

  const backButton = createElement("button", {
    className: "class-settings-app-icon-button",
    type: "button",
    textContent: "<",
    ariaLabel: "클래스 목록으로 돌아가기",
    dataset: { action: "backToClassSettings" },
  });
  backButton.addEventListener("click", () => {
    window.location.href = "./class.html";
  });

  const actions = createElement("div", {
    className: "class-form-header-actions",
    dataset: { area: "classFormHeaderActions" },
  });

  if (classFormState.mode === "edit") {
    const deleteButton = createElement("button", {
      className: "class-form-delete-button",
      type: "button",
      textContent: "삭제",
      dataset: { action: "deleteClassForm" },
    });
    deleteButton.addEventListener("click", () => {
      deleteClassForm();
    });
    actions.append(deleteButton);
  }

  header.append(backButton);
  header.append(createElement("h1", { textContent: classFormState.mode === "edit" ? "클래스 수정" : "클래스 생성" }));
  header.append(actions);
  return header;
}

function createClassFormTabs(rootElement) {
  const tabs = createElement("div", {
    className: "class-modal-tabs class-form-app-tabs",
    dataset: { area: "classFormTabs" },
  });
  tabs.setAttribute("role", "tablist");

  [
    { key: "basic", label: "기본 정보" },
    { key: "detail", label: "상세 정보" },
  ].forEach((tab) => {
    const isSelected = classFormState.activeTab === tab.key;
    const button = createElement("button", {
      className: isSelected ? "class-modal-tab is-selected" : "class-modal-tab",
      type: "button",
      textContent: tab.label,
      dataset: { action: "switchClassFormTab", tab: tab.key, state: isSelected ? "selected" : "idle" },
    });
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(isSelected));
    button.addEventListener("click", () => {
      classFormState.activeTab = tab.key;
      renderClassForm(rootElement, { mode: classFormState.mode, classId: classFormState.classId });
    });
    tabs.append(button);
  });

  return tabs;
}

function createClassForm(rootElement) {
  const form = createElement("form", {
    className: "class-form-app-content",
    dataset: { area: "classForm" },
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitClassForm(rootElement);
  });

  if (classFormState.activeTab === "detail") {
    form.append(createClassMemberField(rootElement));
  } else {
    form.append(createTextField("name", "반 이름", "최대 20글자", { maxLength: 20 }));
    form.append(createTextField("manager", "담당", "최대 10글자", { maxLength: 10 }));
    form.append(createCapacityField());
    form.append(createBusinessDaysField(rootElement));
  }

  form.append(createFixedSubmitButton(rootElement));
  return form;
}

function createFixedSubmitButton(rootElement) {
  const submitButton = createElement("button", {
    className: "class-form-fixed-submit-button",
    type: "button",
    textContent: "저장",
    dataset: { action: "submitClassForm" },
  });
  submitButton.disabled = !hasClassFormChanges();
  submitButton.addEventListener("click", () => {
    submitClassForm(rootElement);
  });
  return submitButton;
}

function createTextField(fieldName, labelText, placeholder, options = {}) {
  const field = createElement("label", {
    className: classFormState.errors[fieldName] ? "class-form-field has-error" : "class-form-field",
  });
  field.append(createElement("span", { className: "class-form-label", textContent: labelText }));
  const input = createElement("input", {
    className: "form-input class-form-input",
    type: "text",
    value: classFormState.draft[fieldName],
    placeholder,
    dataset: { field: fieldName },
  });
  if (options.maxLength) {
    input.maxLength = options.maxLength;
  }
  input.addEventListener("input", (event) => {
    classFormState.draft[fieldName] = event.target.value;
    classFormState.errors[fieldName] = "";
    syncFixedSubmitButton();
  });
  field.append(input);
  field.append(createErrorMessage(fieldName));
  return field;
}

function createCapacityField() {
  const field = createElement("label", {
    className: classFormState.errors.capacity ? "class-form-field has-error" : "class-form-field",
  });
  field.append(createElement("span", { className: "class-form-label", textContent: "정원" }));
  const input = createElement("input", {
    className: "form-input class-form-input",
    type: "number",
    value: classFormState.draft.capacity,
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
    classFormState.draft.capacity = numericValue;
    classFormState.errors.capacity = "";
    syncFixedSubmitButton();
  });
  input.addEventListener("blur", (event) => {
    if (!event.target.value) {
      classFormState.draft.capacity = "";
      syncFixedSubmitButton();
      return;
    }

    const normalizedCapacity = String(Math.min(Math.max(Number(event.target.value), 1), 99));
    event.target.value = normalizedCapacity;
    classFormState.draft.capacity = normalizedCapacity;
    syncFixedSubmitButton();
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
    className: classFormState.errors.businessDays ? "class-form-field class-day-field has-error" : "class-form-field class-day-field",
  });
  field.append(createElement("legend", { className: "class-form-label", textContent: "영업일" }));
  field.append(createElement("p", {
    className: "class-form-description",
    textContent: "회원은 영업일 내에서만 예약할 수 있습니다.",
  }));

  const options = createElement("div", { className: "class-weekday-options" });
  WEEKDAYS.forEach((weekday) => {
    const isChecked = classFormState.draft.businessDays.includes(weekday.key);
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
      classFormState.errors.businessDays = "";
      classFormState.draft.businessDays = checkbox.checked
        ? [...classFormState.draft.businessDays, weekday.key]
        : classFormState.draft.businessDays.filter((businessDay) => businessDay !== weekday.key);
      renderClassForm(rootElement, { mode: classFormState.mode, classId: classFormState.classId });
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
  const selectedMemberPetKeys = new Set(classFormState.draft.memberPetKeys || []);
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
    value: classFormState.memberSearchQuery || "",
    placeholder: "반려견 / 견종 / 보호자 검색",
    dataset: { field: "classMemberSearch" },
  });
  bindImeAwareInput(search, {
    onInput: (event, meta) => {
      classFormState.memberSearchQuery = event.target.value;

      if (meta.isComposing) {
        syncClassMemberList(rootElement);
        return;
      }

      renderClassForm(rootElement, { mode: classFormState.mode, classId: classFormState.classId });
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

  const selectedMemberPetKeys = new Set(classFormState.draft.memberPetKeys || []);
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
      classFormState.draft.memberPetKeys = checkbox.checked
        ? [...selectedMemberPetKeys, memberPetKey]
        : (classFormState.draft.memberPetKeys || []).filter((selectedKey) => selectedKey !== memberPetKey);
      renderClassForm(rootElement, { mode: classFormState.mode, classId: classFormState.classId });
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

function submitClassForm(rootElement) {
  if (!hasClassFormChanges()) {
    return;
  }

  const validationResult = validateClassDraft(classFormState.draft);
  if (!validationResult.ok) {
    classFormState.errors = validationResult.errors;
    classFormState.activeTab = "basic";
    renderClassForm(rootElement, { mode: classFormState.mode, classId: classFormState.classId });
    return;
  }

  if (classFormState.mode === "edit") {
    const updatedClass = updateSchoolClass(classFormState.classId, validationResult.classData);
    if (updatedClass) {
      setSchoolClassMemberPets(updatedClass.id, classFormState.draft.memberPetKeys);
    }
  } else {
    const createdClass = createSchoolClass(validationResult.classData);
    setSchoolClassMemberPets(createdClass.id, classFormState.draft.memberPetKeys);
  }

  window.location.href = "./class.html";
}

function deleteClassForm() {
  if (classFormState.mode !== "edit" || !classFormState.classId || !confirm("클래스를 삭제하시겠습니까?")) {
    return;
  }

  deleteSchoolClass(classFormState.classId);
  setSchoolClassMemberPets(classFormState.classId, []);
  window.location.href = "./class.html";
}

function syncFixedSubmitButton() {
  document.querySelectorAll("[data-action='submitClassForm']").forEach((button) => {
    button.disabled = !hasClassFormChanges();
  });
}

function hasClassFormChanges() {
  const baselineDraft = getBaselineClassDraft();
  return JSON.stringify(createComparableClassDraft(classFormState.draft)) !== JSON.stringify(createComparableClassDraft(baselineDraft));
}

function getBaselineClassDraft() {
  if (classFormState.mode !== "edit") {
    return createEmptyClassDraft();
  }

  const schoolClass = findSchoolClass(classFormState.classId);
  return schoolClass ? createClassDraft(schoolClass) : createEmptyClassDraft();
}

function createComparableClassDraft(draft) {
  return {
    name: normalizeComparableText(draft.name),
    manager: normalizeComparableText(draft.manager),
    capacity: normalizeComparableCapacity(draft.capacity),
    businessDays: normalizeComparableBusinessDays(draft.businessDays),
    memberPetKeys: normalizeComparableMemberPetKeys(draft.memberPetKeys),
  };
}

function normalizeComparableText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeComparableCapacity(value) {
  const text = String(value ?? "").trim();
  return text ? text : "";
}

function normalizeComparableBusinessDays(businessDays) {
  const selectedDays = Array.isArray(businessDays) ? businessDays : [];
  return WEEKDAYS.map((weekday) => weekday.key).filter((weekdayKey) => selectedDays.includes(weekdayKey));
}

function normalizeComparableMemberPetKeys(memberPetKeys) {
  return Array.isArray(memberPetKeys) ? [...new Set(memberPetKeys.map(String))].sort() : [];
}

function validateClassDraft(draft) {
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

  if (manager.length > 10) {
    errors.manager = "담당은 최대 10글자까지 입력할 수 있습니다.";
  }

  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 99)) {
    errors.capacity = "정원은 1 ~ 99 사이 숫자로 입력해 주세요.";
  }

  if (businessDays.length === 0) {
    errors.businessDays = "영업일을 선택해 주세요.";
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

function findSchoolClass(classId) {
  return loadSchoolClassList().find((schoolClass) => schoolClass.id === classId) || null;
}

function createEmptyClassDraft() {
  return {
    name: "",
    manager: "",
    capacity: "",
    businessDays: [],
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

function getVisibleClassMemberPets(memberPets) {
  const query = normalizeClassMemberSearchText(classFormState.memberSearchQuery);
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

function formatMemberPetMeta(memberPet) {
  return [memberPet.breed, memberPet.guardianName].filter(Boolean).join(" / ") || "-";
}

function createErrorMessage(fieldName) {
  return createElement("span", {
    className: "class-form-error",
    textContent: classFormState.errors[fieldName] || "",
  });
}
