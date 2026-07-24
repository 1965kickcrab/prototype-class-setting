import { getMemberPetRows, getStoredMemberTagCatalog, getStoredMembers } from "../../storage/member-storage.js";

export function createMemberHomeState() {
  const queryParams = new URLSearchParams(window.location.search);

  return {
    members: getStoredMembers(),
    memberTagCatalog: getStoredMemberTagCatalog(),
    searchTerm: "",
    selectedMemberTagNames: [],
    selectedSchoolClassIds: [],
    tagFilterQuery: "",
    memberTagManagementQuery: "",
    currentPage: 1,
    pageSize: 10,
    isFilterPanelOpen: false,
    activeMobileFilterTab: "memberTag",
    isTagMenuOpen: false,
    isSchoolClassMenuOpen: false,
    isMemberTagManagementOpen: false,
    openMemberTagMenuTagName: "",
    activeMemberTagSheetTagName: "",
    memberTagSheetDraftName: "",
    isGuardianLookupModalOpen: false,
    isMemberRegistrationPageOpen: false,
    activeScreen: "memberHome",
    selectedMember: null,
    toastMessage: queryParams.get("toast") === "memberRegistered" ? "회원을 등록했습니다." : "",
    guardianLookup: {
      guardianName: "",
      phoneNumber: "",
      error: "",
    },
  };
}

export function getFilteredMembers(memberHomeState, searchFields) {
  const searchTerm = normalizeSearchText(memberHomeState.searchTerm);
  const selectedMemberTagNames = memberHomeState.selectedMemberTagNames || [];
  const selectedSchoolClassIds = memberHomeState.selectedSchoolClassIds || [];
  let filteredMembers = getMemberPetRows(memberHomeState.members);

  if (searchTerm) {
    filteredMembers = filteredMembers.filter((member) => {
      return searchFields.some((fieldName) => {
        return normalizeSearchText(member[fieldName]).includes(searchTerm);
      });
    });
  }

  if (selectedMemberTagNames.length > 0) {
    filteredMembers = filteredMembers.filter((member) => {
      const memberTagNames = [...(member.petTags || []), ...(member.ownerTags || [])];
      return selectedMemberTagNames.every((memberTagName) => memberTagNames.includes(memberTagName));
    });
  }

  if (selectedSchoolClassIds.length > 0) {
    filteredMembers = filteredMembers.filter((member) => {
      const schoolClassIds = Array.isArray(member.schoolClassIds) ? member.schoolClassIds : [];
      return selectedSchoolClassIds.some((classId) => schoolClassIds.includes(classId));
    });
  }

  return filteredMembers;
}

export function getMemberListState(memberHomeState, filteredMembers) {
  if (getMemberPetRows(memberHomeState.members).length === 0) {
    return "empty";
  }

  if (filteredMembers.length === 0) {
    return "searchEmpty";
  }

  return "list";
}

function normalizeSearchText(value) {
  return String(value || "").trim().toLowerCase();
}
