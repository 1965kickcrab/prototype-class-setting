import { createEmptyStateElement } from "../../components/empty-state.js";
import { createHeaderIconButton } from "../../components/header-icon-button.js";
import { createToast, TOAST_AUTO_DISMISS_MS } from "../../components/toast.js";
import { createMemberTag, deleteMemberTag, renameMemberTag } from "../../storage/member-storage.js";
import { createElement } from "../../utils/dom.js";
import { bindImeAwareInput } from "../../utils/ime-input.js";
import { getCreatableMemberTagName, getVisibleMemberTags } from "./member-tag-management-state.js";

const MEMBER_TAG_DUPLICATE_MESSAGE = "이미 존재하는 태그입니다.";
let toastDismissTimer = null;

export function renderMemberTagManagementScreen(rootElement, state) {
  rootElement.innerHTML = "";
  rootElement.append(createScreen(state));
  scheduleToastDismiss(state);
}

function rerender(state) {
  renderMemberTagManagementScreen(document.querySelector("#app"), state);
}

function scheduleToastDismiss(state) {
  window.clearTimeout(toastDismissTimer);

  if (!state.toastMessage) {
    return;
  }

  toastDismissTimer = window.setTimeout(() => {
    state.toastMessage = "";
    rerender(state);
  }, TOAST_AUTO_DISMISS_MS);
}

function createScreen(state) {
  const screen = createElement("main", {
    className: "member-tag-management-screen",
    dataset: { screen: "memberTagManagement" },
  });
  screen.append(createHeader());
  screen.append(createBody(state));

  if (state.activeMemberTagSheetTagName) {
    screen.append(createMemberTagEditBottomSheet(state));
  }

  if (state.toastMessage) {
    screen.append(createToast(state.toastMessage));
  }

  return screen;
}

function createHeader() {
  const header = createElement("header", { className: "member-tag-management-page-header" });
  const backButton = createHeaderIconButton({
    className: "page-close-button back-button",
    icon: "back",
    iconPath: "../assets/icons/iconChevronLeft.svg",
    ariaLabel: "태그 관리 닫기",
    dataset: { action: "closeMemberTagManagement" },
  });
  backButton.addEventListener("click", () => {
    window.location.href = "./app-more.html";
  });
  header.append(backButton);
  header.append(createElement("h1", { textContent: "태그 관리" }));
  header.append(createElement("span", { className: "header-spacer" }));
  return header;
}

function createBody(state) {
  const body = createElement("section", {
    className: "member-tag-management-page-body",
    dataset: { area: "memberTagManagement" },
  });
  body.append(createSearch(state));
  body.append(createMemberTagList(state));
  return body;
}

function createSearch(state) {
  const field = createElement("label", {
    className: "member-tag-management-search",
    dataset: { field: "memberTagManagementSearch" },
  });
  const input = createElement("input", {
    className: "member-tag-management-search-input",
    type: "search",
    value: state.memberTagManagementQuery || "",
    placeholder: "태그 검색",
    dataset: { field: "memberTagSearch" },
  });
  bindImeAwareInput(input, {
    onInput: (event, meta) => {
      state.memberTagManagementQuery = event.target.value;
      state.openMemberTagMenuTagName = "";

      if (meta.isComposing) {
        syncMemberTagList(state);
        return;
      }

      rerender(state);
      focusSearchInput();
    },
  });
  field.append(input);
  return field;
}

function syncMemberTagList(state) {
  const list = document.querySelector("[data-area='memberTagManagementList']");
  if (!list) {
    return;
  }

  list.replaceWith(createMemberTagList(state));
}

function focusSearchInput() {
  window.setTimeout(() => {
    const input = document.querySelector(".member-tag-management-search-input");
    if (!input) {
      return;
    }

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, 0);
}

function createMemberTagList(state) {
  const visibleMemberTags = getVisibleMemberTags(state);
  const hasQuery = Boolean(String(state.memberTagManagementQuery || "").trim());
  const creatableTagName = getCreatableMemberTagName(state);
  const canCreateTag = Boolean(creatableTagName);
  const list = createElement("div", {
    className: "member-tag-management-list",
    dataset: {
      area: "memberTagManagementList",
      state: visibleMemberTags.length || canCreateTag ? "list" : hasQuery ? "searchEmpty" : "empty",
    },
  });

  if (!state.memberTagCatalog.length && !canCreateTag) {
    list.append(createEmptyStateElement({ title: "등록된 태그가 없습니다" }));
    return list;
  }

  if (canCreateTag) {
    list.append(createMemberTagCreateRow(state, creatableTagName));
  }

  if (!visibleMemberTags.length && !canCreateTag) {
    list.append(createEmptyStateElement({ title: "조회 결과가 없습니다" }));
    return list;
  }

  visibleMemberTags.forEach((memberTagName) => {
    list.append(createMemberTagRow(state, memberTagName));
  });
  return list;
}

function createMemberTagCreateRow(state, memberTagName) {
  const row = createElement("button", {
    className: "member-tag-management-row member-tag-management-create-row",
    type: "button",
    textContent: `"${memberTagName}" 추가`,
    dataset: { action: "createMemberTag", entity: "memberTag", entityId: memberTagName },
  });
  row.addEventListener("click", () => {
    applyMemberTagMutation(state, createMemberTag(memberTagName), {
      clearQuery: true,
      closeMenu: true,
    });
  });
  return row;
}

function createMemberTagRow(state, memberTagName) {
  const row = createElement("div", {
    className: "member-tag-management-row",
    dataset: { entity: "memberTag", entityId: memberTagName, state: "idle" },
  });

  if (isMobileLayout()) {
    row.append(createElement("span", { className: "member-tag-management-name", textContent: memberTagName }));
    row.append(createMoreButton(state, memberTagName, { presentation: "sheet" }));
    return row;
  }

  const input = createElement("input", {
    className: "member-tag-management-input",
    type: "text",
    value: memberTagName,
    placeholder: "태그명",
    dataset: { field: "memberTag" },
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitMemberTagRename(state, memberTagName, event.target.value);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.target.value = memberTagName;
      event.target.blur();
    }
  });
  input.addEventListener("blur", (event) => {
    commitMemberTagRename(state, memberTagName, event.target.value);
  });
  row.append(input);
  row.append(createMoreButton(state, memberTagName, { presentation: "menu" }));

  if (state.openMemberTagMenuTagName === memberTagName) {
    row.append(createMemberTagOptionMenu(state, memberTagName));
  }

  return row;
}

