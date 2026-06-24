export function createEmptyPetDraft() {
  return createPetDraft({});
}

export function createGuardianDraft(member = {}) {
  return {
    guardianName: member.guardianName || "",
    phoneNumber: member.phoneNumber || "",
    address: member.address || "",
    addressDetail: member.addressDetail || "",
    ownerTags: Array.isArray(member.ownerTags) ? [...member.ownerTags] : [],
  };
}

export function createPetDraft(pet = {}) {
  return {
    id: pet.id || "",
    petName: pet.petName || pet.dogName || "",
    dogName: pet.dogName || pet.petName || "",
    breed: pet.breed || "",
    birthDate: pet.birthDate || "",
    animalRegistrationNumber: pet.animalRegistrationNumber || "",
    coatColor: pet.coatColor || "",
    weight: pet.weight || "",
    gender: pet.gender || "",
    neuteredStatus: pet.neuteredStatus || "",
    memo: pet.memo || "",
    petTags: Array.isArray(pet.petTags) ? [...pet.petTags] : [],
  };
}
