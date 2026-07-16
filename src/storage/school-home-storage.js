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

export function detachStoredSchoolReservationsClass(sourceClass) {
  const sourceClassId = String(sourceClass?.id || "").trim();
  if (!sourceClassId) {
    return loadStoredSchoolReservations();
  }

  const deletedClassSnapshot = createClassSnapshot(sourceClass);
  const nextReservations = loadStoredSchoolReservations().map((reservation) => {
    if (reservation.classId !== sourceClassId) {
      return reservation;
    }

    return {
      ...reservation,
      classId: null,
      className: "",
      classSnapshot: reservation.classSnapshot || deletedClassSnapshot,
    };
  });

  return saveStoredSchoolReservations(nextReservations);
}

function createClassSnapshot(schoolClass) {
  const id = String(schoolClass?.id || "").trim();
  if (!id) {
    return null;
  }

  const capacity = Number(schoolClass?.capacity);
  return {
    id,
    name: String(schoolClass?.name || "").trim(),
    capacity: Number.isInteger(capacity) && capacity > 0 ? capacity : null,
  };
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
    isCountReserved: Boolean(reservation?.isCountReserved),
    isRemainingConsumed: Boolean(reservation?.isRemainingConsumed),
    classId: reservation?.classId ? String(reservation.classId).trim() : null,
    className: String(reservation?.className || "").trim(),
    classSnapshot: normalizeClassSnapshot(reservation?.classSnapshot, reservation),
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

function normalizeClassSnapshot(snapshot, reservation) {
  const id = String(snapshot?.id || reservation?.classId || "").trim();
  if (!id) {
    return null;
  }

  const capacity = Number(snapshot?.capacity);
  return {
    id,
    name: String(snapshot?.name || reservation?.className || "").trim(),
    capacity: Number.isInteger(capacity) && capacity > 0 ? capacity : null,
  };
}

function normalizeReservationStatus(status) {
  return status === "취소" ? "취소" : "예약";
}
