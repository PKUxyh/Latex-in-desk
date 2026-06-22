(function exposeOfficeMath() {
  const mathmlNamespace = "http://www.w3.org/1998/Math/MathML";
  const officeMathNamespace = "http://schemas.openxmlformats.org/officeDocument/2006/math";
  const xmlNamespace = "http://www.w3.org/2000/xmlns/";
  const allowedRootAttributes = new Set(["display", "dir", "mathbackground", "mathcolor"]);

  function isInternalAttribute(attribute) {
    return attribute.name.startsWith("xmlns") || attribute.name.startsWith("data-");
  }

  function getFontSize(fontSizePt) {
    const size = Number.parseFloat(fontSizePt);
    if (!Number.isFinite(size) || size <= 0) return null;
    return `${size}pt`;
  }

  function copyNode(source, targetDocument) {
    if (source.nodeType === Node.TEXT_NODE) {
      return targetDocument.createTextNode(source.nodeValue);
    }

    if (source.nodeType !== Node.ELEMENT_NODE) return null;

    const target = targetDocument.createElementNS(
      mathmlNamespace,
      `mml:${source.localName}`
    );
    for (const attribute of source.attributes) {
      if (!isInternalAttribute(attribute)) {
        target.setAttribute(attribute.name, attribute.value);
      }
    }
    for (const child of source.childNodes) {
      const copiedChild = copyNode(child, targetDocument);
      if (copiedChild) target.append(copiedChild);
    }
    return target;
  }

  function createOfficeMathML(math, options = {}) {
    const documentNode = document.implementation.createDocument(
      mathmlNamespace,
      "mml:math",
      null
    );
    const root = documentNode.documentElement;
    root.setAttributeNS(xmlNamespace, "xmlns:m", officeMathNamespace);
    const fontSize = getFontSize(options.fontSizePt);

    for (const attribute of math.attributes) {
      if (!isInternalAttribute(attribute) && allowedRootAttributes.has(attribute.name)) {
        root.setAttribute(attribute.name, attribute.value);
      }
    }
    if (fontSize) root.setAttribute("mathsize", fontSize);

    const targetParent = fontSize
      ? documentNode.createElementNS(mathmlNamespace, "mml:mstyle")
      : root;
    if (fontSize) {
      targetParent.setAttribute("mathsize", fontSize);
      root.append(targetParent);
    }
    for (const child of math.childNodes) {
      const copiedChild = copyNode(child, documentNode);
      if (copiedChild) targetParent.append(copiedChild);
    }

    return `<?xml version="1.0"?>\r\n${new XMLSerializer().serializeToString(documentNode)}\r\n`;
  }

  window.officeMath = { createOfficeMathML };
})();
