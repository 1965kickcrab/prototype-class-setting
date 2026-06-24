import { createHeaderIconButton } from "../../components/header-icon-button.js";
import { initTagInput } from "../../components/member-tag-input.js";
import { ACTION_BUTTON_STATE } from "../../constants/ui-state.js";
import { sanitizeTagList } from "../../services/member-tag-service.js";
import { mergeMemberTagCatalog } from "../../storage/member-storage.js";
import { loadSchoolClassList } from "../../storage/class-storage.js";
import { createElement } from "../../utils/dom.js";
import { getAgeOutputText, normalizeBirthDateParts } from "../../utils/member-date.js";

const DEFAULT_DOG_PROFILE_IMAGE = "assets/images/defaultProfile_dog.svg";
const CAMERA_ICON_PATH = "assets/icons/iconCamera.svg";

export function createPetDetailDraft(member) {
  return {
    id: member?.id || "",
    petName: member?.petName || member?.dogName || "",
    breed: member?.breed || "",
    birthDate: member?.birthDate || "",
    animalRegistrationNumber: member?.animalRegistrationNumber || "",
    coatColor: member?.coatColor || "",
    weight: member?.weight || "",
    gender: member?.gender || "",
    neuteredStatus: member?.neuteredStatus || "",
    memo: member?.memo || "",
    petTags: Array.isArray(member?.petTags) ? [...member.petTags] : [],
    schoolClassIds: Array.isArray(member?.schoolClassIds) ? [...member.schoolClassIds] : [],
  };
}

export function createPetDetailModal(memberHomeState, options = {}) {
  const rerender = options.rerender || (() => {});
  const overlay = createElement("section", {
    className: "pet-detail-modal-overlay",
    dataset: { area: "petDetailModal", modal: "petDetail", state: "open" },
  });
  const modal = createElement("div", { className: "pet-detail-modal" });
  const header = createElement("div", { className: "pet-detail-modal-header" });
  header.append(createElement("h2", { textContent: "반려견 수정" }));

  const closeButton = createHeaderIconButton({
    className: "close-button",
    icon: "close",
    ariaLabel: "반려견 수정 닫기",
    dataset: { action: "closePetDetail" },
  });
  closeButton.addEventListener("click", () => {
    memberHomeState.isPetDetailModalOpen = false;
    rerender(memberHomeState);
  });
  header.append(closeButton);

  modal.append(header);
  modal.append(createPetDetailEditor(memberHomeState, "web", rerender));
  overlay.append(modal);
  return overlay;
}

export function createPetDetailBottomSheet(memberHomeState, options = {}) {
  const rerender = options.rerender || (() => {});
  const overlay = createElement("section", {
    className: "pet-bottom-sheet-overlay",
    dataset: { area: "petDetailBottomSheet", modal: "petDetailBottomSheet", state: "open" },
  });
  const sheet = createElement("div", { className: "pet-bottom-sheet pet-detail-bottom-sheet" });
  const header = createElement("header", { className: "bottom-sheet-header" });

  const closeButton = createHeaderIconButton({
    className: "bottom-sheet-close-button close-button",
    icon: "close",
    ariaLabel: "반려견 상세 닫기",
    dataset: { action: "closePetDetail" },
  });
  closeButton.addEventListener("click", () => {
    memberHomeState.isPetDetailBottomSheetOpen = false;
    rerender(memberHomeState);
  });
  header.append(closeButton);
  header.append(createElement("h2", { textContent: "반려견 상세" }));
  header.append(createElement("span", { className: "header-spacer" }));

  const body = createElement("section", { className: "bottom-sheet-body" });
  body.append(createPetDetailEditor(memberHomeState, "mobile", rerender));

  sheet.append(header);
  sheet.append(body);
  sheet.append(createPetDetailBottomSheetActions(memberHomeState, rerender));
  overlay.append(sheet);
  return overlay;
}

function createPetDetailEditor(memberHomeState, layoutMode, rerender) {
  const wrapper = createElement("section", {
    className: layoutMode === "web" ? "pet-detail-editor is-web" : "pet-detail-editor is-mobile",
    dataset: { area: "petDetailEditor", platform: layoutMode },
  });
  const draft = memberHomeState.petDetailDraft;

  if (layoutMode === "web") {
    const columns = createElement("div", { className: "pet-detail-editor-columns" });
    columns.append(createPetDetailColumnLeft(memberHomeState, draft));
    columns.append(createPetDetailColumnRight(memberHomeState, draft));
    wrapper.append(columns);
    wrapper.append(createPetDetailWebSubmit(memberHomeState, rerender));
    return wrapper;
  }

  wrapper.append(createPetDetailColumnLeft(memberHomeState, draft, true));
  wrapper.append(createPetDetailColumnRight(memberHomeState, draft, true));
  return wrapper;
}

