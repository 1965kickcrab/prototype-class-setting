import { createSchoolClass } from "../../storage/class-storage.js";
import { getMemberPetKey, getMemberPetRows, getStoredMembers, setSchoolClassMemberPets } from "../../storage/member-storage.js";
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

const registrationState = {
  draft: {
    name: "",
    manager: "",
    capacity: "",
    businessDays: [],
    memberPetKeys: [],
  },
  errors: {},
  memberSearchQuery: "",
  activeTab: "basic",
};

export function renderAppClassRegistration(rootElement) {
  rootElement.innerHTML = "";
  rootElement.append(createAppClassRegistrationScreen(rootElement));
}

function rerender(rootElement) {
  renderAppClassRegistration(rootElement);
}

function createAppClassRegistrationScreen(rootElement) {
  const screen = createElement("main", {
    className: "app-class-screen app-class-registration-screen",
    dataset: { screen: "appClassRegistration", platform: "app" },
  });

  screen.append(createHeader(rootElement));
  screen.append(createForm(rootElement));
  return screen;
}

function createHeader(rootElement) {
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

  const submitButton = createElement("button", {
    className: "app-class-save-button",
    type: "submit",
    textContent: "저장",
    dataset: { action: "submitClassRegistration" },
  });
  submitButton.addEventListener("click", () => {
    submitClassRegistration(rootElement);
  });

  header.append(backButton);
  header.append(createElement("h1", { textContent: "클래스 등록" }));
  header.append(submitButton);
  return header;
}

function createForm(rootElement) {
  const form = createElement("form", {
    className: "app-class-registration-form",
    dataset: { area: "content" },
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitClassRegistration(rootElement);
  });

  form.append(createTabs(rootElement));

  if (registrationState.activeTab === "detail") {
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
    dataset: { area: "classRegistrationTabs" },
  });

  [
    { key: "basic", label: "기본 정보" },
    { key: "detail", label: "상세 정보" },
  ].forEach((tab) => {
    const isSelected = registrationState.activeTab === tab.key;
    const button = createElement("button", {
      className: isSelected ? "app-class-registration-tab is-selected" : "app-class-registration-tab",
      type: "button",
      role: "tab",
      textContent: tab.label,
      dataset: { tab: tab.key, state: isSelected ? "selected" : "idle" },
    });
    button.setAttribute("aria-selected", String(isSelected));
    button.addEventListener("click", () => {
      registrationState.activeTab = tab.key;
      rerender(rootElement);
    });
    tabs.append(button);
  });

  return tabs;
}

function createTextField(rootElement, fieldName, labelText, placeholder, maxLength) {
  const field = createElement("label", {
    className: registrationState.errors[fieldName] ? "app-class-form-field has-error" : "app-class-form-field",
  });
  field.append(createElement("span", { className: "app-class-form-label", textContent: labelText }));
  const input = createElement("input", {
    className: "app-class-form-input",
    type: "text",
    value: registrationState.draft[fieldName],
    placeholder,
    dataset: { field: fieldName },
  });
  input.maxLength = maxLength;
  input.addEventListener("input", (event) => {
    registrationState.draft[fieldName] = event.target.value;
    registrationState.errors[fieldName] = "";
  });
  field.append(input);
  field.append(createErrorMessage(fieldName));
  return field;
}

function createCapacityField(rootElement) {
  const field = createElement("label", {
    className: registrationState.errors.capacity ? "app-class-form-field has-error" : "app-class-form-field",
  });
  field.append(createElement("span", { className: "app-class-form-label", textContent: "정원" }));
  const input = createElement("input", {
    className: "app-class-form-input",
    type: "number",
    value: registrationState.draft.capacity,
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
    registrationState.draft.capacity = numericValue;
    registrationState.errors.capacity = "";
  });
  input.addEventListener("blur", (event) => {
    if (!event.target.value) {
      registrationState.draft.capacity = "";
      return;
    }
    const normalizedCapacity = String(Math.min(Math.max(Number(event.target.value), 1), 99));
    event.target.value = normalizedCapacity;
    registrationState.draft.capacity = normalizedCapacity;
  });
  field.append(input);
  field.append(createErrorMessage("capacity"));
  return field;
}

