import { readJsonStorage, writeJsonStorage } from "./storage-utils.js";
import { getDefaultMemberList } from "./default-member-list.js";
import {
  applyCatalogDrafts,
  mergeTagCatalog,
  normalizeMemberTagName,
  sanitizeTagList,
  sortMemberTagNames,
  syncTagListWithCatalogEdits,
} from "../services/member-tag-service.js";
import { normalizePhoneNumber } from "../utils/phone.js";

export const MEMBER_LIST_STORAGE_KEY = "memberList";
export const DELETED_MEMBER_IDS_STORAGE_KEY = "prototype.memberTags.deletedMemberIds";
export const MEMBER_TAG_CATALOG_STORAGE_KEY = "memberTagCatalog";

export function getStoredMembers() {
  const deletedMemberIds = loadDeletedMemberIds();
  const normalizedMembers = normalizeStoredMembers([
    ...getDefaultMemberList(),
    ...readMemberListStorage(MEMBER_LIST_STORAGE_KEY),
  ]).filter((member) => !deletedMemberIds.includes(member.id));

  writeJsonStorage(MEMBER_LIST_STORAGE_KEY, normalizedMembers);
  return normalizedMembers;
}

export function getStoredMemberTagCatalog() {
  return loadMemberTagCatalog();
}

export function loadMemberTagCatalog() {
  const storedMemberTagCatalog = readJsonStorage(MEMBER_TAG_CATALOG_STORAGE_KEY, null);
  const catalogSource = Array.isArray(storedMemberTagCatalog)
    ? storedMemberTagCatalog
    : getDefaultMemberTagCatalog();

  if (!Array.isArray(catalogSource)) {
    return [];
  }

  const normalizedCatalog = sortMemberTagNames(catalogSource);
  writeJsonStorage(MEMBER_TAG_CATALOG_STORAGE_KEY, normalizedCatalog);
  return normalizedCatalog;
}

export function saveMemberTagCatalog(tags) {
  const nextCatalog = sortMemberTagNames(tags);
  writeJsonStorage(MEMBER_TAG_CATALOG_STORAGE_KEY, nextCatalog);
  return nextCatalog;
}

export function mergeMemberTagCatalog(tags) {
  const nextCatalog = mergeTagCatalog(loadMemberTagCatalog(), tags);
  writeJsonStorage(MEMBER_TAG_CATALOG_STORAGE_KEY, nextCatalog);
  return nextCatalog;
}

export function applyMemberTagCatalogEdits(drafts) {
  const nextCatalog = applyCatalogDrafts(loadMemberTagCatalog(), drafts);
  const nextMembers = getStoredMembers().map((member) => {
    return normalizeStoredMember({
      ...member,
      ownerTags: syncTagListWithCatalogEdits(member.ownerTags, drafts),
      pets: member.pets.map((pet) => ({
        ...pet,
        petTags: syncTagListWithCatalogEdits(pet.petTags, drafts),
      })),
    });
  });

  writeJsonStorage(MEMBER_LIST_STORAGE_KEY, nextMembers);
  writeJsonStorage(MEMBER_TAG_CATALOG_STORAGE_KEY, nextCatalog);

  return {
    members: nextMembers,
    memberTagCatalog: nextCatalog,
  };
}

export function createMemberTag(memberTagName) {
  const nextTag = normalizeMemberTagInput(memberTagName);
  const memberTagCatalog = loadMemberTagCatalog();

  if (!nextTag) {
    return createMemberTagMutationResult(false, "empty", memberTagCatalog);
  }

  if (hasMemberTag(memberTagCatalog, nextTag)) {
    return createMemberTagMutationResult(false, "duplicate", memberTagCatalog);
  }

  return {
    ok: true,
    reason: "",
    ...applyMemberTagCatalogEdits([{
      sourceTag: nextTag,
      nextTag,
      isDeleted: false,
    }]),
  };
}

