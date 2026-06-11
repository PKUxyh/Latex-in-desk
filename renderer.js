const SYMBOL_CATEGORIES = {
  "希腊字母": [
    ["α", "\\alpha"], ["β", "\\beta"], ["γ", "\\gamma"], ["δ", "\\delta"],
    ["ε", "\\epsilon"], ["ζ", "\\zeta"], ["η", "\\eta"], ["θ", "\\theta"],
    ["λ", "\\lambda"], ["μ", "\\mu"], ["ξ", "\\xi"], ["π", "\\pi"],
    ["ρ", "\\rho"], ["σ", "\\sigma"], ["τ", "\\tau"], ["φ", "\\phi"],
    ["χ", "\\chi"], ["ψ", "\\psi"], ["ω", "\\omega"], ["Γ", "\\Gamma"],
    ["Δ", "\\Delta"], ["Θ", "\\Theta"], ["Λ", "\\Lambda"], ["Ω", "\\Omega"]
  ],
  "运算": [
    ["±", "\\pm"], ["×", "\\times"], ["÷", "\\div"], ["·", "\\cdot"],
    ["∑", "\\sum_{}^{}"], ["∏", "\\prod_{}^{}"], ["∫", "\\int_{}^{}"], ["∮", "\\oint"],
    ["√", "\\sqrt{}"], ["∞", "\\infty"], ["∂", "\\partial"], ["∇", "\\nabla"],
    ["∘", "\\circ"], ["⊕", "\\oplus"], ["⊗", "\\otimes"], ["∝", "\\propto"]
  ],
  "关系": [
    ["=", "="], ["≠", "\\neq"], ["≈", "\\approx"], ["≡", "\\equiv"],
    ["<", "<"], [">", ">"], ["≤", "\\leq"], ["≥", "\\geq"],
    ["∈", "\\in"], ["∉", "\\notin"], ["⊂", "\\subset"], ["⊆", "\\subseteq"],
    ["∪", "\\cup"], ["∩", "\\cap"], ["⊥", "\\perp"], ["∥", "\\parallel"]
  ],
  "箭头": [
    ["→", "\\rightarrow"], ["←", "\\leftarrow"], ["↔", "\\leftrightarrow"], ["⇒", "\\Rightarrow"],
    ["⇐", "\\Leftarrow"], ["⇔", "\\Leftrightarrow"], ["↦", "\\mapsto"], ["↑", "\\uparrow"],
    ["↓", "\\downarrow"], ["↗", "\\nearrow"], ["↘", "\\searrow"], ["⟶", "\\longrightarrow"]
  ],
  "结构": [
    ["a⁄b", "\\frac{}{}"], ["x²", "^{}"], ["xₙ", "_{}"], ["|x|", "\\left|  \\right|"],
    ["( )", "\\left(  \\right)"], ["[ ]", "\\left[  \\right]"], ["{ }", "\\left\\{  \\right\\}"], ["⌈ ⌉", "\\left\\lceil  \\right\\rceil"],
    ["lim", "\\lim_{}"], ["sin", "\\sin"], ["cos", "\\cos"], ["ln", "\\ln"],
    ["矩阵", "\\begin{pmatrix}\n  & \\\\\n  &\n\\end{pmatrix}"], ["分段", "\\begin{cases}\n  & \\\\\n  &\n\\end{cases}"], ["对齐", "\\begin{aligned}\n  &= \\\\\n  &=\n\\end{aligned}"], ["文本", "\\text{}"]
  ]
};

