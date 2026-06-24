import { ACTION_BUTTON_STATE } from "../../constants/ui-state.js";
import { createHeaderIconButton } from "../../components/header-icon-button.js";
import { renderMemberTagChips } from "../../components/member-tag-chips.js";
import { initTagInput } from "../../components/member-tag-input.js";
import { createBusinessNavigation } from "../../components/navigation.js";
import { createToast, TOAST_AUTO_DISMISS_MS } from "../../components/toast.js";
import { createWebHeaderActions } from "../../components/web-header-actions.js";
import { sanitizeTagList } from "../../services/member-tag-service.js";
import { mergeMemberTagCatalog, saveRegisteredMembers } from "../../storage/member-storage.js";
import { loadSchoolClassList } from "../../storage/class-storage.js";
import { createElement } from "../../utils/dom.js";
import { formatText } from "../../utils/format.js";
import { formatMemberBirthDate, formatMemberGender, formatMemberWeight, getAgeOutputText, normalizeBirthDateParts } from "../../utils/member-date.js";
import { formatPhoneNumber } from "../../utils/phone.js";
import { createOwnerDetailDraft, createPetDetailDraft } from "./member-detail-draft.js";

const DEFAULT_DOG_PROFILE_IMAGE = "assets/images/defaultProfile_dog.svg";
const CAMERA_ICON_PATH = "assets/icons/iconCamera.svg";
let toastDismissTimer = null;

export function renderMemberDetail(rootElement, memberDetailState) {
  rootElement.innerHTML = "";
  rootElement.append(createMemberDetailScreen(memberDetailState));

  scheduleToastDismiss(memberDetailState);
}

function rerender(memberDetailState) {
  renderMemberDetail(document.querySelector("#app"), memberDetailState);
}

function scheduleToastDismiss(memberDetailState) {
  window.clearTimeout(toastDismissTimer);

  if (!memberDetailState.toastMessage) {
    return;
  }

  toastDismissTimer = window.setTimeout(() => {
    memberDetailState.toastMessage = "";
    rerender(memberDetailState);
  }, TOAST_AUTO_DISMISS_MS);
}

function createMemberDetailScreen(memberDetailState) {
  const screen = createElement("div", {
    className: "member-detail-screen",
    dataset: { screen: "memberDetail" },
  });
  screen.append(createWebMemberDetailScreen(memberDetailState));
  screen.append(createAppMemberDetailScreen(memberDetailState));

  if (memberDetailState.toastMessage) {
    screen.append(createToast(memberDetailState.toastMessage));
  }
  return screen;
}

function createWebMemberDetailScreen(memberDetailState) {
  const screen = createElement("section", {
    className: "member-home-shell member-detail-shell",
    dataset: { area: "memberDetailDesktop" },
  });
  screen.append(createHeader());
  screen.append(createNavigation());
  screen.append(createWebMemberDetailContent(memberDetailState));
  return screen;
}

function createHeader() {
  const header = createElement("header", {
    className: "web-global-header",
    dataset: { area: "header" },
  });

  header.append(createElement("strong", { className: "brand-name", textContent: "다이얼독 비즈" }));
  header.append(createElement("h1", { textContent: "회원" }));
  header.append(createWebHeaderActions());

  return header;
}

function createNavigation() {
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
        : label === "호텔링"
          ? "./hotel-home.html"
        : label === "알림장"
          ? "./report.html"
          : label === "회원"
            ? "./member-home.html"
            : ""
    }))
  });

  return sharedNavigation;
}
function createWebMemberDetailContent(memberDetailState) {
  const member = getSelectedMemberView(memberDetailState);
  const content = createElement("section", {
    className: "content member-detail-content",
    dataset: { area: "content", feature: "memberDetail" },
  });
  const titleBar = createElement("div", {
    className: "member-detail-title-bar",
    dataset: { area: "detailTitle" },
  });
  titleBar.append(createBackNavigationButton());
  titleBar.append(createElement("h1", { textContent: "회원 상세" }));

  const summaryCard = createElement("section", {
    className: "member-detail-summary-card",
    dataset: { area: "memberSummary" },
  });
  const profile = createElement("div", { className: "member-detail-profile" });
  profile.append(createMemberProfileImage("member-detail-avatar"));
  const profileText = createElement("div", { className: "member-detail-profile-text" });
  profileText.append(createElement("strong", { textContent: getMemberPetName(member) }));
  profileText.append(createElement("p", { textContent: formatText(member.breed) }));
  appendInlineMemberTags(profileText, member.petTags);
  profile.append(profileText);
  summaryCard.append(profile);
  const webClassSection = createMemberClassSection(member, "web");
  if (webClassSection) {
    summaryCard.append(webClassSection);
  }
  summaryCard.append(createReservationHighlightCard(member));

  const panel = createElement("section", {
    className: "member-detail-panel",
    dataset: { area: "detailPanel", state: "memberInfo" },
  });
  panel.append(createWebMemoSection(memberDetailState, member));
  panel.append(createWebGuardianInfoSection(memberDetailState, member));
  panel.append(createWebPetDetailSection(memberDetailState, member));
  panel.append(createWebSiblingPetsSection(memberDetailState, member));

  const detailPanelGroup = createElement("div", {
    className: "member-detail-tab-panel-group",
    dataset: { area: "detailPanelGroup" },
  });
  detailPanelGroup.append(createWebMemberDetailTabs());
  detailPanelGroup.append(panel);

  content.append(titleBar);
  content.append(summaryCard);
  content.append(detailPanelGroup);

  if (memberDetailState.isPetDetailModalOpen) {
    content.append(createPetDetailModal(memberDetailState));
  }

  if (memberDetailState.isOwnerDetailModalOpen) {
    content.append(createOwnerDetailModal(memberDetailState));
  }

  return content;
}

