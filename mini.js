const source = document.getElementById("mini-source");
const preview = document.getElementById("mini-preview");
const placeholder = document.getElementById("mini-placeholder");
const status = document.getElementById("mini-status");
const suggestions = document.getElementById("mini-suggestions");
const fontSizeSelect = document.getElementById("mini-font-size");
const fontSizeStorageKey = "latexFormulaDesk.fontSizePt";

let renderTimer;
let renderSequence = 0;
let renderValid = false;
let suggestionItems = [];
let selectedSuggestion = 0;
let suggestionQuery = null;
let suggestionsOpen = false;

function setStatus(message, state = "") {
  status.textContent = message;
  status.className = `mini-status${state ? ` ${state}` : ""}`;
}

function getFontSizePt() {
  return fontSizeSelect?.value || localStorage.getItem(fontSizeStorageKey) || "18";
}

function setFontSizePt(value) {
  if (!fontSizeSelect) return;
  fontSizeSelect.value = value;
  localStorage.setItem(fontSizeStorageKey, value);
}

async function renderFormula() {
  const sequence = ++renderSequence;
  const tex = source.value.trim();
  renderValid = false;

  if (!tex) {
    preview.replaceChildren();
    placeholder.hidden = false;
    setStatus("Enter 复制");
    return false;
  }

  try {
    const node = await MathJax.tex2svgPromise(tex, { display: true });
    if (sequence !== renderSequence) return false;

    const mathError = node.querySelector('mjx-merror, [data-mml-node="merror"]');
    preview.replaceChildren(node);
    placeholder.hidden = true;
    renderValid = !mathError && Boolean(node.querySelector("mjx-assistive-mml math"));
    setStatus(renderValid ? "Enter 复制" : "语法需检查", renderValid ? "valid" : "error");
    return renderValid;
  } catch (_error) {
    if (sequence !== renderSequence) return false;
    preview.replaceChildren();
    placeholder.hidden = false;
    placeholder.textContent = "无法渲染";
    setStatus("语法错误", "error");
    return false;
  }
}

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderFormula, 140);
}

function setSuggestionsOpen(isOpen) {
  if (suggestionsOpen === isOpen) return;
  suggestionsOpen = isOpen;
  suggestions.hidden = !isOpen;
  window.desktopApi?.setMiniSuggestionsOpen?.(isOpen);
}

function findSuggestionQuery() {
  const cursor = source.selectionStart;
  if (cursor === null || source.selectionEnd !== cursor) return null;
  const match = source.value.slice(0, cursor).match(/\\[A-Za-z]*$/);
  if (!match) return null;
  return { text: match[0], start: cursor - match[0].length, end: cursor };
}

function updateSelectedSuggestion() {
  for (const [index, item] of [...suggestions.children].entries()) {
    const isSelected = index === selectedSuggestion;
    item.classList.toggle("selected", isSelected);
    item.setAttribute("aria-selected", String(isSelected));
  }
}

function acceptSuggestion(index = selectedSuggestion) {
  const completion = suggestionItems[index];
  if (!completion || !suggestionQuery) return;

  const [, text, cursorOffset] = completion;
  source.setRangeText(text, suggestionQuery.start, suggestionQuery.end, "end");
  const cursor = suggestionQuery.start + (cursorOffset ?? text.length);
  source.setSelectionRange(cursor, cursor);
  setSuggestionsOpen(false);
  scheduleRender();
}

function updateSuggestions() {
  suggestionQuery = findSuggestionQuery();
  if (!suggestionQuery) {
    suggestionItems = [];
    setSuggestionsOpen(false);
    return;
  }

  suggestionItems = window.latexCompletions
    .filter(([label]) => label.toLowerCase().startsWith(suggestionQuery.text.toLowerCase()))
    .slice(0, 3);
  selectedSuggestion = 0;
  suggestions.replaceChildren();

  for (const [index, [label, text]] of suggestionItems.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `suggestion-item${index === 0 ? " selected" : ""}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(index === 0));

    const icon = document.createElement("span");
    icon.className = "suggestion-icon";
    icon.textContent = "∑";
    const command = document.createElement("span");
    command.className = "suggestion-command";
    command.textContent = label;
    const template = document.createElement("span");
    template.className = "suggestion-template";
    template.textContent = text === label ? "LaTeX 命令" : text;

    button.append(icon, command, template);
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => acceptSuggestion(index));
    suggestions.append(button);
  }

  setSuggestionsOpen(suggestionItems.length > 0);
}

async function copyFormula() {
  clearTimeout(renderTimer);
  const valid = await renderFormula();
  if (!valid || !renderValid) {
    setStatus("请检查语法", "error");
    return;
  }

  try {
    const math = preview.querySelector("mjx-assistive-mml math");
    const mathml = window.officeMath.createOfficeMathML(math, { fontSizePt: getFontSizePt() });
    if (!window.desktopApi?.copyOfficeEquation) {
      throw new Error("Desktop API unavailable");
    }
    await window.desktopApi.copyOfficeEquation(mathml);
    setSuggestionsOpen(false);
    setStatus("已复制", "valid");
    source.select();
  } catch (_error) {
    setStatus("复制失败", "error");
  }
}

source.addEventListener("input", () => {
  scheduleRender();
  updateSuggestions();
});
source.addEventListener("keydown", (event) => {
  if (suggestionsOpen && event.key === "ArrowDown") {
    event.preventDefault();
    selectedSuggestion = (selectedSuggestion + 1) % suggestionItems.length;
    updateSelectedSuggestion();
  } else if (suggestionsOpen && event.key === "ArrowUp") {
    event.preventDefault();
    selectedSuggestion = (selectedSuggestion - 1 + suggestionItems.length) % suggestionItems.length;
    updateSelectedSuggestion();
  } else if (suggestionsOpen && event.key === "Tab") {
    event.preventDefault();
    acceptSuggestion();
  } else if (event.key === "Enter") {
    event.preventDefault();
    setSuggestionsOpen(false);
    copyFormula();
  } else if (event.key === "Escape") {
    event.preventDefault();
    if (suggestionsOpen) setSuggestionsOpen(false);
    else window.desktopApi?.hideMiniWindow();
  }
});
source.addEventListener("click", updateSuggestions);

document.getElementById("close-mini").addEventListener("click", () => {
  setSuggestionsOpen(false);
  window.desktopApi?.hideMiniWindow();
});
fontSizeSelect?.addEventListener("change", () => setFontSizePt(fontSizeSelect.value));
window.addEventListener("storage", (event) => {
  if (event.key === fontSizeStorageKey && event.newValue && fontSizeSelect) {
    fontSizeSelect.value = event.newValue;
  }
});

function loadSource(value) {
  setSuggestionsOpen(false);
  source.value = typeof value === "string" ? value.replace(/\s*\n\s*/g, " ") : "";
  placeholder.textContent = "实时预览";
  renderFormula();
  source.focus();
  source.select();
}

if (window.desktopApi?.onMiniSource) {
  window.desktopApi.onMiniSource(loadSource);
}

MathJax.startup.promise.then(() => {
  setFontSizePt(localStorage.getItem(fontSizeStorageKey) || "18");
  source.focus();
  if (!window.desktopApi?.onMiniSource) loadSource("\\frac{a}{b} + \\sqrt{x^2 + y^2}");
  else renderFormula();
});
