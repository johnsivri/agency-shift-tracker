const STORAGE_KEY = "agency-shift-tracker-v1";

const today = new Date();
const isoToday = toDateInput(today);
const tomorrow = addDays(isoToday, 1);
const nextWeek = addDays(isoToday, 6);
const SHIFT_DEFINITIONS = {
  A: { start: "06:00", end: "18:00", label: "A" },
  B: { start: "18:00", end: "06:00", label: "B" },
  C: { start: "06:00", end: "18:00", label: "C" },
  D: { start: "18:00", end: "06:00", label: "D" }
};

const seedData = {
  shifts: [
    { id: uid(), date: isoToday, officer: "Jordan Lee", agency: "North Precinct", shift: "A", start: "06:00", end: "18:00", status: "Worked", notes: "Zone 2" },
    { id: uid(), date: tomorrow, officer: "M. Alvarez", agency: "Court Services", shift: "B", start: "18:00", end: "06:00", status: "Scheduled", notes: "" }
  ],
  overtime: [
    { id: uid(), date: isoToday, officer: "Jordan Lee", start: "15:00", end: "18:30", reason: "Holdover", approval: "Pending", caseNumber: "", courtRelated: false },
    { id: uid(), date: tomorrow, officer: "Dana Price", start: "09:00", end: "11:00", reason: "Court", approval: "Approved", caseNumber: "26-1842", courtRelated: true }
  ],
  court: [
    { id: uid(), date: tomorrow, officer: "Dana Price", caseNumber: "26-1842", court: "District 4", time: "09:00", duration: "2", status: "Scheduled", subpoena: true, notes: "Bring body cam notes" }
  ],
  swaps: [
    { id: uid(), requester: "M. Alvarez", covering: "Jordan Lee", giveDate: nextWeek, giveShift: "1500-2300", takeDate: "", takeShift: "", status: "Pending", notes: "Awaiting supervisor approval" }
  ]
};

let state = loadState();

const els = {
  monthFilter: document.querySelector("#monthFilter"),
  searchFilter: document.querySelector("#searchFilter"),
  shiftRows: document.querySelector("#shiftRows"),
  overtimeRows: document.querySelector("#overtimeRows"),
  courtRows: document.querySelector("#courtRows"),
  swapRows: document.querySelector("#swapRows"),
  shiftHours: document.querySelector("#shiftHours"),
  overtimeHours: document.querySelector("#overtimeHours"),
  courtCount: document.querySelector("#courtCount"),
  swapCount: document.querySelector("#swapCount"),
  upcomingList: document.querySelector("#upcomingList")
};

els.monthFilter.value = isoToday.slice(0, 7);

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => activateTab(tab.dataset.tab));
});

document.querySelector("#shiftForm").elements.shift.addEventListener("change", (event) => {
  applyShiftHours(event.currentTarget.form);
});

document.querySelector("#shiftForm").addEventListener("submit", (event) => {
  event.preventDefault();
  applyShiftHours(event.currentTarget);
  saveForm("shifts", event.currentTarget, ["date", "officer", "agency", "shift", "start", "end", "status", "notes"]);
});

document.querySelector("#overtimeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  saveForm("overtime", event.currentTarget, ["date", "officer", "start", "end", "reason", "approval", "caseNumber", "courtRelated"]);
});

document.querySelector("#courtForm").addEventListener("submit", (event) => {
  event.preventDefault();
  saveForm("court", event.currentTarget, ["date", "officer", "caseNumber", "court", "time", "duration", "status", "subpoena", "notes"]);
});

document.querySelector("#swapForm").addEventListener("submit", (event) => {
  event.preventDefault();
  saveForm("swaps", event.currentTarget, ["requester", "covering", "giveDate", "giveShift", "takeDate", "takeShift", "status", "notes"]);
});

els.monthFilter.addEventListener("input", render);
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
applyShiftHours(document.querySelector("#shiftForm"));

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
  if (collection === "shifts") applyShiftHours(form);
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
  if (collection === "shifts") applyShiftHours(form);
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function deleteRecord(collection, id) {
  state[collection] = state[collection].filter((item) => item.id !== id);
  persist();
  render();
}