function createWebMemberDetailTabs() {
  const tabs = createElement("div", {
    className: "member-detail-tabs",
    dataset: { area: "memberDetailTabs" },
  });
  tabs.setAttribute("role", "tablist");

  const memberInfoTab = createElement("button", {
    className: "member-detail-tab is-selected",
    type: "button",
    textContent: "회원 정보",
    dataset: { action: "selectMemberDetailTab", target: "memberInfo", state: "selected" },
  });
  memberInfoTab.setAttribute("role", "tab");
  memberInfoTab.setAttribute("aria-selected", "true");
  tabs.append(memberInfoTab);

  const ticketTab = createElement("button", {
    className: "member-detail-tab",
    type: "button",
    textContent: "이용권 내역",
    dataset: { action: "selectMemberDetailTab", target: "ticketHistory", state: "disabled" },
  });
  ticketTab.setAttribute("role", "tab");
  ticketTab.setAttribute("aria-selected", "false");
  ticketTab.setAttribute("aria-disabled", "true");
  ticketTab.disabled = true;
  tabs.append(ticketTab);

  return tabs;
}

function createAppMemberDetailScreen(memberDetailState) {
  const member = getSelectedMemberView(memberDetailState);
  const screen = createElement("section", {
    className: "app-page-shell member-detail-app-screen",
    dataset: { area: "memberDetailMobile" },
  });

  screen.append(createAppMemberDetailHeader(memberDetailState));

  const content = createElement("section", {
    className: "member-detail-app-content",
    dataset: { area: "detailContent" },
  });
  content.append(createAppMemberProfileSection(member));
  const appClassSection = createMemberClassSection(member, "app");
  if (appClassSection) {
    content.append(appClassSection);
  }
  content.append(createAppAccordionSection(memberDetailState, "detailInfo", "상세 정보", createAppDetailInfoBody(member)));
  content.append(createAppAccordionSection(memberDetailState, "memo", "메모", createAppMemoBody(memberDetailState, member)));
  content.append(createAppTicketSection(member));

  screen.append(content);

  if (memberDetailState.isPetDetailBottomSheetOpen) {
    screen.append(createPetDetailBottomSheet(memberDetailState));
  }

  return screen;
}

function createAppMemberDetailHeader(memberDetailState) {
  const header = createElement("header", {
    className: "member-detail-app-header",
    dataset: { area: "header" },
  });
  header.append(createBackNavigationButton());
  header.append(createElement("h1", { textContent: "회원 상세" }));

  const editButton = createElement("button", {
    className: "member-detail-edit-button",
    type: "button",
    textContent: "수정",
    dataset: { action: "openMemberEdit" },
  });
  editButton.addEventListener("click", () => {
    window.location.href = createMemberEditUrl(memberDetailState);
  });
  header.append(editButton);

  return header;
}

function createBackNavigationButton() {
  const button = createHeaderIconButton({
    className: "back-button icon-button",
    icon: "back",
    ariaLabel: "회원 목록으로 돌아가기",
    dataset: { action: "backToMemberHome" },
  });
  button.addEventListener("click", () => {
    window.location.href = "./member-home.html";
  });
  return button;
}

function createMemberEditUrl(memberDetailState) {
  const queryParams = new URLSearchParams();

  if (memberDetailState.selectedMember?.id) {
    queryParams.set("memberId", memberDetailState.selectedMember.id);
  }

  if (memberDetailState.selectedPet?.id) {
    queryParams.set("petId", memberDetailState.selectedPet.id);
  }

  return `./member-edit.html?${queryParams.toString()}`;
}

function createReservationHighlightCard(member) {
  const availability = getReservationAvailability(member);
  const card = createElement("aside", {
    className: "member-detail-reservation-card",
    dataset: { area: "reservationSummary", state: availability.state },
  });
  card.append(createElement("span", { textContent: "예약 가능" }));
  card.append(createElement("strong", { textContent: availability.text }));
  return card;
}

function createWebMemoSection(memberDetailState, member) {
  const section = createElement("section", {
    className: "member-detail-card member-detail-memo-section",
    dataset: { area: "memberMemo" },
  });
  section.append(createElement("h2", { textContent: "메모" }));
  const memoField = createElement("textarea", {
    className: "member-detail-memo-box",
    value: String(member.memo || "").trim(),
  });
  memoField.placeholder = "성격, 알러지 등 필요한 내용을 입력해 주세요. (최대 500자)";
  memoField.dataset.state = String(member.memo || "").trim() ? "filled" : "empty";
  memoField.addEventListener("input", (event) => {
    member.memo = event.target.value;
    memberDetailState.petDetailDraft.memo = event.target.value;
    memoField.dataset.state = event.target.value.trim() ? "filled" : "empty";
  });
  section.append(memoField);
  return section;
}

