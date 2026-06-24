import { createMemberDetailState } from "../features/member-detail/member-detail-state.js";
import { renderMemberDetail } from "../features/member-detail/member-detail-renderer.js";

const rootElement = document.querySelector("#app");
renderMemberDetail(rootElement, createMemberDetailState());