function createMoreButton(state, memberTagName, options) {
  const button = createElement("button", {
    className: "member-tag-more-button",
    type: "button",
    textContent: "...",
    ariaLabel: `${memberTagName} 태그 더보기`,
    dataset: { action: "openMemberTagOptions", entityId: memberTagName },
  });
  button.addEventListener("click", () => {
    if (options.presentation === "sheet") {
      state.activeMemberTagSheetTagName = memberTagName;
      state.memberTagSheetDraftName = memberTagName;
      rerender(state);
      focusMemberTagSheetInput();
      return;
    }

    state.openMemberTagMenuTagName = state.openMemberTagMenuTagName === memberTagName ? "" : memberTagName;
    rerender(state);
  });
  return button;
}

function createMemberTagOptionMenu(state, memberTagName) {
  const menu = createElement("div", {
    className: "member-tag-option-menu",
    dataset: { area: "memberTagOptionMenu", state: "open" },
  });
  const deleteButton = createElement("button", {
    className: "member-tag-option-button",
    type: "button",
    textContent: "삭제",
    dataset: { action: "deleteMemberTag", entityId: memberTagName },
  });
  deleteButton.addEventListener("click", () => {
    applyMemberTagMutation(state, deleteMemberTag(memberTagName), {
      closeMenu: true,
    });
  });
  menu.append(deleteButton);
  return menu;
}

function createMemberTagEditBottomSheet(state) {
  const sourceTag = state.activeMemberTagSheetTagName;
  const overlay = createElement("section", {
    className: "member-tag-edit-sheet-overlay",
    dataset: { area: "memberTagEditBottomSheet", modal: "memberTagEditBottomSheet", state: "open" },
  });
  overlay.addEventListener("click", (event) => {
    if (event.target !== overlay) {
      return;
    }

    closeMemberTagEditSheet(state);
  });

  const sheet = createElement("div", { className: "member-tag-edit-sheet" });
  sheet.append(createElement("div", { className: "member-tag-edit-sheet-handle" }));

  const header = createElement("header", { className: "member-tag-edit-sheet-header" });
  header.append(createElement("span", { className: "member-tag-edit-sheet-spacer" }));
  header.append(createElement("h2", { textContent: sourceTag }));
  const doneButton = createElement("button", {
    className: "text-button member-tag-edit-done-button",
    type: "button",
    textContent: "완료",
    dataset: { action: "saveMemberTagEdit" },
  });
  header.append(doneButton);
  sheet.append(header);

  const input = createElement("input", {
    className: "member-tag-edit-input",
    type: "text",
    value: state.memberTagSheetDraftName || sourceTag,
    placeholder: "태그명",
    dataset: { field: "memberTag" },
  });
  doneButton.addEventListener("click", () => {
    commitMemberTagRename(state, sourceTag, input.value, { closeSheet: true });
  });
  sheet.append(input);

  const deleteButton = createElement("button", {
    className: "member-tag-edit-delete-button",
    type: "button",
    textContent: "삭제",
    dataset: { action: "deleteMemberTag", entityId: sourceTag },
  });
  deleteButton.addEventListener("click", () => {
    applyMemberTagMutation(state, deleteMemberTag(sourceTag), {
      closeSheet: true,
    });
  });
  sheet.append(deleteButton);
  overlay.append(sheet);
  return overlay;
}

function closeMemberTagEditSheet(state) {
  state.activeMemberTagSheetTagName = "";
  state.memberTagSheetDraftName = "";
  rerender(state);
}

function focusMemberTagSheetInput() {
  window.setTimeout(() => {
    const input = document.querySelector(".member-tag-edit-input");
    if (!input) {
      return;
    }

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, 0);
}

function commitMemberTagRename(state, sourceTag, nextTagName, options = {}) {
  const trimmedTagName = String(nextTagName || "").trim().replace(/\s+/g, " ");
  if (!trimmedTagName) {
    if (options.closeSheet) {
      closeMemberTagEditSheet(state);
      return;
    }

    rerender(state);
    return;
  }

  applyMemberTagMutation(state, renameMemberTag(sourceTag, trimmedTagName), options);
}

function applyMemberTagMutation(state, result, options = {}) {
  if (!result.ok) {
    state.toastMessage = result.reason === "duplicate" ? MEMBER_TAG_DUPLICATE_MESSAGE : "";
    rerender(state);
    return;
  }

  state.memberTagCatalog = result.memberTagCatalog;

  if (options.clearQuery) {
    state.memberTagManagementQuery = "";
  }

  if (options.closeMenu) {
    state.openMemberTagMenuTagName = "";
  }

  if (options.closeSheet) {
    state.activeMemberTagSheetTagName = "";
    state.memberTagSheetDraftName = "";
  }

  rerender(state);
}

function isMobileLayout() {
  return window.matchMedia && window.matchMedia("(max-width: 430px)").matches;
}