function createWebGuardianInfoSection(memberDetailState, member) {
  const section = createDetailInfoCard("보호자 정보", {
    area: "guardianInfo",
    actionText: "수정",
    actionName: "openOwnerDetail",
    headerTags: member.ownerTags,
  });
  section.append(createInfoList([
    ["보호자", formatText(member.guardianName)],
    ["연락처", formatText(formatPhoneNumber(member.phoneNumber))],
    ["주소", formatText(formatGuardianAddress(member))],
  ]));
  const actionButton = section.querySelector('[data-action="openOwnerDetail"]');
  if (actionButton) {
    actionButton.addEventListener("click", () => {
      memberDetailState.ownerDetailDraft = createOwnerDetailDraft(memberDetailState.selectedMember);
      memberDetailState.isOwnerDetailModalOpen = true;
      rerender(memberDetailState);
    });
  }
  return section;
}

function createWebPetDetailSection(memberDetailState, member) {
  const section = createDetailInfoCard("반려견 세부 정보", { area: "petDetailInfo", actionText: "수정", actionName: "openPetDetail" });
  section.append(createInfoList([
    ["생년월일", formatMemberBirthDate(member.birthDate)],
    ["동물등록번호", formatText(member.animalRegistrationNumber)],
    ["모색", formatText(member.coatColor)],
    ["몸무게", formatMemberWeight(member.weight)],
    ["성별", formatMemberGender(member.gender, member.neuteredStatus)],
  ]));
  const actionButton = section.querySelector('[data-action="openPetDetail"]');
  if (actionButton) {
    actionButton.addEventListener("click", () => {
      memberDetailState.petDetailDraft = createPetDetailDraft(memberDetailState.selectedPet);
      memberDetailState.isPetDetailModalOpen = true;
      rerender(memberDetailState);
    });
  }
  return section;
}

function createWebSiblingPetsSection(memberDetailState, member) {
  const section = createDetailInfoCard("형제 반려견", { area: "siblingPets", actionText: "추가 등록" });
  const siblings = getSiblingMembers(memberDetailState.members, member);

  if (siblings.length === 0) {
    section.append(createElement("p", {
      className: "member-detail-empty-inline",
      textContent: "등록된 형제 반려견이 없습니다.",
      dataset: { state: "empty" },
    }));
    return section;
  }

  const list = createElement("div", { className: "member-sibling-list", dataset: { state: "list" } });
  siblings.forEach((sibling) => {
    const item = createElement("article", {
      className: "member-sibling-item",
      dataset: { entity: "member", entityId: formatText(sibling.id) },
    });
    item.append(createMemberProfileImage("member-sibling-avatar"));
    const text = createElement("div", { className: "member-sibling-text" });
    text.append(createElement("strong", { textContent: getMemberPetName(sibling) }));
    text.append(createElement("span", { textContent: formatText(sibling.breed) }));
    item.append(text);
    item.append(createElement("span", { className: "member-sibling-arrow", textContent: "›" }));
    list.append(item);
  });
  section.append(list);
  return section;
}

function createAppMemberProfileSection(member) {
  const section = createElement("section", {
    className: "member-detail-app-profile",
    dataset: { area: "profileSummary" },
  });
  section.append(createMemberProfileImage("member-detail-app-avatar"));

  const text = createElement("div", { className: "member-detail-app-profile-text" });
  text.append(createElement("strong", { textContent: getMemberPetName(member) }));
  text.append(createElement("p", { textContent: formatText(member.breed) }));
  appendInlineMemberTags(text, member.petTags);

  const guardian = createElement("p", { className: "member-detail-app-guardian-line" });
  guardian.append(createElement("span", { textContent: `${formatText(member.guardianName)} 보호자` }));
  guardian.append(createElement("span", { textContent: ` (${formatText(formatPhoneNumber(member.phoneNumber))})` }));
  text.append(guardian);

  section.append(text);
  return section;
}

function createAppAccordionSection(memberDetailState, sectionName, label, body) {
  const isOpen = sectionName === "detailInfo" ? memberDetailState.isDetailInfoExpanded : memberDetailState.isDetailMemoExpanded;
  const section = createElement("section", {
    className: sectionName === "memo" ? "member-detail-app-accordion is-memo" : "member-detail-app-accordion",
    dataset: { area: sectionName, state: isOpen ? "open" : "closed" },
  });
  const button = createElement("button", {
    className: "member-detail-app-accordion-button",
    type: "button",
    dataset: { action: "toggleDetailAccordion", target: sectionName },
  });
  button.append(createElement("span", { textContent: label }));
  button.append(createElement("span", { className: isOpen ? "member-detail-chevron is-open" : "member-detail-chevron", textContent: "⌄" }));
  button.addEventListener("click", () => {
    if (sectionName === "detailInfo") {
      memberDetailState.isDetailInfoExpanded = !memberDetailState.isDetailInfoExpanded;
    } else {
      memberDetailState.isDetailMemoExpanded = !memberDetailState.isDetailMemoExpanded;
    }
    rerender(memberDetailState);
  });
  section.append(button);

  if (isOpen) {
    section.append(body);
  }

  return section;
}