function createPetDetailColumnLeft(memberHomeState, draft, isMobile = false) {
  const column = createElement("div", { className: isMobile ? "pet-detail-column mobile" : "pet-detail-column" });
  column.append(createPetDetailPhotoArea());
  column.append(createPetDetailTextField(memberHomeState, "이름", "petName", "한글, 영문, 숫자 입력 가능 (12자 이내)", true, draft));
  column.append(createPetDetailSearchField(memberHomeState, "견종", "breed", "견종을 검색해 주세요.", true, draft));
  if (isMobile) {
    column.append(createPetDetailTextArea(memberHomeState, "메모", "memo", "성격, 알러지 등 필요한 내용을 입력해 주세요. (최대 500자)", draft));
  }
  column.append(createPetDetailTextField(memberHomeState, "몸무게", "weight", "0~999 사이 숫자만 입력", false, draft, { suffix: "kg" }));
  return column;
}

function createPetDetailColumnRight(memberHomeState, draft, isMobile = false) {
  const column = createElement("div", { className: isMobile ? "pet-detail-column mobile" : "pet-detail-column" });
  column.append(createPetDetailTextField(memberHomeState, "동물등록번호", "animalRegistrationNumber", "410XXXXXXXXXXXX", false, draft));
  column.append(createPetDetailTextField(memberHomeState, "모색", "coatColor", "20자 이내 입력", false, draft));
  column.append(createPetDetailBirthDateField(memberHomeState, draft));
  column.append(createPetDetailRadioGroup(memberHomeState, "성별", "gender", ["선택 안함", "남아", "여아"], draft));
  column.append(createPetDetailRadioGroup(memberHomeState, "중성화 여부", "neuteredStatus", ["선택안함", "완료", "미완료"], draft));
  column.append(createPetDetailSchoolClassField(memberHomeState, draft));
  column.append(createPetDetailTagField(memberHomeState, draft, { showRemoveControls: !isMobile }));
  return column;
}

function createPetDetailPhotoArea() {
  const area = createElement("div", { className: "pet-detail-photo-area", dataset: { area: "petProfileImage" } });
  area.append(createElement("img", { className: "pet-detail-photo-image", src: DEFAULT_DOG_PROFILE_IMAGE, alt: "반려견 프로필" }));
  const button = createElement("button", {
    className: "pet-detail-photo-button",
    type: "button",
    ariaLabel: "반려견 사진 수정",
    dataset: { action: "editPetPhoto" },
  });
  button.append(createElement("img", { className: "button-icon pet-detail-photo-icon", src: CAMERA_ICON_PATH, alt: "" }));
  area.append(button);
  return area;
}

function createPetDetailTextField(memberHomeState, labelText, fieldName, placeholder, isRequired, draft, options = {}) {
  const field = createElement("label", { className: "pet-detail-field", dataset: { field: fieldName } });
  const label = createElement("span", { className: "pet-detail-label", textContent: labelText });
  if (isRequired) {
    label.append(createElement("span", { className: "required-mark", textContent: " *" }));
  }
  const input = createElement("input", {
    className: "form-input pet-detail-input",
    type: "text",
    value: draft[fieldName] || "",
    placeholder,
  });
  input.addEventListener("input", (event) => {
    draft[fieldName] = event.target.value;
    syncPetDetailSubmitState(memberHomeState);
  });
  field.append(label);
  field.append(input);
  if (options.suffix) {
    field.className = `${field.className} has-suffix`;
    field.append(createElement("span", { className: "pet-detail-input-suffix", textContent: options.suffix }));
  }
  return field;
}

function createPetDetailSearchField(memberHomeState, labelText, fieldName, placeholder, isRequired, draft) {
  const field = createPetDetailTextField(memberHomeState, labelText, fieldName, placeholder, isRequired, draft);
  field.dataset.search = "true";
  return field;
}

function createPetDetailTextArea(memberHomeState, labelText, fieldName, placeholder, draft) {
  const field = createElement("label", { className: "pet-detail-field is-wide", dataset: { field: fieldName } });
  field.append(createElement("span", { className: "pet-detail-label", textContent: labelText }));
  const textarea = createElement("textarea", {
    className: "form-input pet-detail-textarea",
    value: draft[fieldName] || "",
    placeholder,
  });
  textarea.addEventListener("input", (event) => {
    draft[fieldName] = event.target.value;
    syncPetDetailSubmitState(memberHomeState);
  });
  field.append(textarea);
  return field;
}

