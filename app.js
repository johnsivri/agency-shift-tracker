const STORAGE_KEY = "agency-shift-tracker-v1";

const today = new Date();
const isoToday = toDateInput(today);
const tomorrow = addDays(isoToday, 1);
const nextWeek = addDays(isoToday, 6);
const SHIFT_DEFINITIONS = {
  A: { start: "06:00", end: "18:00", label: "A" },
  B: { start: "06:00", end: "18:00", label: "B" },
  C: { start: "18:00", end: "06:00", label: "C" },
  D: { start: "18:00", end: "06:00", label: "D" }
};
const COURT_SCHEDULE = {
  2: "13:30",
  4: "09:00"
};
const nextCourtDate = findNextCourtDate(isoToday);

const seedData = {
  shifts: [
    { id: uid(), date: isoToday, officer: "Jordan Lee", agency: "North Precinct", shift: "A", start: "06:00", end: "18:00", status: "Worked", notes: "Zone 2" },
    { id: uid(), date: tomorrow, officer: "M. Alvarez", agency: "Court Services", shift: "B", start: "06:00", end: "18:00", status: "Scheduled", notes: "" }
  ],
  court: [
    { id: uid(), date: nextCourtDate, officer: "Dana Price", caseNumber: "26-1842", court: "District 4", time: courtTimeForDate(nextCourtDate), duration: "2", status: "Scheduled", subpoena: true, notes: "Bring body cam notes" }
  ],
  swaps: [
    { id: uid(), requester: "M. Alvarez", covering: "Jordan Lee", giveDate: nextWeek, giveShift: "1500-2300", takeDate: "", takeShift: "", status: "Pending", notes: "Awaiting supervisor approval" }
  ]
};

let state = loadState();

const els = {
  monthFilter: document.querySelector("#monthFilter"),
  unitFilter: document.querySelector("#unitFilter"),
  searchFilter: document.querySelector("#searchFilter"),
  courtRows: document.querySelector("#courtRows"),
  swapRows: document.querySelector("#swapRows"),
  courtHours: document.querySelector("#courtHours"),
  courtCount: document.querySelector("#courtCount"),
  swapCount: document.querySelector("#swapCount"),
  activeSwapList: document.querySelector("#activeSwapList")
};

els.monthFilter.value = isoToday.slice(0, 7);
populateUnitFilter();

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => activateTab(tab.dataset.tab));
});

document.querySelector("#courtForm").elements.date.addEventListener("input", (event) => {
  applyCourtTime(event.currentTarget.form);
});

document.querySelector("#courtForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!applyCourtTime(event.currentTarget)) return;
  saveForm("court", event.currentTarget, ["date", "officer", "caseNumber", "court", "time", "duration", "status", "subpoena", "notes"]);
});

document.querySelector("#swapForm").addEventListener("submit", (event) => {
  event.preventDefault();
  saveForm("swaps", event.currentTarget, ["requester", "covering", "giveDate", "giveShift", "takeDate", "takeShift", "status", "notes"]);
});

els.monthFilter.addEventListener("input", render);
els.unitFilter.addEventListener("change", () => {
  localStorage.setItem(`${STORAGE_KEY}-unit`, els.unitFilter.value);
  render();
});
els.searchFilter.addEventListener("input", render);
document.querySelector("#exportCsv").addEventListener("click", exportCsv);
document.querySelector("#printView").addEventListener("click", () => window.print());
document.querySelector("#resetDemo").addEventListener("click", () => {
  if (!confirm("Reset the tracker to demo data?")) return;
  state = structuredClone(seedData);
  persist();
  render();
});

render();
applyCourtTime(document.querySelector("#courtForm"));

function activateTab(name) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === name));
  document.querySelectorAll(".panel").forEach((panel) => panel.classList.toggle("is-active", panel.id === `tab-${name}`));
}

function saveForm(collection, form, fields) {
  const formData = new FormData(form);
  const item = {};

  fields.forEach((field) => {
    const element = form.elements[field];
    item[field] = element?.type === "checkbox" ? element.checked : String(formData.get(field) || "").trim();
  });

  item.id = form.elements.id.value || uid();
  const index = state[collection].findIndex((record) => record.id === item.id);

  if (index >= 0) {
    state[collection][index] = item;
  } else {
    state[collection].push(item);
  }

  form.reset();
  form.elements.id.value = "";
  if (collection === "court") applyCourtTime(form);
  populateUnitFilter();
  persist();
  render();
}

