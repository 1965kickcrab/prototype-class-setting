import { getSchoolHomeInitialView } from "../../storage/school-home-storage.js";

export const SCHOOL_RESERVATION_DRAFT_STORAGE_KEY = "schoolReservationDraft";

export function loadSchoolReservationDraft() {
  try {
    const draft = JSON.parse(window.sessionStorage.getItem(SCHOOL_RESERVATION_DRAFT_STORAGE_KEY) || "{}");
    return normalizeDraft(draft);
  } catch (error) {
    return createEmptySchoolReservationDraft();
  }
}

export function saveSchoolReservationDraft(draft) {
  const nextDraft = normalizeDraft(draft);
  window.sessionStorage.setItem(SCHOOL_RESERVATION_DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
  return nextDraft;
}

export function clearSchoolReservationDraft() {
  window.sessionStorage.removeItem(SCHOOL_RESERVATION_DRAFT_STORAGE_KEY);
}

export function createEmptySchoolReservationDraft() {
  return {
    memberPet: null,
    selectedClassId: "",
    currentMonth: getSchoolHomeInitialView().currentMonth,
    selectedDates: [],
    allowOverCapacity: false,
  };
}

function normalizeDraft(draft) {
  const defaultDraft = createEmptySchoolReservationDraft();

  return {
    memberPet: draft?.memberPet || null,
    selectedClassId: String(draft?.selectedClassId || ""),
    currentMonth: String(draft?.currentMonth || defaultDraft.currentMonth),
    selectedDates: Array.isArray(draft?.selectedDates) ? draft.selectedDates.filter(Boolean) : [],
    allowOverCapacity: Boolean(draft?.allowOverCapacity),
  };
}
