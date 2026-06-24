import { findMemberPet, loadMemberTagCatalog, getStoredMembers } from "../../storage/member-storage.js";
import { createOwnerDetailDraft, createPetDetailDraft } from "./member-detail-draft.js";

export function createMemberDetailState() {
  const queryParams = new URLSearchParams(window.location.search);
  const memberId = queryParams.get("memberId") || "";
  const petId = queryParams.get("petId") || "";
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
    toastMessage: "",
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
