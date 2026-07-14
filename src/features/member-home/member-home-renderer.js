import { createEmptyStateElement } from "../../components/empty-state.js";
import { createHeaderIconButton } from "../../components/header-icon-button.js";
import { initTagInput } from "../../components/member-tag-input.js";
import { createBusinessNavigation, createDefaultAppBottomNavigation } from "../../components/navigation.js";
import { createToast, TOAST_AUTO_DISMISS_MS } from "../../components/toast.js";
import { createWebHeaderActions } from "../../components/web-header-actions.js";
import { ACTION_BUTTON_STATE } from "../../constants/ui-state.js";
import { getMemberPetRows } from "../../storage/member-storage.js";
import { loadSchoolClassList } from "../../storage/class-storage.js";
import { createElement } from "../../utils/dom.js";
import { formatText } from "../../utils/format.js";
import { bindImeAwareInput } from "../../utils/ime-input.js";
import { formatPhoneNumber, normalizePhoneNumber } from "../../utils/phone.js";
import { createMemberTagManagementModal } from "./member-home-tag-management-renderer.js";
import { getFilteredMembers, getMemberListState } from "./member-home-state.js";

const MEMBER_SEARCH_FIELDS = ["petName", "breed", "guardianName", "phoneNumber"];
const MENU_FOLD_ICON_PATH = "assets/icons/menuFold.svg";
const MENU_FOLD_OPEN_ICON_PATH = "assets/icons/menuFold_fold.svg";
const DEFAULT_DOG_PROFILE_IMAGE = "assets/images/defaultProfile_dog.svg";
const CHEVRON_RIGHT_ICON_PATH = "assets/icons/iconChevronRight.svg";
let toastDismissTimer = null;

export function renderMemberHome(rootElement, memberHomeState) {
  rootElement.innerHTML = "";

  if (memberHomeState.activeScreen === "memberEdit") {
    rootElement.append(createMemberEditScreen(memberHomeState));
    scheduleToastDismiss(memberHomeState);
    return;
  }

  if (memberHomeState.isMemberRegistrationPageOpen) {
    rootElement.append(createGuardianRegistrationPage(memberHomeState));
    return;
  }

  rootElement.append(createMemberHomeShell(memberHomeState));
  scheduleToastDismiss(memberHomeState);
}

function rerender(memberHomeState) {
  renderMemberHome(document.querySelector("#app"), memberHomeState);
}

function scheduleToastDismiss(memberHomeState) {
  window.clearTimeout(toastDismissTimer);

  if (!memberHomeState.toastMessage) {
    return;
  }

  toastDismissTimer = window.setTimeout(() => {
    memberHomeState.toastMessage = "";
    rerender(memberHomeState);
  }, TOAST_AUTO_DISMISS_MS);
}

function createMemberHomeShell(memberHomeState) {
  const shell = createElement("main", {
    className: "member-home-shell",
    dataset: {
      screen: "memberHome",
      state: "ready",
    },
  });

  shell.append(createHeader(memberHomeState));
  shell.append(createNavigation(memberHomeState));
  shell.append(createContent(memberHomeState));

  if (memberHomeState.isGuardianLookupModalOpen) {
    shell.append(createGuardianLookupModal(memberHomeState));
  }

  if (memberHomeState.isMemberTagManagementOpen) {
    shell.append(createMemberTagManagementModal(memberHomeState, { rerender }));
  }

  if (memberHomeState.toastMessage) {
    shell.append(createToast(memberHomeState.toastMessage));
  }

  return shell;
}

function createHeader(memberHomeState) {
  const header = createElement("header", {
    className: "web-global-header",
    dataset: { area: "header" },
  });

  header.append(createElement("strong", { className: "brand-name", textContent: "다이얼독 비즈" }));
  header.append(createElement("h1", { textContent: "회원" }));
  header.append(createCreateMemberButton("icon-button header-add-button", "+", memberHomeState));
  header.append(createWebHeaderActions());

  return header;
}

function createNavigation(memberHomeState = {}) {
  const sharedNavigation = createBusinessNavigation({
    className: "business-navigation member-navigation",
    dataset: { area: "navigation" },
    profile: {
      imageSrc: DEFAULT_DOG_PROFILE_IMAGE,
      title: "다이얼독",
      subtitle: "애견유치원",
    },
    footerText: "개인정보 처리방침  이용약관  문의",
    items: ["대시보드", "유치원", "호텔링", "알림장", "회원", "이용권"].map((label) => ({
      label,
      selected: label === "회원",
      href: label === "대시보드" || label === "유치원"
        ? "./index.html"
        : label === "알림장"
          ? "./report.html"
          : label === "회원"
            ? "./member-home.html"
            : ""
    }))
  });

  if (isMobileLayout() && !memberHomeState.isFilterPanelOpen) {
    sharedNavigation.append(createDefaultAppBottomNavigation({
      className: "mobile-bottom-nav",
      dataset: { area: "bottomNavigation" },
      selectedLabel: "회원",
    }));
  }

  return sharedNavigation;
}
function createContent(memberHomeState) {
  const content = createElement("section", {
    className: "content",
    dataset: { area: "content", feature: "memberHome" },
  });

  const titleBar = createElement("div", {
    className: "page-title-bar",
    dataset: { area: "title" },
  });
  titleBar.append(createElement("h1", { textContent: "회원" }));
  titleBar.append(createCreateMemberButton("primary-button", "회원 등록", memberHomeState));

  const panel = createElement("section", {
    className: "member-panel",
    dataset: { area: "memberPanel" },
  });
  panel.append(createPanelHeader(memberHomeState));
  panel.append(createMemberFilterArea(memberHomeState));
  panel.append(createMemberListArea(memberHomeState));

  content.append(titleBar);
  content.append(panel);

  return content;
}