export function renameMemberTag(sourceTag, nextTagName) {
  const sourceTagName = normalizeMemberTagInput(sourceTag);
  const nextTag = normalizeMemberTagInput(nextTagName);
  const memberTagCatalog = loadMemberTagCatalog();

  if (!sourceTagName || !nextTag) {
    return createMemberTagMutationResult(false, "empty", memberTagCatalog);
  }

  if (normalizeMemberTagName(sourceTagName) === normalizeMemberTagName(nextTag)) {
    return createMemberTagMutationResult(true, "", memberTagCatalog);
  }

  const isDuplicate = memberTagCatalog.some((memberTagName) => {
    return normalizeMemberTagName(memberTagName) !== normalizeMemberTagName(sourceTagName)
      && normalizeMemberTagName(memberTagName) === normalizeMemberTagName(nextTag);
  });

  if (isDuplicate) {
    return createMemberTagMutationResult(false, "duplicate", memberTagCatalog);
  }

  return {
    ok: true,
    reason: "",
    ...applyMemberTagCatalogEdits([{
      sourceTag: sourceTagName,
      nextTag,
      isDeleted: false,
    }]),
  };
}

export function deleteMemberTag(memberTagName) {
  const sourceTagName = normalizeMemberTagInput(memberTagName);
  const memberTagCatalog = loadMemberTagCatalog();

  if (!sourceTagName) {
    return createMemberTagMutationResult(false, "empty", memberTagCatalog);
  }

  if (!hasMemberTag(memberTagCatalog, sourceTagName)) {
    return createMemberTagMutationResult(true, "", memberTagCatalog);
  }

  return {
    ok: true,
    reason: "",
    ...applyMemberTagCatalogEdits([{
      sourceTag: sourceTagName,
      nextTag: sourceTagName,
      isDeleted: true,
    }]),
  };
}

function createMemberTagMutationResult(ok, reason, memberTagCatalog) {
  return {
    ok,
    reason,
    members: getStoredMembers(),
    memberTagCatalog,
  };
}

function normalizeMemberTagInput(memberTagName) {
  return String(memberTagName || "").trim().replace(/\s+/g, " ");
}

function hasMemberTag(memberTagCatalog, memberTagName) {
  const normalizedTagName = normalizeMemberTagName(memberTagName);
  return (memberTagCatalog || []).some((currentTagName) => {
    return normalizeMemberTagName(currentTagName) === normalizedTagName;
  });
}

export function saveRegisteredMembers(membersToRegister) {
  const currentMembers = getStoredMembers();
  const nextMembers = [...currentMembers];
  const registeredMemberIds = [];

  membersToRegister.forEach((member) => {
    const normalizedMember = normalizeStoredMember({ ...member, isRegistered: true });
    registeredMemberIds.push(normalizedMember.id);
    const existingIndex = normalizedMember.id
      ? nextMembers.findIndex((currentMember) => currentMember.id === normalizedMember.id)
      : -1;
    const phoneIndex = normalizedMember.phoneNumber
      ? nextMembers.findIndex((currentMember) => normalizePhoneNumber(currentMember.phoneNumber) === normalizePhoneNumber(normalizedMember.phoneNumber))
      : -1;

    if (existingIndex >= 0) {
      nextMembers[existingIndex] = mergeMemberRecords(nextMembers[existingIndex], normalizedMember);
      return;
    }

    if (phoneIndex >= 0) {
      nextMembers[phoneIndex] = mergeMemberRecords(nextMembers[phoneIndex], normalizedMember);
      return;
    }

    nextMembers.push(normalizedMember);
  });

  writeJsonStorage(
    DELETED_MEMBER_IDS_STORAGE_KEY,
    loadDeletedMemberIds().filter((memberId) => !registeredMemberIds.includes(memberId))
  );
  writeJsonStorage(MEMBER_LIST_STORAGE_KEY, nextMembers);
  return nextMembers;
}

export function getMemberPetRows(members = getStoredMembers()) {
  return (members || []).flatMap((member) => {
    return getMemberPets(member).map((pet) => createMemberPetRow(member, pet));
  });
}