function createAppDetailInfoBody(member) {
  const body = createElement("div", { className: "member-detail-app-info-body" });
  body.append(createInfoList([
    ["기본 주소", formatText(member.address)],
    ["상세 주소", formatText(member.addressDetail)],
    ["생년월일", formatMemberBirthDate(member.birthDate)],
    ["동물등록번호", formatText(member.animalRegistrationNumber)],
    ["모색", formatText(member.coatColor)],
    ["몸무게", formatMemberWeight(member.weight)],
    ["성별", formatMemberGender(member.gender, member.neuteredStatus)],
  ], "member-detail-app-info-list"));
  const ownerTagSection = createMemberTagDisplaySection("태그", member.ownerTags);
  if (ownerTagSection) {
    body.append(ownerTagSection);
  }
  return body;
}

function createAppMemoBody(memberDetailState, member) {
  const memoText = String(member.memo || "").trim();
  const body = createElement("div", {
    className: "member-detail-app-memo-body",
    dataset: { area: "memberMemoBody", state: memoText ? "filled" : "empty" },
  });
  body.append(createElement("div", { className: "member-detail-app-accordion-divider" }));
  body.append(createElement("p", {
    className: "member-detail-app-memo-copy",
    textContent: memoText || "작성된 메모가 없습니다.",
  }));

  const footer = createElement("div", {
    className: "member-detail-app-memo-actions",
    dataset: { area: "memberMemoActions" },
  });
  const editButton = createElement("button", {
    className: "member-detail-app-memo-edit-button",
    type: "button",
    textContent: "메모 수정",
    dataset: { action: "openMemberEdit", target: "memo" },
  });
  editButton.addEventListener("click", () => {
      memberDetailState.petDetailDraft = createPetDetailDraft(memberDetailState.selectedPet);
    memberDetailState.isPetDetailBottomSheetOpen = true;
    rerender(memberDetailState);
  });
  footer.append(editButton);
  body.append(footer);
  return body;
}

function createAppTicketSection(member) {
  const section = createElement("section", {
    className: "member-detail-app-ticket-section",
    dataset: { area: "ticketSection" },
  });
  const title = createElement("div", { className: "member-detail-app-ticket-title" });
  title.append(createElement("strong", { textContent: "이용권" }));
  title.append(createElement("span", { textContent: `(예약 가능 ${getReservationAvailability(member).text})` }));
  section.append(title);
  section.append(createTicketIssuePrimaryButton(member));

  const ticketHistories = getMemberTicketHistories(member);
  if (ticketHistories.length === 0) {
    section.append(createTicketHistoryPlaceholder("member-detail-app-ticket-placeholder"));
    return section;
  }

  const list = createElement("div", {
    className: "member-detail-app-ticket-list",
    dataset: { state: "list" },
  });
  ticketHistories.forEach((ticketHistory) => {
    const card = createElement("article", {
      className: "member-detail-app-ticket-card",
      dataset: { entity: "ticket", entityId: ticketHistory.id || ticketHistory.ticketName },
    });
    const titleGroup = createElement("div", { className: "member-detail-app-ticket-card-title" });
    titleGroup.append(createElement("span", {
      className: `member-ticket-status status-${getTicketStatusTone(ticketHistory.status)}`,
      textContent: getTicketStatusLabel(ticketHistory.status),
    }));
    titleGroup.append(createElement("strong", { textContent: ticketHistory.ticketName }));
    card.append(titleGroup);

    const caption = createElement("p", {
      className: "member-detail-app-ticket-card-caption",
      textContent: `예약 가능: ${ticketHistory.remainingCount}회 | 유효기간: ${getTicketValidityText(ticketHistory)}`,
    });
    card.append(caption);
    card.append(createElement("span", { className: "member-detail-app-ticket-card-arrow", textContent: "›" }));
    list.append(card);
  });
  section.append(list);

  return section;
}

function createTicketIssuePrimaryButton(member) {
  return createElement("button", {
    className: "primary-button member-ticket-issue-button",
    type: "button",
    textContent: "이용권 지급",
    dataset: { action: "issueTicket", entityId: formatText(member.id) },
  });
}

function createDetailInfoCard(title, options = {}) {
  const section = createElement("section", {
    className: "member-detail-card",
    dataset: { area: options.area || "detailCard" },
  });
  const header = createElement("div", { className: "member-detail-card-header" });
  header.append(createElement("h2", { textContent: title }));
  appendHeaderMemberTags(header, options.headerTags);

  if (options.actionText) {
    header.append(createElement("button", {
      className: "member-detail-card-action",
      type: "button",
      textContent: options.actionText,
      dataset: { action: options.actionName || "detailCardAction", target: options.area || title },
    }));
  }

  section.append(header);
  return section;
}

function createMemberClassSection(member, platform) {
  const selectedClasses = getSelectedSchoolClasses(member.schoolClassIds);
  if (selectedClasses.length === 0) {
    return null;
  }

  const section = createElement("section", {
    className: platform === "app" ? "member-detail-class-section is-app" : "member-detail-class-section is-web",
    dataset: { area: "schoolClassSection", platform },
  });

  if (platform === "app") {
    section.append(createElement("strong", { className: "member-detail-class-title", textContent: "클래스" }));
  } else {
    section.append(createElement("span", { className: "member-detail-class-title", textContent: "클래스" }));
  }

  const list = createElement("div", { className: "member-detail-class-list" });
  selectedClasses.forEach((schoolClass) => {
    const item = createElement("span", { className: "member-detail-class-item" });
    item.setAttribute("tabindex", "0");
    item.append(createElement("span", { className: "member-detail-class-name", textContent: schoolClass.name || "-" }));
    if (platform === "web") {
      item.append(createElement("span", { className: "member-detail-class-tooltip", textContent: formatClassMeta(schoolClass) }));
    }
    list.append(item);
  });
  section.append(list);
  return section;
}

