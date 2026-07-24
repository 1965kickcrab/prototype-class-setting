import { ACTION_BUTTON_STATE } from "../../constants/ui-state.js";
import { createElement } from "../../utils/dom.js";
import { formatText } from "../../utils/format.js";
import { getAgeOutputText, normalizeBirthDateParts } from "../../utils/member-date.js";
import { formatPhoneNumber } from "../../utils/phone.js";
import { deleteStoredMember, mergeMemberTagCatalog, saveRegisteredMembers } from "../../storage/member-storage.js";
import { sanitizeTagList } from "../../services/member-tag-service.js";
import { initTagInput } from "../../components/member-tag-input.js";
import { createToast, TOAST_AUTO_DISMISS_MS } from "../../components/toast.js";
import { createHeaderIconButton } from "../../components/header-icon-button.js";
import { createEmptyPetDraft, createGuardianDraft, createPetDraft } from "./member-edit-draft.js";

const DEFAULT_DOG_PROFILE_IMAGE = "assets/images/defaultProfile_dog.svg";
let toastDismissTimer = null;

export function renderMemberEdit(rootElement, memberEditState) {
  rootElement.innerHTML = "";
  rootElement.append(memberEditState.activeScreen === "guardianEdit" ? createGuardianEditScreen(memberEditState) : createMemberEditScreen(memberEditState));
  scheduleToastDismiss(memberEditState);
}

function rerender(memberEditState) {
  renderMemberEdit(document.querySelector("#app"), memberEditState);
}

function scheduleToastDismiss(memberEditState) {
  window.clearTimeout(toastDismissTimer);

  if (!memberEditState.toastMessage) {
    return;
  }

  toastDismissTimer = window.setTimeout(() => {
    memberEditState.toastMessage = "";
    rerender(memberEditState);
  }, TOAST_AUTO_DISMISS_MS);
}

function createMemberEditScreen(memberEditState) {
  const page = createElement("main", {
    className: "app-page-shell member-edit-page",
    dataset: { screen: "memberEdit" },
  });

  page.append(createHeader(memberEditState));
  page.append(createContent(memberEditState));

  if (memberEditState.activeSheet === "petDetail") {
    page.append(createPetBottomSheet(memberEditState, "반려견 상세", memberEditState.petDetailDraft, () => submitPetDetail(memberEditState), "수정", "petDetailBottomSheet"));
  }

  if (memberEditState.activeSheet === "addPet") {
    page.append(createPetBottomSheet(memberEditState, "반려견 추가", memberEditState.addPetDraft, () => submitAddPet(memberEditState), "추가", "addPetBottomSheet"));
  }

  if (memberEditState.activeAlert === "deleteAll") {
    page.append(createDeleteAlert(memberEditState));
  }

  if (memberEditState.toastMessage) {
    page.append(createToast(memberEditState.toastMessage));
  }

  return page;
}

function createHeader(memberEditState) {
  const header = createElement("header", { className: "registration-header member-edit-header", dataset: { area: "header" } });
  const closeButton = createHeaderIconButton({
    className: "page-close-button close-button",
    icon: "close",
    ariaLabel: "회원 수정 닫기",
    dataset: { action: "closeMemberEdit" },
  });
  closeButton.addEventListener("click", () => {
    window.location.href = createMemberDetailUrl(memberEditState);
  });

  const deleteButton = createElement("button", { className: "member-edit-delete-all-button", type: "button", textContent: "전체 삭제", dataset: { action: "deleteMember" } });
  deleteButton.addEventListener("click", () => {
    memberEditState.activeAlert = "deleteAll";
    rerender(memberEditState);
  });

  header.append(closeButton);
  header.append(createElement("h1", { textContent: "회원 수정" }));
  header.append(deleteButton);
  return header;
}

function createContent(memberEditState) {
  const content = createElement("section", { className: "registration-content member-edit-content", dataset: { area: "content" } });
  content.append(createGuardianSection(memberEditState));
  content.append(createPetSection(memberEditState));
  return content;
}

