import { createMemberHomeState } from "../features/member-home/member-home-state.js";
import { renderMemberHome } from "../features/member-home/member-home-renderer.js";

const rootElement = document.querySelector("#app");
const memberHomeState = createMemberHomeState();
let isMobileLayout = getIsMobileLayout();

renderMemberHome(rootElement, memberHomeState);

window.addEventListener("resize", () => {
  const nextIsMobileLayout = getIsMobileLayout();

  if (nextIsMobileLayout === isMobileLayout) {
    return;
  }

  isMobileLayout = nextIsMobileLayout;
  renderMemberHome(rootElement, memberHomeState);
});

function getIsMobileLayout() {
  return window.matchMedia && window.matchMedia("(max-width: 430px)").matches;
}
