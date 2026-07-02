import { createElement } from "../utils/dom.js";

export function createSideNavigation(options) {
  const navigation = createElement("aside", {
    className: options.className,
    dataset: options.dataset,
  });

  if (options.profileNode) {
    navigation.append(options.profileNode);
  }

  const menu = createElement("nav", {
    className: options.menuClassName,
    ariaLabel: options.ariaLabel || "주요 메뉴",
  });

  (options.items || []).forEach((item) => {
    menu.append(createNavigationButton(item, options.itemClassName));
  });

  navigation.append(menu);

  if (options.footerText) {
    navigation.append(createElement("small", {
      className: options.footerClassName,
      textContent: options.footerText,
    }));
  }

  return navigation;
}

export function createBusinessNavigation(options) {
  return createSideNavigation({
    className: options.className,
    dataset: options.dataset,
    profileNode: options.profileNode || createBusinessNavigationProfile(options.profile),
    menuClassName: options.menuClassName || "business-side-nav",
    itemClassName: options.itemClassName || "business-side-nav-item",
    footerClassName: options.footerClassName || "business-navigation-footer",
    footerText: options.footerText,
    items: options.items,
    ariaLabel: options.ariaLabel,
  });
}

export function createBusinessNavigationProfile(options = {}) {
  const profile = createElement("section", {
    className: options.className || "business-navigation-profile",
    dataset: {
      area: "businessProfile",
      ...(options.dataset || {}),
    },
  });

  if (options.imageSrc) {
    const avatar = createElement("div", {
      className: options.avatarClassName || "business-navigation-avatar",
    });
    avatar.append(createElement("img", {
      src: options.imageSrc,
      alt: options.imageAlt || "업장 프로필",
    }));
    profile.append(avatar);
  }

  const profileText = createElement("div", {
    className: options.textClassName || "business-navigation-profile-text",
  });
  profileText.append(createElement("strong", { textContent: options.title || "" }));

  if (options.subtitle) {
    profileText.append(createElement("span", { textContent: options.subtitle }));
  }

  profile.append(profileText);
  return profile;
}

export function createMobileBottomNavigation(options) {
  const navigation = createElement("nav", {
    className: options.className || "mobile-bottom-nav",
    dataset: options.dataset,
    ariaLabel: options.ariaLabel || "하단 내비게이션",
  });

  (options.items || []).forEach((item) => {
    navigation.append(createNavigationButton(item, options.itemClassName || "nav-item"));
  });

  return navigation;
}

export function createDefaultAppBottomNavigation(options = {}) {
  const selectedLabel = options.selectedLabel || "일정";

  return createMobileBottomNavigation({
    className: options.className || "mobile-bottom-nav",
    dataset: options.dataset,
    ariaLabel: options.ariaLabel,
    itemClassName: options.itemClassName,
    items: [
      { label: "일정", selected: selectedLabel === "일정", href: "./index.html" },
      { label: "알림장", selected: selectedLabel === "알림장", href: "./report.html" },
      { label: "회원", selected: selectedLabel === "회원", href: "./member-home.html" },
      { label: "더보기", selected: selectedLabel === "더보기", href: "./app-more.html" },
    ],
  });
}

function createNavigationButton(item, className) {
  const button = createElement("button", {
    className: item.selected ? `${className} is-selected` : className,
    type: "button",
    textContent: item.icon ? undefined : item.label,
    dataset: {
      action: item.action || "navigate",
      target: item.target || item.label,
      state: item.selected ? "selected" : "idle",
      ...(item.dataset || {}),
    },
  });

  if (item.icon) {
    button.append(createElement("img", { src: item.icon, alt: "" }));
    button.append(createElement("span", { textContent: item.label }));
  }

  if (item.href) {
    button.addEventListener("click", () => {
      window.location.href = item.href;
    });
  }

  return button;
}