function render() {
  const filters = getFilters();
  normalizeShiftRecords();
  const shifts = filterRecords(state.shifts, filters, ["date", "officer", "agency", "shift", "status", "notes"]);
  const overtime = filterRecords(state.overtime, filters, ["date", "officer", "reason", "approval", "caseNumber"]);
  const court = filterRecords(state.court, filters, ["date", "officer", "caseNumber", "court", "status", "notes"]);
  const swaps = filterRecords(state.swaps, filters, ["giveDate", "takeDate", "requester", "covering", "giveShift", "takeShift", "status", "notes"]);

  renderRows(els.shiftRows, shifts, (item) => [
    formatDate(item.date),
    item.officer,
    item.agency || "-",
    `${item.shift} shift`,
    `${formatMilitaryTime(item.start)} - ${formatMilitaryTime(item.end)}`,
    formatHours(hoursBetween(item.start, item.end)),
    statusPill(item.status),
    rowActions("shifts", item.id)
  ]);

  renderRows(els.overtimeRows, overtime, (item) => [
    formatDate(item.date),
    item.officer,
    item.courtRelated ? `${item.reason} / court` : item.reason,
    `${item.start} - ${item.end}`,
    formatHours(hoursBetween(item.start, item.end)),
    statusPill(item.approval),
    rowActions("overtime", item.id)
  ]);

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
    item.covering,
    item.giveShift || "-",
    item.takeDate ? `${formatDate(item.takeDate)} ${item.takeShift}` : "-",
    statusPill(item.status),
    rowActions("swaps", item.id)
  ]);

  renderSummary(filters);
  renderUpcoming();
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
  const shiftHours = state.shifts.filter(inMonth).reduce((sum, shift) => sum + hoursBetween(shift.start, shift.end), 0);
  const otHours = state.overtime.filter(inMonth).reduce((sum, ot) => sum + hoursBetween(ot.start, ot.end), 0);
  const courtCount = state.court.filter(inMonth).length;
  const swapCount = state.swaps.filter((swap) => itemMonth(swap.giveDate) === filters.month && swap.status === "Pending").length;

  els.shiftHours.textContent = formatHours(shiftHours);
  els.overtimeHours.textContent = formatHours(otHours);
  els.courtCount.textContent = courtCount;
  els.swapCount.textContent = swapCount;
}

function renderUpcoming() {
  normalizeShiftRecords();
  const start = new Date(isoToday);
  const end = new Date(addDays(isoToday, 7));
  const items = [
    ...state.shifts.map((item) => ({ date: item.date, text: `${item.officer} ${item.shift} shift ${formatMilitaryTime(item.start)}-${formatMilitaryTime(item.end)}` })),
    ...state.overtime.map((item) => ({ date: item.date, text: `${item.officer} OT ${formatMilitaryTime(item.start)}-${formatMilitaryTime(item.end)}` })),
    ...state.court.map((item) => ({ date: item.date, text: `${item.officer} court ${item.time} case ${item.caseNumber}` })),
    ...state.swaps.map((item) => ({ date: item.giveDate, text: `${item.requester} swap with ${item.covering}` }))
  ].filter((item) => {
    const date = new Date(item.date);
    return date >= start && date <= end;
  }).sort((a, b) => a.date.localeCompare(b.date));

  els.upcomingList.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.textContent = "Nothing scheduled in the next week.";
    els.upcomingList.appendChild(li);
    return;
  }

  items.slice(0, 8).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${formatDate(item.date)}: ${item.text}`;
    els.upcomingList.appendChild(li);
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
    search: els.searchFilter.value.trim().toLowerCase()
  };
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

function applyShiftHours(form) {
  const shift = form.elements.shift.value || "A";
  const definition = SHIFT_DEFINITIONS[shift] || SHIFT_DEFINITIONS.A;
  form.elements.start.value = definition.start;
  form.elements.end.value = definition.end;
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

function hoursBetween(start, end) {
  if (!start || !end) return 0;
  const [startHours, startMinutes] = start.split(":").map(Number);
  const [endHours, endMinutes] = end.split(":").map(Number);
  let startTotal = startHours * 60 + startMinutes;
  let endTotal = endHours * 60 + endMinutes;
  if (endTotal < startTotal) endTotal += 24 * 60;
  return (endTotal - startTotal) / 60;
}

function formatMilitaryTime(value) {
  return String(value || "").replace(":", "");
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
    ["overtime", state.overtime],
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