function createGuardianSection(memberEditState) {
  const member = memberEditState.selectedMember;
  const section = createElement("section", { className: "registration-card guardian-summary-section", dataset: { area: "guardianInfo" } });
  const header = createElement("div", { className: "registration-section-header" });
  header.append(createElement("h2", { textContent: "보호자 정보" }));
  const editButton = createElement("button", { className: "text-action-button", type: "button", textContent: "수정", dataset: { action: "editGuardianInfo" } });
  editButton.addEventListener("click", () => {
    memberEditState.guardianDraft = createGuardianDraft(memberEditState.selectedMember);
    memberEditState.activeScreen = "guardianEdit";
    rerender(memberEditState);
  });
  header.append(editButton);

  const summaryList = createElement("ul", { className: "guardian-summary-list" });
  summaryList.append(createSummaryLine("보호자 이름", formatText(member.guardianName)));
  summaryList.append(createSummaryLine("전화번호", formatText(formatPhoneNumber(member.phoneNumber))));
  summaryList.append(createSummaryLine("주소", formatText(formatGuardianAddress(member))));

  section.append(header);
  section.append(summaryList);
  return section;
}

function createPetSection(memberEditState) {
  const section = createElement("section", { className: "registration-card pet-registration-card", dataset: { area: "petRegistration" } });
  const header = createElement("div", { className: "registration-section-header" });
  header.append(createElement("h2", { textContent: "반려견 정보" }));
  section.append(header);

  const addButton = createElement("button", { className: "mobile-add-pet-button", type: "button", textContent: "+ 반려견 추가", dataset: { action: "addPet" } });
  addButton.addEventListener("click", () => {
    memberEditState.addPetDraft = createEmptyPetDraft();
    memberEditState.activeSheet = "addPet";
    rerender(memberEditState);
  });
  section.append(addButton);

  const list = createElement("section", { className: "mobile-pet-list", dataset: { area: "mobilePetList", state: memberEditState.selectedMember.pets.length ? "list" : "empty" } });
  memberEditState.selectedMember.pets.forEach((pet) => {
    list.append(createPetListItem(memberEditState, pet));
  });
  section.append(list);

  return section;
}

function createPetListItem(memberEditState, pet) {
  const item = createElement("button", {
    className: "mobile-pet-list-item",
    type: "button",
    dataset: { action: "openPetDetail", entity: "pet", entityId: pet.id },
  });
  item.append(createElement("img", { className: "mobile-pet-list-image", src: DEFAULT_DOG_PROFILE_IMAGE, alt: "" }));
  const text = createElement("span", { className: "mobile-pet-list-text" });
  text.append(createElement("strong", { textContent: formatText(pet.petName || pet.dogName) }));
  text.append(createElement("span", { textContent: formatText(pet.breed) }));
  item.append(text);
  item.append(createElement("span", { className: "mobile-pet-list-arrow", textContent: "›" }));
  item.addEventListener("click", () => {
    memberEditState.selectedPet = pet;
    memberEditState.petDetailDraft = createPetDraft(pet);
    memberEditState.activeSheet = "petDetail";
    rerender(memberEditState);
  });
  return item;
}

function createPetBottomSheet(memberEditState, title, draft, onSubmit, submitText = "수정", modalName = "petDetailBottomSheet") {
  const overlay = createElement("section", { className: "pet-bottom-sheet-overlay", dataset: { area: modalName, modal: modalName, state: "open" } });
  const sheet = createElement("div", { className: "pet-bottom-sheet" });
  const header = createElement("header", { className: "bottom-sheet-header" });
  const closeButton = createHeaderIconButton({
    className: "bottom-sheet-close-button close-button",
    icon: "close",
    ariaLabel: `${title} 닫기`,
    dataset: { action: "closePetSheet" },
  });
  closeButton.addEventListener("click", () => {
    memberEditState.activeSheet = "";
    rerender(memberEditState);
  });
  header.append(closeButton);
  header.append(createElement("h2", { textContent: title }));
  header.append(createElement("span", { className: "header-spacer" }));

  const body = createElement("section", { className: "bottom-sheet-body" });
  body.append(createPetForm(memberEditState, draft));

  const submitButton = createElement("button", {
    className: "large-disabled-button bottom-sheet-submit-button",
    type: "button",
    textContent: submitText,
    dataset: { action: "submitPet", state: isPetReady(draft) ? ACTION_BUTTON_STATE.enabled : ACTION_BUTTON_STATE.disabled },
  });
  submitButton.disabled = !isPetReady(draft);
  submitButton.addEventListener("click", onSubmit);

  sheet.append(header);
  sheet.append(body);
  sheet.append(submitButton);
  overlay.append(sheet);
  return overlay;
}

