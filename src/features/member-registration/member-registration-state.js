import { findMemberPet, getStoredMembers, loadMemberTagCatalog } from "../../storage/member-storage.js";

export function createMemberRegistrationState() {
  const queryParams = new URLSearchParams(window.location.search);
  const memberId = queryParams.get("memberId") || "";
  const petId = queryParams.get("petId") || "";
  const members = getStoredMembers();
  const loadedMember = members.find((member) => member.id === memberId);
  const loadedPet = findMemberPet(loadedMember, petId);

  const member = loadedMember || {
    id: "",
    guardianName: queryParams.get("guardianName") || "",
    phoneNumber: queryParams.get("phoneNumber") || "",
    address: queryParams.get("address") || "",
    addressDetail: "",
    ownerTags: [],
    pets: [],
  };

  return {
    activeScreen: "memberRegistration",
    isGuardianEditModalOpen: false,
    isAddPetBottomSheetOpen: false,
    activeAlert: "",
    activePetIndex: 0,
    memberTagCatalog: loadMemberTagCatalog(),
    member,
    guardianDraft: {
      guardianName: member.guardianName || "",
      phoneNumber: member.phoneNumber || "",
      address: member.address || "",
      addressDetail: member.addressDetail || "",
      ownerTags: Array.isArray(member.ownerTags) ? [...member.ownerTags] : [],
    },
    petForms: loadedMember?.pets?.length ? loadedMember.pets.map(createPetFormDraft) : [createPetFormDraft(loadedPet)],
    addPetDraft: createPetFormDraft(),
    toastMessage: queryParams.get("toast") === "loaded" ? "반려견 정보를 불러왔습니다." : "",
  };
}

function createPetFormDraft(member = {}) {
  return {
    id: member.id || "",
    petName: member.petName || member.dogName || "",
    breed: member.breed || "",
    birthDate: member.birthDate || "",
    animalRegistrationNumber: member.animalRegistrationNumber || "",
    coatColor: member.coatColor || "",
    weight: member.weight || "",
    gender: member.gender || "",
    neuteredStatus: member.neuteredStatus || "",
    memo: member.memo || "",
    petTags: Array.isArray(member.petTags) ? [...member.petTags] : [],
    schoolClassIds: Array.isArray(member.schoolClassIds) ? [...member.schoolClassIds] : [],
  };
}
