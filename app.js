const STORAGE_KEY = "agency-shift-tracker-v2";

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
  roster: [
    { id: uid(), name: "Sgt. Elena Rivera", badgeNumber: "S-104", role: "supervisor", shift: "A", supervisor: "" },
    { id: uid(), name: "Sgt. Marcus Chen", badgeNumber: "S-118", role: "supervisor", shift: "C", supervisor: "" },
    { id: uid(), name: "Officer Jordan Lee", badgeNumber: "P-221", role: "officer", shift: "A", supervisor: "Sgt. Elena Rivera" },
    { id: uid(), name: "Officer Maya Alvarez", badgeNumber: "P-237", role: "officer", shift: "B", supervisor: "Sgt. Elena Rivera" },
    { id: uid(), name: "Officer Dana Price", badgeNumber: "P-244", role: "officer", shift: "C", supervisor: "Sgt. Marcus Chen" },
    { id: uid(), name: "Officer Sam Patel", badgeNumber: "P-258", role: "officer", shift: "D", supervisor: "Sgt. Marcus Chen" },
    { id: uid(), name: "Officer Chris Morgan", badgeNumber: "P-263", role: "officer", shift: "A", supervisor: "Sgt. Elena Rivera" },
    { id: uid(), name: "Officer Taylor Brooks", badgeNumber: "P-279", role: "officer", shift: "C", supervisor: "Sgt. Marcus Chen" }
  ],
  shifts: [
    { id: uid(), date: isoToday, officer: "Officer Jordan Lee", agency: "Patrol", shift: "A", start: "06:00", end: "18:00", status: "Worked", notes: "Supervisor: Sgt. Elena Rivera" },
    { id: uid(), date: isoToday, officer: "Officer Maya Alvarez", agency: "Patrol", shift: "B", start: "06:00", end: "18:00", status: "Worked", notes: "Supervisor: Sgt. Elena Rivera" },
    { id: uid(), date: isoToday, officer: "Officer Dana Price", agency: "Patrol", shift: "C", start: "18:00", end: "06:00", status: "Scheduled", notes: "Supervisor: Sgt. Marcus Chen" },
    { id: uid(), date: isoToday, officer: "Officer Sam Patel", agency: "Patrol", shift: "D", start: "18:00", end: "06:00", status: "Scheduled", notes: "Supervisor: Sgt. Marcus Chen" },
    { id: uid(), date: tomorrow, officer: "Officer Chris Morgan", agency: "Patrol", shift: "A", start: "06:00", end: "18:00", status: "Scheduled", notes: "Supervisor: Sgt. Elena Rivera" },
    { id: uid(), date: tomorrow, officer: "Officer Taylor Brooks", agency: "Patrol", shift: "C", start: "18:00", end: "06:00", status: "Scheduled", notes: "Supervisor: Sgt. Marcus Chen" }
  ],
  court: [
    { id: uid(), date: nextCourtDate, officer: "Officer Dana Price", caseNumber: "26-1842", court: "Traffic Court", time: courtTimeForDate(nextCourtDate), duration: "2", status: "Scheduled", subpoena: true, notes: "Citation: T-26-1842; complainant: Alex Reed; attorney: yes" },
    { id: uid(), date: nextCourtDate, officer: "Officer Jordan Lee", caseNumber: "26-1904", court: "Traffic Court", time: courtTimeForDate(nextCourtDate), duration: "2", status: "Scheduled", subpoena: true, notes: "Citation: T-26-1904; complainant: Morgan Gray; attorney: no" },
    { id: uid(), date: addDays(nextCourtDate, 2), officer: "Officer Taylor Brooks", caseNumber: "26-1931", court: "Traffic Court", time: courtTimeForDate(addDays(nextCourtDate, 2)), duration: "1.5", status: "Scheduled", subpoena: true, notes: "Citation: T-26-1931; complainant: Jamie Fox; attorney: yes" }
  ],
  swaps: [
    { id: uid(), requester: "Officer Maya Alvarez", acceptingOfficer: "", giveDate: nextWeek, giveShift: "B shift 0600-1800", takeDate: "", takeShift: "", requesterApproval: "Pending", requesterSupervisorApproval: "Pending", acceptingSupervisorApproval: "Pending", status: "Open", notes: "Requester supervisor: Sgt. Elena Rivera" },
    { id: uid(), requester: "Officer Sam Patel", acceptingOfficer: "Officer Chris Morgan", giveDate: addDays(isoToday, 8), giveShift: "D shift 1800-0600", takeDate: addDays(isoToday, 10), takeShift: "A shift 0600-1800", requesterApproval: "Approved", requesterSupervisorApproval: "Pending", acceptingSupervisorApproval: "Pending", status: "Awaiting Approvals", notes: "Requester supervisor: Sgt. Marcus Chen; accepting supervisor: Sgt. Elena Rivera" },
    { id: uid(), requester: "Officer Jordan Lee", acceptingOfficer: "Officer Dana Price", giveDate: addDays(isoToday, 12), giveShift: "A shift 0600-1800", takeDate: addDays(isoToday, 14), takeShift: "C shift 1800-0600", requesterApproval: "Approved", requesterSupervisorApproval: "Approved", acceptingSupervisorApproval: "Approved", status: "Approved", notes: "Fully approved demo swap" }
  ]
};

