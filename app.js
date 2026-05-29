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
let currentProfile = null;
let supabaseClient = createSupabaseClient();
let isLoadingRemote = false;
let activeLoadId = 0;

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

document.querySelector("#courtForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!applyCourtTime(event.currentTarget)) return;
  await saveForm("court", event.currentTarget, ["date", "officer", "caseNumber", "court", "time", "duration", "status", "subpoena", "notes"]);
});

document.querySelector("#swapForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveForm("swaps", event.currentTarget, ["requester", "acceptingOfficer", "giveDate", "giveShift", "takeDate", "takeShift", "requesterApproval", "requesterSupervisorApproval", "acceptingSupervisorApproval", "notes"]);
});

els.monthFilter.addEventListener("input", render);
els.unitFilter.addEventListener("change", () => {
  if (!isRemoteMode()) localStorage.setItem(`${STORAGE_KEY}-unit`, els.unitFilter.value);
  render();
});
els.searchFilter.addEventListener("input", render);
document.querySelector("#exportCsv").addEventListener("click", exportCsv);
document.querySelector("#printView").addEventListener("click", () => window.print());
document.querySelector("#resetDemo").addEventListener("click", async () => {
  if (isRemoteMode()) {
    await loadSupabaseState();
    return;
  }
  if (!confirm("Reset the tracker to demo data?")) return;
  state = structuredClone(seedData);
  persist();
  populateUnitFilter();
  render();
});

initializeApp();
applyCourtTime(document.querySelector("#courtForm"));

async function initializeApp() {
  if (supabaseClient) {
    const { data } = await supabaseClient.auth.getUser();
    authUser = data.user || null;
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      authUser = session?.user || null;
      if (authUser) {
        await loadSupabaseState("Session refreshed.");
      } else {
        currentProfile = null;
        state = loadState();
        populateUnitFilter();
        updateAuthState();
        render();
      }
    });
  }

  if (authUser) {
    await loadSupabaseState("Signed in.");
  } else {
    updateAuthState();
    render();
  }
}

function activateTab(name) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === name));
  document.querySelectorAll(".panel").forEach((panel) => panel.classList.toggle("is-active", panel.id === `tab-${name}`));
}

