import { createEmptyStateElement } from "./empty-state.js";
import { sortMemberTagNames } from "../services/member-tag-service.js";
import { loadSchoolClassList } from "../storage/class-storage.js";
import { createElement } from "../utils/dom.js";
import { bindImeAwareInput } from "../utils/ime-input.js";

export function createReservationSearchFilter(state, options) {
  const wrapper = createElement("div", {
    className: options.className || "reservation-search-filter",
    dataset: options.dataset,
  });

  const searchField = createElement("div", {
    className: options.searchFieldClassName || "filter-field filter-search-field reservation-search-field member-search-suggestion-field",
    dataset: { field: "reservationSearch" },
  });
  const searchInput = createElement("input", {
    className: options.searchInputClassName || "filter-search-input reservation-search-input",
    type: "search",
    value: state.searchTerm || "",
    placeholder: options.placeholder || "예약자 / 반려견 검색",
  });
  searchInput.addEventListener("focus", () => {
    if (state.isReservationSearchMenuOpen) {
      return;
    }

    state.isReservationSearchMenuOpen = true;
    options.rerender(state);
    focusReservationSearchInput(options);
  });
  bindImeAwareInput(searchInput, {
    onInput: (event, meta) => {
      state.searchTerm = event.target.value;
      state.isReservationSearchMenuOpen = true;

      if (meta.isComposing) {
        syncReservationSearchMenu(state, options);
        return;
      }

      options.onSearchInput?.(state, event.target.value);
      focusReservationSearchInput(options);
    },
  });
  searchInput.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (
        document.activeElement?.closest?.("[data-field='reservationSearch']")
        || document.activeElement?.closest?.("[data-area='reservationSearchMenu']")
      ) {
        return;
      }

      state.isReservationSearchMenuOpen = false;
      options.rerender(state);
    }, 120);
  });
  searchField.append(searchInput);

  if (state.isReservationSearchMenuOpen) {
    searchField.append(createReservationSearchMenu(state, options));
  }

  wrapper.append(searchField);
  wrapper.append(createReservationTagFilter(state, options));
  return wrapper;
}

function syncReservationSearchMenu(state, options) {
  const field = document.querySelector("[data-field='reservationSearch']");
  if (!field) {
    return;
  }

  const currentMenu = field.querySelector("[data-area='reservationSearchMenu']");
  const nextMenu = createReservationSearchMenu(state, options);

  if (currentMenu) {
    currentMenu.replaceWith(nextMenu);
    return;
  }

  field.append(nextMenu);
}

function createReservationSearchMenu(state, options) {
  const visibleMembers = getVisibleReservationMemberOptions(state);
  const menu = createElement("div", {
    className: "member-search-menu reservation-search-menu",
    dataset: {
      area: "reservationSearchMenu",
      state: visibleMembers.length ? "list" : "empty",
    },
  });

  if (!visibleMembers.length) {
    menu.append(createTagEmptyState("조회 결과가 없습니다"));
    return menu;
  }

  visibleMembers.forEach((member) => {
    const button = createElement("button", {
      className: "member-search-option",
      type: "button",
      dataset: {
        action: "selectReservationMemberSearch",
        entity: "member",
        entityId: member.memberId,
        petId: member.petId,
      },
    });
    button.append(createElement("strong", { textContent: member.petName || "-" }));
    button.append(createElement("span", { textContent: `${member.guardianName || "-"} / ${member.phoneNumber || "-"}` }));
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    button.addEventListener("click", () => {
      state.searchTerm = member.petName || member.guardianName || "";
      state.isReservationSearchMenuOpen = false;
      options.onSearchInput?.(state, state.searchTerm);
    });
    menu.append(button);
  });

  return menu;
}

function getVisibleReservationMemberOptions(state) {
  const query = String(state.searchTerm || "").trim().toLowerCase();
  const options = getReservationMemberOptions(state);
  const visibleOptions = query
    ? options.filter((member) => {
      return [member.guardianName, member.petName, member.phoneNumber].some((fieldValue) => {
        return String(fieldValue || "").toLowerCase().includes(query);
      });
    })
    : options;

  return visibleOptions.slice(0, 8);
}