let state = loadState();
let authUser = null;
let supabaseClient = createSupabaseClient();

const els = {
  authForm: document.querySelector("#authForm"),
  authState: document.querySelector("#authState"),
  signOut: document.querySelector("#signOut"),
  monthFilter: document.querySelector("#monthFilter"),
  unitFilter: document.querySelector("#unitFilter"),
  searchFilter: document.querySelector("#searchFilter"),
  courtRows: document.querySelector("#courtRows"),
  courtCards: document.querySelector("#courtCards"),
  swapRows: document.querySelector("#swapRows"),
  swapCards: document.querySelector("#swapCards"),
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

els.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  await signIn(form.elements.email.value, form.elements.password.value);
  form.elements.password.value = "";
});

els.signOut.addEventListener("click", signOut);

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
  saveForm("swaps", event.currentTarget, ["requester", "acceptingOfficer", "giveDate", "giveShift", "takeDate", "takeShift", "requesterApproval", "requesterSupervisorApproval", "acceptingSupervisorApproval", "notes"]);
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

initializeApp();
applyCourtTime(document.querySelector("#courtForm"));

async function initializeApp() {
  if (supabaseClient) {
    const { data } = await supabaseClient.auth.getUser();
    authUser = data.user || null;
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      authUser = session?.user || null;
      updateAuthState();
    });
  }
  updateAuthState();
  render();
}

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
  if (collection === "swaps") item.status = deriveSwapStatus(item);
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
  if (collection === "swaps") normalizeSwapRecords();
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
  normalizeSwapRecords();
  const court = filterRecords(state.court.filter((record) => isUnitRecord(record, filters.unit)), filters, ["date", "caseNumber", "court", "status", "notes"]);
  const swaps = filterRecords(state.swaps.filter((record) => isUnitSwap(record, filters.unit)), filters, ["giveDate", "takeDate", "requester", "acceptingOfficer", "giveShift", "takeShift", "status", "notes"]);

  renderRows(els.courtRows, court, (item) => [
    formatDate(item.date),
    item.officer,
    item.caseNumber,
    item.court || "-",
    statusPill(item.status),
    item.duration ? `${Number(item.duration).toFixed(2)}h` : "-",
    rowActions("court", item.id)
  ], 7);
  renderCourtCards(court);

  renderRows(els.swapRows, swaps, (item) => [
    formatDate(item.giveDate),
    item.requester,
    item.acceptingOfficer || "Open",
    item.giveShift || "-",
    item.takeDate ? `${formatDate(item.takeDate)} ${item.takeShift}` : "-",
    approvalSummary(item),
    statusPill(item.status),
    rowActions("swaps", item.id)
  ], 8);
  renderSwapCards(swaps);

  renderSummary(filters);
  renderActiveSwapRequests();
}

function renderCourtCards(court) {
  els.courtCards.innerHTML = "";
  if (!court.length) {
    els.courtCards.appendChild(emptyCard("No matching court records."));
    return;
  }
  court.sort(sortByPrimaryDate).forEach((item) => {
    const card = document.createElement("article");
    card.className = "mobile-card";
    const title = document.createElement("h3");
    title.textContent = `${formatDate(item.date)} - ${item.caseNumber}`;
    const details = document.createElement("p");
    details.textContent = `${item.officer} - ${item.court || "Court"} - ${item.status}`;
    const hours = document.createElement("p");
    hours.textContent = `Court hours: ${item.duration ? `${Number(item.duration).toFixed(2)}h` : "-"}`;
    card.append(title, details, hours, rowActions("court", item.id));
    els.courtCards.appendChild(card);
  });
}

function renderSwapCards(swaps) {
  els.swapCards.innerHTML = "";
  if (!swaps.length) {
    els.swapCards.appendChild(emptyCard("No matching swap records."));
    return;
  }
  swaps.sort(sortByPrimaryDate).forEach((item) => {
    const card = document.createElement("article");
    card.className = "mobile-card";
    const title = document.createElement("h3");
    title.textContent = `${formatDate(item.giveDate)} - ${item.status}`;
    const officers = document.createElement("p");
    officers.textContent = `${item.requester} -> ${item.acceptingOfficer || "Open"}`;
    const details = document.createElement("p");
    details.textContent = `Give: ${item.giveShift || "-"} | Take: ${item.takeDate ? `${formatDate(item.takeDate)} ${item.takeShift || ""}` : "-"}`;
    const approvals = document.createElement("p");
    approvals.textContent = approvalSummary(item);
    card.append(title, officers, details, approvals, rowActions("swaps", item.id));
    els.swapCards.appendChild(card);
  });
}

