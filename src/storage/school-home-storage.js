import { readJsonStorage, writeJsonStorage } from "./storage-utils.js";

export const SCHOOL_RESERVATION_LIST_STORAGE_KEY = "schoolReservationList";

export function getSchoolHomeReservations() {
  return [
    ...SCHOOL_HOME_RESERVATIONS.map((reservation) => ({ ...reservation })),
    ...loadStoredSchoolReservations(),
  ];
}

export function loadStoredSchoolReservations() {
  const storedReservations = readJsonStorage(SCHOOL_RESERVATION_LIST_STORAGE_KEY, []);
  return Array.isArray(storedReservations)
    ? storedReservations.map(normalizeStoredSchoolReservation).filter((reservation) => reservation.date && reservation.memberId && reservation.petId)
    : [];
}

export function saveStoredSchoolReservations(reservations) {
  const normalizedReservations = Array.isArray(reservations)
    ? reservations.map(normalizeStoredSchoolReservation).filter((reservation) => reservation.date && reservation.memberId && reservation.petId)
    : [];
  writeJsonStorage(SCHOOL_RESERVATION_LIST_STORAGE_KEY, normalizedReservations);
  return normalizedReservations;
}

export function appendStoredSchoolReservations(reservationsToAppend) {
  const nextReservations = [
    ...loadStoredSchoolReservations(),
    ...(Array.isArray(reservationsToAppend) ? reservationsToAppend : []),
  ];
  return saveStoredSchoolReservations(nextReservations);
}

export function getSchoolHomeReservationMembers() {
  return createMembersFromReservations(SCHOOL_HOME_MEMBER_FIXTURES);
}

export function getSchoolHomeCapacityClosedDates() {
  return [...SCHOOL_HOME_CAPACITY_CLOSED_DATES];
}

export function getSchoolHomeInitialView() {
  const todayDateKey = getTodayDateKey();

  return {
    currentMonth: todayDateKey.slice(0, 7),
    selectedDate: todayDateKey,
  };
}

const SCHOOL_HOME_RESERVATIONS = [];

const SCHOOL_HOME_MEMBER_FIXTURES = [
  createSchoolReservation({
    id: "school-member-fixture-1",
    date: "",
    memberId: "member-kim-minji",
    petId: "pet-byeoli",
    petName: "별이",
    breed: "캐벌리어 킹 찰스 스패니얼",
    guardianName: "김민지",
    phoneNumber: "010-2345-1001",
    address: "서울시 마포구",
    addressDetail: "",
    ownerTags: [],
    petTags: [],
    birthDate: "2021-03-12",
    animalRegistrationNumber: "410000000001001",
    coatColor: "브라운 화이트",
    weight: "6.2",
    gender: "여아",
    neuteredStatus: "완료",
    memo: "",
    totalReservableCount: 0,
  }),
  createSchoolReservation({
    id: "school-member-fixture-2",
    date: "",
    memberId: "member-lee-seojun",
    petId: "pet-coco",
    petName: "코코",
    breed: "토이 푸들",
    guardianName: "이서준",
    phoneNumber: "010-2345-1002",
    address: "서울시 용산구",
    addressDetail: "",
    ownerTags: [],
    petTags: [],
    birthDate: "2020-11-02",
    animalRegistrationNumber: "410000000001002",
    coatColor: "크림",
    weight: "4.1",
    gender: "남아",
    neuteredStatus: "완료",
    memo: "",
    totalReservableCount: 0,
  }),
  createSchoolReservation({
    id: "school-member-fixture-3",
    date: "",
    memberId: "member-park-hana",
    petId: "pet-cherry",
    petName: "체리",
    breed: "말티즈",
    guardianName: "박하나",
    phoneNumber: "010-2345-1003",
    address: "서울시 성동구",
    addressDetail: "",
    ownerTags: [],
    petTags: [],
    birthDate: "2022-05-20",
    animalRegistrationNumber: "410000000001003",
    coatColor: "화이트",
    weight: "3.8",
    gender: "여아",
    neuteredStatus: "미완료",
    memo: "",
    totalReservableCount: 0,
  }),
];

const SCHOOL_HOME_CAPACITY_CLOSED_DATES = [
  "2025-07-04",
];