function getReservationMemberOptions(state) {
  const optionsByKey = new Map();

  (state.members || []).forEach((member) => {
    (member.pets || []).forEach((pet) => {
      const petName = pet?.petName || pet?.dogName || "";
      const key = `${member.id || member.guardianName}:${pet?.id || petName}`;
      optionsByKey.set(key, {
        memberId: member.id || "",
        petId: pet?.id || "",
        guardianName: member.guardianName || "",
        phoneNumber: member.phoneNumber || "",
        petName,
      });
    });
  });

  (state.reservations || []).forEach((reservation) => {
    const key = `${reservation.memberId || reservation.guardianName}:${reservation.petId || reservation.petName}`;
    if (optionsByKey.has(key)) {
      return;
    }

    optionsByKey.set(key, {
      memberId: reservation.memberId || "",
      petId: reservation.petId || "",
      guardianName: reservation.guardianName || "",
      phoneNumber: reservation.phoneNumber || "",
      petName: reservation.petName || "",
    });
  });

  return Array.from(optionsByKey.values()).filter((member) => {
    return member.guardianName || member.petName;
  });
}

function focusReservationSearchInput(options = {}) {
  window.setTimeout(() => {
    const nextInput = document.querySelector(options.searchInputSelector || ".reservation-search-input");
    if (!nextInput) {
      return;
    }

    nextInput.focus();
    nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
  }, 0);
}

function createReservationTagFilter(state, options) {
  const wrapper = createElement("div", {
    className: "filter-field filter-tag-field reservation-tag-filter",
    dataset: { area: "reservationTagFilter", state: state.isTagMenuOpen ? "open" : "closed" },
  });
  const button = createElement("button", {
    className: options.filterButtonClassName || "filter-select-button",
    type: "button",
    textContent: getReservationFilterSummary(state),
    dataset: { action: "toggleReservationFilter" },
  });
  button.addEventListener("click", () => {
    state.isTagMenuOpen = !state.isTagMenuOpen;
    options.rerender(state);
  });
  wrapper.append(button);

  if (state.isTagMenuOpen) {
    wrapper.append(options.tagFilterPresentation === "bottomSheet"
      ? createReservationTagBottomSheet(state, options)
      : createReservationTagMenu(state, options));
  }

  return wrapper;
}

function createReservationTagBottomSheet(state, options) {
  const overlay = createElement("section", {
    className: "tag-bottom-sheet-overlay reservation-tag-bottom-sheet-overlay",
    dataset: { area: "reservationTagBottomSheet", modal: "reservationTagBottomSheet", state: "open" },
  });
  const sheet = createElement("div", { className: "tag-bottom-sheet reservation-tag-bottom-sheet" });
  const header = createElement("div", { className: "tag-bottom-sheet-header" });
  header.append(createElement("span", { className: "tag-bottom-sheet-header-spacer" }));
  header.append(createElement("h3", { textContent: "태그" }));
  const closeButton = createElement("button", {
    className: "text-button",
    type: "button",
    textContent: "닫기",
    dataset: { action: "closeReservationTagBottomSheet" },
  });
  closeButton.addEventListener("click", () => {
    state.isTagMenuOpen = false;
    options.rerender(state);
  });
  header.append(closeButton);

  header.querySelector("h3").textContent = "필터";
  sheet.append(header);
  sheet.append(createReservationFilterTabs(state, options));
  sheet.append(createReservationFilterTabPanel(state, options));
  overlay.append(sheet);
  return overlay;
}