function editRecord(collection, id) {
  const record = state[collection].find((item) => item.id === id);
  const form = document.querySelector(`#${collection === "shifts" ? "shift" : collection === "swaps" ? "swap" : collection}Form`);
  if (!record || !form) return;

  Object.entries(record).forEach(([key, value]) => {
    if (!form.elements[key]) return;
    if (form.elements[key].type === "checkbox") {
      form.elements[key].checked = Boolean(value);
    } else {
      form.elements[key].value = value;
    }
  });
  if (collection === "court") applyCourtTime(form);
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function deleteRecord(collection, id) {
  state[collection] = state[collection].filter((item) => item.id !== id);
  populateUnitFilter();
  persist();
  render();
}

function render() {
  const filters = getFilters();
  normalizeShiftRecords();
  const court = filterRecords(state.court.filter((record) => isUnitRecord(record, filters.unit)), filters, ["date", "caseNumber", "court", "status", "notes"]);
  const swaps = filterRecords(state.swaps.filter((record) => isUnitSwap(record, filters.unit)), filters, ["giveDate", "takeDate", "requester", "covering", "giveShift", "takeShift", "status", "notes"]);

  renderRows(els.courtRows, court, (item) => [
    formatDate(item.date),
    item.officer,
    item.caseNumber,
    item.court || "-",
    statusPill(item.status),
    item.duration ? `${Number(item.duration).toFixed(2)}h` : "-",
    rowActions("court", item.id)
  ]);

  renderRows(els.swapRows, swaps, (item) => [
    formatDate(item.giveDate),
    item.requester,
    item.covering || "-",
    item.giveShift || "-",
    item.takeDate ? `${formatDate(item.takeDate)} ${item.takeShift}` : "-",
    statusPill(item.status),
    rowActions("swaps", item.id)
  ]);

  renderSummary(filters);
  renderActiveSwapRequests();
}

function renderRows(target, rows, mapRow) {
  target.innerHTML = "";
  if (!rows.length) {
    target.appendChild(document.querySelector("#emptyState").content.cloneNode(true));
    return;
  }

  rows.sort(sortByPrimaryDate).forEach((item) => {
    const tr = document.createElement("tr");
    mapRow(item).forEach((value) => {
      const td = document.createElement("td");
      if (value instanceof Node) {
        td.appendChild(value);
      } else {
        td.textContent = value;
      }
      tr.appendChild(td);
    });
    target.appendChild(tr);
  });
}

function rowActions(collection, id) {
  const wrapper = document.createElement("div");
  wrapper.className = "row-actions";
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "ghost";
  edit.textContent = "Edit";
  edit.addEventListener("click", () => editRecord(collection, id));
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "ghost";
  remove.textContent = "Delete";
  remove.addEventListener("click", () => deleteRecord(collection, id));
  wrapper.append(edit, remove);
  return wrapper;
}

function statusPill(status) {
  const span = document.createElement("span");
  const normalized = String(status || "").toLowerCase();
  const kind = normalized.includes("approved") || normalized.includes("worked") || normalized.includes("appeared") || normalized.includes("completed")
    ? "good"
    : normalized.includes("pending") || normalized.includes("scheduled")
      ? "info"
      : normalized.includes("denied") || normalized.includes("canceled")
        ? "bad"
        : "warn";
  span.className = `status ${kind}`;
  span.textContent = status || "Unknown";
  return span;
}

function renderSummary(filters) {
  normalizeShiftRecords();
  const inMonth = (item) => itemMonth(primaryDate(item)) === filters.month;
  const courtInMonth = state.court.filter((item) => inMonth(item) && isUnitRecord(item, filters.unit));
  const courtHours = courtInMonth.reduce((sum, court) => sum + Number(court.duration || 0), 0);
  const courtCount = courtInMonth.length;
  const swapCount = state.swaps.filter((swap) => itemMonth(swap.giveDate) === filters.month && swap.status === "Pending" && isUnitSwap(swap, filters.unit)).length;

  els.courtHours.textContent = formatHours(courtHours);
  els.courtCount.textContent = courtCount;
  els.swapCount.textContent = swapCount;
}

function renderActiveSwapRequests() {
  const items = state.swaps
    .filter((swap) => swap.status === "Pending")
    .sort((a, b) => primaryDate(a).localeCompare(primaryDate(b)));

  els.activeSwapList.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.textContent = "No open shift swap requests.";
    els.activeSwapList.appendChild(li);
    return;
  }

  items.slice(0, 8).forEach((item) => {
    const li = document.createElement("li");
    const takeText = item.takeDate ? ` for ${formatDate(item.takeDate)} ${item.takeShift || ""}` : "";
    const requester = document.createElement("strong");
    requester.textContent = item.requester;
    const request = document.createTextNode(` needs ${formatDate(item.giveDate)} ${item.giveShift || ""}${takeText}`);
    const meta = document.createElement("span");
    meta.textContent = `${item.covering ? `Covering: ${item.covering}` : "Open coverage"} - ${item.status}`;
    li.append(requester, request, meta);
    els.activeSwapList.appendChild(li);
  });
}