const COMPLETIONS = [
  ["\\frac", "\\frac{}{}", 6], ["\\sqrt", "\\sqrt{}", 6], ["\\text", "\\text{}", 6],
  ["\\sum", "\\sum_{}^{}", 6], ["\\prod", "\\prod_{}^{}", 7], ["\\int", "\\int_{}^{}", 6],
  ["\\lim", "\\lim_{}", 6], ["\\left", "\\left(  \\right)", 7],
  ["\\begin{aligned}", "\\begin{aligned}\n  &= \\\\\n  &=\n\\end{aligned}", 19],
  ["\\begin{cases}", "\\begin{cases}\n  & \\\\\n  &\n\\end{cases}", 17],
  ["\\begin{pmatrix}", "\\begin{pmatrix}\n  & \\\\\n  &\n\\end{pmatrix}", 19],
  ...Object.values(SYMBOL_CATEGORIES).flat().map(([, command]) => [command.split(/[_{^ ]/)[0], command])
].filter((item, index, all) => all.findIndex((entry) => entry[0] === item[0]) === index);

const source = document.getElementById("latex-source");
const preview = document.getElementById("formula-preview");
const emptyState = document.getElementById("empty-state");
const renderState = document.getElementById("render-state");
const cursorPosition = document.getElementById("cursor-position");
const tabs = document.getElementById("category-tabs");
const symbolGrid = document.getElementById("symbol-grid");
const toast = document.getElementById("toast");

const editor = CodeMirror.fromTextArea(source, {
  mode: "stex",
  lineNumbers: true,
  lineWrapping: true,
  indentUnit: 2,
  tabSize: 2,
  autofocus: true,
  extraKeys: {
    "Ctrl-Space": showCompletion,
    "Cmd-Space": showCompletion
  }
});

let renderTimer;
let toastTimer;
let renderSequence = 0;
let currentCategory = Object.keys(SYMBOL_CATEGORIES)[0];

function insertSnippet(text, cursorOffset) {
  const selection = editor.getSelection();
  const insertAt = editor.getCursor("from");
  const value = selection ? text.replace("{}", `{${selection}}`) : text;
  editor.replaceSelection(value, "around", "+input");

  if (!selection) {
    const offset = cursorOffset ?? value.indexOf("}");
    if (offset >= 0) {
      const beforeCursor = value.slice(0, offset);
      const lines = beforeCursor.split("\n");
      editor.setCursor({
        line: insertAt.line + lines.length - 1,
        ch: lines.length === 1 ? insertAt.ch + lines[0].length : lines.at(-1).length
      });
    }
  }

  editor.focus();
}

function completionHint(cm) {
  const cursor = cm.getCursor();
  const line = cm.getLine(cursor.line).slice(0, cursor.ch);
  const match = line.match(/\\(?:begin\{)?[A-Za-z]*$/);

  if (!match) {
    return null;
  }

  const query = match[0];
  const list = COMPLETIONS
    .filter(([label]) => label.startsWith(query))
    .slice(0, 30)
    .map(([label, text, cursorOffset]) => ({
      text,
      displayText: label,
      hint(instance, data, completion) {
        instance.replaceRange(completion.text, data.from, data.to, "+complete");
        const start = data.from;
        const offset = cursorOffset ?? completion.text.indexOf("}");
        if (offset >= 0) {
          const beforeCursor = completion.text.slice(0, offset);
          const lines = beforeCursor.split("\n");
          instance.setCursor({
            line: start.line + lines.length - 1,
            ch: lines.length === 1 ? start.ch + lines[0].length : lines.at(-1).length
          });
        }
      }
    }));

  return {
    list,
    from: CodeMirror.Pos(cursor.line, cursor.ch - query.length),
    to: cursor
  };
}

function showCompletion(cm = editor) {
  cm.showHint({ hint: completionHint, completeSingle: false });
}

function setRenderStatus(message, isError = false) {
  renderState.classList.toggle("error", isError);
  renderState.lastChild.textContent = ` ${message}`;
}

async function renderFormula() {
  const sequence = ++renderSequence;
  const tex = editor.getValue().trim();

  if (!tex) {
    preview.replaceChildren();
    emptyState.hidden = false;
    setRenderStatus("等待输入");
    return;
  }

  try {
    const node = await MathJax.tex2svgPromise(tex, { display: true });
    if (sequence !== renderSequence) return;
    preview.replaceChildren(node);
    emptyState.hidden = true;

    const mathError = node.querySelector('mjx-merror, [data-mml-node="merror"]');
    setRenderStatus(mathError ? "语法需检查" : "已同步", Boolean(mathError));
  } catch (error) {
    if (sequence !== renderSequence) return;
    setRenderStatus("渲染失败", true);
    showToast(error.message || "无法渲染当前公式");
  }
}

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderFormula, 180);
}

