import { createHeaderIconButton } from "../../components/header-icon-button.js";
import { normalizeMemberTagName, sanitizeTagList, sortMemberTagNames } from "../../services/member-tag-service.js";
import { createMemberTag, deleteMemberTag, renameMemberTag } from "../../storage/member-storage.js";
import { createElement } from "../../utils/dom.js";
import { bindImeAwareInput } from "../../utils/ime-input.js";

const MEMBER_TAG_DUPLICATE_MESSAGE = "이미 존재하는 태그입니다.";

export function createMemberTagManagementModal(memberHomeState, options = {}) {
  const rerender = options.rerender || (() => {});
  const overlay = createElement("section", {
    className: "member-tag-management-overlay",
    dataset: { area: "memberTagManagement", modal: "memberTagManagement", state: "open" },
  });
  const modal = createElement("div", { className: "member-tag-management-modal" });
  const header = createElement("div", { className: "member-tag-management-header" });
  header.append(createElement("h2", { textContent: "태그 관리" }));

  const closeButton = createHeaderIconButton({
    className: "modal-close-button close-button",
    icon: "close",
    ariaLabel: "태그 관리 닫기",
    dataset: { action: "closeMemberTagManagement" },
  });
  closeButton.addEventListener("click", () => {
    memberHomeState.isMemberTagManagementOpen = false;
    memberHomeState.memberTagManagementQuery = "";
    memberHomeState.openMemberTagMenuTagName = "";
    memberHomeState.activeMemberTagSheetTagName = "";
    memberHomeState.memberTagSheetDraftName = "";
    rerender(memberHomeState);
  });
  header.append(closeButton);
  modal.append(header);
  modal.append(createMemberTagManagementSearch(memberHomeState, rerender));
  modal.append(createMemberTagManagementList(memberHomeState, rerender));
  overlay.append(modal);

  if (memberHomeState.activeMemberTagSheetTagName) {
    overlay.append(createMemberTagEditBottomSheet(memberHomeState, rerender));
  }

  return overlay;
}

function createMemberTagManagementSearch(memberHomeState, rerender) {
  const field = createElement("label", {
    className: "member-tag-management-search",
    dataset: { field: "memberTagManagementSearch" },
  });
  const input = createElement("input", {
    className: "member-tag-management-search-input",
    type: "search",
    value: memberHomeState.memberTagManagementQuery || "",
    placeholder: "태그 검색",
    dataset: { field: "memberTagSearch" },
  });
  bindImeAwareInput(input, {
    onInput: (event, meta) => {
      memberHomeState.memberTagManagementQuery = event.target.value;
      memberHomeState.openMemberTagMenuTagName = "";

      if (meta.isComposing) {
        syncMemberTagManagementList(memberHomeState, rerender);
        return;
      }

      rerender(memberHomeState);
      focusMemberTagManagementSearch();
    },
  });
  field.append(input);
  return field;
}

function syncMemberTagManagementList(memberHomeState, rerender) {
  const list = document.querySelector("[data-area='memberTagManagementList']");
  if (!list) {
    return;
  }

  list.replaceWith(createMemberTagManagementList(memberHomeState, rerender));
}

