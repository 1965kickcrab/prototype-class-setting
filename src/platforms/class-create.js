import { renderClassForm } from "../features/class-settings/class-form-renderer.js";

const rootElement = document.querySelector("#app");
renderClassForm(rootElement, { mode: "create" });