async function saveForm(collection, form, fields) {
  const formData = new FormData(form);
  const item = {};

  fields.forEach((field) => {
    const element = form.elements[field];
    item[field] = element?.type === "checkbox" ? element.checked : String(formData.get(field) || "").trim();
  });

  item.id = form.elements.id.value || uid();
  if (collection === "swaps") item.status = deriveSwapStatus(item);

  if (isRemoteMode()) {
    setStatus("Saving shared data...");
    const saved = collection === "court" ? await saveSupabaseCourt(item) : await saveSupabaseSwap(item);
    if (!saved) return;
    await loadSupabaseState(collection === "court" ? "Court record saved." : "Shift swap saved.");
  } else {
    const index = state[collection].findIndex((record) => record.id === item.id);
    if (index >= 0) {
      state[collection][index] = item;
    } else {
      state[collection].push(item);
    }
    populateUnitFilter();
    persist();
    render();
  }

  form.reset();
  form.elements.id.value = "";
  if (collection === "court") applyCourtTime(form);
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

async function deleteRecord(collection, id) {
  if (isRemoteMode()) {
    const table = collection === "court" ? "traffic_court_events" : "shift_swap_requests";
    try {
      const { error } = await withSupabaseTimeout(supabaseClient.from(table).delete().eq("id", id), `${table} delete`);
      if (error) throw error;
    } catch (error) {
      setStatus(`Delete failed: ${error.message}`);
      return;
    }
    await loadSupabaseState("Record deleted.");
    return;
  }

  state[collection] = state[collection].filter((item) => item.id !== id);
  populateUnitFilter();
  persist();
  render();
}

async function acceptSwap(id) {
  if (!currentProfile) {
    setStatus("Sign in as an officer to accept an open swap request.");
    return;
  }
  const swap = state.swaps.find((item) => item.id === id);
  if (!swap) return;
  if (!canAcceptSwap(swap)) {
    setStatus("This swap is not available for this officer to accept.");
    return;
  }

  const updated = {
    ...swap,
    acceptingOfficer: currentProfile.display_name,
    acceptingOfficerId: currentProfile.id,
    requesterApproval: swap.requesterApproval || "Pending",
    requesterSupervisorApproval: swap.requesterSupervisorApproval || "Pending",
    acceptingSupervisorApproval: "Pending"
  };
  updated.status = deriveSwapStatus(updated);

  if (isRemoteMode()) {
    setStatus("Accepting shift swap...");
    const saved = await saveSupabaseSwap(updated);
    if (!saved) return;
    await loadSupabaseState("Shift swap accepted. Supervisor approvals are now pending.");
    return;
  }

  state.swaps = state.swaps.map((item) => (item.id === id ? updated : item));
  populateUnitFilter();
  persist();
  render();
}

function render() {
  const filters = getFilters();
  normalizeShiftRecords();
  normalizeSwapRecords();
  const court = filterRecords(state.court.filter((record) => isUnitRecord(record, filters.unit)), filters, ["date", "caseNumber", "court", "status", "notes"]);
  const swaps = filterRecords(state.swaps.filter((record) => isVisibleSwap(record, filters.unit)), filters, ["giveDate", "takeDate", "requester", "acceptingOfficer", "giveShift", "takeShift", "status", "notes"]);

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
    rowActions("swaps", item.id, item)
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
    card.append(title, officers, details, approvals, rowActions("swaps", item.id, item));
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

function rowActions(collection, id, item = null) {
  const wrapper = document.createElement("div");
  wrapper.className = "row-actions";
  if (collection === "swaps" && canAcceptSwap(item)) {
    const accept = document.createElement("button");
    accept.type = "button";
    accept.className = "primary compact";
    accept.textContent = "Accept";
    accept.addEventListener("click", () => acceptSwap(id));
    wrapper.appendChild(accept);
  }
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
  const swapCount = state.swaps.filter((swap) => itemMonth(swap.giveDate) === filters.month && isActiveSwap(swap) && isVisibleSwap(swap, filters.unit)).length;

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
    if (canAcceptSwap(item)) {
      const accept = document.createElement("button");
      accept.type = "button";
      accept.className = "ghost compact";
      accept.textContent = "Accept";
      accept.addEventListener("click", () => acceptSwap(item.id));
      li.appendChild(accept);
    }
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
  const current = currentProfile?.role === "officer"
    ? currentProfile.display_name
    : els.unitFilter.value || localStorage.getItem(`${STORAGE_KEY}-unit`) || "";
  const units = getUnitNames();
  els.unitFilter.innerHTML = "";
  if (isRemoteMode() && currentProfile.role !== "officer") {
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "All visible units";
    els.unitFilter.appendChild(allOption);
  }
  units.forEach((unit) => {
    const option = document.createElement("option");
    option.value = unit;
    option.textContent = unit;
    els.unitFilter.appendChild(option);
  });
  els.unitFilter.value = units.includes(current) ? current : units[0] || "";
  if (isRemoteMode() && currentProfile.role !== "officer" && !current) els.unitFilter.value = "";
  els.unitFilter.disabled = isRemoteMode() && currentProfile.role === "officer";
  applyCurrentProfileDefaults();
}

function getUnitNames() {
  const names = new Set();
  if (!isRemoteMode() && Array.isArray(state.roster)) {
    state.roster.forEach((record) => {
      if (record.role === "officer" && record.name) names.add(record.name);
    });
  }
  if (isRemoteMode() && currentProfile?.role === "officer") {
    names.add(currentProfile.display_name);
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

function isVisibleSwap(record, unit) {
  if (isUnitSwap(record, unit)) return true;
  return isRemoteMode() && currentProfile?.role === "officer" && isOpenSwap(record) && record.requester !== currentProfile.display_name;
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

function canAcceptSwap(swap) {
  return Boolean(
    swap
    && currentProfile
    && currentProfile.role === "officer"
    && isOpenSwap(swap)
    && swap.requester !== currentProfile.display_name
  );
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
    setStatus("Add Supabase URL and anon key in app-config.js to enable login.");
    return;
  }
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    setStatus(`Sign in failed: ${error.message}`);
    return;
  }
  authUser = data.user;
  await loadSupabaseState("Signed in.");
}

async function signOut() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  authUser = null;
  currentProfile = null;
  state = loadState();
  populateUnitFilter();
  updateAuthState();
  render();
}

function updateAuthState() {
  if (isLoadingRemote) {
    setStatus("Loading shared Supabase data...");
    return;
  }
  if (!supabaseClient) {
    setStatus("Local demo mode - Supabase not configured");
    return;
  }
  if (!authUser) {
    setStatus("Supabase ready - sign in required for shared data");
    return;
  }
  const name = currentProfile?.display_name || authUser.email;
  setStatus(`Signed in as ${name}`);
}

function setStatus(message) {
  els.authState.textContent = message;
}

function isRemoteMode() {
  return Boolean(supabaseClient && authUser && currentProfile);
}

async function loadSupabaseState(successMessage = "Shared Supabase data loaded.") {
  if (!supabaseClient || !authUser) return;
  const loadId = activeLoadId + 1;
  activeLoadId = loadId;
  isLoadingRemote = true;
  updateAuthState();

  try {
    const profiles = await fetchSupabaseProfiles();
    currentProfile = profiles.find((profile) => profile.id === authUser.id) || null;
    if (!currentProfile) {
      throw new Error("No public.profiles row found for this signed-in user.");
    }

    const [shifts, court, swaps] = await Promise.all([
      fetchSupabaseShiftAssignments(profiles),
      fetchSupabaseCourtEvents(profiles),
      fetchSupabaseSwapRequests(profiles)
    ]);

    state = {
      roster: profiles.map((profile) => ({
        id: profile.id,
        name: profile.display_name,
        badgeNumber: profile.badge_number || "",
        role: profile.role,
        supervisor: profileName(profiles, profile.supervisor_id)
      })),
      shifts,
      court,
      swaps
    };
    populateUnitFilter();
    render();
    if (loadId === activeLoadId) setStatus(successMessage);
  } catch (error) {
    if (loadId === activeLoadId) setStatus(`Supabase load failed: ${error.message}`);
  } finally {
    if (loadId === activeLoadId) {
      isLoadingRemote = false;
      if (els.authState.textContent === "Loading shared Supabase data...") updateAuthState();
    }
  }
}

async function fetchSupabaseProfiles() {
  const { data, error } = await withSupabaseTimeout(
    supabaseClient
      .from("profiles")
      .select("id, display_name, badge_number, role, supervisor_id")
      .order("display_name"),
    "profiles"
  );
  if (error) throw error;
  return data || [];
}

async function fetchSupabaseShiftAssignments(profiles) {
  const { data, error } = await withSupabaseTimeout(
    supabaseClient
      .from("shift_assignments")
      .select("id, officer_id, shift, starts_at, ends_at, active")
      .eq("active", true),
    "shift assignments"
  );
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    date: isoToday,
    officerId: row.officer_id,
    officer: profileName(profiles, row.officer_id),
    agency: "Patrol",
    shift: row.shift,
    start: trimTime(row.starts_at),
    end: trimTime(row.ends_at),
    status: "Scheduled",
    notes: ""
  }));
}

