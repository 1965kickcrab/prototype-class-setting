import { findMemberPet, getStoredMembers, loadMemberTagCatalog } from "../../storage/member-storage.js";
import { createGuardianDraft, createPetDraft } from "./member-edit-draft.js";

export function createMemberEditState() {
  const queryParams = new URLSearchParams(window.location.search);
  const memberId = queryParams.get("memberId") || "";
  const petId = queryParams.get("petId") || "";
  const members = getStoredMembers();
  const selectedMember = members.find((member) => member.id === memberId) || createEmptyMember();
  const selectedPet = findMemberPet(selectedMember, petId);

  return {
    members,
    memberTagCatalog: loadMemberTagCatalog(),
    selectedMember,
    selectedPet,
    guardianDraft: createGuardianDraft(selectedMember),
    petDetailDraft: createPetDraft(selectedPet),
    addPetDraft: createPetDraft(),
    activeScreen: "memberEdit",
    activeSheet: "",
    activeAlert: "",
    toastMessage: "",
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