function createReservationFilterTabs(state, options) {
  const tabs = createElement("div", { className: "filter-tab-list", dataset: { area: "reservationFilterTabs" } });
  [{ key: "tag", label: "태그" }, { key: "class", label: "클래스" }].forEach((tab) => {
    const isSelected = (state.activeReservationFilterTab || "tag") === tab.key;
    const button = createElement("button", {
      className: isSelected ? "filter-tab-button is-selected" : "filter-tab-button",
      type: "button",
      textContent: tab.label,
      dataset: { action: "selectReservationFilterTab", filter: tab.key, state: isSelected ? "selected" : "idle" },
    });
    button.addEventListener("click", () => {
      state.activeReservationFilterTab = tab.key;
      options.rerender(state);
    });
    tabs.append(button);
  });
  return tabs;
}

function createReservationFilterTabPanel(state, options) {
  const activeTab = state.activeReservationFilterTab || "tag";
  const panel = createElement("div", { className: "reservation-filter-tab-panel", dataset: { area: "reservationFilterTabPanel", filter: activeTab } });
  if (activeTab === "class") {
    panel.append(createReservationClassMenu(state, options));
    return panel;
  }
  panel.append(createTagSearchControl(state, {
    ...options,
    tagSearchControlClassName: "member-tag-search-control member-tag-search-filter-control",
    tagSearchInputSelector: ".reservation-tag-bottom-sheet .member-tag-search-input",
  }));
  panel.append(createReservationTagMenu(state, options, { includeSearch: false }));
  return panel;
}

function createReservationClassMenu(state, options) {
  const classes = loadSchoolClassList();
  const menu = createElement("div", { className: "tag-multi-select-menu class-multi-select-menu", dataset: { area: "reservationClassMenu", state: classes.length ? "list" : "empty" } });
  if (!classes.length) {
    menu.append(createTagEmptyState("등록된 클래스가 없습니다."));
    return menu;
  }
  const list = createElement("div", { className: "member-tag-data-list school-class-data-list" });
  [{ id: "", name: "전체 클래스" }, ...classes].forEach((schoolClass) => {
    const isSelected = String(state.selectedSchoolClassId || "") === String(schoolClass.id || "");
    const option = createElement("label", { className: "member-tag-checkbox-option", dataset: { action: "selectReservationClass", entityId: schoolClass.id || "all", state: isSelected ? "selected" : "idle" } });
    const radio = createElement("input", { type: "radio", name: "reservationSchoolClass" });
    radio.checked = isSelected;
    radio.addEventListener("change", () => {
      state.selectedSchoolClassId = schoolClass.id || "";
      options.rerender(state);
    });
    option.append(radio);
    option.append(createElement("span", { textContent: schoolClass.name || "-" }));
    list.append(option);
  });
  menu.append(list);
  return menu;
}

function createReservationTagMenu(state, options, menuOptions = {}) {
  const { includeSearch = true } = menuOptions;
  const menu = createElement("div", {
    className: "tag-multi-select-menu",
    dataset: { area: "reservationTagMenu", state: state.memberTagCatalog.length ? "list" : "empty" },
  });

  if (includeSearch) {
    menu.append(createTagSearchControl(state, options));
  }
  const list = createElement("div", {
    className: "member-tag-data-list",
    dataset: { area: "reservationTagOptionList" },
  });

  if (state.memberTagCatalog.length === 0) {
    list.append(createTagEmptyState("등록된 태그가 없습니다"));
    menu.append(list);
    return menu;
  }

  getVisibleReservationTags(state).forEach((memberTagName) => {
    list.append(createReservationTagOption(state, options, memberTagName));
  });

  if (!list.childNodes.length) {
    list.append(createTagEmptyState("조회 결과가 없습니다"));
  }

  menu.append(list);
  return menu;
}