function getSelectedSchoolClasses(schoolClassIds) {
  const selectedClassIds = Array.isArray(schoolClassIds) ? schoolClassIds : [];
  if (selectedClassIds.length === 0) {
    return [];
  }

  const schoolClassList = loadSchoolClassList();
  return selectedClassIds
    .map((classId) => schoolClassList.find((schoolClass) => schoolClass.id === classId))
    .filter(Boolean);
}

function formatClassMeta(schoolClass) {
  const manager = formatText(schoolClass.manager);
  const capacity = schoolClass.capacity ? `정원 ${schoolClass.capacity}명` : "";
  return [manager === "-" ? "" : `담당 ${manager}`, capacity].filter(Boolean).join(" / ") || "-";
}

function appendHeaderMemberTags(header, tags) {
  const memberTags = sanitizeTagList(tags);
  if (memberTags.length === 0) {
    return;
  }

  const chipList = createElement("div", {
    className: "member-tag-chip-list member-detail-header-tags",
    dataset: { area: "memberTagChips", state: "list" },
  });
  renderMemberTagChips(chipList, memberTags);
  header.append(chipList);
}

function appendInlineMemberTags(parent, tags) {
  const memberTags = sanitizeTagList(tags);
  if (memberTags.length === 0) {
    return;
  }

  const chipList = createElement("div", {
    className: "member-tag-chip-list member-detail-profile-tags",
    dataset: { area: "memberTagChips", state: "list" },
  });
  renderMemberTagChips(chipList, memberTags);
  parent.append(chipList);
}

function createInfoList(items, className = "member-detail-info-list") {
  const list = createElement("div", { className, dataset: { role: "infoList" } });
  items.forEach(([label, value]) => {
    const row = createElement("div", { className: "member-detail-info-row" });
    row.append(createElement("span", { className: "member-detail-info-label", textContent: label }));
    row.append(createElement("strong", { className: "member-detail-info-value", textContent: value }));
    list.append(row);
  });
  return list;
}

function createMemberTagDisplaySection(title, tags) {
  const memberTags = sanitizeTagList(tags);
  if (memberTags.length === 0) {
    return null;
  }

  const section = createElement("section", {
    className: "member-tag-section",
    dataset: { area: "memberTagDisplay", state: "list" },
  });
  section.append(createElement("strong", { className: "member-tag-section-title", textContent: title }));
  const chipList = createElement("div", { className: "member-tag-chip-list", dataset: { area: "memberTagChips" } });
  renderMemberTagChips(chipList, memberTags);
  section.append(chipList);
  return section;
}

function createTicketHistoryPlaceholder(className = "member-ticket-history-placeholder") {
  return createElement("p", {
    className,
    textContent: "지급한 이용권 내역이 없습니다.",
    dataset: { state: "empty" },
  });
}

function createMemberProfileImage(className) {
  return createElement("img", {
    className,
    src: DEFAULT_DOG_PROFILE_IMAGE,
    alt: "반려견 프로필",
  });
}

function getSelectedMemberView(memberDetailState) {
  const member = memberDetailState.selectedMember || {};
  const pet = memberDetailState.selectedPet || {};
  return {
    ...member,
    ...pet,
    id: member.id || "",
    memberId: member.id || "",
    petId: pet.id || "",
    guardianName: member.guardianName || "",
    phoneNumber: member.phoneNumber || "",
    address: member.address || "",
    addressDetail: member.addressDetail || "",
    ownerTags: Array.isArray(member.ownerTags) ? [...member.ownerTags] : [],
    pets: Array.isArray(member.pets) ? member.pets : [],
  };
}

function getMemberPetName(member) {
  return formatText(member.petName || member.dogName);
}

function getSiblingMembers(members, member) {
  const selectedMember = (members || []).find((candidate) => candidate.id === member.id);
  const pets = Array.isArray(selectedMember?.pets) ? selectedMember.pets : [];
  return pets
    .filter((pet) => pet.id !== member.petId)
    .map((pet) => ({
      ...selectedMember,
      ...pet,
      id: selectedMember.id,
      petId: pet.id,
    }));
}

function getMemberTicketHistories(member) {
  return Array.isArray(member?.ticketHistories) ? member.ticketHistories : [];
}

function getTicketStatusLabel(status) {
  const normalizedStatus = String(status || "").trim().toLowerCase();
  if (normalizedStatus === "using" || normalizedStatus === "이용 중") {
    return "이용 중";
  }
  if (normalizedStatus === "before" || normalizedStatus === "unused" || normalizedStatus === "사용 전") {
    return "사용 전";
  }
  if (normalizedStatus === "expired" || normalizedStatus === "留뚮즺") {
    return "留뚮즺";
  }
  if (normalizedStatus === "depleted" || normalizedStatus === "?잛닔 ?뚯쭊") {
    return "?잛닔 ?뚯쭊";
  }
  return formatText(status);
}

function getTicketStatusTone(status) {
  const label = getTicketStatusLabel(status);
  if (label === "이용 중") {
    return "active";
  }
  if (label === "사용 전") {
    return "ready";
  }
  return "danger";
}