export function getMemberPetKey(memberId, petId) {
  return `${String(memberId || "").trim()}:${String(petId || "").trim()}`;
}

export function setSchoolClassMemberPets(classId, memberPetKeys) {
  const targetClassId = String(classId || "").trim();
  const nextMemberPetKeys = Array.isArray(memberPetKeys) ? memberPetKeys : [];
  const nextMembers = getStoredMembers().map((member) => {
    return normalizeStoredMember({
      ...member,
      pets: getMemberPets(member).map((pet) => {
        const petKey = getMemberPetKey(member.id, pet.id);
        const currentClassIds = normalizeSchoolClassIds(pet.schoolClassIds);
        return {
          ...pet,
          schoolClassIds: nextMemberPetKeys.includes(petKey)
            ? mergeUniqueValues([...currentClassIds, targetClassId])
            : currentClassIds.filter((schoolClassId) => schoolClassId !== targetClassId),
        };
      }),
    });
  });

  return saveStoredMembers(nextMembers);
}

export function updateMemberPetSchoolClassIds(memberId, petId, schoolClassIds) {
  const targetMemberId = String(memberId || "").trim();
  const targetPetId = String(petId || "").trim();
  const nextClassIds = normalizeSchoolClassIds(schoolClassIds);
  const nextMembers = getStoredMembers().map((member) => {
    if (member.id !== targetMemberId) {
      return member;
    }

    return normalizeStoredMember({
      ...member,
      pets: getMemberPets(member).map((pet) => {
        if (pet.id !== targetPetId) {
          return pet;
        }

        return {
          ...pet,
          schoolClassIds: nextClassIds,
        };
      }),
    });
  });

  return saveStoredMembers(nextMembers);
}

export function addMemberPetToSchoolClass(memberId, petId, classId) {
  const targetMemberId = String(memberId || "").trim();
  const targetPetId = String(petId || "").trim();
  const targetClassId = String(classId || "").trim();
  const members = getStoredMembers();

  if (!targetMemberId || !targetPetId || !targetClassId) {
    return members;
  }

  const memberPet = getMemberPetRows(members).find((row) => {
    return row.memberId === targetMemberId && row.petId === targetPetId;
  });
  const currentClassIds = normalizeSchoolClassIds(memberPet?.schoolClassIds);
  if (currentClassIds.includes(targetClassId)) {
    return members;
  }

  return updateMemberPetSchoolClassIds(targetMemberId, targetPetId, [...currentClassIds, targetClassId]);
}

export function findMemberPet(member, petId) {
  const pets = Array.isArray(member?.pets) ? member.pets : getMemberPets(member);

  if (!petId) {
    return pets[0] || createEmptyPet();
  }

  return pets.find((pet) => pet.id === petId) || pets[0] || createEmptyPet();
}

export function saveStoredMembers(members) {
  const normalizedMembers = normalizeStoredMembers(Array.isArray(members) ? members : []);
  const defaultMemberIds = getDefaultMemberIds();
  const savedMemberIds = normalizedMembers.map((member) => member.id);
  const nextDeletedMemberIds = mergeUniqueValues([
    ...loadDeletedMemberIds().filter((memberId) => !savedMemberIds.includes(memberId)),
    ...defaultMemberIds.filter((memberId) => !savedMemberIds.includes(memberId)),
  ]);

  writeJsonStorage(DELETED_MEMBER_IDS_STORAGE_KEY, nextDeletedMemberIds);
  writeJsonStorage(MEMBER_LIST_STORAGE_KEY, normalizedMembers);
  return normalizedMembers;
}

export function deleteStoredMember(memberId) {
  const nextMembers = getStoredMembers().filter((member) => member.id !== memberId);
  const nextDeletedMemberIds = mergeUniqueValues([...loadDeletedMemberIds(), memberId]);

  writeJsonStorage(DELETED_MEMBER_IDS_STORAGE_KEY, nextDeletedMemberIds);
  writeJsonStorage(MEMBER_LIST_STORAGE_KEY, nextMembers);
  return nextMembers;
}

