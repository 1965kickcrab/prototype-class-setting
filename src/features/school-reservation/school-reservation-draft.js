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
    currentMonth: "2025-07",
    selectedDates: [],
  };
}

function normalizeDraft(draft) {
  return {
    memberPet: draft?.memberPet || null,
    selectedClassId: String(draft?.selectedClassId || ""),
    currentMonth: String(draft?.currentMonth || "2025-07"),
    selectedDates: Array.isArray(draft?.selectedDates) ? draft.selectedDates.filter(Boolean) : [],
  };
}