function createPanelHeader(memberHomeState) {
  const panelHeader = createElement("div", {
    className: "member-panel-header",
    dataset: { area: "memberPanelHeader" },
  });

  panelHeader.append(createElement("h2", { textContent: "회원 목록" }));

  if (!isMobileLayout()) {
    return panelHeader;
  }

  const controlRow = createElement("div", {
    className: "member-panel-controls",
    dataset: { area: "memberControls" },
  });

  controlRow.append(createMobileFilterButton(memberHomeState));
  controlRow.append(createMemberSearchField(memberHomeState, {
    fieldClassName: "member-search-suggestion-field mobile-member-search-field",
    inputClassName: "search-input",
  }));
  panelHeader.append(controlRow);

  return panelHeader;
}

function createCreateMemberButton(className, textContent, memberHomeState) {
  const button = createElement("button", {
    className,
    type: "button",
    textContent,
    dataset: { action: "createMember" },
    ariaLabel: textContent === "+" ? "회원 등록" : undefined,
  });

  button.addEventListener("click", () => {
    if (isMobileLayout()) {
      memberHomeState.isMemberRegistrationPageOpen = true;
      memberHomeState.isGuardianLookupModalOpen = false;
    } else {
      memberHomeState.isGuardianLookupModalOpen = true;
      memberHomeState.isMemberRegistrationPageOpen = false;
    }

    rerender(memberHomeState);
  });

  return button;
}

function createGuardianLookupModal(memberHomeState) {
  const overlay = createElement("section", {
    className: "guardian-modal-overlay",
    dataset: { area: "guardianLookupModal", modal: "guardianLookup", state: "open" },
  });
  const modal = createElement("div", { className: "guardian-modal" });
  const header = createElement("div", { className: "modal-header" });
  header.append(createElement("h2", { textContent: "보호자 조회" }));
  header.append(createCloseRegistrationButton(memberHomeState, "modal-close-button", "✕", "보호자 조회 닫기"));

  const body = createElement("div", { className: "registration-form" });
  body.append(createRegistrationNotice("등록 전 기존 다이얼독 회원인지 조회합니다.\n보호자의 성함과 전화번호를 확인해 정확하게 입력해 주세요."));
  body.append(createFormField("보호자 성함", "이름 입력", true, {
    value: memberHomeState.guardianLookup.guardianName,
    hasError: Boolean(memberHomeState.guardianLookup.error),
    errorMessage: memberHomeState.guardianLookup.error,
    onInput: (value) => {
      memberHomeState.guardianLookup.guardianName = value;
      memberHomeState.guardianLookup.error = "";
      syncGuardianLookupButtonState(memberHomeState);
    },
  }));
  body.append(createFormField("전화번호", "010-0000-0000", true, {
    value: formatPhoneNumber(memberHomeState.guardianLookup.phoneNumber),
    inputFormatter: formatPhoneNumber,
    onInput: (value) => {
      memberHomeState.guardianLookup.phoneNumber = value;
      syncGuardianLookupButtonState(memberHomeState);
    },
  }));
  body.append(createLookupGuardianButton(memberHomeState, "조회"));

  modal.append(header);
  modal.append(body);
  overlay.append(modal);

  return overlay;
}

function createGuardianRegistrationPage(memberHomeState) {
  const page = createElement("main", {
    className: "app-page-shell has-footer member-registration-page",
    dataset: { screen: "memberRegistration", state: "creating" },
  });
  const header = createElement("header", {
    className: "registration-page-header",
    dataset: { area: "header" },
  });
  header.append(createCloseRegistrationButton(memberHomeState, "page-close-button", "✕", "회원 등록 닫기"));
  header.append(createElement("h1", { textContent: "회원 등록" }));
  header.append(createElement("span", { className: "header-spacer" }));

  const form = createElement("section", {
    className: "registration-form registration-page-form",
    dataset: { area: "memberRegistrationForm" },
  });
  form.append(createRegistrationNotice("보호자 이름과 번호는 회원 아이디로 사용됩니다.\n올바른 보호자 정보를 입력해 주세요."));
  form.append(createFormField("보호자 이름", "한글, 영문 10자 이내 입력", true, {
    value: memberHomeState.guardianLookup.guardianName,
    hasError: Boolean(memberHomeState.guardianLookup.error),
    errorMessage: memberHomeState.guardianLookup.error,
    onInput: (value) => {
      memberHomeState.guardianLookup.guardianName = value;
      memberHomeState.guardianLookup.error = "";
      syncGuardianLookupButtonState(memberHomeState);
    },
  }));
  form.append(createFormField("전화번호", "010-0000-0000", true, {
    value: formatPhoneNumber(memberHomeState.guardianLookup.phoneNumber),
    inputFormatter: formatPhoneNumber,
    onInput: (value) => {
      memberHomeState.guardianLookup.phoneNumber = value;
      syncGuardianLookupButtonState(memberHomeState);
    },
  }));

  page.append(header);
  page.append(form);
  page.append(createLookupGuardianButton(memberHomeState, "다음", "large-disabled-button mobile-next-button"));

  return page;
}

function createCloseRegistrationButton(memberHomeState, className, textContent, ariaLabel) {
  const actionClassName = textContent === "←" ? "back-button" : "close-button";
  const button = createHeaderIconButton({
    className: `${className} ${actionClassName}`,
    icon: textContent === "←" ? "back" : "close",
    ariaLabel,
    dataset: { action: "closeMemberRegistration" },
  });

  button.addEventListener("click", () => {
    memberHomeState.isGuardianLookupModalOpen = false;
    memberHomeState.isMemberRegistrationPageOpen = false;
    memberHomeState.activeScreen = "memberHome";
    memberHomeState.selectedMember = null;
    memberHomeState.toastMessage = "";
    rerender(memberHomeState);
  });

  return button;
}

function createRegistrationNotice(textContent) {
  return createElement("section", {
    className: "registration-notice",
    textContent,
    dataset: { area: "registrationNotice" },
  });
}

