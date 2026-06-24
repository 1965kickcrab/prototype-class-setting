import { buildTagSuggestions, normalizeMemberTagName, sanitizeTagList } from "../services/member-tag-service.js";
import { createEmptyStateElement } from "./empty-state.js";
import { sortMemberTagNames } from "../services/member-tag-service.js";
import { createHeaderIconButton } from "./header-icon-button.js";
import { createElement } from "../utils/dom.js";
import { bindImeAwareInput } from "../utils/ime-input.js";

export function initTagInput({ container, initialTags = [], getCatalog, onChange, showRemoveControls = true }) {
  let selectedTags = sanitizeTagList(initialTags);
  let query = "";
  let isSuggestionOpen = false;
  let isMobileSearchOpen = false;
  const inputId = `member-tag-input-${Math.random().toString(36).slice(2)}`;

  function notifyChange() {
    if (onChange) {
      onChange(getTags());
    }
  }

  function getTags() {
    return sanitizeTagList(selectedTags);
  }

  function addTag(memberTagName, options = {}) {
    const { keepSearchOpen = false } = options;
    const trimmedTagName = String(memberTagName || "").trim().replace(/\s+/g, " ");
    const selectedTagSet = new Set(selectedTags.map(normalizeMemberTagName));

    if (!trimmedTagName || selectedTagSet.has(normalizeMemberTagName(trimmedTagName))) {
      query = "";
      isMobileSearchOpen = keepSearchOpen;
      isSuggestionOpen = keepSearchOpen;
      render({ shouldFocusSearchInput: keepSearchOpen });
      return;
    }

    selectedTags = sanitizeTagList([...selectedTags, trimmedTagName]);
    query = "";
    isSuggestionOpen = keepSearchOpen;
    isMobileSearchOpen = keepSearchOpen;
    render({ shouldFocusSearchInput: keepSearchOpen });
    notifyChange();
  }

  function removeTag(memberTagName) {
    selectedTags = selectedTags.filter((selectedTagName) => {
      return normalizeMemberTagName(selectedTagName) !== normalizeMemberTagName(memberTagName);
    });
    render();
    notifyChange();
  }

  function clearTags(options = {}) {
    const { keepSearchOpen = false } = options;
    selectedTags = [];
    query = "";
    isMobileSearchOpen = keepSearchOpen;
    isSuggestionOpen = keepSearchOpen;
    render({ shouldFocusSearchInput: keepSearchOpen });
    notifyChange();
  }

  function toggleTag(memberTagName, options = {}) {
    const { keepSearchOpen = false } = options;
    const isSelected = selectedTags.some((selectedTagName) => {
      return normalizeMemberTagName(selectedTagName) === normalizeMemberTagName(memberTagName);
    });

    if (isSelected) {
      selectedTags = selectedTags.filter((selectedTagName) => {
        return normalizeMemberTagName(selectedTagName) !== normalizeMemberTagName(memberTagName);
      });
      isMobileSearchOpen = keepSearchOpen;
      isSuggestionOpen = keepSearchOpen;
      render({ shouldFocusSearchInput: keepSearchOpen });
      notifyChange();
      return;
    }

    addTag(memberTagName, { keepSearchOpen });
  }

  function focusInputAtEnd(selector = ".member-tag-input-field") {
    const input = container.querySelector(selector);
    if (!input) {
      return;
    }

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  function render(options = {}) {
    const { shouldFocusInput = false, shouldFocusSearchInput = false } = options;
    container.innerHTML = "";
    container.className = "member-tag-input";
    container.dataset.area = "memberTagInput";

    const chips = createElement("div", { className: "member-tag-input-chips", dataset: { state: selectedTags.length ? "list" : "empty" } });
    appendSelectedTagChips(chips);

    const input = createElement("input", {
      className: "member-tag-input-field",
      type: "text",
      value: query,
      placeholder: "태그 입력",
      dataset: { field: "memberTag" },
    });
    input.id = inputId;
    input.name = "memberTag";
    bindTagInputEvents(input, { searchInputSelector: ".member-tag-input-field" });
    chips.append(input);
    appendClearTagsButton(chips, { keepSearchOpen: false });
    container.append(chips);

    if (!isMobileSearchOpen) {
      appendSuggestionMenu(container);
    }

    if (isMobileSearchOpen) {
      container.append(createMobileTagSearchScreen());
    }

    if (shouldFocusInput) {
      focusInputAtEnd(".member-tag-input-field");
    }

    if (shouldFocusSearchInput) {
      focusInputAtEnd(".member-tag-search-input");
    }
  }

  function bindTagInputEvents(input, options = {}) {
    const searchInputSelector = options.searchInputSelector || ".member-tag-input-field";
    const imeInput = bindImeAwareInput(input, {
      onInput: (event, meta) => {
        query = event.target.value;
        isSuggestionOpen = true;
        if (meta.isComposing) {
          if (searchInputSelector === ".member-tag-search-input") {
            syncMobileTagDataList();
          }
          return;
        }

        render({ [searchInputSelector === ".member-tag-search-input" ? "shouldFocusSearchInput" : "shouldFocusInput"]: true });
      },
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || imeInput.isComposing()) {
        return;
      }
      event.preventDefault();
      const suggestion = getSuggestions()[0];
      addTag(suggestion || query, { keepSearchOpen: searchInputSelector === ".member-tag-search-input" });
    });
    input.addEventListener("focus", () => {
      if (isMobileLayout() && !isMobileSearchOpen) {
        isMobileSearchOpen = true;
        isSuggestionOpen = true;
        render({ shouldFocusSearchInput: true });
        return;
      }

      if (isSuggestionOpen) {
        return;
      }

      isSuggestionOpen = true;
      render({ [searchInputSelector === ".member-tag-search-input" ? "shouldFocusSearchInput" : "shouldFocusInput"]: true });
    });
    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (container.contains(document.activeElement) || isMobileSearchOpen) {
          return;
        }

        isSuggestionOpen = false;
        render();
      }, 120);
    });
  }

  function appendSuggestionMenu(parent) {
    const suggestions = getSuggestions();
    if (isSuggestionOpen && (suggestions.length || query.trim())) {
      const menu = createElement("div", {
        className: "member-tag-suggestion-menu",
        dataset: { state: suggestions.length ? "list" : "empty" },
      });

      suggestions.forEach((memberTagName) => {
        const option = createElement("button", {
          className: "member-tag-suggestion-option",
          type: "button",
          textContent: memberTagName,
          dataset: { action: "selectMemberTagSuggestion", entityId: memberTagName },
        });
        option.addEventListener("mousedown", (event) => {
          event.preventDefault();
          addTag(memberTagName);
        });
        menu.append(option);
      });

      if (query.trim() && !suggestions.some((memberTagName) => normalizeMemberTagName(memberTagName) === normalizeMemberTagName(query))) {
        const createButton = createElement("button", {
          className: "member-tag-suggestion-option",
          type: "button",
          textContent: `"${query.trim()}" 추가`,
          dataset: { action: "createMemberTag" },
        });
        createButton.addEventListener("mousedown", (event) => {
          event.preventDefault();
          addTag(query);
        });
        menu.append(createButton);
      }

      if (!menu.childElementCount) {
        menu.append(createElement("span", { className: "empty-inline", textContent: "추천 태그가 없습니다" }));
      }

      parent.append(menu);
    }
  }

  function createMobileTagSearchScreen() {
    const screen = createElement("section", {
      className: "member-tag-search-screen",
      dataset: { area: "memberTagSearch", state: "open" },
    });
    const header = createElement("header", { className: "member-tag-search-header" });
    const backButton = createHeaderIconButton({
      className: "back-button",
      icon: "back",
      ariaLabel: "태그 입력으로 돌아가기",
      dataset: { action: "closeMemberTagSearch" },
    });
    backButton.addEventListener("click", () => {
      isMobileSearchOpen = false;
      isSuggestionOpen = false;
      render();
    });
    header.append(backButton);
    header.append(createElement("h2", { textContent: "태그" }));
    header.append(createElement("span", { className: "member-tag-search-header-spacer" }));

    screen.append(header);
    screen.append(createMobileTagSearchControl());
    screen.append(createMobileTagDataList());
    return screen;
  }

  function createMobileTagSearchControl() {
    const control = createElement("div", {
      className: "member-tag-search-control member-tag-search-filter-control",
      dataset: { state: selectedTags.length ? "selected" : "empty" },
    });

    appendSelectedTagSummaryChips(control);

    const searchInput = createElement("input", {
      className: "member-tag-search-input",
      type: "text",
      value: query,
      placeholder: "태그 입력 또는 조회",
      dataset: { field: "memberTag" },
    });
    bindTagInputEvents(searchInput, { searchInputSelector: ".member-tag-search-input" });
    control.append(searchInput);
    appendClearTagsButton(control, { keepSearchOpen: true });
    return control;
  }

  function appendClearTagsButton(parent, options) {
    if (!showRemoveControls || !selectedTags.length) {
      return;
    }

    const button = createElement("button", {
      className: "member-tag-clear-button",
      type: "button",
      textContent: "×",
      ariaLabel: "선택한 태그 전체 해제",
      dataset: { action: "clearMemberTags" },
    });
    button.addEventListener("click", () => {
      clearTags(options);
    });
    parent.append(button);
  }

  function appendSelectedTagChips(parent) {
    selectedTags.forEach((memberTagName) => {
      const chip = createElement("span", { className: "member-tag-input-chip", dataset: { entity: "memberTag", entityId: memberTagName } });
      chip.append(createElement("span", { textContent: memberTagName }));
      if (!showRemoveControls) {
        parent.append(chip);
        return;
      }
      const removeButton = createElement("button", {
        className: "member-tag-chip-remove",
        type: "button",
        textContent: "×",
        ariaLabel: `${memberTagName} 태그 삭제`,
        dataset: { action: "removeMemberTag" },
      });
      removeButton.addEventListener("click", () => {
        removeTag(memberTagName);
      });
      chip.append(removeButton);
      parent.append(chip);
    });
  }

  function appendSelectedTagSummaryChips(parent) {
    selectedTags.forEach((memberTagName) => {
      const chip = createElement("span", {
        className: "member-tag-input-chip",
        dataset: { entity: "memberTag", entityId: memberTagName },
      });
      chip.append(createElement("span", { textContent: memberTagName }));
      if (!showRemoveControls) {
        parent.append(chip);
        return;
      }
      const removeButton = createElement("button", {
        className: "member-tag-chip-remove",
        type: "button",
        textContent: "×",
        ariaLabel: `${memberTagName} 태그 삭제`,
        dataset: { action: "removeMemberTagSummary" },
      });
      removeButton.addEventListener("click", () => {
        removeTag(memberTagName);
      });
      chip.append(removeButton);
      parent.append(chip);
    });
  }

  function createMobileTagDataList() {
    const list = createElement("div", {
      className: "member-tag-data-list",
    });
    populateMobileTagDataList(list);
    return list;
  }

  function syncMobileTagDataList() {
    const list = container.querySelector(".member-tag-data-list");
    if (!list) {
      return;
    }

    populateMobileTagDataList(list);
  }

  function populateMobileTagDataList(list) {
    const searchResults = getTagSearchResults();
    const hasQuery = Boolean(query.trim());

    list.innerHTML = "";
    list.dataset.state = searchResults.length ? "list" : hasQuery ? "searchEmpty" : "empty";
    list.dataset.query = query.trim();

    searchResults.forEach((memberTagName) => {
      list.append(createTagCheckboxOption(memberTagName, {
        isSelected: isSelectedTag(memberTagName),
        action: "toggleMemberTag",
        onChange: () => {
          toggleTag(memberTagName, { keepSearchOpen: true });
        },
      }));
    });

    if (hasQuery && !isSelectedTag(query) && !searchResults.some((memberTagName) => normalizeMemberTagName(memberTagName) === normalizeMemberTagName(query))) {
      list.append(createTagCheckboxOption(`"${query.trim()}" 추가`, {
        isSelected: false,
        action: "createMemberTag",
        entityId: query.trim(),
        onChange: () => {
          addTag(query, { keepSearchOpen: true });
        },
      }));
    }

    if (!list.childElementCount) {
      list.append(createTagEmptyState(hasQuery ? "조회 결과가 없습니다" : "등록된 태그가 없습니다"));
    }
  }

  function createTagEmptyState(title) {
    const emptyState = createEmptyStateElement({ title });
    emptyState.className = "empty-state member-tag-empty-state";
    return emptyState;
  }

  function getSuggestions() {
    return buildTagSuggestions(getCatalog ? getCatalog() : [], query, selectedTags, 6);
  }

  function getTagSearchResults() {
    const catalog = sortMemberTagNames(getCatalog ? getCatalog() : []);
    const selectedTagNames = new Set(selectedTags.map((memberTagName) => {
      return normalizeMemberTagName(memberTagName);
    }));
    const availableCatalog = catalog.filter((memberTagName) => {
      return !selectedTagNames.has(normalizeMemberTagName(memberTagName));
    });
    const normalizedQuery = normalizeMemberTagName(query);
    if (!normalizedQuery) {
      return availableCatalog;
    }

    return availableCatalog.filter((memberTagName) => {
      return normalizeMemberTagName(memberTagName).includes(normalizedQuery);
    });
  }

  function isSelectedTag(memberTagName) {
    return selectedTags.some((selectedTagName) => {
      return normalizeMemberTagName(selectedTagName) === normalizeMemberTagName(memberTagName);
    });
  }

  function createTagCheckboxOption(labelText, options) {
    const entityId = options.entityId || labelText;
    const option = createElement("label", {
      className: "member-tag-checkbox-option",
      dataset: {
        action: options.action,
        entityId,
        state: options.isSelected ? "selected" : "idle",
      },
    });
    const checkbox = createElement("input", {
      type: "checkbox",
    });
    checkbox.checked = options.isSelected;
    checkbox.addEventListener("change", options.onChange);
    option.append(checkbox);
    option.append(createElement("span", { textContent: labelText }));
    return option;
  }

  function isMobileLayout() {
    return window.matchMedia && window.matchMedia("(max-width: 430px)").matches;
  }

  render();

  return {
    getTags,
  };
}