export function createMemberId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createPetId() {
  return `pet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeStoredMembers(storedMembers) {
  const groupedMembers = [];
  const groupIndexByKey = new Map();

  storedMembers.forEach((member) => {
    const normalizedMember = normalizeStoredMember(member);
    const groupKey = getMemberGroupKey(normalizedMember);
    const existingIndex = groupIndexByKey.get(groupKey);

    if (existingIndex === undefined) {
      groupIndexByKey.set(groupKey, groupedMembers.length);
      groupedMembers.push(normalizedMember);
      return;
    }

    groupedMembers[existingIndex] = mergeMemberRecords(groupedMembers[existingIndex], normalizedMember);
  });

  return groupedMembers;
}

function readMemberListStorage(storageKey) {
  const storedMembers = readJsonStorage(storageKey, []);
  return Array.isArray(storedMembers) ? storedMembers : [];
}

function loadDeletedMemberIds() {
  const deletedMemberIds = readJsonStorage(DELETED_MEMBER_IDS_STORAGE_KEY, []);
  return Array.isArray(deletedMemberIds) ? mergeUniqueValues(deletedMemberIds) : [];
}

function getDefaultMemberIds() {
  return normalizeStoredMembers(getDefaultMemberList()).map((member) => member.id);
}

function mergeUniqueValues(values) {
  const uniqueValues = [];

  values.forEach((value) => {
    const normalizedValue = String(value || "").trim();
    if (normalizedValue && !uniqueValues.includes(normalizedValue)) {
      uniqueValues.push(normalizedValue);
    }
  });

  return uniqueValues;
}

function normalizeStoredMember(member) {
  const normalizedMember = {
    id: member?.id || createMemberId(),
    guardianName: member?.guardianName || member?.owner || "",
    phoneNumber: member?.phoneNumber || member?.phone || "",
    address: member?.address || "",
    addressDetail: member?.addressDetail || "",
    isRegistered: Boolean(member?.isRegistered || member?.registered || member?.registeredAt || member?.memberRegistrationStatus === "registered"),
    ownerTags: normalizeMemberTags(member?.ownerTags),
    pets: normalizePets(member),
  };

  if (normalizedMember.pets.length === 0) {
    normalizedMember.pets = [createEmptyPet()];
  }

  return normalizedMember;
}

function normalizePets(member) {
  if (Array.isArray(member?.pets)) {
    return member.pets.map(normalizePet).filter(hasMeaningfulPetData);
  }

  const legacyPet = normalizePet(member);
  return hasMeaningfulPetData(legacyPet) ? [legacyPet] : [];
}

function normalizePet(pet) {
  return {
    id: pet?.id || createPetId(),
    petName: pet?.petName || pet?.dogName || "",
    dogName: pet?.dogName || pet?.petName || "",
    breed: pet?.breed || "",
    memo: pet?.memo || "",
    birthDate: pet?.birthDate || pet?.birthday || "",
    animalRegistrationNumber: pet?.animalRegistrationNumber || pet?.registrationNumber || "",
    coatColor: pet?.coatColor || "",
    weight: pet?.weight || "",
    gender: pet?.gender || "",
    neuteredStatus: pet?.neuteredStatus || "",
    remainingCountByType: normalizeCountMap(pet?.remainingCountByType),
    totalReservableCountByType: normalizeCountMap(pet?.totalReservableCountByType),
    totalReservedCountByType: normalizeCountMap(pet?.totalReservedCountByType),
    ticketHistories: normalizeTicketHistories(pet?.ticketHistories || pet?.tickets),
    petTags: normalizeMemberTags(pet?.petTags),
    schoolClassIds: normalizeSchoolClassIds(pet?.schoolClassIds),
  };
}

function createEmptyPet() {
  return normalizePet({});
}

function hasMeaningfulPetData(pet) {
  return Boolean(
    pet?.petName ||
    pet?.dogName ||
    pet?.breed ||
    pet?.memo ||
    pet?.birthDate ||
    pet?.animalRegistrationNumber ||
    pet?.coatColor ||
    pet?.weight ||
    pet?.gender ||
    pet?.neuteredStatus ||
    pet?.petTags?.length ||
    pet?.schoolClassIds?.length ||
    pet?.ticketHistories?.length
  );
}

function mergeMemberRecords(currentMember, nextMember) {
  const mergedPets = [...getMemberPets(currentMember)];

  getMemberPets(nextMember).forEach((nextPet) => {
    const existingPetIndex = nextPet.id ? mergedPets.findIndex((pet) => pet.id === nextPet.id) : -1;

    if (existingPetIndex >= 0) {
      mergedPets[existingPetIndex] = normalizePet(nextPet);
      return;
    }

    mergedPets.push(normalizePet(nextPet));
  });

  return normalizeStoredMember({
    ...currentMember,
    ...nextMember,
    id: currentMember.id || nextMember.id || createMemberId(),
    guardianName: nextMember.guardianName || currentMember.guardianName,
    phoneNumber: nextMember.phoneNumber || currentMember.phoneNumber,
    address: nextMember.address || currentMember.address,
    addressDetail: nextMember.addressDetail || currentMember.addressDetail,
    ownerTags: mergeTagCatalog(currentMember.ownerTags || [], nextMember.ownerTags || []),
    isRegistered: Boolean(currentMember.isRegistered || nextMember.isRegistered),
    pets: mergedPets,
  });
}

function getMemberPets(member) {
  return Array.isArray(member?.pets) ? member.pets.map(normalizePet) : normalizePets(member);
}

function createMemberPetRow(member, pet) {
  return {
    ...pet,
    id: member.id,
    memberId: member.id,
    petId: pet.id,
    guardianName: member.guardianName,
    phoneNumber: member.phoneNumber,
    address: member.address,
    addressDetail: member.addressDetail,
    ownerTags: Array.isArray(member.ownerTags) ? [...member.ownerTags] : [],
    schoolClassIds: Array.isArray(pet.schoolClassIds) ? [...pet.schoolClassIds] : [],
    isRegistered: member.isRegistered,
    pets: member.pets,
  };
}

function getMemberGroupKey(member) {
  const phoneNumber = normalizePhoneNumber(member?.phoneNumber);
  return phoneNumber ? `phone:${phoneNumber}` : `id:${member?.id || createMemberId()}`;
}


function normalizeCountMap(countMap) {
  const source = countMap && typeof countMap === "object" ? countMap : {};

  return {
    school: normalizeCount(source.school),
    daycare: normalizeCount(source.daycare),
    oneway: normalizeCount(source.oneway),
    roundtrip: normalizeCount(source.roundtrip),
  };
}

function normalizeCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? count : 0;
}

function normalizeMemberTags(memberTags) {
  return sanitizeTagList(memberTags);
}

function normalizeSchoolClassIds(schoolClassIds) {
  return mergeUniqueValues(Array.isArray(schoolClassIds) ? schoolClassIds : []);
}

function getDefaultMemberTagCatalog() {
  return getDefaultMemberList().flatMap((member) => {
    return [
      ...(member.ownerTags || []),
      ...(member.pets || []).flatMap((pet) => pet.petTags || []),
    ];
  });
}

function normalizeTicketHistories(ticketHistories) {
  if (!Array.isArray(ticketHistories)) {
    return [];
  }

  return ticketHistories
    .map((ticketHistory) => {
      return {
        id: ticketHistory?.id || "",
        status: ticketHistory?.status || "",
        ticketName: ticketHistory?.ticketName || ticketHistory?.name || "",
        remainingCount: normalizeCount(ticketHistory?.remainingCount),
        totalCount: normalizeCount(ticketHistory?.totalCount),
        validDays: normalizeCount(ticketHistory?.validDays),
        expiresAt: ticketHistory?.expiresAt || "",
        amount: normalizeCount(ticketHistory?.amount),
      };
    })
    .filter((ticketHistory) => {
      return ticketHistory.ticketName;
    });
}
