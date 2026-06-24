export function createOwnerDetailDraft(member) {
  return {
    id: member?.id || "",
    guardianName: member?.guardianName || "",
    phoneNumber: member?.phoneNumber || "",
    address: member?.address || "",
    addressDetail: member?.addressDetail || "",
    ownerTags: Array.isArray(member?.ownerTags) ? [...member.ownerTags] : [],
  };
}

export function createPetDetailDraft(member) {
  return {
    id: member?.id || "",
    petName: member?.petName || member?.dogName || "",
    breed: member?.breed || "",
    birthDate: member?.birthDate || "",
    animalRegistrationNumber: member?.animalRegistrationNumber || "",
    coatColor: member?.coatColor || "",
    weight: member?.weight || "",
    gender: member?.gender || "",
    neuteredStatus: member?.neuteredStatus || "",
    memo: member?.memo || "",
    petTags: Array.isArray(member?.petTags) ? [...member.petTags] : [],
    schoolClassIds: Array.isArray(member?.schoolClassIds) ? [...member.schoolClassIds] : [],
  };
}