async function fetchSupabaseCourtEvents(profiles) {
  const { data, error } = await withSupabaseTimeout(
    supabaseClient
      .from("traffic_court_events")
      .select("id, officer_id, court_date, court_time, court_hours, citation_number, complainant, has_attorney, court_location, status, notes")
      .order("court_date"),
    "traffic court events"
  );
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    officerId: row.officer_id,
    officer: profileName(profiles, row.officer_id),
    date: row.court_date,
    time: trimTime(row.court_time),
    duration: String(row.court_hours || 0),
    caseNumber: row.citation_number,
    court: row.court_location || "Traffic Court",
    status: row.status,
    subpoena: true,
    notes: courtNotes(row)
  }));
}

async function fetchSupabaseSwapRequests(profiles) {
  const { data, error } = await withSupabaseTimeout(
    supabaseClient
      .from("shift_swap_requests")
      .select("id, requesting_officer_id, accepting_officer_id, give_date, give_shift, take_date, take_shift, requesting_officer_approval, requester_supervisor_approval, accepting_supervisor_approval, status, notes")
      .order("give_date"),
    "shift swap requests"
  );
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    requesterId: row.requesting_officer_id,
    acceptingOfficerId: row.accepting_officer_id,
    requester: profileName(profiles, row.requesting_officer_id),
    acceptingOfficer: profileName(profiles, row.accepting_officer_id),
    giveDate: row.give_date,
    giveShift: row.give_shift || "",
    takeDate: row.take_date || "",
    takeShift: row.take_shift || "",
    requesterApproval: row.requesting_officer_approval,
    requesterSupervisorApproval: row.requester_supervisor_approval,
    acceptingSupervisorApproval: row.accepting_supervisor_approval,
    status: row.status,
    notes: row.notes || ""
  }));
}

