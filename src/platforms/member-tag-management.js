import { renderMemberTagManagementScreen } from "../features/member-tag-management/member-tag-management-renderer.js";
import { createMemberTagManagementState } from "../features/member-tag-management/member-tag-management-state.js";

const rootElement = document.querySelector("#app");
const state = createMemberTagManagementState();

renderMemberTagManagementScreen(rootElement, state);