function createPetForm(memberEditState, draft) {
  const section = createElement("section", {
    className: "pet-form-section mobile-pet-form-section",
    dataset: { area: "petForm" },
  });

  const formBody = createElement("div", { className: "pet-form-body" });
  const leftColumn = createElement("div", { className: "pet-form-column pet-form-left" });
  const rightColumn = createElement("div", { className: "pet-form-column pet-form-right" });

  leftColumn.append(createPetPhotoArea());
  leftColumn.append(createPetTextField(memberEditState, draft, "반려견 이름", "petName", "한글, 영문, 숫자 입력 가능 (12자 이내)", true));
  leftColumn.append(createPetTextField(memberEditState, draft, "견종", "breed", "견종을 검색해 주세요.", true, "input", "search"));
  leftColumn.append(createPetTextField(memberEditState, draft, "메모", "memo", "성격, 알러지 등 필요한 내용을 입력해 주세요. (최대 500자)", false, "textarea", "text", "mobile-main-only"));
  leftColumn.append(createWeightField(memberEditState, draft));

  rightColumn.append(createPetTextField(memberEditState, draft, "동물등록번호", "animalRegistrationNumber", "410XXXXXXXXXXXX"));
  rightColumn.append(createPetTextField(memberEditState, draft, "모색", "coatColor", "20자 이내 입력"));
  rightColumn.append(createBirthDateField(memberEditState, draft));
  rightColumn.append(createChoiceField(memberEditState, draft, "성별", "gender", ["선택 안함", "남아", "여아"]));
  rightColumn.append(createChoiceField(memberEditState, draft, "중성화 여부", "neuteredStatus", ["선택안함", "완료", "미완료"]));
  rightColumn.append(createPetTagField(memberEditState, draft));

  formBody.append(leftColumn);
  formBody.append(rightColumn);
  section.append(formBody);
  section.append(createPetTextField(memberEditState, draft, "메모", "memo", "성격, 알러지 등 필요한 내용을 입력해 주세요. (최대 500자)", false, "textarea", "text", "web-memo-field"));
  return section;
}

function createPetPhotoArea() {
  const photoArea = createElement("div", { className: "pet-photo-area", dataset: { area: "petProfileImage" } });
  photoArea.append(createElement("img", { className: "pet-photo-image", src: DEFAULT_DOG_PROFILE_IMAGE, alt: "반려견 기본 프로필" }));
  photoArea.append(createElement("button", { className: "pet-photo-button", type: "button", textContent: "+", ariaLabel: "반려견 사진 등록", dataset: { action: "addPetPhoto" } }));
  return photoArea;
}

function createPetTextField(memberEditState, draft, labelText, fieldName, placeholder, isRequired = false, tagName = "input", inputType = "text", extraClassName = "") {
  return createFormField(labelText, placeholder, isRequired, draft[fieldName], tagName, inputType, extraClassName, {
    onInput: (value) => {
      draft[fieldName] = value;
      syncSubmitButton(draft);
    },
  });
}

function createWeightField(memberEditState, draft) {
  const field = createFormField("몸무게", "0~999 사이 숫자만 입력", false, draft.weight, "input", "text", "", {
    onInput: (value) => {
      draft.weight = value;
      syncSubmitButton(draft);
    },
  });
  field.className = `${field.className} has-unit`;
  field.append(createElement("span", { className: "input-unit", textContent: "kg" }));
  return field;
}

function createBirthDateField(memberEditState, draft) {
  const field = createElement("fieldset", { className: "registration-field birth-date-field", dataset: { field: "생년월일" } });
  field.append(createElement("legend", { className: "registration-label", textContent: "생년월일" }));
  const birthDateParts = String(draft.birthDate || "").split("-");
  const birthInputs = createElement("div", { className: "birth-date-inputs" });
  const ageOutput = createElement("output", { className: "age-output", textContent: getAgeOutputText(draft.birthDate) });

  ["연도", "월", "일"].forEach((placeholder, index) => {
    const input = createElement("input", { className: "registration-input birth-date-input", type: "text", placeholder, value: birthDateParts[index] || "" });
    input.addEventListener("input", () => {
      const dateParts = Array.from(birthInputs.querySelectorAll(".birth-date-input")).map((dateInput) => dateInput.value);
      draft.birthDate = normalizeBirthDateParts(dateParts);
      ageOutput.textContent = getAgeOutputText(draft.birthDate);
      syncSubmitButton(draft);
    });
    birthInputs.append(input);
  });
  birthInputs.append(ageOutput);
  field.append(birthInputs);
  field.append(createElement("p", { className: "field-guide-message", textContent: "정확한 생년월일을 모르면 연도만 적어 주세요." }));
  return field;
}

