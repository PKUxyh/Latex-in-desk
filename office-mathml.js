(function exposeOfficeMath() {
  const mathmlNamespace = "http://www.w3.org/1998/Math/MathML";
  const officeMathNamespace = "http://schemas.openxmlformats.org/officeDocument/2006/math";
  const xmlNamespace = "http://www.w3.org/2000/xmlns/";

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
      if (!attribute.name.startsWith("xmlns")) {
        target.setAttribute(attribute.name, attribute.value);
      }
    }
    for (const child of source.childNodes) {
      const copiedChild = copyNode(child, targetDocument);
      if (copiedChild) target.append(copiedChild);
    }
    return target;
  }

  function createOfficeMathML(math) {
    const documentNode = document.implementation.createDocument(
      mathmlNamespace,
      "mml:math",
      null
    );
    const root = documentNode.documentElement;
    root.setAttributeNS(xmlNamespace, "xmlns:m", officeMathNamespace);

    for (const attribute of math.attributes) {
      if (attribute.name !== "xmlns") root.setAttribute(attribute.name, attribute.value);
    }
    for (const child of math.childNodes) {
      const copiedChild = copyNode(child, documentNode);
      if (copiedChild) root.append(copiedChild);
    }

    return `<?xml version="1.0"?>\r\n${new XMLSerializer().serializeToString(documentNode)}\r\n`;
  }

  window.officeMath = { createOfficeMathML };
})();