function createTagSearchControl(state, options) {
  const control = createElement("div", {
    className: options.tagSearchControlClassName || "member-tag-search-control tag-menu-search-control",
    dataset: { state: state.selectedMemberTagNames?.length ? "selected" : "empty" },
  });

  const input = createElement("input", {
    className: "member-tag-search-input",
    type: "text",
    value: state.tagFilterQuery || "",
    placeholder: "태그 검색",
  });
  bindImeAwareInput(input, {
    onInput: (event, meta) => {
      state.tagFilterQuery = event.target.value;

      if (meta.isComposing) {
        syncReservationTagDataList(control, state, options);
        return;
      }

      options.rerender(state);
      focusReservationTagSearchInput(options);
    },
  });
  control.append(input);

  if (!state.selectedMemberTagNames?.length) {
    return control;
  }

  const clearButton = createElement("button", {
    className: "member-tag-clear-button",
    type: "button",
    textContent: "×",
    ariaLabel: "선택한 태그 전체 해제",
    dataset: { action: "clearSelectedReservationTags" },
  });
  clearButton.addEventListener("click", () => {
    state.selectedMemberTagNames = [];
    options.rerender(state);
    focusReservationTagSearchInput(options);
  });
  control.append(clearButton);
  return control;
}

function syncReservationTagDataList(control, state, options) {
  const list = control.closest("[data-area='reservationTagMenu']")?.querySelector(".member-tag-data-list")
    || control.closest(".tag-bottom-sheet")?.querySelector("[data-area='reservationTagMenu'] .member-tag-data-list");
  if (!list) {
    return;
  }

  const visibleMemberTags = getVisibleReservationTags(state);
  const hasQuery = Boolean(String(state.tagFilterQuery || "").trim());

  list.innerHTML = "";
  list.dataset.state = visibleMemberTags.length ? "list" : hasQuery ? "searchEmpty" : "empty";
  list.dataset.query = String(state.tagFilterQuery || "").trim();

  if (state.memberTagCatalog.length === 0) {
    list.append(createTagEmptyState("등록된 태그가 없습니다"));
    return;
  }

  visibleMemberTags.forEach((memberTagName) => {
    list.append(createReservationTagOption(state, options, memberTagName));
  });

  if (!list.childNodes.length) {
    list.append(createTagEmptyState("조회 결과가 없습니다"));
  }
}

function createReservationTagOption(state, options, memberTagName) {
  const isSelected = state.selectedMemberTagNames.includes(memberTagName);
  const option = createElement("label", {
    className: "member-tag-checkbox-option",
    dataset: { action: "toggleReservationTag", entityId: memberTagName, state: isSelected ? "selected" : "idle" },
  });
  const checkbox = createElement("input", {
    type: "checkbox",
  });
  checkbox.checked = isSelected;
  checkbox.addEventListener("change", () => {
    state.selectedMemberTagNames = isSelected
      ? state.selectedMemberTagNames.filter((selectedTagName) => selectedTagName !== memberTagName)
      : [...state.selectedMemberTagNames, memberTagName];
    options.rerender(state);
  });
  option.append(checkbox);
  option.append(createElement("span", { textContent: memberTagName }));
  return option;
}

function focusReservationTagSearchInput(options = {}) {
  window.setTimeout(() => {
    const nextInput = document.querySelector(options.tagSearchInputSelector || ".reservation-tag-filter .member-tag-search-input");
    if (!nextInput) {
      return;
    }

    nextInput.focus();
    nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
  }, 0);
}

function getVisibleReservationTags(state) {
  const query = String(state.tagFilterQuery || "").trim().toLowerCase();
  const memberTags = sortMemberTagNames(state.memberTagCatalog || []);

  if (!query) {
    return memberTags;
  }

  return memberTags.filter((memberTagName) => {
    return String(memberTagName || "").toLowerCase().includes(query);
  });
}

function getSelectedTagSummary(state) {
  if (!state.selectedMemberTagNames.length) {
    return "태그";
  }
  return `태그 (${state.selectedMemberTagNames.length})`;
}

function getReservationFilterSummary(state) {
  const count = (state.selectedMemberTagNames?.length || 0) + (state.selectedSchoolClassId ? 1 : 0);
  return count ? `필터 (${count})` : "필터";
}

function createTagEmptyState(title) {
  const emptyState = createEmptyStateElement({ title });
  emptyState.className = "empty-state member-tag-empty-state";
  return emptyState;
}
