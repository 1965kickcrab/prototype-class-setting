import { renderSchoolReservationCreate } from "../features/school-reservation/school-reservation-create-renderer.js";
import { clearSchoolReservationDraft } from "../features/school-reservation/school-reservation-draft.js";

const rootElement = document.querySelector("#app");

if (new URLSearchParams(window.location.search).get("source") !== "member-search") {
  clearSchoolReservationDraft();
}

renderSchoolReservationCreate(rootElement);
