import { createMemberRegistrationState } from "../features/member-registration/member-registration-state.js";
import { renderMemberRegistration } from "../features/member-registration/member-registration-renderer.js";

const rootElement = document.querySelector("#app");

renderMemberRegistration(rootElement, createMemberRegistrationState());