function createPetDetailBirthDateField(memberHomeState, draft) {
  const field = createElement("fieldset", { className: "pet-detail-field", dataset: { field: "birthDate" } });
  field.append(createElement("legend", { className: "pet-detail-label", textContent: "생년월일" }));
  const row = createElement("div", { className: "pet-detail-birth-row" });
  const parts = String(draft.birthDate || "").split("-");
  ["연도", "월", "일"].forEach((placeholder, index) => {
    const input = createElement("input", {
      className: "form-input pet-detail-birth-input",
      type: "text",
      value: parts[index] || "",
      placeholder,
    });
    input.addEventListener("input", () => {
      const dateParts = Array.from(row.querySelectorAll(".pet-detail-birth-input")).map((dateInput) => dateInput.value);
      draft.birthDate = normalizeBirthDateParts(dateParts);
      ageOutput.textContent = getAgeOutputText(draft.birthDate);
      syncPetDetailSubmitState(memberHomeState);
    });
    row.append(input);
  });
  const ageOutput = createElement("output", { className: "pet-detail-age-output", textContent: getAgeOutputText(draft.birthDate) });
  row.append(ageOutput);
  field.append(row);
  field.append(createElement("p", { className: "pet-detail-guide", textContent: "정확한 생년월일을 모르면 연도만 적어 주세요." }));
  return field;
}

function createPetDetailRadioGroup(memberHomeState, labelText, fieldName, options, draft) {
  const field = createElement("fieldset", { className: "pet-detail-field", dataset: { field: fieldName } });
  field.append(createElement("legend", { className: "pet-detail-label", textContent: labelText }));
  const row = createElement("div", { className: "pet-detail-radio-row" });
  const groupName = `pet-detail-${fieldName}`;
  options.forEach((optionText, optionIndex) => {
    const optionValue = ["선택안함", "선택 안함"].includes(optionText) ? "" : optionText;
    const isSelected = draft[fieldName] === optionValue || (!draft[fieldName] && optionIndex === 0 && optionValue === "");
    const option = createElement("label", {
      className: "pet-detail-radio-option",
      dataset: { state: isSelected ? "selected" : "idle" },
    });
    const input = createElement("input", { className: "pet-detail-radio-input", type: "radio", value: optionValue });
    input.name = groupName;
    input.checked = isSelected;
    input.addEventListener("change", () => {
      draft[fieldName] = input.value;
      row.querySelectorAll(".pet-detail-radio-option").forEach((optionElement) => {
        optionElement.dataset.state = "idle";
      });
      option.dataset.state = "selected";
      syncPetDetailSubmitState(memberHomeState);
    });
    option.append(input);
    option.append(createElement("span", { textContent: optionText }));
    row.append(option);
  });
  field.append(row);
  return field;
}

function createPetDetailSchoolClassField(memberHomeState, draft) {
  const field = createElement("fieldset", {
    className: "pet-detail-field pet-detail-school-class-field",
    dataset: { field: "schoolClassIds" },
  });
  field.append(createElement("legend", { className: "pet-detail-label", textContent: "소속 클래스" }));
  const schoolClassList = loadSchoolClassList();

  if (schoolClassList.length === 0) {
    field.append(createElement("p", {
      className: "pet-detail-empty-inline",
      textContent: "등록된 클래스가 없습니다.",
    }));
    return field;
  }

  const optionList = createElement("div", { className: "pet-detail-class-options" });
  const selectedClassIds = new Set(draft.schoolClassIds || []);
  schoolClassList.forEach((schoolClass) => {
    const isSelected = selectedClassIds.has(schoolClass.id);
    const option = createElement("label", {
      className: isSelected ? "pet-detail-class-option is-selected" : "pet-detail-class-option",
      dataset: {
        entity: "schoolClass",
        entityId: schoolClass.id,
        state: isSelected ? "selected" : "idle",
      },
    });
    const checkbox = createElement("input", {
      type: "checkbox",
      value: schoolClass.id,
      dataset: { field: "schoolClassIds" },
    });
    checkbox.checked = isSelected;
    checkbox.addEventListener("change", () => {
      const currentClassIds = Array.isArray(draft.schoolClassIds) ? draft.schoolClassIds : [];
      draft.schoolClassIds = checkbox.checked
        ? [...new Set([...currentClassIds, schoolClass.id])]
        : currentClassIds.filter((classId) => classId !== schoolClass.id);
      option.classList.toggle("is-selected", checkbox.checked);
      option.dataset.state = checkbox.checked ? "selected" : "idle";
      syncPetDetailSubmitState(memberHomeState);
    });
    option.append(checkbox);
    option.append(createElement("span", { textContent: schoolClass.name || "-" }));
    optionList.append(option);
  });
  field.append(optionList);
  return field;
}