function createSchoolReservation(reservation) {
  return {
    status: "예약",
    ...reservation,
  };
}

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createSchoolReservationId() {
  return `school-reservation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeStoredSchoolReservation(reservation) {
  return createSchoolReservation({
    id: String(reservation?.id || createSchoolReservationId()).trim(),
    date: String(reservation?.date || "").trim(),
    classId: String(reservation?.classId || "").trim(),
    className: String(reservation?.className || "").trim(),
    memberId: String(reservation?.memberId || "").trim(),
    petId: String(reservation?.petId || "").trim(),
    petName: String(reservation?.petName || "").trim(),
    breed: String(reservation?.breed || "").trim(),
    guardianName: String(reservation?.guardianName || "").trim(),
    phoneNumber: String(reservation?.phoneNumber || "").trim(),
    address: String(reservation?.address || "").trim(),
    addressDetail: String(reservation?.addressDetail || "").trim(),
    ownerTags: Array.isArray(reservation?.ownerTags) ? [...reservation.ownerTags] : [],
    petTags: Array.isArray(reservation?.petTags) ? [...reservation.petTags] : [],
    birthDate: String(reservation?.birthDate || "").trim(),
    animalRegistrationNumber: String(reservation?.animalRegistrationNumber || "").trim(),
    coatColor: String(reservation?.coatColor || "").trim(),
    weight: String(reservation?.weight || "").trim(),
    gender: String(reservation?.gender || "").trim(),
    neuteredStatus: String(reservation?.neuteredStatus || "").trim(),
    memo: String(reservation?.memo || "").trim(),
    status: normalizeReservationStatus(reservation?.status),
    totalReservableCount: Number(reservation?.totalReservableCount) || 0,
  });
}

function normalizeReservationStatus(status) {
  return status === "취소" ? "취소" : "예약";
}

function createMembersFromReservations(reservations) {
  const memberMap = new Map();
  const petReservationCounts = new Map();

  reservations.forEach((reservation) => {
    const memberId = reservation.memberId || createStableId("member", reservation.guardianName);
    const petId = reservation.petId || createStableId("pet", `${reservation.guardianName}-${reservation.petName}`);

    if (!memberMap.has(memberId)) {
      memberMap.set(memberId, {
        id: memberId,
        guardianName: reservation.guardianName || "",
        phoneNumber: reservation.phoneNumber || "",
        address: reservation.address || "",
        addressDetail: reservation.addressDetail || "",
        isRegistered: true,
        ownerTags: Array.isArray(reservation.ownerTags) ? [...reservation.ownerTags] : [],
        pets: [],
      });
    }

    const member = memberMap.get(memberId);
    const existingPet = member.pets.find((pet) => pet.id === petId);
    const pet = existingPet || createPetFromReservation(reservation, petId);
    const petCountKey = `${memberId}:${petId}`;
    const reservedCount = (petReservationCounts.get(petCountKey) || 0) + 1;
    const totalReservableCount = Number(reservation.totalReservableCount) || pet.totalReservableCountByType.school || 8;

    petReservationCounts.set(petCountKey, reservedCount);
    pet.totalReservableCountByType.school = totalReservableCount;
    pet.totalReservedCountByType.school = reservedCount;
    pet.remainingCountByType.school = Math.max(totalReservableCount - reservedCount, 0);
    pet.ticketHistories = createTicketHistories(reservation, totalReservableCount, reservedCount);

    if (!existingPet) {
      member.pets.push(pet);
    }
  });

  return Array.from(memberMap.values());
}

function createPetFromReservation(reservation, petId) {
  const totalReservableCount = Number(reservation.totalReservableCount) || 8;
  return {
    id: petId,
    petName: reservation.petName || "",
    dogName: reservation.petName || "",
    breed: reservation.breed || "",
    memo: reservation.memo || "",
    birthDate: reservation.birthDate || "",
    animalRegistrationNumber: reservation.animalRegistrationNumber || "",
    coatColor: reservation.coatColor || "",
    weight: reservation.weight || "",
    gender: reservation.gender || "",
    neuteredStatus: reservation.neuteredStatus || "",
    remainingCountByType: { school: totalReservableCount, daycare: 0, oneway: 0, roundtrip: 0 },
    totalReservableCountByType: { school: totalReservableCount, daycare: 0, oneway: 0, roundtrip: 0 },
    totalReservedCountByType: { school: 0, daycare: 0, oneway: 0, roundtrip: 0 },
    ticketHistories: createTicketHistories(reservation, totalReservableCount, 0),
    petTags: Array.isArray(reservation.petTags) ? [...reservation.petTags] : [],
  };
}

function createTicketHistories(reservation, totalCount, reservedCount) {
  return [
    {
      id: `ticket-${reservation.petId || reservation.id}`,
      status: "이용중",
      ticketName: "유치원 정기권",
      remainingCount: Math.max(totalCount - reservedCount, 0),
      totalCount,
      validDays: 30,
      expiresAt: "2025-07-31",
      amount: 280000,
    },
  ];
}

function createStableId(prefix, value) {
  return `${prefix}-${String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣]/g, "")}`;
}