function updateCursorPosition() {
  const cursor = editor.getCursor();
  cursorPosition.textContent = `行 ${cursor.line + 1}，列 ${cursor.ch + 1}`;
}

function renderSymbolLibrary() {
  tabs.replaceChildren();

  for (const category of Object.keys(SYMBOL_CATEGORIES)) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `category-tab${category === currentCategory ? " active" : ""}`;
    tab.textContent = category;
    tab.addEventListener("click", () => {
      currentCategory = category;
      renderSymbolLibrary();
    });
    tabs.append(tab);
  }

  symbolGrid.replaceChildren();
  for (const [glyph, command] of SYMBOL_CATEGORIES[currentCategory]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "symbol-button";
    button.title = command;

    const symbol = document.createElement("span");
    symbol.className = "symbol-glyph";
    symbol.textContent = glyph;

    const code = document.createElement("span");
    code.className = "symbol-command";
    code.textContent = command;

    button.append(symbol, code);
    button.addEventListener("click", () => insertSnippet(command));
    symbolGrid.append(button);
  }
}

function createExportSvg(background = false, scale = 1) {
  const formulaSvg = preview.querySelector("svg");
  if (!formulaSvg) {
    throw new Error("请先输入一个可以渲染的公式。");
  }

  const rect = formulaSvg.getBoundingClientRect();
  const contentWidth = Math.max(1, Math.ceil(rect.width));
  const contentHeight = Math.max(1, Math.ceil(rect.height));
  const padding = 24;
  const width = contentWidth + padding * 2;
  const height = contentHeight + padding * 2;
  const clone = formulaSvg.cloneNode(true);

  clone.setAttribute("x", String(padding));
  clone.setAttribute("y", String(padding));
  clone.setAttribute("width", String(contentWidth));
  clone.setAttribute("height", String(contentHeight));

  const root = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  root.setAttribute("width", String(width * scale));
  root.setAttribute("height", String(height * scale));
  root.setAttribute("viewBox", `0 0 ${width} ${height}`);

  if (background) {
    const backgroundRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    backgroundRect.setAttribute("width", "100%");
    backgroundRect.setAttribute("height", "100%");
    backgroundRect.setAttribute("fill", "white");
    root.append(backgroundRect);
  }

  root.append(clone);
  return { markup: new XMLSerializer().serializeToString(root), width, height };
}

async function exportSvg() {
  try {
    const { markup } = createExportSvg(false, 1);
    const result = await window.desktopApi.saveExport({
      format: "svg",
      data: `<?xml version="1.0" encoding="UTF-8"?>\n${markup}`
    });
    if (!result.canceled) showToast(`已保存：${result.filePath}`);
  } catch (error) {
    showToast(error.message || "SVG 导出失败");
  }
}

async function exportPng() {
  try {
    const scale = 3;
    const { markup, width, height } = createExportSvg(true, scale);
    const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    const dataUrl = await new Promise((resolve, reject) => {
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width * scale;
        canvas.height = height * scale;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("PNG 转换失败"));
      };
      image.src = url;
    });

    const result = await window.desktopApi.saveExport({ format: "png", data: dataUrl });
    if (!result.canceled) showToast(`已保存：${result.filePath}`);
  } catch (error) {
    showToast(error.message || "PNG 导出失败");
  }
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("visible");
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3200);
}

editor.on("change", (_cm, change) => {
  scheduleRender();
  if (change.origin === "+input" && change.text.join("").endsWith("\\")) {
    setTimeout(() => showCompletion(), 60);
  }
});
editor.on("cursorActivity", updateCursorPosition);

document.getElementById("export-png").addEventListener("click", exportPng);
document.getElementById("export-svg").addEventListener("click", exportSvg);

renderSymbolLibrary();
updateCursorPosition();
MathJax.startup.promise.then(renderFormula).catch((error) => showToast(error.message));
