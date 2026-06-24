import { loadMemberTagCatalog } from "../../storage/member-storage.js";
import { normalizeMemberTagName, sortMemberTagNames } from "../../services/member-tag-service.js";

export function createMemberTagManagementState() {
  return {
    memberTagCatalog: loadMemberTagCatalog(),
    memberTagManagementQuery: "",
    openMemberTagMenuTagName: "",
    activeMemberTagSheetTagName: "",
    memberTagSheetDraftName: "",
    toastMessage: "",
  };
}

export function getVisibleMemberTags(state) {
  const query = normalizeMemberTagName(state.memberTagManagementQuery);
  const memberTags = sortMemberTagNames(state.memberTagCatalog || []);

  if (!query) {
    return memberTags;
  }

  return memberTags.filter((memberTagName) => {
    return normalizeMemberTagName(memberTagName).includes(query);
  });
}

export function getCreatableMemberTagName(state) {
  const tagName = String(state.memberTagManagementQuery || "").trim().replace(/\s+/g, " ");
  const normalizedTagName = normalizeMemberTagName(tagName);

  if (!normalizedTagName) {
    return "";
  }

  const isExistingTag = (state.memberTagCatalog || []).some((memberTagName) => {
    return normalizeMemberTagName(memberTagName) === normalizedTagName;
  });

  return isExistingTag ? "" : tagName;
}