function getTicketValidityText(ticketHistory) {
  if (ticketHistory.expiresAt) {
    return formatDateLabel(ticketHistory.expiresAt);
  }

  if (ticketHistory.validDays > 0) {
    return `${ticketHistory.validDays}일`;
  }

  return "-";
}

function createOwnerDetailModal(memberDetailState) {
  const overlay = createElement("section", {
    className: "pet-detail-modal-overlay",
    dataset: { area: "ownerDetailModal", modal: "ownerDetail", state: "open" },
  });
  const modal = createElement("div", { className: "pet-detail-modal" });
  const header = createElement("div", { className: "pet-detail-modal-header" });
  header.append(createElement("h2", { textContent: "보호자 수정" }));

  const closeButton = createHeaderIconButton({
    className: "close-button",
    icon: "close",
    ariaLabel: "보호자 수정 닫기",
    dataset: { action: "closeOwnerDetail" },
  });
  closeButton.addEventListener("click", () => {
    memberDetailState.isOwnerDetailModalOpen = false;
    rerender(memberDetailState);
  });
  header.append(closeButton);

  const form = createElement("section", { className: "pet-detail-editor", dataset: { area: "ownerDetailEditor" } });
  form.append(createOwnerReadonlyField("보호자", memberDetailState.ownerDetailDraft.guardianName));
  form.append(createOwnerReadonlyField("연락처", formatPhoneNumber(memberDetailState.ownerDetailDraft.phoneNumber)));
  form.append(createOwnerAddressField(memberDetailState));
  form.append(createOwnerTagField(memberDetailState));

  const submitButton = createElement("button", {
    className: "large-disabled-button pet-detail-web-submit-button",
    type: "button",
    textContent: "수정",
    dataset: { action: "submitOwnerDetail", state: ACTION_BUTTON_STATE.enabled },
  });
  submitButton.addEventListener("click", () => {
    submitOwnerDetailDraft(memberDetailState);
  });
  form.append(submitButton);

  modal.append(header);
  modal.append(form);
  overlay.append(modal);
  return overlay;
}

function createOwnerReadonlyField(labelText, value) {
  const field = createElement("label", { className: "pet-detail-field" });
  field.append(createElement("span", { className: "pet-detail-label", textContent: labelText }));
  const input = createElement("input", { className: "form-input pet-detail-input", type: "text", value: formatText(value) });
  input.readOnly = true;
  field.append(input);
  return field;
}

function createOwnerAddressField(memberDetailState) {
  const field = createElement("section", { className: "pet-detail-field address-field", dataset: { field: "address" } });
  field.append(createElement("span", { className: "pet-detail-label", textContent: "주소" }));

  const wrapper = createElement("div", { className: "address-fields pet-detail-address-fields" });
  const searchRow = createElement("div", { className: "address-search-row" });
  const baseAddressInput = createElement("input", {
    className: "form-input pet-detail-input address-search-input",
    type: "text",
    value: memberDetailState.ownerDetailDraft.address || "",
    placeholder: "주소를 검색해 주세요.",
    dataset: { field: "baseAddress" },
  });
  baseAddressInput.addEventListener("input", (event) => {
    memberDetailState.ownerDetailDraft.address = event.target.value;
  });
  searchRow.append(baseAddressInput);
  searchRow.append(createElement("button", {
    className: "address-search-button",
    type: "button",
    textContent: "주소 검색",
    dataset: { action: "searchAddress" },
  }));

  const detailAddressInput = createElement("input", {
    className: "form-input pet-detail-input address-detail-input",
    type: "text",
    value: memberDetailState.ownerDetailDraft.addressDetail || "",
    placeholder: "직접 입력",
    dataset: { field: "detailAddress" },
  });
  detailAddressInput.addEventListener("input", (event) => {
    memberDetailState.ownerDetailDraft.addressDetail = event.target.value;
  });

  wrapper.append(searchRow);
  wrapper.append(detailAddressInput);
  field.append(wrapper);
  return field;
}

function createOwnerTagField(memberDetailState) {
  const field = createElement("section", { className: "pet-detail-field", dataset: { field: "ownerTags" } });
  field.append(createElement("span", { className: "pet-detail-label", textContent: "태그" }));
  const container = createElement("div", { dataset: { area: "ownerTagInput" } });
  initTagInput({
    container,
    initialTags: memberDetailState.ownerDetailDraft.ownerTags,
    getCatalog: () => memberDetailState.memberTagCatalog || [],
    onChange: (nextTags) => {
      memberDetailState.ownerDetailDraft.ownerTags = nextTags;
    },
  });
  field.append(container);
  return field;
}

function createPetDetailModal(memberDetailState) {
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
    memberDetailState.isPetDetailModalOpen = false;
    rerender(memberDetailState);
  });
  header.append(closeButton);

  modal.append(header);
  modal.append(createPetDetailEditor(memberDetailState, "web"));
  overlay.append(modal);
  return overlay;
}

function createPetDetailBottomSheet(memberDetailState) {
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
    memberDetailState.isPetDetailBottomSheetOpen = false;
    rerender(memberDetailState);
  });
  header.append(closeButton);
  header.append(createElement("h2", { textContent: "반려견 상세" }));
  header.append(createElement("span", { className: "header-spacer" }));

  const body = createElement("section", { className: "bottom-sheet-body" });
  body.append(createPetDetailEditor(memberDetailState, "mobile"));

  sheet.append(header);
  sheet.append(body);
  sheet.append(createPetDetailBottomSheetActions(memberDetailState));
  overlay.append(sheet);
  return overlay;
}