function createFormField(labelText, placeholder, isRequired, options = {}) {
  const field = createElement("label", {
    className: options.hasError ? "registration-field has-error" : "registration-field",
    dataset: {
      field: labelText,
      state: options.hasError ? "validationError" : "idle",
    },
  });
  const label = createElement("span", { className: "registration-label", textContent: labelText });

  if (isRequired) {
    label.append(createElement("span", { className: "required-mark", textContent: " *" }));
  }

  const input = createElement("input", {
    className: "registration-input",
    type: "text",
    placeholder,
    value: options.value || "",
  });
  input.addEventListener("input", (event) => {
    if (options.inputFormatter) {
      event.target.value = options.inputFormatter(event.target.value);
    }

    if (options.onInput) {
      options.onInput(event.target.value);
    }
  });

  field.append(label);
  field.append(input);

  if (options.errorMessage) {
    field.append(createElement("p", { className: "field-error-message", textContent: options.errorMessage }));
  }

  return field;
}

function createLookupGuardianButton(memberHomeState, textContent, className = "large-disabled-button") {
  const isReady = isGuardianLookupReady(memberHomeState);
  const button = createElement("button", {
    className,
    type: "button",
    textContent,
    dataset: {
      action: "lookupGuardian",
      state: isReady ? ACTION_BUTTON_STATE.enabled : ACTION_BUTTON_STATE.disabled,
    },
  });
  button.disabled = !isReady;

  button.addEventListener("click", () => {
    if (!isGuardianLookupReady(memberHomeState)) {
      syncGuardianLookupButtonState(memberHomeState);
      return;
    }

    const didRedirect = handleGuardianLookup(memberHomeState);

    if (didRedirect) {
      return;
    }

    rerender(memberHomeState);
  });

  return button;
}

function syncGuardianLookupButtonState(memberHomeState) {
  const lookupButton = document.querySelector("[data-action='lookupGuardian']");

  if (!lookupButton) {
    return;
  }

  const isReady = isGuardianLookupReady(memberHomeState);
  lookupButton.disabled = !isReady;
  lookupButton.dataset.state = isReady ? ACTION_BUTTON_STATE.enabled : ACTION_BUTTON_STATE.disabled;
}

function isGuardianLookupReady(memberHomeState) {
  const guardianName = normalizeLookupText(memberHomeState.guardianLookup.guardianName);
  const phoneNumber = normalizePhoneNumber(memberHomeState.guardianLookup.phoneNumber);
  return Boolean(guardianName && phoneNumber.length >= 10);
}

function handleGuardianLookup(memberHomeState) {
  const inputPhoneNumber = normalizePhoneNumber(memberHomeState.guardianLookup.phoneNumber);
  const inputGuardianName = normalizeLookupText(memberHomeState.guardianLookup.guardianName);
  const matchedByPhone = inputPhoneNumber
    ? memberHomeState.members.find((member) => {
        return normalizePhoneNumber(member.phoneNumber) === inputPhoneNumber;
      })
    : null;

  if (matchedByPhone && normalizeLookupText(matchedByPhone.guardianName) !== inputGuardianName) {
    memberHomeState.guardianLookup.error = "회원 정보가 일치하지 않습니다";
    return false;
  }

  const selectedMember = matchedByPhone || {
    id: "",
    petName: "",
    dogName: "",
    guardianName: memberHomeState.guardianLookup.guardianName,
    phoneNumber: memberHomeState.guardianLookup.phoneNumber,
    address: "",
    breed: "",
    ownerTags: [],
    petTags: [],
    isRegistered: false,
  };

  memberHomeState.selectedMember = selectedMember;
  memberHomeState.guardianLookup.error = "";
  memberHomeState.isGuardianLookupModalOpen = false;
  memberHomeState.isMemberRegistrationPageOpen = false;

  if (matchedByPhone && matchedByPhone.isRegistered) {
    if (isMobileLayout()) {
      memberHomeState.activeScreen = "memberEdit";
      memberHomeState.toastMessage = "이미 등록된 회원입니다. 반려견 정보를 확인해 주세요.";
      return false;
    }

    window.location.href = createMemberDetailUrl(matchedByPhone, { toast: "registered" });
    return false;
  }

  window.location.href = createMemberRegistrationUrl(selectedMember, matchedByPhone);
  return true;
}

function createMemberRegistrationUrl(member, matchedByPhone) {
  const queryParams = new URLSearchParams();

  if (member.id) {
    queryParams.set("memberId", member.id);
  }

  queryParams.set("guardianName", member.guardianName || "");
  queryParams.set("phoneNumber", member.phoneNumber || "");
  queryParams.set("address", member.address || "");

  if (matchedByPhone) {
    queryParams.set("toast", "loaded");
  }

  return `./member-registration.html?${queryParams.toString()}`;
}

function createMemberDetailUrl(member, options = {}) {
  const queryParams = new URLSearchParams();

  if (member?.id) {
    queryParams.set("memberId", member.id);
  }

  if (member?.petId) {
    queryParams.set("petId", member.petId);
  }

  if (options.toast) {
    queryParams.set("toast", options.toast);
  }

  return `./member-detail.html?${queryParams.toString()}`;
}

function createMemberEditScreen(memberHomeState) {
  return createMemberProfileFlowScreen({
    memberHomeState,
    screenName: "memberEdit",
    title: "회원 수정",
    primaryActionText: "저장",
  });
}

function createMemberProfileFlowScreen({ memberHomeState, screenName, title, primaryActionText }) {
  const screen = createElement("main", {
    className: "member-profile-flow is-summary",
    dataset: { screen: screenName },
  });
  const selectedMember = memberHomeState.selectedMember || {};

  screen.append(createProfileFlowHeader(memberHomeState, title));

  const content = createElement("section", { className: "profile-flow-content" });
  content.append(createGuardianSummarySection(selectedMember));
  content.append(createPetSummarySection(selectedMember, screenName));

  screen.append(content);
  screen.append(createElement("button", { className: "large-disabled-button profile-flow-primary-button", type: "button", textContent: primaryActionText }));

  if (memberHomeState.toastMessage) {
    screen.append(createToast(memberHomeState.toastMessage));
  }

  return screen;
}