function createChoiceField(memberEditState, draft, labelText, fieldName, options) {
  const field = createElement("fieldset", { className: "registration-field choice-field", dataset: { field: labelText } });
  field.append(createElement("legend", { className: "registration-label", textContent: labelText }));
  const optionsRow = createElement("div", { className: "choice-options" });
  const groupName = `member-edit-${fieldName}-${draft.id || Math.random().toString(36).slice(2)}`;

  options.forEach((optionText, optionIndex) => {
    const optionValue = ["선택안함", "선택 안함"].includes(optionText) ? "" : optionText;
    const isSelected = draft[fieldName] === optionValue || (!draft[fieldName] && optionIndex === 0);
    const input = createElement("input", { type: "radio", value: optionValue });
    input.name = groupName;
    input.checked = isSelected;
    const option = createElement("label", { className: "choice-option", dataset: { state: isSelected ? "selected" : "idle" } });
    option.addEventListener("click", () => {
      draft[fieldName] = input.value;
      optionsRow.querySelectorAll(".choice-option").forEach((optionElement) => {
        optionElement.dataset.state = "idle";
        const optionInput = optionElement.querySelector("input");
        if (optionInput) {
          optionInput.checked = false;
        }
      });
      input.checked = true;
      option.dataset.state = "selected";
      syncSubmitButton(draft);
    });
    option.append(input);
    option.append(createElement("span", { textContent: optionText }));
    optionsRow.append(option);
  });

  field.append(optionsRow);
  return field;
}

function createPetTagField(memberEditState, draft) {
  const field = createElement("section", { className: "registration-field", dataset: { field: "petTags" } });
  field.append(createElement("span", { className: "registration-label", textContent: "태그" }));
  const container = createElement("div", { dataset: { area: "petTagInput" } });
  initTagInput({
    container,
    initialTags: draft.petTags,
    getCatalog: () => memberEditState.memberTagCatalog || [],
    onChange: (nextTags) => {
      draft.petTags = nextTags;
      syncSubmitButton(draft);
    },
  });
  field.append(container);
  return field;
}

function createFormField(labelText, placeholder, isRequired, value, tagName = "input", inputType = "text", extraClassName = "", options = {}) {
  const field = createElement("label", {
    className: `${tagName === "textarea" ? "registration-field is-wide" : "registration-field"} ${extraClassName}`.trim(),
    dataset: { field: labelText },
  });
  const label = createElement("span", { className: "registration-label", textContent: labelText });

  if (isRequired) {
    label.append(createElement("span", { className: "required-mark", textContent: " *" }));
  }

  const input = createElement(tagName, {
    className: tagName === "textarea" ? "registration-input registration-textarea" : "registration-input",
    type: tagName === "input" ? inputType : undefined,
    placeholder,
    value: value || "",
  });
  input.addEventListener("input", (event) => {
    if (options.onInput) {
      options.onInput(event.target.value);
    }
  });

  field.append(label);
  field.append(input);
  return field;
}

function syncSubmitButton(draft) {
  document.querySelectorAll("[data-action='submitPet']").forEach((button) => {
    const isReady = isPetReady(draft);
    button.disabled = !isReady;
    button.dataset.state = isReady ? ACTION_BUTTON_STATE.enabled : ACTION_BUTTON_STATE.disabled;
  });
}

function submitPetDetail(memberEditState) {
  if (!isPetReady(memberEditState.petDetailDraft)) {
    return;
  }

  applyPetDraft(memberEditState.selectedPet, memberEditState.petDetailDraft);
  persistMember(memberEditState, "정보를 수정했습니다.");
}

function submitAddPet(memberEditState) {
  if (!isPetReady(memberEditState.addPetDraft)) {
    return;
  }

  const nextPet = createPetDraft({ ...memberEditState.addPetDraft, id: memberEditState.addPetDraft.id || `pet-${Date.now()}` });
  memberEditState.selectedMember.pets.push(nextPet);
  memberEditState.selectedPet = nextPet;
  persistMember(memberEditState, "반려견을 추가했습니다.");
}

