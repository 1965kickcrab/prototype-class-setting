import { createHeaderIconButton } from "../../components/header-icon-button.js";
import { renderMemberTagChips } from "../../components/member-tag-chips.js";
import { createToast } from "../../components/toast.js";
import { sanitizeTagList } from "../../services/member-tag-service.js";
import { loadSchoolClassList } from "../../storage/class-storage.js";
import { createElement } from "../../utils/dom.js";
import { formatText } from "../../utils/format.js";
import { formatMemberBirthDate, formatMemberGender, formatMemberWeight } from "../../utils/member-date.js";
import { formatPhoneNumber, normalizePhoneNumber } from "../../utils/phone.js";
import { createPetDetailBottomSheet, createPetDetailDraft, createPetDetailModal } from "./member-home-pet-detail-renderer.js";

const DEFAULT_DOG_PROFILE_IMAGE = "assets/images/defaultProfile_dog.svg";
let detailRenderOptions = {};

export function createMemberDetailScreen(memberHomeState, options = {}) {
  detailRenderOptions = options;
  if (isMobileLayout()) {
    return createAppMemberDetailScreen(memberHomeState);
  }

  return createWebMemberDetailScreen(memberHomeState);
}

function rerender(memberHomeState) {
  detailRenderOptions.rerender?.(memberHomeState);
}

function createHeader(memberHomeState) {
  return detailRenderOptions.createHeader?.(memberHomeState) || createElement("span");
}

function createNavigation() {
  return detailRenderOptions.createNavigation?.() || createElement("span");
}

function getReservationAvailability(member) {
  return detailRenderOptions.getReservationAvailability?.(member) || { state: "idle", text: "-" };
}
function createWebMemberDetailScreen(memberHomeState) {
  const screen = createElement("main", {
    className: "member-home-shell member-detail-shell",
    dataset: { screen: "memberDetail" },
  });

  screen.append(createHeader(memberHomeState));
  screen.append(createNavigation());
  screen.append(createWebMemberDetailContent(memberHomeState));

  if (memberHomeState.toastMessage) {
    screen.append(createToast(memberHomeState.toastMessage));
  }

  return screen;
}