function createProfileFlowHeader(memberHomeState, title) {
  const header = createElement("header", { className: "registration-page-header", dataset: { area: "header" } });
  header.append(createCloseRegistrationButton(memberHomeState, "page-close-button", "✕", `${title} 닫기`));
  header.append(createElement("h1", { textContent: title }));
  header.append(createElement("span", { className: "header-spacer" }));
  return header;
}

function createGuardianSummarySection(member) {
  const section = createElement("section", { className: "profile-flow-section", dataset: { area: "guardianInfo" } });
  section.append(createElement("h2", { textContent: "보호자 정보" }));
  section.append(createSummaryLine("보호자 이름", formatText(member.guardianName)));
  section.append(createSummaryLine("전화번호", formatText(member.phoneNumber)));
  return section;
}

function createPetSummarySection(member, screenName) {
  const section = createElement("section", { className: "profile-flow-section", dataset: { area: "petInfo" } });
  section.append(createElement("h2", { textContent: "반려견 정보" }));
  section.append(createElement("button", { className: "sub-action-button", type: "button", textContent: "반려견 추가", dataset: { action: "addPet" } }));

  if (member.petName || member.dogName) {
    const petRow = createElement("article", {
      className: "pet-summary-row",
      dataset: {
        entity: "member",
        entityId: formatText(member.id),
        state: screenName === "memberEdit" ? "editing" : "detail",
      },
    });
    petRow.append(createElement("strong", { textContent: formatText(member.petName || member.dogName) }));
    petRow.append(createElement("span", { textContent: formatText(member.breed) }));
    section.append(petRow);
  }

  return section;
}

function createSummaryLine(label, value) {
  const line = createElement("p", { className: "summary-line" });
  line.append(createElement("span", { textContent: `${label} : ` }));
  line.append(createElement("strong", { textContent: value }));
  return line;
}

function normalizeLookupText(value) {
  return String(value || "").trim();
}

function isMobileLayout() {
  return window.matchMedia && window.matchMedia("(max-width: 430px)").matches;
}

function createMemberFilterArea(memberHomeState) {
  const filterArea = createElement("section", {
    className: "member-filter-area",
    dataset: {
      area: "memberFilter",
      state: memberHomeState.isFilterPanelOpen ? "open" : "closed",
    },
  });

  if (isMobileLayout() && memberHomeState.isFilterPanelOpen) {
    filterArea.append(createMobileFilterBottomSheet(memberHomeState));
  }

  if (!isMobileLayout()) {
    const headerRow = createElement("div", {
      className: "member-filter-row",
      dataset: { area: "memberFilterRow" },
    });
    headerRow.append(createWebFilterToggle(memberHomeState));
    headerRow.append(createWebFilterSearchField(memberHomeState));
    filterArea.append(headerRow);

    if (memberHomeState.isFilterPanelOpen) {
      filterArea.append(createWebFilterPanel(memberHomeState));
    }
  }

  return filterArea;
}

function createWebFilterToggle(memberHomeState) {
  const button = createElement("button", {
    className: "filter-toggle-button",
    type: "button",
    dataset: {
      action: "toggleFilterPanel",
      state: memberHomeState.isFilterPanelOpen ? "open" : "closed",
    },
    childNodes: [
      createElement("span", { textContent: getFilterToggleSummary(memberHomeState) }),
      createFoldIcon(memberHomeState.isFilterPanelOpen),
    ],
  });

  button.addEventListener("click", () => {
    memberHomeState.isFilterPanelOpen = !memberHomeState.isFilterPanelOpen;
    memberHomeState.isTagMenuOpen = false;
    rerender(memberHomeState);
  });

  return button;
}

function createWebFilterPanel(memberHomeState) {
  const panel = createElement("div", {
    className: "filter-detail-panel",
    dataset: { area: "filterDetail" },
  });

  const fields = createElement("div", {
    className: "filter-fields member-filter-fields",
    dataset: { area: "memberFilterFields" },
  });
  fields.append(createWebFilterClassField(memberHomeState));
  fields.append(createWebFilterTagField(memberHomeState));
  panel.append(fields);
  panel.append(createManageMemberTagsButton(memberHomeState));
  panel.append(createResetFilterButton(memberHomeState));

  return panel;
}

function createWebFilterSearchField(memberHomeState) {
  return createMemberSearchField(memberHomeState, {
    fieldClassName: "filter-field filter-search-field member-search-filter-field member-search-suggestion-field",
    inputClassName: "filter-search-input member-filter-search-input",
  });
}

function createMemberSearchField(memberHomeState, options) {
  const field = createElement("div", {
    className: options.fieldClassName,
    dataset: { field: "memberSearch" },
  });
  field.append(createMemberSearchInput(memberHomeState, options.inputClassName));

  return field;
}

function createWebFilterClassField(memberHomeState) {
  const field = createElement("div", {
    className: "filter-field filter-class-field member-class-filter-field",
    dataset: {
      field: "schoolClass",
      state: memberHomeState.isSchoolClassMenuOpen ? "open" : "closed",
    },
  });
  const classButton = createElement("button", {
    className: "filter-select-button member-filter-select-button",
    type: "button",
    dataset: { action: "toggleSchoolClassMenu" },
    childNodes: [
      createElement("span", { textContent: getSelectedSchoolClassSummary(memberHomeState) }),
      createFoldIcon(memberHomeState.isSchoolClassMenuOpen),
    ],
  });
  classButton.addEventListener("click", () => {
    memberHomeState.isSchoolClassMenuOpen = !memberHomeState.isSchoolClassMenuOpen;
    memberHomeState.isTagMenuOpen = false;
    rerender(memberHomeState);
  });

  field.append(classButton);

  if (memberHomeState.isSchoolClassMenuOpen) {
    field.append(createClassMultiSelectMenu(memberHomeState));
  }

  return field;
}

