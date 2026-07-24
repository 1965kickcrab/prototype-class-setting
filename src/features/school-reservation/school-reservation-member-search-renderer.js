import { getMemberPetRows, getStoredMembers } from "../../storage/member-storage.js";
import { getAutoSelectedSchoolReservationClassId } from "../../services/school-reservation-class-selection-service.js";
import { createElement } from "../../utils/dom.js";
import { loadSchoolReservationDraft, saveSchoolReservationDraft } from "./school-reservation-draft.js";

export function renderSchoolReservationMemberSearch(rootElement) {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("q") || "";
  rootElement.innerHTML = "";
  rootElement.append(createSearchScreen(query));
}

function createSearchScreen(query) {
  const screen = createElement("main", {
    className: "school-reservation-member-search-screen",
    dataset: { screen: "schoolReservationMemberSearch" },
  });
  screen.append(createHeader());
  screen.append(createSearchContent(query));
  return screen;
}

function createHeader() {
  const header = createElement("header", { className: "school-reservation-create-header" });
  const backButton = createElement("button", {
    className: "school-reservation-back-button",
    type: "button",
    textContent: "<",
    ariaLabel: "예약 등록으로 돌아가기",
  });
  backButton.addEventListener("click", () => {
    window.location.href = "./school-home/school-reservation-create.html?source=member-search";
  });
  header.append(backButton);
  header.append(createElement("h1", { textContent: "회원 조회" }));
  header.append(createElement("span", { className: "school-reservation-header-spacer" }));
  return header;
}

function createSearchContent(query) {
  const content = createElement("section", { className: "school-reservation-member-search-content" });
  const input = createElement("input", {
    className: "school-reservation-member-search-input",
    type: "search",
    value: query,
    placeholder: "반려견 / 견종 / 보호자 검색",
  });
  input.addEventListener("input", (event) => {
    const nextParams = new URLSearchParams();
    if (event.target.value) {
      nextParams.set("q", event.target.value);
    }
    window.location.href = `./school-home/school-reservation-member-search.html${nextParams.toString() ? `?${nextParams}` : ""}`;
  });
  content.append(input);
  content.append(createResultList(query));
  return content;
}

function createResultList(query) {
  const list = createElement("section", { className: "school-reservation-member-result-list" });
  const rows = getVisibleMemberPets(query);

  if (!rows.length) {
    list.append(createElement("p", {
      className: "school-reservation-member-empty",
      textContent: "검색 결과가 없습니다.",
    }));
    return list;
  }

  rows.forEach((memberPet) => {
    const button = createElement("button", {
      className: "school-reservation-member-result",
      type: "button",
      dataset: { action: "selectMember", entityId: memberPet.petId || memberPet.id },
    });
    button.append(createElement("strong", { textContent: getMemberTitle(memberPet) }));
    button.append(createElement("span", { textContent: getMemberMeta(memberPet) }));
    button.addEventListener("click", () => {
      const draft = loadSchoolReservationDraft();
      draft.memberPet = memberPet;
      draft.selectedClassId = getAutoSelectedSchoolReservationClassId(memberPet);
      saveSchoolReservationDraft(draft);
      window.location.href = "./school-home/school-reservation-create.html?source=member-search";
    });
    list.append(button);
  });
  return list;
}

function getVisibleMemberPets(query) {
  const normalizedQuery = normalizeText(query);
  const rows = getMemberPetRows(getStoredMembers());
  if (!normalizedQuery) {
    return rows;
  }

  return rows.filter((row) => {
    return [row.petName, row.dogName, row.breed, row.guardianName, row.phoneNumber]
      .some((value) => normalizeText(value).includes(normalizedQuery));
  });
}

function getMemberTitle(memberPet) {
  const petName = memberPet.petName || memberPet.dogName || "-";
  return memberPet.breed ? `${petName} (${memberPet.breed})` : petName;
}

function getMemberMeta(memberPet) {
  return [memberPet.weight ? `${memberPet.weight}kg` : "", memberPet.guardianName || ""].filter(Boolean).join(" / ");
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}
