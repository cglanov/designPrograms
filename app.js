const CONFIG = {
  sheetId: "1tnzfWk4ywTxh6VATfDt1LI2Ksgl8benu5vJ4K7JJFIM",
  get gvizUrl() {
    return `https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq?tqx=out:json`;
  }
};

const elements = {
  statusLine: document.getElementById("status-line"),
  errorBox: document.getElementById("error-box"),
  programGrid: document.getElementById("program-grid"),
  recordCount: document.getElementById("record-count")
};

function setStatus(message) {
  elements.statusLine.textContent = `> ${message}`;
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  elements.statusLine.appendChild(cursor);
}

function showError(message) {
  setStatus("CONNECTION FAILURE.");
  elements.errorBox.style.display = "block";
  elements.errorBox.textContent = `[ERR] ${message}`;
}

function normalizeUrl(rawUrl) {
  return /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
}

function parseSheetRows(rows) {
  const programs = [];

  for (const row of rows) {
    if (!row.c) continue;
    const programVal = row.c[0]?.v != null ? String(row.c[0].v).trim() : "";
    const urlVal = row.c[1]?.v != null ? String(row.c[1].v).trim() : "";

    if (!programVal || !urlVal) continue;

    // Skip header row if Google Sheets treats row 1 as data
    if (programVal.toLowerCase() === "program" && urlVal.toLowerCase() === "url") {
      continue;
    }

    programs.push({
      label: programVal,
      url: normalizeUrl(urlVal)
    });
  }

  return programs;
}

function createProgramButton(item, index) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "program-btn";
  btn.title = `Open ${item.label} (${item.url})`;

  const leftWrap = document.createElement("span");
  leftWrap.className = "btn-left";

  const indexTag = document.createElement("span");
  indexTag.className = "btn-index";
  indexTag.textContent = `[${String(index + 1).padStart(2, "0")}]`;

  const labelText = document.createElement("span");
  labelText.className = "btn-label";
  labelText.textContent = item.label;

  const execTag = document.createElement("span");
  execTag.className = "btn-exec";
  execTag.textContent = "[↗]";

  leftWrap.append(indexTag, labelText);
  btn.append(leftWrap, execTag);

  btn.addEventListener("click", () => {
    window.open(item.url, "_blank", "noopener,noreferrer");
  });

  return btn;
}

function renderPrograms(programs) {
  if (programs.length === 0) {
    setStatus("STREAM COMPLETE. NO ENTRIES FOUND IN COLUMNS A & B.");
    elements.recordCount.textContent = "RECORDS: 00";
    return;
  }

  const fragment = document.createDocumentFragment();
  programs.forEach((item, index) => {
    fragment.appendChild(createProgramButton(item, index));
  });

  elements.programGrid.appendChild(fragment);
  setStatus(`READY. ${programs.length} PROGRAM(S) LOADED.`);
  elements.recordCount.textContent = `RECORDS: ${String(programs.length).padStart(2, "0")}`;
}

async function init() {
  try {
    const response = await fetch(CONFIG.gvizUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while contacting Google Sheets.`);
    }

    const rawText = await response.text();
    const jsonStart = rawText.indexOf("{");
    const jsonEnd = rawText.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Malformed response. Confirm the Google Sheet sharing setting is 'Anyone with the link'.");
    }

    const payload = JSON.parse(rawText.slice(jsonStart, jsonEnd + 1));

    if (payload.status === "error") {
      const detail = payload.errors?.[0]?.detailed_message || "Access denied by spreadsheet.";
      throw new Error(detail);
    }

    const programs = parseSheetRows(payload.table?.rows || []);
    renderPrograms(programs);
  } catch (err) {
    showError(err.message);
  }
}

init();
