import { createMemberEditState } from "../features/member-edit/member-edit-state.js";
import { renderMemberEdit } from "../features/member-edit/member-edit-renderer.js";

const rootElement = document.querySelector("#app");
renderMemberEdit(rootElement, createMemberEditState());