function createPetDetailTagField(memberHomeState, draft, options = {}) {
  const field = createElement("section", { className: "pet-detail-field", dataset: { field: "petTags" } });
  field.append(createElement("span", { className: "pet-detail-label", textContent: "태그" }));
  const container = createElement("div", { dataset: { area: "petTagInput" } });
  initTagInput({
    container,
    initialTags: draft.petTags,
    getCatalog: () => memberHomeState.memberTagCatalog || [],
    showRemoveControls: options.showRemoveControls !== false,
    onChange: (nextTags) => {
      draft.petTags = nextTags;
      syncPetDetailSubmitState(memberHomeState);
    },
  });
  field.append(container);
  return field;
}

function createPetDetailWebSubmit(memberHomeState, rerender) {
  const button = createElement("button", {
    className: "large-disabled-button pet-detail-web-submit-button",
    type: "button",
    textContent: "수정",
    dataset: { action: "submitPetDetail", state: isPetDetailDraftReady(memberHomeState.petDetailDraft) ? ACTION_BUTTON_STATE.enabled : ACTION_BUTTON_STATE.disabled },
  });
  button.disabled = !isPetDetailDraftReady(memberHomeState.petDetailDraft);
  button.addEventListener("click", () => {
    submitPetDetailDraft(memberHomeState, rerender);
  });
  return button;
}

function createPetDetailBottomSheetActions(memberHomeState, rerender) {
  const actions = createElement("div", { className: "pet-detail-bottom-sheet-actions" });
  const deleteButton = createElement("button", {
    className: "pet-detail-delete-button",
    type: "button",
    textContent: "삭제",
  });
  deleteButton.addEventListener("click", () => {
    clearPetDetail(memberHomeState, rerender);
  });

  const submitButton = createElement("button", {
    className: "large-disabled-button bottom-sheet-submit-button",
    type: "button",
    textContent: "수정",
    dataset: { action: "submitPetDetail", state: isPetDetailDraftReady(memberHomeState.petDetailDraft) ? ACTION_BUTTON_STATE.enabled : ACTION_BUTTON_STATE.disabled },
  });
  submitButton.disabled = !isPetDetailDraftReady(memberHomeState.petDetailDraft);
  submitButton.addEventListener("click", () => {
    submitPetDetailDraft(memberHomeState, rerender);
  });

  actions.append(deleteButton);
  actions.append(submitButton);
  return actions;
}

function isPetDetailDraftReady(draft) {
  return Boolean(String(draft?.petName || "").trim() && String(draft?.breed || "").trim());
}

function syncPetDetailSubmitState(memberHomeState) {
  const buttons = document.querySelectorAll("[data-action='submitPetDetail']");
  buttons.forEach((button) => {
    const isReady = isPetDetailDraftReady(memberHomeState.petDetailDraft);
    button.disabled = !isReady;
    button.dataset.state = isReady ? ACTION_BUTTON_STATE.enabled : ACTION_BUTTON_STATE.disabled;
  });
}

function submitPetDetailDraft(memberHomeState, rerender) {
  if (!isPetDetailDraftReady(memberHomeState.petDetailDraft)) {
    return;
  }

  memberHomeState.memberTagCatalog = mergeMemberTagCatalog(memberHomeState.petDetailDraft.petTags);
  applyPetDetailDraft(memberHomeState.selectedMember, memberHomeState.petDetailDraft);
  memberHomeState.isPetDetailModalOpen = false;
  memberHomeState.isPetDetailBottomSheetOpen = false;
  memberHomeState.toastMessage = "정보를 수정했습니다.";
  rerender(memberHomeState);
}

function clearPetDetail(memberHomeState, rerender) {
  applyPetDetailDraft(memberHomeState.selectedMember, {
    petName: "",
    breed: "",
    birthDate: "",
    animalRegistrationNumber: "",
    coatColor: "",
    weight: "",
    gender: "",
    neuteredStatus: "",
    memo: "",
    petTags: [],
    schoolClassIds: [],
  });
  memberHomeState.petDetailDraft = createPetDetailDraft(memberHomeState.selectedMember);
  memberHomeState.isPetDetailBottomSheetOpen = false;
  memberHomeState.toastMessage = "반려견 정보를 삭제했습니다.";
  rerender(memberHomeState);
}

function applyPetDetailDraft(member, draft) {
  member.petName = draft.petName || "";
  member.dogName = draft.petName || "";
  member.breed = draft.breed || "";
  member.birthDate = draft.birthDate || "";
  member.animalRegistrationNumber = draft.animalRegistrationNumber || "";
  member.coatColor = draft.coatColor || "";
  member.weight = draft.weight || "";
  member.gender = draft.gender || "";
  member.neuteredStatus = draft.neuteredStatus || "";
  member.memo = draft.memo || "";
  member.petTags = sanitizeTagList(draft.petTags);
  member.schoolClassIds = Array.isArray(draft.schoolClassIds) ? [...draft.schoolClassIds] : [];
}
