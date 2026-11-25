(() => {
  "use strict";

  const stage = document.getElementById("layout-stage");
  const statusSlot = document.getElementById("layout-status-slot");
  const progress = document.getElementById("demo-stage-progress");
  const topAction = document.getElementById("layout-top-action");
  const actions = document.getElementById("layout-actions");
  const primary = document.getElementById("layout-primary-action");
  const secondary = document.getElementById("layout-secondary-action");
  const actionGuide = document.getElementById("layout-guide-actions");
  const guideToggle = document.getElementById("layout-guides");
  const status = document.getElementById("layout-status");
  const topButtons = [...document.querySelectorAll("[data-top-mode]")];
  const formatButtons = [...document.querySelectorAll("[data-action-target]")];
  const state = {
    topMode: "progress",
    primaryFormat: "icon-label",
    secondaryFormat: "icon-label",
    guides: true
  };

  const formatClasses = {
    label: "experiment-action--label-only",
    icon: "experiment-action--icon-only",
    "icon-label": "experiment-action--icon-label"
  };
  const formatLabels = {
    label: "纯文字",
    icon: "纯 ICON",
    "icon-label": "文字 + ICON"
  };

  function setActionFormat(button, format) {
    button.classList.remove(...Object.values(formatClasses));
    button.classList.add(formatClasses[format]);
    if (format === "icon") {
      button.setAttribute("aria-label", button.querySelector(".experiment-action__label").textContent.trim());
    } else {
      button.removeAttribute("aria-label");
    }
  }

  function render() {
    stage.dataset.topMode = state.topMode;
    stage.dataset.guides = String(state.guides);
    progress.hidden = state.topMode !== "progress";
    topAction.hidden = state.topMode !== "button";
    guideToggle.checked = state.guides;

    setActionFormat(primary, state.primaryFormat);
    setActionFormat(secondary, state.secondaryFormat);

    for (const button of topButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.topMode === state.topMode));
    }
    for (const button of formatButtons) {
      const selected = state[`${button.dataset.actionTarget}Format`] === button.dataset.format;
      button.setAttribute("aria-pressed", String(selected));
    }

    actionGuide.style.width = `${actions.offsetWidth}px`;
    actionGuide.style.height = `${actions.offsetHeight}px`;
    status.textContent =
      `右上角：${state.topMode === "progress" ? "现有横向任务进度" : "图标加文字的跨页导航"}；` +
      `主按钮：${formatLabels[state.primaryFormat]}；次按钮：${formatLabels[state.secondaryFormat]}。`;
  }

  for (const button of topButtons) {
    button.addEventListener("click", () => {
      state.topMode = button.dataset.topMode;
      render();
    });
  }

  for (const button of formatButtons) {
    button.addEventListener("click", () => {
      state[`${button.dataset.actionTarget}Format`] = button.dataset.format;
      render();
    });
  }

  guideToggle.addEventListener("change", () => {
    state.guides = guideToggle.checked;
    render();
  });

  render();
})();
