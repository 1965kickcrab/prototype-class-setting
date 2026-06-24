import { renderSchoolHome } from "./features/school-home/school-home-renderer.js";
import { createSchoolHomeState } from "./features/school-home/school-home-state.js";

const rootElement = document.querySelector("#app");
renderSchoolHome(rootElement, createSchoolHomeState());