function createBusinessDaysField(rootElement) {
  const field = createElement("fieldset", {
    className: registrationState.errors.businessDays
      ? "app-class-form-field app-class-day-field has-error"
      : "app-class-form-field app-class-day-field",
  });
  field.append(createElement("legend", { className: "app-class-form-label", textContent: "영업일" }));

  const options = createElement("div", { className: "app-class-weekday-options" });
  WEEKDAYS.forEach((weekday) => {
    const isChecked = registrationState.draft.businessDays.includes(weekday.key);
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
      registrationState.errors.businessDays = "";
      registrationState.draft.businessDays = checkbox.checked
        ? [...registrationState.draft.businessDays, weekday.key]
        : registrationState.draft.businessDays.filter((businessDay) => businessDay !== weekday.key);
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

function createErrorMessage(fieldName) {
  return createElement("p", {
    className: "app-class-form-error",
    textContent: registrationState.errors[fieldName] || "",
  });
}

function createClassMemberField(rootElement) {
  const field = createElement("section", {
    className: "app-class-form-field app-class-member-field",
    dataset: { field: "classMembers" },
  });
  const selectedMemberPetKeys = new Set(registrationState.draft.memberPetKeys || []);
  const label = createElement("div", { className: "app-class-member-label" });
  label.append(createElement("span", { className: "app-class-form-label", textContent: "소속 회원" }));
  label.append(createElement("strong", {
    className: "app-class-member-count",
    textContent: `${selectedMemberPetKeys.size}마리 선택`,
  }));
  field.append(label);

  const memberPets = getMemberPetRows(getStoredMembers());
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
    value: registrationState.memberSearchQuery,
    placeholder: "반려견 / 견종 / 보호자 검색",
    dataset: { field: "classMemberSearch" },
  });
  searchInput.addEventListener("input", (event) => {
    registrationState.memberSearchQuery = event.target.value;
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

  const selectedMemberPetKeys = new Set(registrationState.draft.memberPetKeys || []);
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
      registrationState.draft.memberPetKeys = checkbox.checked
        ? [...selectedMemberPetKeys, memberPetKey]
        : (registrationState.draft.memberPetKeys || []).filter((selectedKey) => selectedKey !== memberPetKey);
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

function submitClassRegistration(rootElement) {
  const errors = validateDraft();
  registrationState.errors = errors;

  if (Object.keys(errors).length > 0) {
    registrationState.activeTab = getErrorTab(errors);
    rerender(rootElement);
    return;
  }

  const createdClass = createSchoolClass({
    name: registrationState.draft.name,
    manager: registrationState.draft.manager,
    capacity: registrationState.draft.capacity,
    businessDays: registrationState.draft.businessDays,
  });
  setSchoolClassMemberPets(createdClass.id, registrationState.draft.memberPetKeys);
  window.location.href = "./app-class-settings.html";
}

function getErrorTab(errors) {
  return errors.name || errors.manager || errors.capacity || errors.businessDays ? "basic" : "detail";
}

function getVisibleMemberPets(memberPets) {
  const query = registrationState.memberSearchQuery.trim().toLowerCase();
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

function validateDraft() {
  const errors = {};
  const name = registrationState.draft.name.trim();
  const manager = registrationState.draft.manager.trim();
  const capacityText = String(registrationState.draft.capacity ?? "").trim();
  const capacity = capacityText ? Number(capacityText) : null;

  if (!name) {
    errors.name = "반 이름을 입력해 주세요.";
  }

  if (manager.length > 10) {
    errors.manager = "담당은 최대 10글자까지 입력할 수 있습니다.";
  }

  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 99)) {
    errors.capacity = "정원은 1명부터 99명까지 입력해 주세요.";
  }

  if (registrationState.draft.businessDays.length === 0) {
    errors.businessDays = "영업일을 선택해 주세요.";
  }

  return errors;
}