function focusMemberTagManagementSearch() {
  window.setTimeout(() => {
    const input = document.querySelector(".member-tag-management-search-input");
    if (!input) {
      return;
    }

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, 0);
}

function createMemberTagManagementList(memberHomeState, rerender) {
  const visibleMemberTags = getVisibleManagedMemberTags(memberHomeState);
  const hasQuery = Boolean(String(memberHomeState.memberTagManagementQuery || "").trim());
  const creatableTagName = getCreatableMemberTagName(memberHomeState);
  const canCreateTag = Boolean(creatableTagName);
  const list = createElement("div", {
    className: "member-tag-management-list",
    dataset: {
      area: "memberTagManagementList",
      state: visibleMemberTags.length || canCreateTag ? "list" : hasQuery ? "searchEmpty" : "empty",
    },
  });

  if (!memberHomeState.memberTagCatalog.length && !canCreateTag) {
    list.append(createElement("p", { className: "empty-inline", textContent: "등록된 태그가 없습니다" }));
    return list;
  }

  if (canCreateTag) {
    list.append(createMemberTagCreateRow(memberHomeState, creatableTagName, rerender));
  }

  if (!visibleMemberTags.length && !canCreateTag) {
    list.append(createElement("p", { className: "empty-inline", textContent: "조회 결과가 없습니다" }));
    return list;
  }

  visibleMemberTags.forEach((memberTagName) => {
    list.append(createMemberTagManagementRow(memberHomeState, memberTagName, rerender));
  });

  return list;
}

function createMemberTagCreateRow(memberHomeState, memberTagName, rerender) {
  const row = createElement("button", {
    className: "member-tag-management-row member-tag-management-create-row",
    type: "button",
    textContent: `"${memberTagName}" 추가`,
    dataset: { action: "createMemberTagDraft", entity: "memberTag", entityId: memberTagName },
  });
  row.addEventListener("click", () => {
    applyMemberHomeTagMutation(memberHomeState, createMemberTag(memberTagName), {
      clearQuery: true,
      closeMenu: true,
    }, rerender);
  });
  return row;
}

function createMemberTagManagementRow(memberHomeState, memberTagName, rerender) {
  const row = createElement("div", {
    className: "member-tag-management-row",
    dataset: { entity: "memberTag", entityId: memberTagName, state: "idle" },
  });

  if (isMobileLayout()) {
    row.append(createElement("span", { className: "member-tag-management-name", textContent: memberTagName }));
    row.append(createMemberTagMoreButton(memberHomeState, memberTagName, { presentation: "sheet" }, rerender));
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
      commitMemberHomeTagRename(memberHomeState, memberTagName, event.target.value, {}, rerender);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.target.value = memberTagName;
      event.target.blur();
    }
  });
  input.addEventListener("blur", (event) => {
    commitMemberHomeTagRename(memberHomeState, memberTagName, event.target.value, {}, rerender);
  });
  row.append(input);
  row.append(createMemberTagMoreButton(memberHomeState, memberTagName, { presentation: "menu" }, rerender));

  if (memberHomeState.openMemberTagMenuTagName === memberTagName) {
    row.append(createMemberTagOptionMenu(memberHomeState, memberTagName, rerender));
  }

  return row;
}

function createMemberTagMoreButton(memberHomeState, memberTagName, options, rerender) {
  const button = createElement("button", {
    className: "member-tag-more-button",
    type: "button",
    textContent: "...",
    ariaLabel: `${memberTagName} 태그 더보기`,
    dataset: { action: "openMemberTagOptions", entityId: memberTagName },
  });
  button.addEventListener("click", () => {
    if (options.presentation === "sheet") {
      memberHomeState.activeMemberTagSheetTagName = memberTagName;
      memberHomeState.memberTagSheetDraftName = memberTagName;
      rerender(memberHomeState);
      focusMemberHomeTagSheetInput();
      return;
    }

    memberHomeState.openMemberTagMenuTagName = memberHomeState.openMemberTagMenuTagName === memberTagName ? "" : memberTagName;
    rerender(memberHomeState);
  });
  return button;
}

function createMemberTagOptionMenu(memberHomeState, memberTagName, rerender) {
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
    applyMemberHomeTagMutation(memberHomeState, deleteMemberTag(memberTagName), {
      closeMenu: true,
      deletedTag: memberTagName,
    }, rerender);
  });
  menu.append(deleteButton);
  return menu;
}

function createMemberTagEditBottomSheet(memberHomeState, rerender) {
  const sourceTag = memberHomeState.activeMemberTagSheetTagName;
  const overlay = createElement("section", {
    className: "member-tag-edit-sheet-overlay",
    dataset: { area: "memberTagEditBottomSheet", modal: "memberTagEditBottomSheet", state: "open" },
  });
  overlay.addEventListener("click", (event) => {
    if (event.target !== overlay) {
      return;
    }

    closeMemberHomeTagEditSheet(memberHomeState, rerender);
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
    value: memberHomeState.memberTagSheetDraftName || sourceTag,
    placeholder: "태그명",
    dataset: { field: "memberTag" },
  });
  doneButton.addEventListener("click", () => {
    commitMemberHomeTagRename(memberHomeState, sourceTag, input.value, { closeSheet: true }, rerender);
  });
  sheet.append(input);

  const deleteButton = createElement("button", {
    className: "member-tag-edit-delete-button",
    type: "button",
    textContent: "삭제",
    dataset: { action: "deleteMemberTag", entityId: sourceTag },
  });
  deleteButton.addEventListener("click", () => {
    applyMemberHomeTagMutation(memberHomeState, deleteMemberTag(sourceTag), {
      closeSheet: true,
      deletedTag: sourceTag,
    }, rerender);
  });
  sheet.append(deleteButton);
  overlay.append(sheet);
  return overlay;
}