function createWebFilterTagField(memberHomeState) {
  const field = createElement("div", {
    className: "filter-field filter-tag-field member-tag-filter-field",
    dataset: {
      field: "memberTag",
      state: memberHomeState.isTagMenuOpen ? "open" : "closed",
    },
  });
  const tagButton = createElement("button", {
    className: "filter-select-button member-filter-select-button",
    type: "button",
    dataset: { action: "toggleMemberTagMenu" },
    childNodes: [
      createElement("span", { textContent: getSelectedTagSummary(memberHomeState) }),
      createFoldIcon(memberHomeState.isTagMenuOpen),
    ],
  });
  tagButton.addEventListener("click", () => {
    memberHomeState.isTagMenuOpen = !memberHomeState.isTagMenuOpen;
    memberHomeState.isSchoolClassMenuOpen = false;
    rerender(memberHomeState);
  });

  field.append(tagButton);

  if (memberHomeState.isTagMenuOpen) {
    field.append(createTagMultiSelectMenu(memberHomeState));
  }

  return field;
}

function createManageMemberTagsButton(memberHomeState) {
  const button = createElement("button", {
    className: "member-tag-manage-button",
    type: "button",
    textContent: "태그 관리",
    dataset: { action: "openMemberTagManagement" },
  });
  button.addEventListener("click", () => {
    memberHomeState.isMemberTagManagementOpen = true;
    memberHomeState.isTagMenuOpen = false;
    memberHomeState.isSchoolClassMenuOpen = false;
    memberHomeState.memberTagManagementQuery = "";
    memberHomeState.openMemberTagMenuTagName = "";
    memberHomeState.activeMemberTagSheetTagName = "";
    memberHomeState.memberTagSheetDraftName = "";
    rerender(memberHomeState);
  });
  return button;
}

function createMobileFilterButton(memberHomeState) {
  const button = createElement("button", {
    className: "mobile-filter-button",
    type: "button",
    textContent: "필터",
    dataset: {
      action: "openMemberFilterBottomSheet",
      state: hasActiveMemberFilters(memberHomeState) ? "selected" : "empty",
    },
  });

  button.addEventListener("click", () => {
    memberHomeState.isFilterPanelOpen = true;
    memberHomeState.isTagMenuOpen = false;
    memberHomeState.isSchoolClassMenuOpen = false;
    rerender(memberHomeState);
  });

  return button;
}

function createMobileFilterBottomSheet(memberHomeState) {
  const overlay = createElement("section", {
    className: "filter-bottom-sheet-overlay",
    dataset: { area: "memberFilterBottomSheet", modal: "memberFilterBottomSheet", state: "open" },
  });
  const sheet = createElement("div", { className: "filter-bottom-sheet" });
  const header = createElement("div", { className: "filter-bottom-sheet-header" });
  header.append(createResetFilterButton(memberHomeState));
  header.append(createElement("h3", { textContent: "필터" }));

  const closeButton = createElement("button", {
    className: "text-button",
    type: "button",
    textContent: "닫기",
    dataset: { action: "closeMemberFilterBottomSheet" },
  });
  closeButton.addEventListener("click", () => {
    memberHomeState.isFilterPanelOpen = false;
    memberHomeState.isTagMenuOpen = false;
    memberHomeState.isSchoolClassMenuOpen = false;
    rerender(memberHomeState);
  });
  header.append(closeButton);

  const body = createElement("div", {
    className: "filter-bottom-sheet-body",
    dataset: { area: "memberFilterSections" },
  });
  getMobileFilterSections(memberHomeState).forEach((section) => {
    body.append(createMobileFilterSection(section));
  });

  sheet.append(header);
  sheet.append(body);
  overlay.append(sheet);

  return overlay;
}

function getMobileFilterSections(memberHomeState) {
  return [
    {
      key: "memberTag",
      title: "태그",
      controls: [
        createTagBottomSheetSearchControl(memberHomeState),
        createTagMultiSelectMenu(memberHomeState),
      ],
    },
    {
      key: "schoolClass",
      title: "클래스",
      controls: [
        createClassMultiSelectMenu(memberHomeState),
      ],
    },
  ];
}

function createMobileFilterSection(section) {
  const sectionElement = createElement("section", {
    className: "filter-bottom-sheet-section",
    dataset: { filter: section.key },
  });
  const header = createElement("div", { className: "filter-bottom-sheet-section-header" });
  header.append(createElement("h4", { textContent: section.title }));

  if (section.action) {
    header.append(section.action);
  }

  sectionElement.append(header);
  section.controls.forEach((control) => sectionElement.append(control));

  return sectionElement;
}

function createTagBottomSheetSearchControl(memberHomeState) {
  return createTagSearchControl(memberHomeState, {
    className: "member-tag-search-control member-tag-search-filter-control",
    inputClassName: "member-tag-search-input",
    refocusSelector: ".member-tag-search-filter-control .member-tag-search-input",
    clearMode: "selection",
  });
}

function createClassMultiSelectMenu(memberHomeState) {
  const schoolClassList = loadSchoolClassList();
  const menu = createElement("div", {
    className: "tag-multi-select-menu class-multi-select-menu",
    dataset: {
      area: "schoolClassMenu",
      state: schoolClassList.length ? "list" : "empty",
    },
  });
  const list = createElement("div", {
    className: "member-tag-data-list school-class-data-list",
    dataset: { area: "schoolClassOptionList" },
  });

  if (schoolClassList.length === 0) {
    list.append(createTagEmptyState("등록된 클래스가 없습니다"));
    menu.append(list);
    return menu;
  }

  schoolClassList.forEach((schoolClass) => {
    list.append(createClassOptionButton(memberHomeState, schoolClass));
  });

  menu.append(list);
  return menu;
}