function createPetDetailEditor(memberDetailState, layoutMode) {
  const wrapper = createElement("section", {
    className: layoutMode === "web" ? "pet-detail-editor is-web" : "pet-detail-editor is-mobile",
    dataset: { area: "petDetailEditor", platform: layoutMode },
  });
  const draft = memberDetailState.petDetailDraft;

  if (layoutMode === "web") {
    const columns = createElement("div", { className: "pet-detail-editor-columns" });
    columns.append(createPetDetailColumnLeft(memberDetailState, draft));
    columns.append(createPetDetailColumnRight(memberDetailState, draft));
    wrapper.append(columns);
    wrapper.append(createPetDetailWebSubmit(memberDetailState));
    return wrapper;
  }

  wrapper.append(createPetDetailColumnLeft(memberDetailState, draft, true));
  wrapper.append(createPetDetailColumnRight(memberDetailState, draft, true));
  return wrapper;
}

function createPetDetailColumnLeft(memberDetailState, draft, isMobile = false) {
  const column = createElement("div", { className: isMobile ? "pet-detail-column mobile" : "pet-detail-column" });
  column.append(createPetDetailPhotoArea());
  column.append(createPetDetailTextField(memberDetailState, "이름", "petName", "한글, 영문, 숫자 입력 가능 (12자 이내)", true, draft));
  column.append(createPetDetailSearchField(memberDetailState, "견종", "breed", "견종을 검색해 주세요.", true, draft));
  if (isMobile) {
    column.append(createPetDetailTextArea(memberDetailState, "메모", "memo", "성격, 알러지 등 필요한 내용을 입력해 주세요. (최대 500자)", draft));
  }
  column.append(createPetDetailTextField(memberDetailState, "몸무게", "weight", "0~999 사이 숫자만 입력", false, draft, { suffix: "kg" }));
  return column;
}

function createPetDetailColumnRight(memberDetailState, draft, isMobile = false) {
  const column = createElement("div", { className: isMobile ? "pet-detail-column mobile" : "pet-detail-column" });
  column.append(createPetDetailTextField(memberDetailState, "동물등록번호", "animalRegistrationNumber", "410XXXXXXXXXXXX", false, draft));
  column.append(createPetDetailTextField(memberDetailState, "모색", "coatColor", "20자 이내 입력", false, draft));
  column.append(createPetDetailBirthDateField(memberDetailState, draft));
  column.append(createPetDetailRadioGroup(memberDetailState, "성별", "gender", ["선택 안함", "남아", "여아"], draft));
  column.append(createPetDetailRadioGroup(memberDetailState, "중성화 여부", "neuteredStatus", ["선택안함", "완료", "미완료"], draft));
  column.append(createPetDetailSchoolClassField(memberDetailState, draft));
  column.append(createPetDetailTagField(memberDetailState, draft, { showRemoveControls: !isMobile }));
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

function createPetDetailTextField(memberDetailState, labelText, fieldName, placeholder, isRequired, draft, options = {}) {
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
    syncPetDetailSubmitState(memberDetailState);
  });
  field.append(label);
  field.append(input);
  if (options.suffix) {
    field.className = `${field.className} has-suffix`;
    field.append(createElement("span", { className: "pet-detail-input-suffix", textContent: options.suffix }));
  }
  return field;
}

function createPetDetailSearchField(memberDetailState, labelText, fieldName, placeholder, isRequired, draft) {
  const field = createPetDetailTextField(memberDetailState, labelText, fieldName, placeholder, isRequired, draft);
  field.dataset.search = "true";
  return field;
}

function createPetDetailTextArea(memberDetailState, labelText, fieldName, placeholder, draft) {
  const field = createElement("label", { className: "pet-detail-field is-wide", dataset: { field: fieldName } });
  field.append(createElement("span", { className: "pet-detail-label", textContent: labelText }));
  const textarea = createElement("textarea", {
    className: "form-input pet-detail-textarea",
    value: draft[fieldName] || "",
    placeholder,
  });
  textarea.addEventListener("input", (event) => {
    draft[fieldName] = event.target.value;
    syncPetDetailSubmitState(memberDetailState);
  });
  field.append(textarea);
  return field;
}

function createPetDetailBirthDateField(memberDetailState, draft) {
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
      syncPetDetailSubmitState(memberDetailState);
    });
    row.append(input);
  });
  const ageOutput = createElement("output", { className: "pet-detail-age-output", textContent: getAgeOutputText(draft.birthDate) });
  row.append(ageOutput);
  field.append(row);
  field.append(createElement("p", { className: "pet-detail-guide", textContent: "정확한 생년월일을 모르면 연도만 적어 주세요." }));
  return field;
}

function createPetDetailRadioGroup(memberDetailState, labelText, fieldName, options, draft) {
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
      syncPetDetailSubmitState(memberDetailState);
    });
    option.append(input);
    option.append(createElement("span", { textContent: optionText }));
    row.append(option);
  });
  field.append(row);
  return field;
}

