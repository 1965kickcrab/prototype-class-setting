export function bindImeAwareInput(input, options = {}) {
  let isComposing = false;

  input.addEventListener("compositionstart", () => {
    isComposing = true;
  });

  input.addEventListener("compositionend", (event) => {
    isComposing = false;
    window.setTimeout(() => {
      options.onInput?.(event, { isComposing: false, isCommit: true });
    }, 0);
  });

  input.addEventListener("input", (event) => {
    options.onInput?.(event, { isComposing, isCommit: false });
  });

  return {
    isComposing: () => isComposing,
  };
}
