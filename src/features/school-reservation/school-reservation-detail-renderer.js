import { getSchoolHomeReservations, loadStoredSchoolReservations, saveStoredSchoolReservations } from "../../storage/school-home-storage.js";
import { loadSchoolClassList } from "../../storage/class-storage.js";
import { createElement } from "../../utils/dom.js";

const DEFAULT_DOG_PROFILE_IMAGE = "assets/images/defaultProfile_dog.svg";
let isClassBottomSheetOpen = false;
let isReservationCancelAlertOpen = false;

const SAMPLE_RESERVATION = {
  id: "school-reservation-sample",
  date: "2025-07-04",
  className: "스탠다드",
  petName: "로보",
  breed: "스탠다드 푸들",
  weight: "5.5",
  guardianName: "조OO",
  phoneNumber: "010-1234-1234",
  petTags: ["적응중", "대형견"],
  ownerTags: ["정기권"],
  status: "예약",
};

export function renderSchoolReservationDetail(rootElement) {
  rootElement.innerHTML = "";
  rootElement.append(createReservationDetailScreen(getReservationDetail()));
}

function createReservationDetailScreen(reservation) {
  const screen = createElement("main", {
    className: "school-reservation-create-screen school-reservation-detail-screen",
    dataset: { screen: "schoolReservationDetail", entityId: reservation.id },
  });

  screen.append(createHeader(reservation));
  screen.append(createDetailContent(reservation));
  if (isReservationCancelAlertOpen) {
    screen.append(createReservationCancelAlert(reservation));
  }
  if (isClassBottomSheetOpen) {
    screen.append(createClassBottomSheet(reservation));
  }
  return screen;
}

function createHeader(reservation) {
  const header = createElement("header", { className: "school-reservation-create-header school-reservation-detail-header" });
  const backButton = createElement("button", {
    className: "school-reservation-back-button",
    type: "button",
    ariaLabel: "유치원으로 돌아가기",
  });
  backButton.append(createElement("img", { className: "button-icon", src: "assets/icons/iconBack.svg", alt: "" }));
  backButton.addEventListener("click", () => {
    window.location.href = "./index.html";
  });

  const cancelButton = createElement("button", {
    className: "school-reservation-detail-cancel-button",
    type: "button",
    textContent: "예약 취소",
    dataset: { action: "cancelReservation", entityId: reservation.id },
  });
  cancelButton.addEventListener("click", () => {
    isReservationCancelAlertOpen = true;
    renderSchoolReservationDetail(document.querySelector("#app"));
  });

  header.append(backButton);
  header.append(createElement("h1", { textContent: "유치원 예약" }));
  header.append(cancelButton);
  return header;
}

function createDetailContent(reservation) {
  const content = createElement("section", { className: "school-reservation-detail-content" });
  const infoSection = createElement("section", { className: "school-reservation-detail-section" });
  infoSection.append(createElement("h2", { textContent: "예약 정보" }));
  infoSection.append(createPetSummary(reservation));
  content.append(infoSection);

  const classSection = createElement("section", { className: "school-reservation-detail-section" });
  classSection.append(createElement("h2", { textContent: "클래스" }));
  classSection.append(createInfoBox(reservation.className || "-", "class", reservation));
  content.append(classSection);

  const dateSection = createElement("section", { className: "school-reservation-detail-section" });
  dateSection.append(createElement("h2", { textContent: "예약 날짜" }));
  dateSection.append(createInfoBox(formatReservationDate(reservation.date), "date"));
  content.append(dateSection);
  return content;
}

function createPetSummary(reservation) {
  const summary = createElement("article", { className: "school-reservation-detail-pet" });
  summary.append(createElement("img", {
    className: "school-reservation-detail-avatar",
    src: reservation.imageSrc || DEFAULT_DOG_PROFILE_IMAGE,
    alt: "반려견 프로필",
  }));

  const text = createElement("div", { className: "school-reservation-detail-pet-text" });
  text.append(createElement("strong", { textContent: reservation.petName || "-" }));
  text.append(createElement("p", { textContent: formatPetMeta(reservation) }));
  const tags = getReservationTags(reservation);
  if (tags.length > 0) {
    text.append(createTagList(tags));
  }
  const guardian = createElement("a", {
    className: "school-reservation-detail-guardian",
    textContent: formatGuardian(reservation),
  });
  guardian.href = reservation.phoneNumber ? `tel:${reservation.phoneNumber}` : "#";
  text.append(guardian);
  summary.append(text);
  return summary;
}

function createInfoBox(text, type, reservation = null) {
  const isClassField = type === "class" && reservation;
  const infoBox = createElement(isClassField ? "button" : "div", {
    className: "school-reservation-detail-info-box",
    textContent: text || "-",
    dataset: { field: type },
  });
  if (isClassField) {
    infoBox.type = "button";
    infoBox.addEventListener("click", () => {
      isClassBottomSheetOpen = true;
      renderSchoolReservationDetail(document.querySelector("#app"));
    });
  }
  return infoBox;
}