function emptyCard(message) {
  const card = document.createElement("article");
  card.className = "mobile-card";
  card.textContent = message;
  return card;
}

function renderRows(target, rows, mapRow, colSpan = 7) {
  target.innerHTML = "";
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = colSpan;
    td.className = "empty";
    td.textContent = "No matching records yet.";
    tr.appendChild(td);
    target.appendChild(tr);
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
    : normalized.includes("pending") || normalized.includes("scheduled") || normalized.includes("open") || normalized.includes("awaiting")
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
  normalizeSwapRecords();
  const inMonth = (item) => itemMonth(primaryDate(item)) === filters.month;
  const courtInMonth = state.court.filter((item) => inMonth(item) && isUnitRecord(item, filters.unit));
  const courtHours = courtInMonth.reduce((sum, court) => sum + Number(court.duration || 0), 0);
  const courtCount = courtInMonth.length;
  const swapCount = state.swaps.filter((swap) => itemMonth(swap.giveDate) === filters.month && isActiveSwap(swap) && isUnitSwap(swap, filters.unit)).length;

  els.courtHours.textContent = formatHours(courtHours);
  els.courtCount.textContent = courtCount;
  els.swapCount.textContent = swapCount;
}

function renderActiveSwapRequests() {
  normalizeSwapRecords();
  const items = state.swaps
    .filter((swap) => isOpenSwap(swap))
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
    const request = document.createTextNode(` requests ${formatDate(item.giveDate)} ${item.giveShift || ""}${takeText}`);
    const meta = document.createElement("span");
    meta.textContent = "Open for any officer to accept";
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
  if (Array.isArray(state.roster)) {
    state.roster.forEach((record) => {
      if (record.role === "officer" && record.name) names.add(record.name);
    });
  }
  state.shifts.forEach((record) => record.officer && names.add(record.officer));
  state.court.forEach((record) => record.officer && names.add(record.officer));
  state.swaps.forEach((record) => {
    if (record.requester) names.add(record.requester);
    if (record.acceptingOfficer) names.add(record.acceptingOfficer);
  });
  return [...names].sort((a, b) => a.localeCompare(b));
}

function isUnitRecord(record, unit) {
  return !unit || record.officer === unit;
}

function isUnitSwap(record, unit) {
  return !unit || record.requester === unit || record.acceptingOfficer === unit;
}

function normalizeSwapRecords() {
  state.swaps.forEach((swap) => {
    if (!swap.acceptingOfficer && swap.covering) swap.acceptingOfficer = swap.covering;
    delete swap.covering;
    swap.requesterApproval = swap.requesterApproval || (swap.status === "Approved" ? "Approved" : "Pending");
    swap.requesterSupervisorApproval = swap.requesterSupervisorApproval || (swap.status === "Approved" ? "Approved" : "Pending");
    swap.acceptingSupervisorApproval = swap.acceptingSupervisorApproval || (swap.status === "Approved" ? "Approved" : "Pending");
    swap.status = deriveSwapStatus(swap);
  });
}

function deriveSwapStatus(swap) {
  const approvals = [swap.requesterApproval, swap.requesterSupervisorApproval, swap.acceptingSupervisorApproval];
  if (approvals.includes("Denied")) return "Denied";
  if (!swap.acceptingOfficer) return "Open";
  if (approvals.every((approval) => approval === "Approved")) return "Approved";
  return "Awaiting Approvals";
}

function approvalSummary(swap) {
  return [
    `Officer: ${shortApproval(swap.requesterApproval)}`,
    `Req Sup: ${shortApproval(swap.requesterSupervisorApproval)}`,
    `Acc Sup: ${shortApproval(swap.acceptingSupervisorApproval)}`
  ].join(" / ");
}

function shortApproval(value) {
  return value === "Approved" ? "Yes" : value === "Denied" ? "No" : "Pending";
}

function isOpenSwap(swap) {
  return deriveSwapStatus(swap) === "Open";
}

function isActiveSwap(swap) {
  return ["Open", "Awaiting Approvals"].includes(deriveSwapStatus(swap));
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
    ["roster", state.roster || []],
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

function createSupabaseClient() {
  const config = window.APP_CONFIG || {};
  if (!config.supabaseUrl || !config.supabaseAnonKey || !window.supabase) return null;
  return window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

async function signIn(email, password) {
  if (!supabaseClient) {
    els.authState.textContent = "Add Supabase URL and anon key in app-config.js to enable login.";
    return;
  }
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    els.authState.textContent = `Sign in failed: ${error.message}`;
    return;
  }
  authUser = data.user;
  updateAuthState();
}

async function signOut() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  authUser = null;
  updateAuthState();
}

function updateAuthState() {
  if (!supabaseClient) {
    els.authState.textContent = "Local demo mode - Supabase not configured";
    return;
  }
  els.authState.textContent = authUser ? `Signed in as ${authUser.email}` : "Supabase ready - sign in required for shared data";
}