function filterRecords(records, filters, fields) {
  return records.filter((record) => {
    const monthMatch = itemMonth(primaryDate(record)) === filters.month;
    const textMatch = !filters.search || fields.some((field) => String(record[field] || "").toLowerCase().includes(filters.search));
    return monthMatch && textMatch;
  });
}

function getFilters() {
  return {
    month: els.monthFilter.value,
    unit: els.unitFilter.value,
    search: els.searchFilter.value.trim().toLowerCase()
  };
}

function populateUnitFilter() {
  const current = els.unitFilter.value || localStorage.getItem(`${STORAGE_KEY}-unit`) || "";
  const units = getUnitNames();
  els.unitFilter.innerHTML = "";
  units.forEach((unit) => {
    const option = document.createElement("option");
    option.value = unit;
    option.textContent = unit;
    els.unitFilter.appendChild(option);
  });
  els.unitFilter.value = units.includes(current) ? current : units[0] || "";
}

function getUnitNames() {
  const names = new Set();
  state.shifts.forEach((record) => record.officer && names.add(record.officer));
  state.court.forEach((record) => record.officer && names.add(record.officer));
  state.swaps.forEach((record) => {
    if (record.requester) names.add(record.requester);
    if (record.covering) names.add(record.covering);
  });
  return [...names].sort((a, b) => a.localeCompare(b));
}

function isUnitRecord(record, unit) {
  return !unit || record.officer === unit;
}

function isUnitSwap(record, unit) {
  return !unit || record.requester === unit || record.covering === unit;
}

function primaryDate(record) {
  return record.date || record.giveDate || record.takeDate || "";
}

function sortByPrimaryDate(a, b) {
  return primaryDate(a).localeCompare(primaryDate(b));
}

function itemMonth(value) {
  return String(value || "").slice(0, 7);
}

function normalizeShiftRecords() {
  state.shifts.forEach((shift) => {
    shift.shift = shift.shift || inferShiftName(shift.start, shift.end);
    const definition = SHIFT_DEFINITIONS[shift.shift] || SHIFT_DEFINITIONS.A;
    shift.start = definition.start;
    shift.end = definition.end;
  });
}

function inferShiftName(start, end) {
  const startTime = String(start || "");
  const endTime = String(end || "");
  if (startTime === "18:00" || endTime === "06:00") return "B";
  return "A";
}

function applyCourtTime(form) {
  const date = form.elements.date.value;
  const time = courtTimeForDate(date);
  form.elements.time.value = time || "";
  form.elements.date.setCustomValidity(time ? "" : "Traffic court dates must be Tuesdays at 1330 or Thursdays at 0900.");
  if (!time && date) {
    form.reportValidity();
    return false;
  }
  return true;
}

function courtTimeForDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return COURT_SCHEDULE[date.getDay()] || "";
}

function findNextCourtDate(value) {
  let date = new Date(`${value}T00:00:00`);
  for (let i = 0; i < 7; i += 1) {
    const candidate = toDateInput(date);
    if (courtTimeForDate(candidate)) return candidate;
    date.setDate(date.getDate() + 1);
  }
  return value;
}

function formatHours(value) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function toDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInput(date);
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : structuredClone(seedData);
  } catch {
    return structuredClone(seedData);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function exportCsv() {
  const sections = [
    ["shifts", state.shifts],
    ["court", state.court],
    ["swaps", state.swaps]
  ];
  const rows = [["section", "data"]];
  sections.forEach(([section, records]) => {
    records.forEach((record) => rows.push([section, JSON.stringify(record)]));
  });

  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `agency-shift-tracker-${isoToday}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
