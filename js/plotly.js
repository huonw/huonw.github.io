---
---
{% include plotly-cartesian-2.5.1.min.js %}
{% include pako_inflate.es5.min.js %}

function b64ToUint6(nChr) {
  return nChr > 64 && nChr < 91
    ? nChr - 65
    : nChr > 96 && nChr < 123
    ? nChr - 71
    : nChr > 47 && nChr < 58
    ? nChr + 4
    : nChr === 43
    ? 62
    : nChr === 47
    ? 63
    : 0;
}

function base64DecToArr(sBase64, nBlocksSize) {
  var sB64Enc = sBase64.replace(/[^A-Za-z0-9\+\/]/g, ""),
    nInLen = sB64Enc.length,
    nOutLen = nBlocksSize
      ? Math.ceil(((nInLen * 3 + 1) >> 2) / nBlocksSize) * nBlocksSize
      : (nInLen * 3 + 1) >> 2,
    taBytes = new Uint8Array(nOutLen);

  for (
    var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0;
    nInIdx < nInLen;
    nInIdx++
  ) {
    nMod4 = nInIdx & 3;
    nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << (6 * (3 - nMod4));
    if (nMod4 === 3 || nInLen - nInIdx === 1) {
      for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++) {
        taBytes[nOutIdx] = (nUint24 >>> ((16 >>> nMod3) & 24)) & 255;
      }
      nUint24 = 0;
    }
  }

  return taBytes;
}

function parseInflateB64(data) {
  const inflated = pako.inflate(
    base64DecToArr(data)
  );
  const string = new TextDecoder().decode(inflated);
  return JSON.parse(string);
}

document.addEventListener("DOMContentLoaded", () => {
  const templateElement = document.getElementById("plotly-template");
  const globalTemplate = templateElement && parseInflateB64(templateElement.text);
  console.log(globalTemplate);
  // syncs with _include/plotly.html
  const plots = Array.from(document.querySelectorAll("[data-plotly-data]"));

  const sortCriteria = (elem) => {
    const rect = elem.getBoundingClientRect();
    const visible = rect.top < window.innerHeight && rect.bottom > 0;
    const distance = Math.min(Math.abs(rect.top), Math.abs(rect.bottom));

    return [visible, distance];
  };

  plots.sort((x, y) => {
    const [xVisible, xDist] = sortCriteria(x);
    const [yVisible, yDist] = sortCriteria(y);
    if (xVisible == yVisible) {
      return xDist - yDist;
    }
    return xVisible ? -1 : 1;
  });

  plots.forEach((x, idx) => {
    // let the event loop jump in here, so that they can render when ready
    setTimeout(() => {
      const object = parseInflateB64(x.getAttribute("data-plotly-data"));
      if (!object.layout.template && globalTemplate) {
        object.layout.template = globalTemplate;
      }
      object.config = { responsive: true, displayModeBar: true, modeBarButtons: [['resetScale2d']] };
      Plotly.newPlot(x, object);
      x.setAttribute("data-rendering-order", idx.toString());
    }, 0);
  });
});

