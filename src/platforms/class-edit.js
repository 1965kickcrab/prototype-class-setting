import { renderClassForm } from "../features/class-settings/class-form-renderer.js";

const rootElement = document.querySelector("#app");
const params = new URLSearchParams(window.location.search);
renderClassForm(rootElement, {
  mode: "edit",
  classId: params.get("classId") || "",
});