function createTagMultiSelectMenu(memberHomeState) {
  const visibleMemberTags = getVisibleMemberTags(memberHomeState);
  const menu = createElement("div", {
    className: "tag-multi-select-menu",
    dataset: {
      area: "memberTagMenu",
      state: visibleMemberTags.length ? "list" : memberHomeState.memberTagCatalog.length ? "searchEmpty" : "empty",
    },
  });

  if (!isMobileLayout()) {
    menu.append(createTagSearchControl(memberHomeState, {
      className: "member-tag-search-control tag-menu-search-control",
      inputClassName: "member-tag-search-input",
      refocusSelector: ".tag-menu-search-control .member-tag-search-input",
      clearMode: "query",
    }));
  }

  const list = createElement("div", {
    className: "member-tag-data-list",
    dataset: { area: "memberTagOptionList" },
  });

  if (memberHomeState.memberTagCatalog.length === 0) {
    list.append(createTagEmptyState("등록된 태그가 없습니다"));
    menu.append(list);
    return menu;
  }

  if (visibleMemberTags.length === 0) {
    list.append(createTagEmptyState("조회 결과가 없습니다"));
    menu.append(list);
    return menu;
  }

  visibleMemberTags.forEach((memberTagName) => {
    list.append(createTagOptionButton(memberHomeState, memberTagName));
  });

  menu.append(list);
  return menu;
}

function createTagSearchControl(memberHomeState, options = {}) {
  const control = createElement("div", {
    className: options.className || "member-tag-search-control",
    dataset: { state: memberHomeState.selectedMemberTagNames.length ? "selected" : "empty" },
  });

  const input = createElement("input", {
    className: options.inputClassName || "member-tag-search-input",
    type: "text",
    value: memberHomeState.tagFilterQuery || "",
    placeholder: "태그 검색",
    dataset: { field: "memberTagSearch" },
  });
  bindImeAwareInput(input, {
    onInput: (event, meta) => {
      memberHomeState.tagFilterQuery = event.target.value;

      if (meta.isComposing) {
        syncMemberTagFilterDataList(memberHomeState, control);
        return;
      }

      rerender(memberHomeState);

      if (!options.refocusSelector) {
        return;
      }

      focusTagSearchInput(options.refocusSelector);
    },
  });
  control.append(input);

  if (!memberHomeState.tagFilterQuery && (!memberHomeState.selectedMemberTagNames.length || options.clearMode !== "selection")) {
    return control;
  }

  const clearButton = createElement("button", {
    className: "member-tag-clear-button",
    type: "button",
    textContent: "×",
    ariaLabel: options.clearMode === "selection" ? "선택한 태그 전체 해제" : "태그 검색어 지우기",
    dataset: { action: options.clearMode === "selection" ? "clearSelectedMemberTags" : "clearMemberTagQuery" },
  });
  clearButton.addEventListener("click", () => {
    if (options.clearMode === "selection") {
      memberHomeState.selectedMemberTagNames = [];
      memberHomeState.currentPage = 1;
    }

    memberHomeState.tagFilterQuery = "";
    rerender(memberHomeState);
  });
  control.append(clearButton);

  return control;
}

function syncMemberTagFilterDataList(memberHomeState, control) {
  const list = control
    ?.closest(".tag-multi-select-menu, .filter-bottom-sheet")
    ?.querySelector("[data-area='memberTagOptionList']")
    || document.querySelector(".filter-bottom-sheet [data-area='memberTagOptionList']");

  if (!list) {
    return;
  }

  populateMemberTagFilterDataList(list, memberHomeState);
}

function populateMemberTagFilterDataList(list, memberHomeState) {
  const visibleMemberTags = getVisibleMemberTags(memberHomeState);
  const hasQuery = Boolean(normalizeLookupText(memberHomeState.tagFilterQuery));

  list.innerHTML = "";
  list.dataset.state = visibleMemberTags.length ? "list" : hasQuery ? "searchEmpty" : "empty";
  list.dataset.query = normalizeLookupText(memberHomeState.tagFilterQuery);

  if (memberHomeState.memberTagCatalog.length === 0) {
    list.append(createTagEmptyState("등록된 태그가 없습니다"));
    return;
  }

  if (visibleMemberTags.length === 0) {
    list.append(createTagEmptyState("조회 결과가 없습니다"));
    return;
  }

  visibleMemberTags.forEach((memberTagName) => {
    list.append(createTagOptionButton(memberHomeState, memberTagName));
  });
}

function createTagEmptyState(title) {
  const emptyState = createEmptyStateElement({ title });
  emptyState.className = "empty-state member-tag-empty-state";
  return emptyState;
}

function focusTagSearchInput(selector) {
  if (!selector) {
    return;
  }

  window.setTimeout(() => {
    const nextInput = document.querySelector(selector);
    if (!nextInput) {
      return;
    }

    nextInput.focus();
    nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
  }, 0);
}

function createMemberSearchInput(memberHomeState, className) {
  let isComposing = false;
  const searchInput = createElement("input", {
    className,
    type: "search",
    value: memberHomeState.searchTerm,
    placeholder: "반려견 / 보호자 / 전화번호 검색",
    dataset: { field: "memberSearch", action: "searchMembers" },
  });
  searchInput.addEventListener("compositionstart", () => {
    isComposing = true;
  });
  searchInput.addEventListener("compositionend", (event) => {
    isComposing = false;
    window.setTimeout(() => {
      memberHomeState.searchTerm = event.target.value;
      memberHomeState.currentPage = 1;
      rerender(memberHomeState);
      focusMemberSearchInput();
    }, 0);
  });
  searchInput.addEventListener("input", (event) => {
    memberHomeState.searchTerm = event.target.value;
    memberHomeState.currentPage = 1;

    if (isComposing) {
      return;
    }

    rerender(memberHomeState);
    focusMemberSearchInput();
  });
  return searchInput;
}

function focusMemberSearchInput() {
  window.setTimeout(() => {
    const nextInput = document.querySelector(".member-filter-search-input, .mobile-member-search-field .search-input");
    if (!nextInput) {
      return;
    }

    nextInput.focus();
    nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
  }, 0);
}

