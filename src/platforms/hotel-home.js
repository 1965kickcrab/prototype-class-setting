import { renderHotelHome } from "../features/hotel-home/hotel-home-renderer.js";
import { createHotelHomeState } from "../features/hotel-home/hotel-home-state.js";

const rootElement = document.querySelector("#app");
const hotelHomeState = createHotelHomeState();
let isMobileLayout = getIsMobileLayout();

renderHotelHome(rootElement, hotelHomeState);

window.addEventListener("resize", () => {
  const nextIsMobileLayout = getIsMobileLayout();

  if (nextIsMobileLayout === isMobileLayout) {
    return;
  }

  isMobileLayout = nextIsMobileLayout;
  renderHotelHome(rootElement, hotelHomeState);
});

function getIsMobileLayout() {
  return window.matchMedia && window.matchMedia("(max-width: 430px)").matches;
}
