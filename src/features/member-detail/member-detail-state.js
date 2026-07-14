import { findMemberPet, loadMemberTagCatalog, getStoredMembers } from "../../storage/member-storage.js";
import { createOwnerDetailDraft, createPetDetailDraft } from "./member-detail-draft.js";

export function createMemberDetailState() {
  const queryParams = new URLSearchParams(window.location.search);
  const memberId = queryParams.get("memberId") || "";
  const petId = queryParams.get("petId") || "";
  const toast = queryParams.get("toast") || "";
  const members = getStoredMembers();
  const selectedMember = members.find((member) => member.id === memberId) || createEmptyMember();
  const selectedPet = findMemberPet(selectedMember, petId);

  return {
    members,
    memberTagCatalog: loadMemberTagCatalog(),
    activeScreen: "memberDetail",
    selectedMember,
    selectedPet,
    activeMemberDetailTab: "memberInfo",
    isDetailInfoExpanded: false,
    isDetailMemoExpanded: false,
    isPetDetailModalOpen: false,
    isPetDetailBottomSheetOpen: false,
    isOwnerDetailModalOpen: false,
    ownerDetailDraft: createOwnerDetailDraft(selectedMember),
    petDetailDraft: createPetDetailDraft(selectedPet),
    toastMessage: toast === "registered" ? "이미 등록된 회원입니다. 반려견 정보를 확인해 주세요." : "",
    isMemberRegistrationPageOpen: false,
    isGuardianLookupModalOpen: false,
    guardianLookup: {
      guardianName: "",
      phoneNumber: "",
      error: "",
    },
  };
}

function createEmptyMember() {
  return {
    id: "",
    guardianName: "",
    phoneNumber: "",
    address: "",
    addressDetail: "",
    ownerTags: [],
    pets: [],
  };
}