function persistMember(memberEditState, toastMessage) {
  memberEditState.memberTagCatalog = mergeMemberTagCatalog([
    ...(memberEditState.selectedMember.ownerTags || []),
    ...memberEditState.selectedMember.pets.flatMap((pet) => pet.petTags || []),
  ]);
  memberEditState.members = saveRegisteredMembers([memberEditState.selectedMember]);
  memberEditState.activeSheet = "";
  memberEditState.toastMessage = toastMessage;
  rerender(memberEditState);
}

function createGuardianEditScreen(memberEditState) {
  const page = createElement("main", {
    className: "app-page-shell has-footer member-edit-page guardian-edit-page",
    dataset: { screen: "guardianEdit" },
  });

  page.append(createGuardianEditHeader(memberEditState));
  page.append(createGuardianEditContent(memberEditState));
  page.append(createGuardianSubmitButton(memberEditState));

  if (memberEditState.toastMessage) {
    page.append(createToast(memberEditState.toastMessage));
  }

  return page;
}

function createGuardianEditHeader(memberEditState) {
  const header = createElement("header", { className: "registration-header guardian-info-header", dataset: { area: "header" } });
  const backButton = createHeaderIconButton({
    className: "page-close-button back-button",
    icon: "back",
    ariaLabel: "회원 수정으로 돌아가기",
    dataset: { action: "backToMemberEdit" },
  });
  backButton.addEventListener("click", () => {
    memberEditState.activeScreen = "memberEdit";
    rerender(memberEditState);
  });
  header.append(backButton);
  header.append(createElement("h1", { textContent: "보호자 정보" }));
  header.append(createElement("span", { className: "header-spacer" }));
  return header;
}

function createGuardianEditContent(memberEditState) {
  const content = createElement("section", { className: "guardian-edit-page-content member-edit-guardian-content", dataset: { area: "guardianEditContent" } });
  const form = createElement("section", { className: "guardian-edit-form mobile-guardian-edit-form", dataset: { area: "guardianEditForm" } });
  form.append(createReadonlyGuardianField("보호자 이름", memberEditState.guardianDraft.guardianName, true));
  form.append(createReadonlyGuardianField("전화번호", formatPhoneNumber(memberEditState.guardianDraft.phoneNumber), true));
  form.append(createGuardianAddressField(memberEditState));
  form.append(createGuardianTagField(memberEditState));
  content.append(form);
  return content;
}

function createReadonlyGuardianField(labelText, value, isRequired) {
  const field = createElement("label", { className: "registration-field is-readonly", dataset: { field: labelText } });
  const label = createElement("span", { className: "registration-label", textContent: labelText });
  if (isRequired) {
    label.append(createElement("span", { className: "required-mark", textContent: " *" }));
  }
  const input = createElement("input", { className: "registration-input", type: "text", value: formatText(value) });
  input.readOnly = true;
  field.append(label);
  field.append(input);
  return field;
}

function createGuardianAddressField(memberEditState) {
  const field = createElement("section", { className: "registration-field address-field", dataset: { field: "address" } });
  field.append(createElement("span", { className: "registration-label", textContent: "주소" }));

  const wrapper = createElement("div", { className: "address-fields" });
  const searchRow = createElement("div", { className: "address-search-row" });
  const baseAddressInput = createElement("input", {
    className: "registration-input address-search-input",
    type: "text",
    value: memberEditState.guardianDraft.address || "",
    placeholder: "주소를 검색해 주세요.",
    dataset: { field: "baseAddress" },
  });
  baseAddressInput.addEventListener("input", (event) => {
    memberEditState.guardianDraft.address = event.target.value;
  });
  searchRow.append(baseAddressInput);
  searchRow.append(createElement("button", {
    className: "address-search-button",
    type: "button",
    textContent: "주소 검색",
    dataset: { action: "searchAddress" },
  }));

  const detailAddressInput = createElement("input", {
    className: "registration-input address-detail-input",
    type: "text",
    value: memberEditState.guardianDraft.addressDetail || "",
    placeholder: "직접 입력",
    dataset: { field: "detailAddress" },
  });
  detailAddressInput.addEventListener("input", (event) => {
    memberEditState.guardianDraft.addressDetail = event.target.value;
  });

  wrapper.append(searchRow);
  wrapper.append(detailAddressInput);
  field.append(wrapper);
  return field;
}