function createWebMemberDetailContent(memberHomeState) {
  const member = memberHomeState.selectedMember || {};
  const content = createElement("section", {
    className: "content member-detail-content",
    dataset: { area: "content", feature: "memberDetail" },
  });
  const titleBar = createElement("div", {
    className: "member-detail-title-bar",
    dataset: { area: "detailTitle" },
  });
  titleBar.append(createBackNavigationButton(memberHomeState));
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
  summaryCard.append(createReservationHighlightCard(member));

  const panel = createElement("section", {
    className: "member-detail-panel",
    dataset: { area: "detailPanel", state: "memberInfo" },
  });
  panel.append(createWebMemoSection(memberHomeState, member));
  panel.append(createWebGuardianInfoSection(member));
  panel.append(createWebPetDetailSection(memberHomeState, member));
  panel.append(createWebSiblingPetsSection(memberHomeState, member));

  const detailPanelGroup = createElement("div", {
    className: "member-detail-tab-panel-group",
    dataset: { area: "detailPanelGroup" },
  });
  detailPanelGroup.append(createWebMemberDetailTabs());
  detailPanelGroup.append(panel);

  content.append(titleBar);
  content.append(summaryCard);
  content.append(detailPanelGroup);

  if (memberHomeState.isPetDetailModalOpen) {
    content.append(createPetDetailModal(memberHomeState, { rerender }));
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

function createAppMemberDetailScreen(memberHomeState) {
  const member = memberHomeState.selectedMember || {};
  const screen = createElement("main", {
    className: "app-page-shell member-detail-app-screen",
    dataset: { screen: "memberDetail" },
  });

  screen.append(createAppMemberDetailHeader(memberHomeState));

  const content = createElement("section", {
    className: "member-detail-app-content",
    dataset: { area: "detailContent" },
  });
  content.append(createAppMemberProfileSection(member));
  content.append(createAppAccordionSection(memberHomeState, "detailInfo", "상세 정보", createAppDetailInfoBody(member)));
  content.append(createAppAccordionSection(memberHomeState, "memo", "메모", createAppMemoBody(member)));
  content.append(createAppTicketSection(member));

  screen.append(content);

  if (memberHomeState.isPetDetailBottomSheetOpen) {
    screen.append(createPetDetailBottomSheet(memberHomeState, { rerender }));
  }

  if (memberHomeState.toastMessage) {
    screen.append(createToast(memberHomeState.toastMessage));
  }

  return screen;
}

function createAppMemberDetailHeader(memberHomeState) {
  const header = createElement("header", {
    className: "member-detail-app-header",
    dataset: { area: "header" },
  });
  header.append(createBackNavigationButton(memberHomeState));
  header.append(createElement("h1", { textContent: "회원 상세" }));

  const editButton = createElement("button", {
    className: "member-detail-edit-button",
    type: "button",
    textContent: "수정",
    dataset: { action: "openMemberEdit" },
  });
  editButton.addEventListener("click", () => {
    memberHomeState.petDetailDraft = createPetDetailDraft(memberHomeState.selectedMember);
    memberHomeState.isPetDetailBottomSheetOpen = true;
    rerender(memberHomeState);
  });
  header.append(editButton);

  return header;
}

function createBackNavigationButton(memberHomeState) {
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

function createTicketIssuePrimaryButton(member) {
  return createElement("button", {
    className: "primary-button member-ticket-issue-button",
    type: "button",
    textContent: "이용권 지급",
    dataset: { action: "issueTicket", entityId: formatText(member.id) },
  });
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

function createWebMemoSection(memberHomeState, member) {
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
    memoField.dataset.state = event.target.value.trim() ? "filled" : "empty";
  });
  section.append(memoField);
  return section;
}

function createWebGuardianInfoSection(member) {
  const section = createDetailInfoCard("보호자 정보", { area: "guardianInfo", actionText: "수정", headerTags: member.ownerTags });
  section.append(createInfoList([
    ["보호자", formatText(member.guardianName)],
    ["연락처", formatText(formatPhoneNumber(member.phoneNumber))],
    ["주소", formatText([member.address, member.addressDetail].filter(Boolean).join(" "))],
  ]));
  return section;
}

function createWebPetDetailSection(memberHomeState, member) {
  const section = createDetailInfoCard("반려견 세부 정보", { area: "petDetailInfo", actionText: "수정", actionName: "openPetDetail" });
  section.append(createInfoList([
    ["생년월일", formatMemberBirthDate(member.birthDate)],
    ["동물등록번호", formatText(member.animalRegistrationNumber)],
    ["모색", formatText(member.coatColor)],
    ["몸무게", formatMemberWeight(member.weight)],
    ["성별", formatMemberGender(member.gender, member.neuteredStatus)],
    ["소속 클래스", formatSchoolClassNames(member.schoolClassIds)],
  ]));
  const actionButton = section.querySelector('[data-action="openPetDetail"]');
  if (actionButton) {
    actionButton.addEventListener("click", () => {
      memberHomeState.petDetailDraft = createPetDetailDraft(memberHomeState.selectedMember);
      memberHomeState.isPetDetailModalOpen = true;
      rerender(memberHomeState);
    });
  }
  return section;
}

function createWebSiblingPetsSection(memberHomeState, member) {
  const section = createDetailInfoCard("형제 반려견", { area: "siblingPets", actionText: "추가 등록" });
  const siblings = getSiblingMembers(memberHomeState.members, member);

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

function createWebTicketHistorySection(member) {
  const section = createElement("section", {
    className: "member-detail-card member-ticket-history-section",
    dataset: { area: "ticketHistory" },
  });
  section.append(createElement("h2", { textContent: "이용권 내역" }));

  const ticketHistories = getMemberTicketHistories(member);
  if (ticketHistories.length === 0) {
    section.append(createTicketHistoryPlaceholder());
    return section;
  }

  const table = createElement("div", {
    className: "member-ticket-table",
    dataset: { state: "list" },
  });
  ["이용권 상태", "이용권", "예약 가능", "유효기간 / 만료일", "금액", "내역"].forEach((label) => {
    table.append(createElement("strong", { className: "member-ticket-table-header", textContent: label }));
  });

  ticketHistories.forEach((ticketHistory) => {
    table.append(createElement("span", {
      className: `member-ticket-status status-${getTicketStatusTone(ticketHistory.status)}`,
      textContent: getTicketStatusLabel(ticketHistory.status),
    }));
    table.append(createElement("span", { textContent: ticketHistory.ticketName }));
    table.append(createElement("span", { textContent: `${ticketHistory.remainingCount}회` }));
    table.append(createElement("span", { textContent: getTicketValidityText(ticketHistory) }));
    table.append(createElement("span", { textContent: formatTicketAmount(ticketHistory.amount) }));
    table.append(createElement("span", { className: "member-ticket-history-arrow", textContent: "›" }));
  });

  section.append(table);
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

function createAppAccordionSection(memberHomeState, sectionName, label, body) {
  const isOpen = sectionName === "detailInfo" ? memberHomeState.isDetailInfoExpanded : memberHomeState.isDetailMemoExpanded;
  const section = createElement("section", {
    className: "member-detail-app-accordion",
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
      memberHomeState.isDetailInfoExpanded = !memberHomeState.isDetailInfoExpanded;
    } else {
      memberHomeState.isDetailMemoExpanded = !memberHomeState.isDetailMemoExpanded;
    }
    rerender(memberHomeState);
  });
  section.append(button);

  if (isOpen) {
    section.append(body);
  }

  return section;
}

function createAppDetailInfoBody(member) {
  return createInfoList([
    ["기본 주소", formatText(member.address)],
    ["상세 주소", formatText(member.addressDetail)],
    ["생년월일", formatMemberBirthDate(member.birthDate)],
    ["동물등록번호", formatText(member.animalRegistrationNumber)],
    ["모색", formatText(member.coatColor)],
    ["몸무게", formatMemberWeight(member.weight)],
    ["성별", formatMemberGender(member.gender, member.neuteredStatus)],
    ["소속 클래스", formatSchoolClassNames(member.schoolClassIds)],
  ], "member-detail-app-info-list");
}

function createAppMemoBody(member) {
  return createElement("div", {
    className: "member-detail-app-memo-body",
    textContent: String(member.memo || "").trim(),
    dataset: { state: String(member.memo || "").trim() ? "filled" : "empty" },
  });
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

function createTicketHistoryPlaceholder(className = "member-ticket-history-placeholder") {
  return createElement("p", {
    className,
    textContent: "지급한 이용권 내역이 없습니다.",
    dataset: { state: "empty" },
  });
}

function formatSchoolClassNames(schoolClassIds) {
  const selectedClassIds = Array.isArray(schoolClassIds) ? schoolClassIds : [];
  if (selectedClassIds.length === 0) {
    return "-";
  }

  const schoolClassList = loadSchoolClassList();
  const selectedClassNames = selectedClassIds
    .map((classId) => schoolClassList.find((schoolClass) => schoolClass.id === classId)?.name)
    .filter(Boolean);

  return selectedClassNames.length ? selectedClassNames.join(", ") : "-";
}

function createMemberProfileImage(className) {
  return createElement("img", {
    className,
    src: DEFAULT_DOG_PROFILE_IMAGE,
    alt: "반려견 프로필",
  });
}

function getMemberPetName(member) {
  return formatText(member.petName || member.dogName);
}

function getSiblingMembers(members, member) {
  if (!member?.phoneNumber) {
    return [];
  }

  return (members || []).filter((candidate) => {
    return candidate.id !== member.id && normalizePhoneNumber(candidate.phoneNumber) === normalizePhoneNumber(member.phoneNumber);
  });
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

function formatDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return formatText(value);
  }
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatTicketAmount(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return "-";
  }
  return `${numericAmount.toLocaleString("ko-KR")}원`;
}

