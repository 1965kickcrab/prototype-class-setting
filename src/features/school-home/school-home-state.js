import {
  getSchoolHomeInitialView,
  getSchoolHomeReservations,
} from "../../storage/school-home-storage.js";
import { getStoredMembers, loadMemberTagCatalog } from "../../storage/member-storage.js";

export function createSchoolHomeState() {
  const initialView = getSchoolHomeInitialView();

  return {
    currentMonth: initialView.currentMonth,
    selectedDate: initialView.selectedDate,
    selectedReservationIds: [],
    shouldHideCanceledReservations: true,
    isReservationCancelAlertOpen: false,
    activeClassMenuReservationId: "",
    searchTerm: "",
    isReservationSearchMenuOpen: false,
    isReservationSearchScreenOpen: false,
    members: getStoredMembers(),
    reservations: attachMemberTagsToReservations(getSchoolHomeReservations(), getStoredMembers()),
    selectedSchoolClassId: "",
    memberTagCatalog: loadMemberTagCatalog(),
    selectedMemberTagNames: [],
    tagFilterQuery: "",
    isTagMenuOpen: false,
    isModeMenuOpen: false,
    reservationRegistration: createReservationRegistrationState(initialView.currentMonth),
  };
}

export function createReservationRegistrationState(currentMonth = getSchoolHomeInitialView().currentMonth) {
  return {
    isOpen: false,
    memberQuery: "",
    isMemberSuggestionOpen: false,
    selectedMemberPet: null,
    selectedClassId: "",
    currentMonth,
    selectedDates: [],
    allowOverCapacity: false,
    errors: {},
  };
}

export function getCalendarMatrix(currentMonth) {
  const monthDate = createMonthDate(currentMonth);
  const firstDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const firstVisibleDate = new Date(firstDate);
  firstVisibleDate.setDate(firstDate.getDate() - firstDate.getDay());

  return Array.from({ length: 6 }, (_, weekIndex) => {
    return Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(firstVisibleDate);
      date.setDate(firstVisibleDate.getDate() + weekIndex * 7 + dayIndex);
      return createCalendarCell(date, monthDate);
    });
  });
}

export function getReservationsByDate(reservations, selectedDate) {
  return (reservations || []).filter((reservation) => reservation.date === selectedDate);
}

export function isUiHoliday(dateText) {
  const date = new Date(dateText);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getDay() === 0;
}

export function getSelectedDateSummary(schoolHomeState) {
  const reservations = getFilteredReservationsByDate(schoolHomeState, schoolHomeState.selectedDate);
  const reservationCount = reservations.length;
  return {
    dateText: formatSelectedDate(schoolHomeState.selectedDate),
    reservationCount,
    isHoliday: isUiHoliday(schoolHomeState.selectedDate),
    isCapacityClosed: false,
    hasReservations: reservationCount > 0,
    reservations,
  };
}

export function getFilteredReservationsByDate(schoolHomeState, selectedDate = schoolHomeState.selectedDate) {
  const searchTerm = normalizeSearchText(schoolHomeState.searchTerm);
  let reservations = getReservationsByDate(schoolHomeState.reservations, selectedDate);

  if (searchTerm) {
    reservations = reservations.filter((reservation) => {
      return [reservation.guardianName, reservation.petName].some((fieldValue) => {
        return normalizeSearchText(fieldValue).includes(searchTerm);
      });
    });
  }

  if (schoolHomeState.selectedMemberTagNames?.length) {
    reservations = reservations.filter((reservation) => {
      const reservationTags = [...(reservation.ownerTags || []), ...(reservation.petTags || [])];
      return schoolHomeState.selectedMemberTagNames.every((memberTagName) => reservationTags.includes(memberTagName));
    });
  }

  if (schoolHomeState.selectedSchoolClassId) {
    reservations = reservations.filter((reservation) => reservation.classId === schoolHomeState.selectedSchoolClassId);
  }

  return reservations;
}

export function getMonthLabel(currentMonth) {
  const monthDate = createMonthDate(currentMonth);
  return `${monthDate.getFullYear()}년 ${monthDate.getMonth() + 1}월`;
}

export function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftMonth(currentMonth, offset) {
  const monthDate = createMonthDate(currentMonth);
  monthDate.setMonth(monthDate.getMonth() + offset);
  return `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
}

export function getTodayDateKey() {
  return getDateKey(new Date());
}

export function createMonthDate(currentMonth) {
  const [yearText, monthText] = String(currentMonth || "").split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!year || !month) {
    return new Date();
  }

  return new Date(year, month - 1, 1);
}

function createCalendarCell(date, monthDate) {
  const dateKey = getDateKey(date);
  return {
    dateKey,
    dayNumber: date.getDate(),
    isCurrentMonth: date.getMonth() === monthDate.getMonth(),
    isHoliday: isUiHoliday(dateKey),
  };
}

function formatSelectedDate(dateText) {
  const date = new Date(dateText);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function attachMemberTagsToReservations(reservations, members) {
  return (reservations || []).map((reservation) => {
    const matchedMemberPet = findReservationMemberPet(reservation, members);
    return {
      ...reservation,
      ownerTags: Array.isArray(matchedMemberPet?.member?.ownerTags)
        ? [...matchedMemberPet.member.ownerTags]
        : Array.isArray(reservation.ownerTags) ? [...reservation.ownerTags] : [],
      petTags: Array.isArray(matchedMemberPet?.pet?.petTags)
        ? [...matchedMemberPet.pet.petTags]
        : Array.isArray(reservation.petTags) ? [...reservation.petTags] : [],
    };
  });
}

function findReservationMemberPet(reservation, members) {
  if (reservation.memberId) {
    const memberById = members.find((member) => member.id === reservation.memberId);
    if (memberById && reservation.petId) {
      const petById = (memberById.pets || []).find((pet) => pet.id === reservation.petId);
      if (petById) {
        return { member: memberById, pet: petById };
      }
    }

    if (memberById) {
      const matchedPet = findReservationPet(reservation, memberById);
      if (matchedPet) {
        return { member: memberById, pet: matchedPet };
      }
    }
  }

  const reservationKey = createReservationMemberKey(reservation);
  for (const member of members || []) {
    const matchedPet = (member.pets || []).find((pet) => {
      return `${normalizeSearchText(pet?.petName || pet?.dogName)}:${normalizeSearchText(member?.guardianName)}` === reservationKey;
    });

    if (matchedPet) {
      return { member, pet: matchedPet };
    }
  }

  return null;
}

function findReservationPet(reservation, member) {
  const reservationPetName = normalizeSearchText(reservation?.petName || reservation?.dogName);
  return (member?.pets || []).find((pet) => {
    return normalizeSearchText(pet?.petName || pet?.dogName) === reservationPetName;
  }) || (member?.pets || [])[0];
}

function createReservationMemberKey(value) {
  return `${normalizeSearchText(value?.petName || value?.dogName)}:${normalizeSearchText(value?.guardianName)}`;
}

function normalizeSearchText(value) {
  return String(value || "").trim().toLowerCase();
}