function createGuardianTagField(memberEditState) {
  const field = createElement("section", { className: "registration-field", dataset: { field: "ownerTags" } });
  field.append(createElement("span", { className: "registration-label", textContent: "태그" }));
  const container = createElement("div", { dataset: { area: "ownerTagInput" } });
  initTagInput({
    container,
    initialTags: memberEditState.guardianDraft.ownerTags,
    getCatalog: () => memberEditState.memberTagCatalog || [],
    onChange: (nextTags) => {
      memberEditState.guardianDraft.ownerTags = nextTags;
    },
  });
  field.append(container);
  return field;
}

function createGuardianSubmitButton(memberEditState) {
  const button = createElement("button", {
    className: "large-disabled-button mobile-registration-primary-button member-edit-guardian-submit",
    type: "button",
    textContent: "수정",
    dataset: { action: "submitGuardianEdit", state: ACTION_BUTTON_STATE.enabled },
  });
  button.disabled = false;
  button.addEventListener("click", () => {
    submitGuardianEdit(memberEditState);
  });
  return button;
}

function submitGuardianEdit(memberEditState) {
  memberEditState.selectedMember.address = memberEditState.guardianDraft.address || "";
  memberEditState.selectedMember.addressDetail = memberEditState.guardianDraft.addressDetail || "";
  memberEditState.selectedMember.ownerTags = sanitizeTagList(memberEditState.guardianDraft.ownerTags);
  memberEditState.memberTagCatalog = mergeMemberTagCatalog(memberEditState.selectedMember.ownerTags);
  memberEditState.members = saveRegisteredMembers([memberEditState.selectedMember]);
  memberEditState.activeScreen = "memberEdit";
  memberEditState.toastMessage = "정보를 수정했습니다.";
  rerender(memberEditState);
}

function createDeleteAlert(memberEditState) {
  const overlay = createElement("section", { className: "registration-alert-overlay", dataset: { area: "deleteMemberAlert", modal: "deleteMemberAlert", state: "open" } });
  const alert = createElement("div", { className: "registration-alert" });
  const content = createElement("div", { className: "registration-alert-content" });
  content.append(createElement("p", { textContent: "회원을 삭제하시겠습니까?\n반려견 정보도 함께 삭제됩니다." }));

  const actions = createElement("div", { className: "registration-alert-actions" });
  const closeButton = createElement("button", { className: "alert-secondary-button", type: "button", textContent: "닫기" });
  closeButton.addEventListener("click", () => {
    memberEditState.activeAlert = "";
    rerender(memberEditState);
  });
  const deleteButton = createElement("button", { className: "alert-danger-button", type: "button", textContent: "전체 삭제" });
  deleteButton.addEventListener("click", () => {
    deleteStoredMember(memberEditState.selectedMember.id);
    window.location.href = "./member-home/member-home.html";
  });

  actions.append(closeButton);
  actions.append(deleteButton);
  alert.append(content);
  alert.append(actions);
  overlay.append(alert);
  return overlay;
}

function createSummaryLine(label, value) {
  const line = createElement("li", { className: "summary-line" });
  line.append(createElement("span", { textContent: `${label} : ` }));
  line.append(createElement("strong", { textContent: value }));
  return line;
}

function formatGuardianAddress(member) {
  return [member.address, member.addressDetail].filter(Boolean).join(" ");
}

function createMemberDetailUrl(memberEditState) {
  const queryParams = new URLSearchParams();
  if (memberEditState.selectedMember.id) {
    queryParams.set("memberId", memberEditState.selectedMember.id);
  }
  if (memberEditState.selectedPet.id) {
    queryParams.set("petId", memberEditState.selectedPet.id);
  }
  return `./member-home/member-detail.html?${queryParams.toString()}`;
}

function applyPetDraft(pet, draft) {
  pet.petName = draft.petName || "";
  pet.dogName = draft.petName || "";
  pet.breed = draft.breed || "";
  pet.birthDate = draft.birthDate || "";
  pet.animalRegistrationNumber = draft.animalRegistrationNumber || "";
  pet.coatColor = draft.coatColor || "";
  pet.weight = draft.weight || "";
  pet.gender = draft.gender || "";
  pet.neuteredStatus = draft.neuteredStatus || "";
  pet.memo = draft.memo || "";
  pet.petTags = sanitizeTagList(draft.petTags);
}

function isPetReady(draft) {
  return Boolean(String(draft?.petName || "").trim() && String(draft?.breed || "").trim());
}