function createTagList(tags) {
  const list = createElement("div", { className: "school-reservation-detail-tag-list" });
  tags.forEach((tag) => {
    list.append(createElement("span", {
      className: "school-reservation-detail-tag",
      textContent: tag,
      dataset: { entityId: tag },
    }));
  });
  return list;
}

function getReservationDetail() {
  const reservationId = new URLSearchParams(window.location.search).get("id");
  return getSchoolHomeReservations().find((reservation) => reservation.id === reservationId) || SAMPLE_RESERVATION;
}

function cancelReservation(reservationId) {
  const storedReservations = loadStoredSchoolReservations();
  const nextReservations = storedReservations.filter((reservation) => reservation.id !== reservationId);
  if (nextReservations.length !== storedReservations.length) {
    saveStoredSchoolReservations(nextReservations);
  }
  window.location.href = "./index.html";
}

function createClassBottomSheet(reservation) {
  const overlay = createElement("section", {
    className: "school-reservation-class-sheet-overlay",
    dataset: { area: "reservationClassSheet", state: "open" },
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeClassBottomSheet();
    }
  });

  const sheet = createElement("div", { className: "school-reservation-class-sheet" });
  const header = createElement("div", { className: "school-reservation-class-sheet-header" });
  header.append(createElement("strong", { textContent: "클래스 변경" }));
  const closeButton = createElement("button", {
    className: "school-reservation-class-sheet-close",
    type: "button",
    textContent: "닫기",
    dataset: { action: "closeReservationClassSheet" },
  });
  closeButton.addEventListener("click", closeClassBottomSheet);
  header.append(closeButton);
  sheet.append(header);

  const list = createElement("div", { className: "school-reservation-class-sheet-list" });
  loadSchoolClassList().forEach((schoolClass) => {
    const isSelected = reservation.classId === schoolClass.id;
    const option = createElement("button", {
      className: isSelected ? "school-reservation-class-sheet-option is-selected" : "school-reservation-class-sheet-option",
      type: "button",
      textContent: schoolClass.name || "-",
      dataset: {
        action: "selectReservationClass",
        classId: schoolClass.id,
        state: isSelected ? "selected" : "idle",
      },
    });
    option.addEventListener("click", () => {
      updateReservationClass(reservation.id, schoolClass);
    });
    list.append(option);
  });
  sheet.append(list);
  overlay.append(sheet);
  return overlay;
}

function closeClassBottomSheet() {
  isClassBottomSheetOpen = false;
  renderSchoolReservationDetail(document.querySelector("#app"));
}

function updateReservationClass(reservationId, schoolClass) {
  const reservations = getSchoolHomeReservations().map((reservation) => {
    if (reservation.id !== reservationId) {
      return reservation;
    }

    return {
      ...reservation,
      classId: schoolClass.id,
      className: schoolClass.name || "",
    };
  });
  saveStoredSchoolReservations(reservations);
  isClassBottomSheetOpen = false;
  renderSchoolReservationDetail(document.querySelector("#app"));
}

function createReservationCancelAlert(reservation) {
  const overlay = createElement("section", {
    className: "school-reservation-alert-overlay",
    dataset: { area: "reservationCancelAlert", modal: "reservationCancelAlert", state: "open" },
  });
  const alert = createElement("div", { className: "school-reservation-alert" });
  alert.append(createElement("p", {
    className: "school-reservation-alert-body",
    textContent: "예약을 삭제하시겠습니까?\n삭제된 예약은 복구할 수 없습니다.",
  }));

  const actions = createElement("div", { className: "school-reservation-alert-actions" });
  const closeButton = createElement("button", {
    className: "school-reservation-alert-close-button",
    type: "button",
    textContent: "닫기",
    dataset: { action: "closeReservationCancelAlert" },
  });
  closeButton.addEventListener("click", () => {
    isReservationCancelAlertOpen = false;
    renderSchoolReservationDetail(document.querySelector("#app"));
  });

  const confirmButton = createElement("button", {
    className: "school-reservation-alert-confirm-button",
    type: "button",
    textContent: "예약 취소",
    dataset: { action: "confirmReservationCancel" },
  });
  confirmButton.addEventListener("click", () => {
    isReservationCancelAlertOpen = false;
    cancelReservation(reservation.id);
  });

  actions.append(closeButton, confirmButton);
  alert.append(actions);
  overlay.append(alert);
  return overlay;
}

function getReservationTags(reservation) {
  return [
    ...(Array.isArray(reservation.petTags) ? reservation.petTags : []),
    ...(Array.isArray(reservation.ownerTags) ? reservation.ownerTags : []),
  ].filter(Boolean);
}

function formatPetMeta(reservation) {
  const weight = reservation.weight ? `${reservation.weight}kg` : "";
  return [reservation.breed || "-", weight].filter(Boolean).join(" / ");
}

function formatGuardian(reservation) {
  const guardianName = reservation.guardianName || "-";
  return reservation.phoneNumber ? `${guardianName} 보호자 (${reservation.phoneNumber})` : `${guardianName} 보호자`;
}

function formatReservationDate(dateKey) {
  if (!dateKey) {
    return "-";
  }

  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}