async function saveSupabaseCourt(item) {
  const officerId = profileIdByName(item.officer);
  if (!officerId) {
    setStatus("Court save failed: choose an officer from the roster.");
    return false;
  }
  const payload = {
    officer_id: officerId,
    court_date: item.date,
    court_time: item.time,
    court_hours: Number(item.duration || 0),
    citation_number: item.caseNumber,
    court_location: item.court || "Traffic Court",
    status: item.status,
    notes: item.notes || "",
    created_by: authUser.id
  };

  const query = supabaseClient.from("traffic_court_events");
  try {
    const { error } = item.id && isUuid(item.id)
      ? await withSupabaseTimeout(query.update(payload).eq("id", item.id), "court update")
      : await withSupabaseTimeout(query.insert(payload), "court insert");
    if (error) throw error;
  } catch (error) {
    setStatus(`Court save failed: ${error.message}`);
    return false;
  }
  return true;
}

async function saveSupabaseSwap(item) {
  const requesterId = profileIdByName(item.requester) || currentProfile?.id;
  const acceptingOfficerId = profileIdByName(item.acceptingOfficer);
  const payload = {
    requesting_officer_id: requesterId,
    accepting_officer_id: acceptingOfficerId || null,
    give_date: item.giveDate,
    give_shift: item.giveShift || "",
    take_date: item.takeDate || null,
    take_shift: item.takeShift || "",
    requesting_officer_approval: item.requesterApproval,
    requester_supervisor_approval: item.requesterSupervisorApproval,
    accepting_supervisor_approval: item.acceptingSupervisorApproval,
    status: deriveSwapStatus(item),
    notes: item.notes || ""
  };

  const query = supabaseClient.from("shift_swap_requests");
  try {
    const { error } = item.id && isUuid(item.id)
      ? await withSupabaseTimeout(query.update(payload).eq("id", item.id), "swap update")
      : await withSupabaseTimeout(query.insert(payload), "swap insert");
    if (error) throw error;
  } catch (error) {
    setStatus(`Swap save failed: ${error.message}`);
    return false;
  }
  return true;
}

function profileName(profiles, id) {
  if (!id) return "";
  return profiles.find((profile) => profile.id === id)?.display_name || "";
}

function profileIdByName(name) {
  if (!name) return "";
  return state.roster.find((profile) => profile.name === name)?.id || "";
}

function courtNotes(row) {
  const parts = [];
  if (row.notes) parts.push(row.notes);
  if (row.complainant) parts.push(`Complainant: ${row.complainant}`);
  parts.push(`Attorney: ${row.has_attorney ? "yes" : "no"}`);
  return parts.join("; ");
}

function trimTime(value) {
  return String(value || "").slice(0, 5);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function withSupabaseTimeout(query, label, timeoutMs = 12000) {
  return Promise.race([
    query,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} request timed out`)), timeoutMs);
    })
  ]);
}

function applyCurrentProfileDefaults() {
  if (!currentProfile) return;
  const courtForm = document.querySelector("#courtForm");
  const swapForm = document.querySelector("#swapForm");
  if (courtForm && !courtForm.elements.officer.value) courtForm.elements.officer.value = currentProfile.display_name;
  if (swapForm && !swapForm.elements.requester.value) swapForm.elements.requester.value = currentProfile.display_name;
  const isOfficer = currentProfile.role === "officer";
  if (courtForm) courtForm.elements.officer.readOnly = isOfficer;
  if (swapForm) swapForm.elements.requester.readOnly = isOfficer;
}