function createTagOptionButton(memberHomeState, memberTagName) {
  const isSelected = memberHomeState.selectedMemberTagNames.includes(memberTagName);
  const option = createElement("label", {
    className: "member-tag-checkbox-option",
    dataset: {
      action: "toggleMemberTagFilter",
      entity: "memberTag",
      entityId: memberTagName,
      state: isSelected ? "selected" : "idle",
    },
  });
  const checkbox = createElement("input", {
    type: "checkbox",
  });
  checkbox.checked = isSelected;
  checkbox.addEventListener("change", () => {
    toggleSelectedMemberTag(memberHomeState, memberTagName);
    memberHomeState.currentPage = 1;
    rerender(memberHomeState);
  });
  option.append(checkbox);
  option.append(createElement("span", { textContent: memberTagName }));

  return option;
}

function createClassOptionButton(memberHomeState, schoolClass) {
  const selectedSchoolClassIds = memberHomeState.selectedSchoolClassIds || [];
  const isSelected = selectedSchoolClassIds.includes(schoolClass.id);
  const option = createElement("label", {
    className: "member-tag-checkbox-option school-class-checkbox-option",
    dataset: {
      action: "toggleSchoolClassFilter",
      entity: "schoolClass",
      entityId: schoolClass.id,
      state: isSelected ? "selected" : "idle",
    },
  });
  const checkbox = createElement("input", {
    type: "checkbox",
  });
  checkbox.checked = isSelected;
  checkbox.addEventListener("change", () => {
    toggleSelectedSchoolClass(memberHomeState, schoolClass.id);
    memberHomeState.currentPage = 1;
    rerender(memberHomeState);
  });
  option.append(checkbox);
  option.append(createElement("span", { textContent: schoolClass.name || "-" }));

  return option;
}

function getVisibleMemberTags(memberHomeState) {
  const query = normalizeLookupText(memberHomeState.tagFilterQuery).toLowerCase();
  const memberTags = memberHomeState.memberTagCatalog || [];

  if (!query) {
    return memberTags;
  }

  return memberTags.filter((memberTagName) => {
    return String(memberTagName || "").toLowerCase().includes(query);
  });
}

function createResetFilterButton(memberHomeState) {
  const button = createElement("button", {
    className: "reset-filter-button",
    type: "button",
    textContent: "초기화",
    dataset: { action: "resetMemberFilters" },
  });

  button.addEventListener("click", () => {
    memberHomeState.selectedMemberTagNames = [];
    memberHomeState.selectedSchoolClassIds = [];
    memberHomeState.tagFilterQuery = "";
    memberHomeState.isTagMenuOpen = false;
    memberHomeState.isSchoolClassMenuOpen = false;
    memberHomeState.currentPage = 1;
    rerender(memberHomeState);
  });

  return button;
}

function toggleSelectedSchoolClass(memberHomeState, classId) {
  const selectedSchoolClassIds = memberHomeState.selectedSchoolClassIds || [];
  if (selectedSchoolClassIds.includes(classId)) {
    memberHomeState.selectedSchoolClassIds = selectedSchoolClassIds.filter((selectedClassId) => {
      return selectedClassId !== classId;
    });
    return;
  }

  memberHomeState.selectedSchoolClassIds = [...selectedSchoolClassIds, classId];
}

function toggleSelectedMemberTag(memberHomeState, memberTagName) {
  if (memberHomeState.selectedMemberTagNames.includes(memberTagName)) {
    memberHomeState.selectedMemberTagNames = memberHomeState.selectedMemberTagNames.filter((selectedTagName) => {
      return selectedTagName !== memberTagName;
    });
    return;
  }

  memberHomeState.selectedMemberTagNames = [...memberHomeState.selectedMemberTagNames, memberTagName];
}

function getSelectedSchoolClassSummary(memberHomeState) {
  const selectedSchoolClassIds = memberHomeState.selectedSchoolClassIds || [];
  if (selectedSchoolClassIds.length === 0) {
    return "클래스";
  }

  return `클래스 (${selectedSchoolClassIds.length})`;
}

function getSelectedTagSummary(memberHomeState) {
  if (memberHomeState.selectedMemberTagNames.length === 0) {
    return "태그";
  }

  return `태그 (${memberHomeState.selectedMemberTagNames.length})`;
}

function hasActiveMemberFilters(memberHomeState) {
  return getActiveMemberFilterCount(memberHomeState) > 0;
}

function getFilterToggleSummary(memberHomeState) {
  const activeFilterCount = getActiveMemberFilterCount(memberHomeState);
  return activeFilterCount ? `필터 (${activeFilterCount})` : "필터";
}

function getActiveMemberFilterCount(memberHomeState) {
  return [
    memberHomeState.selectedMemberTagNames,
    memberHomeState.selectedSchoolClassIds,
  ].filter((selectedValues) => {
    return (selectedValues || []).length > 0;
  }).length;
}

function createFoldIcon(isOpen) {
  return createElement("img", {
    className: "fold-icon",
    src: isOpen ? MENU_FOLD_OPEN_ICON_PATH : MENU_FOLD_ICON_PATH,
    alt: "",
  });
}

function createMemberListArea(memberHomeState) {
  const filteredMembers = getFilteredMembers(memberHomeState, MEMBER_SEARCH_FIELDS);
  const listState = getMemberListState(memberHomeState, filteredMembers);
  const pagination = getMemberPagination(memberHomeState, filteredMembers);
  const listArea = createElement("section", {
    className: "member-list-area",
    dataset: { area: "memberList", state: listState },
  });

  listArea.append(createMemberListHeader());

  if (listState !== "list") {
    listArea.append(createMemberEmptyState(listState));
    return listArea;
  }

  const visibleMembers = isMobileLayout() ? filteredMembers : pagination.items;
  visibleMembers.forEach((member) => {
    listArea.append(createMemberRow(memberHomeState, member));
  });

  if (!isMobileLayout()) {
    listArea.append(createMemberPaginationControls(memberHomeState, pagination));
  }

  return listArea;
}

function getMemberPagination(memberHomeState, filteredMembers) {
  const pageSize = Number(memberHomeState.pageSize) || 10;
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const currentPage = Math.min(Math.max(Number(memberHomeState.currentPage) || 1, 1), totalPages);

  if (currentPage !== memberHomeState.currentPage) {
    memberHomeState.currentPage = currentPage;
  }

  const startIndex = (currentPage - 1) * pageSize;

  return {
    currentPage,
    totalPages,
    pageSize,
    totalCount: filteredMembers.length,
    items: filteredMembers.slice(startIndex, startIndex + pageSize),
  };
}

