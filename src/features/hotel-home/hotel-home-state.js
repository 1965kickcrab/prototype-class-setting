import { getHotelHomeInitialView, getHotelHomeReservations } from "../../storage/hotel-home-storage.js";
import { getStoredMembers, loadMemberTagCatalog } from "../../storage/member-storage.js";

const DEFAULT_APP_FILTERS = ["checkin", "checkout", "staying"];

export function createHotelHomeState() {
  const initialView = getHotelHomeInitialView();

  return {
    currentMonth: initialView.currentMonth,
    selectedDate: initialView.selectedDate,
    searchTerm: "",
    isReservationSearchMenuOpen: false,
    isReservationSearchScreenOpen: false,
    members: getStoredMembers(),
    reservations: attachMemberTagsToReservations(getHotelHomeReservations(), getStoredMembers()),
    memberTagCatalog: loadMemberTagCatalog(),
    selectedMemberTagNames: [],
    tagFilterQuery: "",
    isTagMenuOpen: false,
    isDetailPanelOpen: Boolean(initialView.selectedDate),
    selectedReservationIds: initialView.selectedReservationIds,
    activeFilters: [...DEFAULT_APP_FILTERS],
    isModeMenuOpen: false,
  };
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

export function getCalendarCountsByDate(reservations, selectedDate) {
  const reservationsByDate = getReservationsByDate(reservations, selectedDate);
  const checkinCount = reservationsByDate.filter((reservation) => reservation.type === "checkin").length;
  const checkoutCount = reservationsByDate.filter((reservation) => reservation.type === "checkout").length;
  const stayingCount = reservationsByDate.filter((reservation) => reservation.type === "staying").length;

  return {
    totalCount: checkinCount + checkoutCount + stayingCount,
    checkinCount,
    checkoutCount,
    stayingCount,
  };
}

export function getFilteredReservationsByDate(hotelHomeState, selectedDate = hotelHomeState.selectedDate) {
  const searchTerm = normalizeSearchText(hotelHomeState.searchTerm);
  let reservations = getReservationsByDate(hotelHomeState.reservations, selectedDate);

  if (searchTerm) {
    reservations = reservations.filter((reservation) => {
      return [reservation.guardianName, reservation.petName].some((fieldValue) => {
        return normalizeSearchText(fieldValue).includes(searchTerm);
      });
    });
  }

  reservations = filterReservationsByMemberTags(reservations, hotelHomeState.selectedMemberTagNames);

  return filterReservationsByTypes(reservations, hotelHomeState.activeFilters);
}

function filterReservationsByMemberTags(reservations, selectedMemberTagNames = []) {
  if (!Array.isArray(selectedMemberTagNames) || selectedMemberTagNames.length === 0) {
    return reservations;
  }

  return reservations.filter((reservation) => {
    const reservationTags = [...(reservation.ownerTags || []), ...(reservation.petTags || [])];
    return selectedMemberTagNames.every((memberTagName) => reservationTags.includes(memberTagName));
  });
}

export function filterReservationsByTypes(reservations, activeFilters = DEFAULT_APP_FILTERS) {
  if (!Array.isArray(activeFilters) || activeFilters.length === 0) {
    return [];
  }

  return reservations.filter((reservation) => activeFilters.includes(reservation.type));
}

export function getReservationGroups(reservations) {
  return [
    { key: "checkin", label: "입실", reservations: reservations.filter((reservation) => reservation.type === "checkin") },
    { key: "checkout", label: "퇴실", reservations: reservations.filter((reservation) => reservation.type === "checkout") },
    { key: "staying", label: "숙박", reservations: reservations.filter((reservation) => reservation.type === "staying") },
  ];
}

export function sortReservationsForApp(reservations) {
  return [...reservations].sort((leftReservation, rightReservation) => {
    const leftMovement = leftReservation.type === "checkin" || leftReservation.type === "checkout";
    const rightMovement = rightReservation.type === "checkin" || rightReservation.type === "checkout";

    if (leftMovement && rightMovement) {
      return compareTimes(leftReservation.time, rightReservation.time);
    }

    if (leftMovement !== rightMovement) {
      return leftMovement ? -1 : 1;
    }

    return String(leftReservation.petName || "").localeCompare(String(rightReservation.petName || ""), "ko");
  });
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

export function getSelectedDateSummary(hotelHomeState, selectedDate = hotelHomeState.selectedDate) {
  const reservations = getFilteredReservationsByDate(hotelHomeState, selectedDate);
  const groups = getReservationGroups(reservations);
  const counts = getCalendarCountsByDate(reservations, selectedDate);

  return {
    dateText: formatSelectedDate(selectedDate),
    reservationCount: counts.totalCount,
    stayingCount: counts.stayingCount,
    checkinCount: counts.checkinCount,
    checkoutCount: counts.checkoutCount,
    reservations,
    groups,
  };
}

function createCalendarCell(date, monthDate) {
  const dateKey = getDateKey(date);
  return {
    dateKey,
    dayNumber: date.getDate(),
    isCurrentMonth: date.getMonth() === monthDate.getMonth(),
    isToday: dateKey === getDateKey(new Date()),
  };
}

function formatSelectedDate(dateText) {
  const date = new Date(dateText);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function normalizeSearchText(value) {
  return String(value || "").trim().toLowerCase();
}

function attachMemberTagsToReservations(reservations, members) {
  return (reservations || []).map((reservation) => {
    const matchedMemberPet = findReservationMemberPet(reservation, members);
    return {
      ...reservation,
      guardianName: reservation.guardianName || matchedMemberPet?.member?.guardianName || "",
      ownerTags: Array.isArray(matchedMemberPet?.member?.ownerTags) ? [...matchedMemberPet.member.ownerTags] : [],
      petTags: Array.isArray(matchedMemberPet?.pet?.petTags) ? [...matchedMemberPet.pet.petTags] : [],
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

function compareTimes(leftTime, rightTime) {
  return convertTimeToMinutes(leftTime) - convertTimeToMinutes(rightTime);
}

function convertTimeToMinutes(timeText) {
  const normalizedText = String(timeText || "").trim();
  const match = normalizedText.match(/(오전|오후)\s*(\d{1,2}):(\d{2})/);

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const meridiem = match[1];
  let hour = Number(match[2]);
  const minute = Number(match[3]);

  if (meridiem === "오후" && hour !== 12) {
    hour += 12;
  }

  if (meridiem === "오전" && hour === 12) {
    hour = 0;
  }

  return hour * 60 + minute;
}