function createPetDetailTagField(memberDetailState, draft, options = {}) {
  const field = createElement("section", { className: "pet-detail-field", dataset: { field: "petTags" } });
  field.append(createElement("span", { className: "pet-detail-label", textContent: "태그" }));
  const container = createElement("div", { dataset: { area: "petTagInput" } });
  initTagInput({
    container,
    initialTags: draft.petTags,
    getCatalog: () => memberDetailState.memberTagCatalog || [],
    showRemoveControls: options.showRemoveControls !== false,
    onChange: (nextTags) => {
      draft.petTags = nextTags;
      syncPetDetailSubmitState(memberDetailState);
    },
  });
  field.append(container);
  return field;
}

function createPetDetailSchoolClassField(memberDetailState, draft) {
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
      syncPetDetailSubmitState(memberDetailState);
    });
    option.append(checkbox);
    option.append(createElement("span", { textContent: schoolClass.name || "-" }));
    optionList.append(option);
  });
  field.append(optionList);
  return field;
}

function createPetDetailWebSubmit(memberDetailState) {
  const button = createElement("button", {
    className: "large-disabled-button pet-detail-web-submit-button",
    type: "button",
    textContent: "수정",
    dataset: { action: "submitPetDetail", state: isPetDetailDraftReady(memberDetailState.petDetailDraft) ? ACTION_BUTTON_STATE.enabled : ACTION_BUTTON_STATE.disabled },
  });
  button.disabled = !isPetDetailDraftReady(memberDetailState.petDetailDraft);
  button.addEventListener("click", () => {
    submitPetDetailDraft(memberDetailState);
  });
  return button;
}

function createPetDetailBottomSheetActions(memberDetailState) {
  const actions = createElement("div", { className: "pet-detail-bottom-sheet-actions" });
  const deleteButton = createElement("button", {
    className: "pet-detail-delete-button",
    type: "button",
    textContent: "삭제",
  });
  deleteButton.addEventListener("click", () => {
    clearPetDetail(memberDetailState);
  });

  const submitButton = createElement("button", {
    className: "large-disabled-button bottom-sheet-submit-button",
    type: "button",
    textContent: "수정",
    dataset: { action: "submitPetDetail", state: isPetDetailDraftReady(memberDetailState.petDetailDraft) ? ACTION_BUTTON_STATE.enabled : ACTION_BUTTON_STATE.disabled },
  });
  submitButton.disabled = !isPetDetailDraftReady(memberDetailState.petDetailDraft);
  submitButton.addEventListener("click", () => {
    submitPetDetailDraft(memberDetailState);
  });

  actions.append(deleteButton);
  actions.append(submitButton);
  return actions;
}

function isPetDetailDraftReady(draft) {
  return Boolean(String(draft?.petName || "").trim() && String(draft?.breed || "").trim());
}

function syncPetDetailSubmitState(memberDetailState) {
  const buttons = document.querySelectorAll("[data-action='submitPetDetail']");
  buttons.forEach((button) => {
    const isReady = isPetDetailDraftReady(memberDetailState.petDetailDraft);
    button.disabled = !isReady;
    button.dataset.state = isReady ? ACTION_BUTTON_STATE.enabled : ACTION_BUTTON_STATE.disabled;
  });
}

function submitPetDetailDraft(memberDetailState) {
  if (!isPetDetailDraftReady(memberDetailState.petDetailDraft)) {
    return;
  }

  applyPetDetailDraft(memberDetailState.selectedPet, memberDetailState.petDetailDraft);
  memberDetailState.memberTagCatalog = mergeMemberTagCatalog(memberDetailState.petDetailDraft.petTags);
  memberDetailState.members = saveRegisteredMembers([memberDetailState.selectedMember]);
  memberDetailState.isPetDetailModalOpen = false;
  memberDetailState.isPetDetailBottomSheetOpen = false;
  memberDetailState.toastMessage = "정보를 수정했습니다.";
  rerender(memberDetailState);
}

function submitOwnerDetailDraft(memberDetailState) {
  memberDetailState.selectedMember.address = memberDetailState.ownerDetailDraft.address || "";
  memberDetailState.selectedMember.addressDetail = memberDetailState.ownerDetailDraft.addressDetail || "";
  memberDetailState.selectedMember.ownerTags = sanitizeTagList(memberDetailState.ownerDetailDraft.ownerTags);
  memberDetailState.memberTagCatalog = mergeMemberTagCatalog(memberDetailState.selectedMember.ownerTags);
  memberDetailState.members = saveRegisteredMembers([memberDetailState.selectedMember]);
  memberDetailState.isOwnerDetailModalOpen = false;
  memberDetailState.toastMessage = "정보를 수정했습니다.";
  rerender(memberDetailState);
}

function clearPetDetail(memberDetailState) {
  applyPetDetailDraft(memberDetailState.selectedPet, {
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
  memberDetailState.members = saveRegisteredMembers([memberDetailState.selectedMember]);
  memberDetailState.petDetailDraft = createPetDetailDraft(memberDetailState.selectedPet);
  memberDetailState.isPetDetailBottomSheetOpen = false;
  memberDetailState.toastMessage = "반려견 정보를 삭제했습니다.";
  rerender(memberDetailState);
}

function applyPetDetailDraft(pet, draft) {
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
  pet.schoolClassIds = Array.isArray(draft.schoolClassIds) ? [...draft.schoolClassIds] : [];
}

function formatGuardianAddress(member) {
  return [member.address, member.addressDetail].filter(Boolean).join(" ");
}

function formatDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return formatText(value);
  }
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
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

function formatTicketAmount(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return "-";
  }
  return `${numericAmount.toLocaleString("ko-KR")}원`;
}
