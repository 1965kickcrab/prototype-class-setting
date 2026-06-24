import { readJsonStorage } from "./storage-utils.js";

export const HOTEL_HOME_RESERVATION_STORAGE_KEY = "prototype.hotelHome.reservations";
export const HOTEL_HOME_INITIAL_VIEW_STORAGE_KEY = "prototype.hotelHome.initialView";

export function getHotelHomeReservations() {
  const storedReservations = readJsonStorage(HOTEL_HOME_RESERVATION_STORAGE_KEY, HOTEL_HOME_RESERVATIONS);

  if (!Array.isArray(storedReservations)) {
    return HOTEL_HOME_RESERVATIONS.map(cloneReservation);
  }

  return storedReservations.map(normalizeReservation).filter((reservation) => {
    return reservation.id && reservation.date;
  });
}

export function getHotelHomeInitialView() {
  const storedInitialView = readJsonStorage(HOTEL_HOME_INITIAL_VIEW_STORAGE_KEY, HOTEL_HOME_INITIAL_VIEW);
  return normalizeInitialView(storedInitialView);
}

function normalizeInitialView(initialView) {
  const currentMonth = typeof initialView?.currentMonth === "string" && initialView.currentMonth
    ? initialView.currentMonth
    : HOTEL_HOME_INITIAL_VIEW.currentMonth;
  const selectedDate = typeof initialView?.selectedDate === "string" ? initialView.selectedDate : "";
  const selectedReservationIds = Array.isArray(initialView?.selectedReservationIds)
    ? initialView.selectedReservationIds.filter((reservationId) => typeof reservationId === "string" && reservationId)
    : [];

  return {
    currentMonth,
    selectedDate,
    selectedReservationIds,
  };
}

function normalizeReservation(reservation) {
  return {
    id: reservation?.id || "",
    date: reservation?.date || "",
    type: normalizeType(reservation?.type),
    status: normalizeStatus(reservation?.status),
    petName: reservation?.petName || "",
    guardianName: reservation?.guardianName || "",
    breed: reservation?.breed || "",
    time: reservation?.time || "",
    memo: reservation?.memo || "",
  };
}

function normalizeType(type) {
  return ["checkin", "checkout", "staying"].includes(type) ? type : "staying";
}

function normalizeStatus(status) {
  return status === "완료" ? "완료" : "대기";
}

function cloneReservation(reservation) {
  return { ...reservation };
}

const HOTEL_HOME_INITIAL_VIEW = {
  currentMonth: "2025-07",
  selectedDate: "",
  selectedReservationIds: [],
};

const HOTEL_HOME_RESERVATIONS = [
  { id: "hotel-1", date: "2025-07-03", type: "checkout", status: "완료", petName: "보리", breed: "말티즈", time: "오전 8:00", memo: "" },
  { id: "hotel-2", date: "2025-07-03", type: "checkin", status: "대기", petName: "망고", breed: "말티푸", time: "오전 8:20", memo: "" },
  { id: "hotel-3", date: "2025-07-03", type: "checkout", status: "완료", petName: "초코", breed: "포메라니안", time: "오후 8:15", memo: "" },
  { id: "hotel-4", date: "2025-07-03", type: "staying", status: "완료", petName: "루이", breed: "비숑 프리제", time: "-", memo: "저녁 산책 필요" },
  { id: "hotel-5", date: "2025-07-03", type: "staying", status: "대기", petName: "하늘", breed: "믹스견", time: "-", memo: "약 급여" },
  { id: "hotel-6", date: "2025-07-03", type: "staying", status: "완료", petName: "구름", breed: "말티즈", time: "-", memo: "식이 알러지" },
  { id: "hotel-7", date: "2025-07-03", type: "staying", status: "대기", petName: "코코", breed: "비숑 프리제", time: "-", memo: "낯가림 있음" },
  { id: "hotel-8", date: "2025-07-03", type: "staying", status: "완료", petName: "로또", breed: "스탠더드 푸들", time: "-", memo: "활동량 많음" },
  { id: "hotel-9", date: "2025-07-03", type: "staying", status: "대기", petName: "체리", breed: "말티푸", time: "-", memo: "귀 청소 필요" },
  { id: "hotel-10", date: "2025-07-05", type: "checkin", status: "대기", petName: "두부", breed: "말티즈", time: "오전 9:00", memo: "" },
  { id: "hotel-11", date: "2025-07-05", type: "checkin", status: "대기", petName: "모카", breed: "믹스견", time: "오전 9:30", memo: "" },
  { id: "hotel-12", date: "2025-07-05", type: "checkin", status: "완료", petName: "미르", breed: "믹스견", time: "오전 10:00", memo: "" },
  { id: "hotel-13", date: "2025-07-05", type: "checkin", status: "완료", petName: "초롱", breed: "토이 푸들", time: "오전 10:30", memo: "" },
  { id: "hotel-14", date: "2025-07-05", type: "checkin", status: "대기", petName: "나리", breed: "비숑 프리제", time: "오전 11:00", memo: "" },
  { id: "hotel-15", date: "2025-07-05", type: "checkout", status: "완료", petName: "체리", breed: "믹스견", time: "오전 9:30", memo: "" },
  { id: "hotel-16", date: "2025-07-05", type: "checkout", status: "대기", petName: "서리", breed: "말티즈", time: "오후 9:00", memo: "" },
  { id: "hotel-17", date: "2025-07-05", type: "staying", status: "대기", petName: "보나", breed: "비숑 프리제", time: "-", memo: "분리 불안 있음" },
  { id: "hotel-18", date: "2025-07-05", type: "staying", status: "완료", petName: "까미", breed: "푸들", time: "-", memo: "약 급여 완료" },
  { id: "hotel-19", date: "2025-07-05", type: "staying", status: "완료", petName: "달콩", breed: "포메라니안", time: "-", memo: "저녁 급여 완료" },
  { id: "hotel-20", date: "2025-07-05", type: "staying", status: "대기", petName: "율이", breed: "시츄", time: "-", memo: "실내 배변 체크" },
];