function closeMemberHomeTagEditSheet(memberHomeState, rerender) {
  memberHomeState.activeMemberTagSheetTagName = "";
  memberHomeState.memberTagSheetDraftName = "";
  rerender(memberHomeState);
}

function focusMemberHomeTagSheetInput() {
  window.setTimeout(() => {
    const input = document.querySelector(".member-tag-edit-input");
    if (!input) {
      return;
    }

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, 0);
}

function commitMemberHomeTagRename(memberHomeState, sourceTag, nextTagName, options = {}, rerender) {
  const trimmedTagName = String(nextTagName || "").trim().replace(/\s+/g, " ");
  if (!trimmedTagName) {
    if (options.closeSheet) {
      closeMemberHomeTagEditSheet(memberHomeState, rerender);
      return;
    }

    rerender(memberHomeState);
    return;
  }

  applyMemberHomeTagMutation(memberHomeState, renameMemberTag(sourceTag, trimmedTagName), {
    ...options,
    renamedFrom: sourceTag,
    renamedTo: trimmedTagName,
  }, rerender);
}

function applyMemberHomeTagMutation(memberHomeState, result, options = {}, rerender) {
  if (!result.ok) {
    memberHomeState.toastMessage = result.reason === "duplicate" ? MEMBER_TAG_DUPLICATE_MESSAGE : "";
    rerender(memberHomeState);
    return;
  }

  memberHomeState.members = result.members;
  memberHomeState.memberTagCatalog = result.memberTagCatalog;

  if (options.renamedFrom) {
    memberHomeState.selectedMemberTagNames = sanitizeTagList(memberHomeState.selectedMemberTagNames.map((selectedTagName) => {
      return normalizeMemberTagName(selectedTagName) === normalizeMemberTagName(options.renamedFrom)
        ? options.renamedTo
        : selectedTagName;
    }));
  }

  if (options.deletedTag) {
    memberHomeState.selectedMemberTagNames = sanitizeTagList(memberHomeState.selectedMemberTagNames.filter((selectedTagName) => {
      return normalizeMemberTagName(selectedTagName) !== normalizeMemberTagName(options.deletedTag);
    }));
  }

  if (options.clearQuery) {
    memberHomeState.memberTagManagementQuery = "";
  }

  if (options.closeMenu) {
    memberHomeState.openMemberTagMenuTagName = "";
  }

  if (options.closeSheet) {
    memberHomeState.activeMemberTagSheetTagName = "";
    memberHomeState.memberTagSheetDraftName = "";
  }

  rerender(memberHomeState);
}

function getCreatableMemberTagName(memberHomeState) {
  const tagName = String(memberHomeState.memberTagManagementQuery || "").trim().replace(/\s+/g, " ");
  const normalizedTagName = normalizeMemberTagName(tagName);

  if (!normalizedTagName) {
    return "";
  }

  const isExistingTag = (memberHomeState.memberTagCatalog || []).some((memberTagName) => {
    return normalizeMemberTagName(memberTagName) === normalizedTagName;
  });

  return isExistingTag ? "" : tagName;
}

function getVisibleManagedMemberTags(memberHomeState) {
  const query = normalizeMemberTagName(memberHomeState.memberTagManagementQuery);
  const memberTags = sortMemberTagNames(memberHomeState.memberTagCatalog || []);

  if (!query) {
    return memberTags;
  }

  return memberTags.filter((memberTagName) => {
    return normalizeMemberTagName(memberTagName).includes(query);
  });
}

function isMobileLayout() {
  return window.matchMedia && window.matchMedia("(max-width: 430px)").matches;
}