function createMemberPaginationControls(memberHomeState, pagination) {
  const controls = createElement("nav", {
    className: "member-pagination",
    dataset: {
      area: "memberPagination",
      state: pagination.totalPages > 1 ? "active" : "single",
    },
  });

  controls.append(createMemberPageMoveButton(memberHomeState, "prev", pagination));

  for (let pageNumber = 1; pageNumber <= pagination.totalPages; pageNumber += 1) {
    const button = createElement("button", {
      className: pageNumber === pagination.currentPage ? "member-page-button is-selected" : "member-page-button",
      type: "button",
      textContent: String(pageNumber),
      ariaLabel: `${pageNumber}페이지`,
      dataset: {
        action: "goToMemberPage",
        page: String(pageNumber),
        state: pageNumber === pagination.currentPage ? "selected" : "idle",
      },
    });
    button.addEventListener("click", () => {
      memberHomeState.currentPage = pageNumber;
      rerender(memberHomeState);
    });
    controls.append(button);
  }

  controls.append(createMemberPageMoveButton(memberHomeState, "next", pagination));
  return controls;
}

function createMemberPageMoveButton(memberHomeState, direction, pagination) {
  const isPrev = direction === "prev";
  const disabled = isPrev ? pagination.currentPage <= 1 : pagination.currentPage >= pagination.totalPages;
  const button = createElement("button", {
    className: "member-page-button member-page-move-button",
    type: "button",
    textContent: isPrev ? "이전" : "다음",
    dataset: {
      action: isPrev ? "prevMemberPage" : "nextMemberPage",
      state: disabled ? "disabled" : "idle",
    },
  });
  button.disabled = disabled;
  button.addEventListener("click", () => {
    if (disabled) {
      return;
    }

    memberHomeState.currentPage = isPrev ? pagination.currentPage - 1 : pagination.currentPage + 1;
    rerender(memberHomeState);
  });
  return button;
}

function createMemberListHeader() {
  const header = createElement("div", {
    className: "member-list-header",
    dataset: { role: "memberListHeader" },
  });

  ["반려견", "보호자", "전화번호", "예약 가능", "이용권 지급"].forEach((headerText) => {
    header.append(createElement("span", { textContent: headerText }));
  });

  return header;
}

function createMemberRow(memberHomeState, member) {
  const row = createElement("article", {
    className: "member-row",
    dataset: {
      entity: "member",
      entityId: formatText(member.id),
      petId: formatText(member.petId),
    },
  });

  row.append(createMemberIdentity(member));
  row.append(createElement("span", { className: "member-cell guardian-cell", textContent: formatText(member.guardianName) }));
  row.append(createElement("span", { className: "member-cell phone-cell", textContent: formatText(formatPhoneNumber(member.phoneNumber)) }));
  row.append(createReservationAvailabilityCell(member));
  row.append(createTicketIssueCell(member));
  row.append(createMemberRowMoreButton(memberHomeState, member));

  row.addEventListener("click", () => {
    openMemberDetail(memberHomeState, member);
  });

  return row;
}

function createMemberRowMoreButton(memberHomeState, member) {
  const button = createElement("button", {
    className: "row-more-button",
    type: "button",
    ariaLabel: `${formatText(member.petName)} 보기`,
    dataset: {
      action: "openMemberMoreMenu",
      entity: "member",
      entityId: formatText(member.id),
      petId: formatText(member.petId),
    },
    childNodes: [
      createElement("img", { className: "row-more-icon", src: CHEVRON_RIGHT_ICON_PATH, alt: "" }),
    ],
  });

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    openMemberDetail(memberHomeState, member);
  });

  return button;
}

function createMemberIdentity(member) {
  const identity = createElement("span", { className: "member-identity member-cell" });

  const title = createElement("strong", { textContent: formatText(member.petName) });
  identity.append(title);

  return identity;
}

function createReservationAvailabilityCell(member) {
  const availability = getReservationAvailability(member);
  return createElement("span", {
    className: availability.state === "warning" ? "member-cell reservation-cell is-warning" : "member-cell reservation-cell",
    textContent: availability.text,
    dataset: { state: availability.state, area: "reservationAvailability" },
  });
}

function createTicketIssueCell(member) {
  const cell = createElement("span", { className: "member-cell ticket-issue-cell" });
  const button = createElement("button", {
    className: "secondary-button ticket-issue-button",
    type: "button",
    textContent: "지급",
    dataset: { action: "issueTicket", entityId: formatText(member.id), petId: formatText(member.petId) },
  });
  button.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  cell.append(button);
  return cell;
}

function getReservationAvailability(member) {
  const reservableCount = getTotalCount(member.totalReservableCountByType);
  const reservedCount = getTotalCount(member.totalReservedCountByType);
  const remainingCount = getTotalCount(member.remainingCountByType);
  const excessCount = Math.max(reservedCount - reservableCount, 0);
  const availableCount = Math.max(remainingCount || reservableCount - reservedCount, 0);

  if (excessCount > 0) {
    return {
      state: "warning",
      text: `초과 ${excessCount}회`,
    };
  }

  return {
    state: availableCount <= 2 ? "warning" : "normal",
    text: `${availableCount}회`,
  };
}

function getTotalCount(countMap = {}) {
  return Object.values(countMap).reduce((total, value) => {
    const count = Number(value);
    return total + (Number.isFinite(count) ? count : 0);
  }, 0);
}

function openMemberDetail(memberHomeState, member) {
  window.location.href = createMemberDetailUrl(member);
}

function createMemberEmptyState(listState) {
  return createEmptyStateElement({
    title: listState === "searchEmpty" ? "검색 결과가 없습니다" : "",
    description: listState === "searchEmpty" ? "다른 검색어로 다시 검색해 주세요." : "등록된 회원이 없습니다",
  });
}
