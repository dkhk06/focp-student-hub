const STORAGE_KEY = "campuspulse_focp_v6";

const defaultState = {
    customDisplayName: "",
    activeTab: "overview",
    monthlyCap: 5000,
    expenses: [
        { id: 1, title: "Canteen Tea & Poha", category: "Food", amount: 45 },
        { id: 2, title: "Shared Auto to Station", category: "Transit", amount: 60 },
        { id: 3, title: "Notebook & Gel Pens", category: "Essentials", amount: 120 },
        { id: 4, title: "Evening Cold Coffee", category: "Food", amount: 80 },
        { id: 5, title: "Turf Football Split", category: "Hobbies", amount: 150 }
    ],
    attendance: [
        { id: 1, subject: "FOCP", attended: 19, total: 24 },
        { id: 2, subject: "FOEE", attended: 16, total: 20 },
        { id: 3, subject: "PC", attended: 15, total: 18 },
        { id: 4, subject: "EM", attended: 17, total: 21 },
        { id: 5, subject: "Yoga", attended: 13, total: 16 },
        { id: 6, subject: "Physics", attended: 14, total: 18 }
    ],
    timetable: [
        // MON
        { id: 101, day: "Mon", time: "9-10AM", course: "FOCP" },
        { id: 102, day: "Mon", time: "10-11AM", course: "Physics" },
        { id: 103, day: "Mon", time: "11-12PM", course: "Physics" },
        { id: 104, day: "Mon", time: "3-4PM", course: "FOEE" },
        // TUE
        { id: 201, day: "Tue", time: "9-10AM", course: "EM" },
        { id: 202, day: "Tue", time: "10-11AM", course: "EM" },
        { id: 203, day: "Tue", time: "11-12PM", course: "Yoga" },
        { id: 204, day: "Tue", time: "12-1PM", course: "PC" },
        { id: 205, day: "Tue", time: "1-2PM", course: "Yoga" },
        { id: 206, day: "Tue", time: "3-4PM", course: "FOEE" },
        // WED
        { id: 301, day: "Wed", time: "9-10AM", course: "FOCP" },
        { id: 302, day: "Wed", time: "10-11AM", course: "PC" },
        { id: 303, day: "Wed", time: "11-12PM", course: "FOCP Lab / Phy Lab / FOEE Lab" },
        { id: 304, day: "Wed", time: "3-4PM", course: "EM" },
        // THU
        { id: 401, day: "Thu", time: "9-10AM", course: "Physics" },
        { id: 402, day: "Thu", time: "10-11AM", course: "PC" },
        { id: 403, day: "Thu", time: "3-4PM", course: "FOEE" },
        // FRI
        { id: 501, day: "Fri", time: "9-10AM", course: "FOCP" },
        { id: 502, day: "Fri", time: "10-11AM", course: "EM" },
        { id: 503, day: "Fri", time: "11-12PM", course: "Phy Lab / FOEE Lab" },
        { id: 504, day: "Fri", time: "3-4PM", course: "PC" }
    ],
    habits: [
        { id: 1, name: "5K Running", days: [true, true, false, true, true, true, true] },
        { id: 2, name: "Gym", days: [true, false, true, true, false, true, true] }
    ],
    activity: {
        name: "Avengers Doomsday Movie",
        people: 4,
        stops: [
            { id: 1, slot: "19th Dec 2026", item: "Avengers Doomsday Movie", cost: 1200 }
        ]
    }
};

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return structuredClone(defaultState);
        const parsed = JSON.parse(raw);
        return {
            ...structuredClone(defaultState),
            ...parsed,
            activity: {
                ...structuredClone(defaultState.activity),
                ...(parsed.activity || {})
            }
        };
    } catch {
        return structuredClone(defaultState);
    }
}

let state = loadState();
let selectedDayFilter = "All";
let expenseChartInstance = null;
let attendanceChartInstance = null;
let habitChartInstance = null;
let curtainTimeoutId = null;

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function applyActiveTab() {
    const tab = state.activeTab || "overview";

    document.querySelectorAll("#section-tabs .tab-btn").forEach((btn) => {
        const isActive = btn.dataset.tab === tab;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-selected", String(isActive));
    });

    const chartsSection = document.getElementById("panel-charts");
    if (chartsSection) {
        chartsSection.classList.toggle("is-hidden", tab !== "overview");
    }

    document.querySelectorAll(".main-grid").forEach((grid) => {
        const visibleCardsInGrid = Array.from(grid.querySelectorAll(".tab-panel")).filter((panel) => {
            const allowed = (panel.dataset.panels || "").split(",");
            return allowed.includes(tab);
        });
        grid.classList.toggle("is-hidden", visibleCardsInGrid.length === 0);
        grid.classList.toggle("single-focus", tab !== "overview" && visibleCardsInGrid.length === 1);
    });

    document.querySelectorAll(".tab-panel").forEach((panel) => {
        const allowed = (panel.dataset.panels || "").split(",");
        panel.classList.toggle("is-hidden", !allowed.includes(tab));
    });
}

function playSplitCurtain() {
    const curtain = document.getElementById("curtain-intro");
    if (!curtain) return;

    if (curtainTimeoutId) clearTimeout(curtainTimeoutId);
    curtain.classList.remove("done", "open");

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            curtain.classList.add("open");
            curtainTimeoutId = setTimeout(() => {
                curtain.classList.add("done");
            }, 950);
        });
    });
}

function calc75Attendance(attended, total) {
    const safeTotal = Math.max(1, Number(total) || 1);
    const safeAttended = Math.max(0, Math.min(safeTotal, Number(attended) || 0));
    const pct = (safeAttended / safeTotal) * 100;

    const canMiss = pct >= 75 ? Math.max(0, Math.floor(safeAttended / 0.75 - safeTotal)) : 0;
    const needToAttend = pct < 75 ? Math.max(0, Math.ceil(3 * safeTotal - 4 * safeAttended)) : 0;

    return {
        attended: safeAttended,
        total: safeTotal,
        pct,
        canMiss,
        needToAttend,
        isSafe: pct >= 75
    };
}

function getHabitStats(days) {
    let currentStreak = 0;
    let recoveryCount = 0;

    for (let i = 0; i < days.length; i++) {
        if (days[i]) {
            currentStreak++;
            if (i > 0 && !days[i - 1]) {
                recoveryCount++;
            }
        } else {
            currentStreak = 0;
        }
    }
    return { currentStreak, recoveryCount };
}

function renderCharts(catTotals, subjectMetrics, dailyHabitRates) {
    if (typeof Chart === "undefined" || state.activeTab !== "overview") return;

    const commonTextColor = "#94a3b8";
    const gridColor = "rgba(148, 163, 184, 0.12)";

    const expCtx = document.getElementById("expenseChart");
    if (expenseChartInstance) expenseChartInstance.destroy();
    expenseChartInstance = new Chart(expCtx, {
        type: "doughnut",
        data: {
            labels: ["Food", "Transit", "Essentials", "Hobbies"],
            datasets: [
                {
                    data: catTotals,
                    backgroundColor: ["#38bdf8", "#a78bfa", "#22c55e", "#f59e0b"],
                    borderColor: "#111827",
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "62%",
            plugins: {
                legend: {
                    position: "right",
                    labels: { color: commonTextColor, boxWidth: 12, font: { size: 11 } }
                }
            }
        }
    });

    const attCtx = document.getElementById("attendanceChart");
    if (attendanceChartInstance) attendanceChartInstance.destroy();
    attendanceChartInstance = new Chart(attCtx, {
        type: "bar",
        data: {
            labels: subjectMetrics.map((s) => s.label),
            datasets: [
                {
                    label: "Attendance %",
                    data: subjectMetrics.map((s) => Number(s.pct.toFixed(1))),
                    backgroundColor: subjectMetrics.map((s) => (s.pct >= 75 ? "#22c55e" : "#f87171")),
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    ticks: { color: commonTextColor, callback: (v) => v + "%" },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: commonTextColor, font: { size: 11 } },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    const habCtx = document.getElementById("habitChart");
    if (habitChartInstance) habitChartInstance.destroy();
    habitChartInstance = new Chart(habCtx, {
        type: "line",
        data: {
            labels: ["D1", "D2", "D3", "D4", "D5", "D6", "Today"],
            datasets: [
                {
                    label: "Completion %",
                    data: dailyHabitRates,
                    borderColor: "#38bdf8",
                    backgroundColor: "rgba(56, 189, 248, 0.16)",
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: "#38bdf8"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    ticks: { color: commonTextColor, callback: (v) => v + "%" },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: commonTextColor, font: { size: 11 } },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function render() {
    applyActiveTab();

    // Custom Display Name (independent of submission Name & Scholar No)
    const nameInput = document.getElementById("custom-display-name");
    const namePill = document.getElementById("custom-name-tag");
    const trimmedName = (state.customDisplayName || "").trim();
    if (nameInput.value !== (state.customDisplayName || "")) {
        nameInput.value = state.customDisplayName || "";
    }
    if (trimmedName) {
        namePill.textContent = `User: ${trimmedName}`;
        namePill.hidden = false;
    } else {
        namePill.textContent = "";
        namePill.hidden = true;
    }

    // 1. Budget & Surplus
    const cap = Number(state.monthlyCap) || 5000;
    const totalSpent = state.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const remaining = Math.max(0, cap - totalSpent);
    const expectedSpendByNow = Math.round((cap / 30) * 10);
    const surplusSaved = Math.max(0, expectedSpendByNow - totalSpent);

    document.getElementById("monthly-cap").value = cap;
    document.getElementById("kpi-remaining").textContent = `₹${remaining.toLocaleString()}`;
    document.getElementById("kpi-cap-sub").textContent = `Spent ₹${totalSpent.toLocaleString()} of ₹${cap.toLocaleString()}`;

    const categories = ["Food", "Transit", "Essentials", "Hobbies"];
    const catWrap = document.getElementById("category-bars");
    catWrap.innerHTML = "";
    const catTotals = [];

    categories.forEach((cat) => {
        const catTotal = state.expenses
            .filter((e) => e.category === cat)
            .reduce((s, e) => s + Number(e.amount), 0);
        catTotals.push(catTotal);
        const pct = totalSpent > 0 ? Math.round((catTotal / totalSpent) * 100) : 0;

        catWrap.innerHTML += `
      <div>
        <div class="cat-row-top">
          <span>${cat}</span>
          <span>₹${catTotal} (${pct}%)</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
    `;
    });

    const expList = document.getElementById("expense-list");
    expList.innerHTML = "";
    state.expenses.slice().reverse().forEach((exp) => {
        const li = document.createElement("li");
        li.innerHTML = `
      <div><span class="tag">${exp.category}</span>${exp.title}</div>
      <div>
        <strong>₹${exp.amount}</strong>
        <button class="btn-del" data-exp="${exp.id}" title="Delete">✕</button>
      </div>
    `;
        expList.appendChild(li);
    });

    // 2. 75% Attendance Tracker
    const attWrap = document.getElementById("attendance-list");
    attWrap.innerHTML = "";
    let sumAttended = 0;
    let sumTotal = 0;
    let totalSafeToMiss = 0;
    const subjectMetrics = [];

    state.attendance.forEach((sub) => {
        const info = calc75Attendance(sub.attended, sub.total);
        sumAttended += info.attended;
        sumTotal += info.total;
        totalSafeToMiss += info.canMiss;
        subjectMetrics.push({ label: sub.subject, pct: info.pct });

        const badgeClass = info.isSafe ? "safe" : "risk";
        const statusLabel = info.isSafe
            ? `Can miss ${info.canMiss} more`
            : `Attend ${info.needToAttend} in a row for 75%`;

        const card = document.createElement("div");
        card.className = "att-card";
        card.innerHTML = `
      <div class="att-top">
        <div>
          <div class="att-title">${sub.subject}</div>
          <div class="att-meta">${info.attended}/${info.total} classes · <strong>${info.pct.toFixed(1)}%</strong></div>
        </div>
        <span class="status-pill ${badgeClass}">${statusLabel}</span>
      </div>
      <div class="att-top">
        <div class="att-actions">
          <button class="btn-mini plus" data-att-present="${sub.id}">+1 Present</button>
          <button class="btn-mini skip" data-att-absent="${sub.id}">+1 Absent</button>
        </div>
        <button class="btn-del" data-del-att="${sub.id}" title="Remove subject">✕</button>
      </div>
    `;
        attWrap.appendChild(card);
    });

    const overallInfo = calc75Attendance(sumAttended, sumTotal);
    document.getElementById("kpi-attendance").textContent = `${overallInfo.pct.toFixed(1)}%`;
    document.getElementById("kpi-bunk-sub").textContent = overallInfo.isSafe
        ? `Safe to miss: ${totalSafeToMiss} class${totalSafeToMiss === 1 ? "" : "es"}`
        : `Need ${overallInfo.needToAttend} class${overallInfo.needToAttend === 1 ? "" : "es"} for 75%`;
    document.getElementById("att-overall-hint").textContent =
        `Overall: ${sumAttended}/${sumTotal} (${overallInfo.pct.toFixed(1)}%)`;

    // 3. Box-Style Class Timetable + Day Filter & Mobile Pills
    document.getElementById("day-filter").value = selectedDayFilter;
    document.querySelectorAll(".day-pill").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.dayPill === selectedDayFilter);
    });

    const allWeekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const daysToShow = selectedDayFilter === "All" ? allWeekDays : [selectedDayFilter];

    const board = document.getElementById("timetable-board");
    board.innerHTML = "";

    daysToShow.forEach((dayName) => {
        const daySlots = state.timetable.filter((s) => s.day === dayName);
        const col = document.createElement("div");
        col.className = "day-column";

        const boxesHTML =
            daySlots.length === 0
                ? `<div class="empty-day-box">No classes</div>`
                : daySlots
                    .map(
                        (slot) => `
            <div class="class-box">
              <div class="class-box-top">
                <span class="class-time">${slot.time}</span>
                <button class="btn-del" data-del-tt="${slot.id}" title="Remove class">✕</button>
              </div>
              <div class="class-course">${slot.course}</div>
            </div>
          `
                    )
                    .join("");

        col.innerHTML = `
      <div class="day-col-header">
        <span class="day-col-title">${dayName}</span>
        <span class="day-count">${daySlots.length}</span>
      </div>
      ${boxesHTML}
    `;
        board.appendChild(col);
    });

    // 4. Habits Grid & Daily Completion Rates
    const dayLabels = ["D1", "D2", "D3", "D4", "D5", "D6", "Today"];
    let bestStreak = 0;
    let totalRecoveries = 0;

    let habitHTML = `
    <table class="data-table habit-grid">
      <thead>
        <tr>
          <th>Habit</th>
          ${dayLabels.map((d) => `<th>${d}</th>`).join("")}
          <th>Streak</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
  `;

    state.habits.forEach((habit) => {
        const { currentStreak, recoveryCount } = getHabitStats(habit.days);
        if (currentStreak > bestStreak) bestStreak = currentStreak;
        totalRecoveries += recoveryCount;

        const cells = habit.days
            .map((done, idx) => {
                const isRecovery = done && idx > 0 && !habit.days[idx - 1];
                const cls = isRecovery ? "recovery" : done ? "done" : "";
                const symbol = isRecovery ? "↻" : done ? "✓" : "";
                return `<td><button class="cell-btn ${cls}" data-habit="${habit.id}" data-day="${idx}">${symbol}</button></td>`;
            })
            .join("");

        habitHTML += `
      <tr>
        <td>${habit.name}</td>
        ${cells}
        <td><strong>${currentStreak}d</strong></td>
        <td><button class="btn-del" data-del-habit="${habit.id}">✕</button></td>
      </tr>
    `;
    });

    habitHTML += `</tbody></table>`;
    document.getElementById("habit-table-wrap").innerHTML = habitHTML;
    document.getElementById("kpi-streak").textContent = `${bestStreak} days`;
    document.getElementById("kpi-recovery-sub").textContent = `Bounce-back days: ${totalRecoveries}`;

    const dailyHabitRates = [0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
        if (state.habits.length === 0) return 0;
        const completed = state.habits.filter((h) => h.days[dayIdx]).length;
        return Math.round((completed / state.habits.length) * 100);
    });

    // 5. Activity Planner
    document.getElementById("activity-name").value = state.activity.name;
    document.getElementById("activity-people").value = state.activity.people;

    const people = Math.max(1, Number(state.activity.people) || 1);
    const totalActivityCost = state.activity.stops.reduce((s, st) => s + Number(st.cost), 0);
    const perPerson = Math.ceil(totalActivityCost / people);
    const readinessPct =
        perPerson > 0 ? Math.min(100, Math.round((surplusSaved / perPerson) * 100)) : 100;
    const diff = surplusSaved - perPerson;

    document.getElementById("kpi-activity-status").textContent = `${readinessPct}%`;
    document.getElementById("kpi-activity-sub").textContent = `Share: ₹${perPerson} vs Surplus: ₹${surplusSaved}`;

    const statusText =
        diff >= 0
            ? `<span class="status-ok">Ready (₹${diff} buffer)</span>`
            : `<span class="status-warn">₹${Math.abs(diff)} short vs surplus</span>`;

    document.getElementById("activity-summary-bar").innerHTML = `
    <span><strong>Total:</strong> ₹${totalActivityCost.toLocaleString()}</span>
    <span><strong>Per Person (${people}):</strong> ₹${perPerson.toLocaleString()}</span>
    <span>${statusText}</span>
  `;

    const stopList = document.getElementById("stop-list");
    stopList.innerHTML = "";
    state.activity.stops.forEach((st) => {
        const li = document.createElement("li");
        li.innerHTML = `
      <div><span class="tag">${st.slot}</span>${st.item}</div>
      <div>
        <strong>₹${st.cost}</strong> <span class="hint">(₹${Math.ceil(st.cost / people)}/ea)</span>
        <button class="btn-del" data-stop="${st.id}">✕</button>
      </div>
    `;
        stopList.appendChild(li);
    });

    renderCharts(catTotals, subjectMetrics, dailyHabitRates);
    saveState();
}

// Event Listeners
document.getElementById("section-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn || !btn.dataset.tab) return;
    state.activeTab = btn.dataset.tab;
    render();
});

document.getElementById("custom-display-name").addEventListener("input", (e) => {
    state.customDisplayName = e.target.value;
    render();
});

document.getElementById("monthly-cap").addEventListener("change", (e) => {
    state.monthlyCap = Number(e.target.value) || 5000;
    render();
});

document.getElementById("expense-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("exp-title").value.trim();
    const category = document.getElementById("exp-category").value;
    const amount = Number(document.getElementById("exp-amount").value);
    if (!title || amount <= 0) return;

    state.expenses.push({ id: Date.now(), title, category, amount });
    e.target.reset();
    render();
});

document.getElementById("expense-list").addEventListener("click", (e) => {
    const id = e.target.dataset.exp;
    if (id) {
        state.expenses = state.expenses.filter((item) => item.id !== Number(id));
        render();
    }
});

document.getElementById("attendance-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const subject = document.getElementById("att-subject").value.trim();
    const attended = Number(document.getElementById("att-attended").value);
    const total = Number(document.getElementById("att-total").value);
    if (!subject || total < 1) return;

    state.attendance.push({
        id: Date.now(),
        subject,
        attended: Math.max(0, Math.min(total, attended)),
        total
    });
    e.target.reset();
    render();
});

document.getElementById("attendance-list").addEventListener("click", (e) => {
    const presentId = e.target.dataset.attPresent;
    const absentId = e.target.dataset.attAbsent;
    const delId = e.target.dataset.delAtt;

    if (presentId) {
        const sub = state.attendance.find((s) => s.id === Number(presentId));
        if (sub) {
            sub.attended += 1;
            sub.total += 1;
            render();
        }
    } else if (absentId) {
        const sub = state.attendance.find((s) => s.id === Number(absentId));
        if (sub) {
            sub.total += 1;
            render();
        }
    } else if (delId) {
        state.attendance = state.attendance.filter((s) => s.id !== Number(delId));
        render();
    }
});

document.getElementById("day-filter").addEventListener("change", (e) => {
    selectedDayFilter = e.target.value;
    render();
});

document.getElementById("mobile-day-pills").addEventListener("click", (e) => {
    const pillDay = e.target.dataset.dayPill;
    if (pillDay) {
        selectedDayFilter = pillDay;
        render();
    }
});

document.getElementById("timetable-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const day = document.getElementById("tt-day").value;
    const time = document.getElementById("tt-time").value.trim();
    const course = document.getElementById("tt-course").value.trim();
    if (!time || !course) return;

    state.timetable.push({ id: Date.now(), day, time, course });
    e.target.reset();
    render();
});

document.getElementById("timetable-board").addEventListener("click", (e) => {
    const delId = e.target.dataset.delTt;
    if (delId) {
        state.timetable = state.timetable.filter((slot) => slot.id !== Number(delId));
        render();
    }
});

document.getElementById("habit-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("habit-name").value.trim();
    if (!name) return;

    state.habits.push({
        id: Date.now(),
        name,
        days: [false, false, false, false, false, false, true]
    });
    e.target.reset();
    render();
});

document.getElementById("habit-table-wrap").addEventListener("click", (e) => {
    const habitId = e.target.dataset.habit;
    const dayIdx = e.target.dataset.day;
    const delId = e.target.dataset.delHabit;

    if (habitId !== undefined && dayIdx !== undefined) {
        const habit = state.habits.find((h) => h.id === Number(habitId));
        if (habit) habit.days[Number(dayIdx)] = !habit.days[Number(dayIdx)];
        render();
    } else if (delId) {
        state.habits = state.habits.filter((h) => h.id !== Number(delId));
        render();
    }
});

document.getElementById("activity-name").addEventListener("input", (e) => {
    state.activity.name = e.target.value;
    saveState();
});

document.getElementById("activity-people").addEventListener("change", (e) => {
    state.activity.people = Math.max(1, Number(e.target.value) || 1);
    render();
});

document.getElementById("stop-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const slot = document.getElementById("stop-slot").value.trim();
    const item = document.getElementById("stop-item").value.trim();
    const cost = Number(document.getElementById("stop-cost").value);
    if (!slot || !item || cost < 0) return;

    state.activity.stops.push({ id: Date.now(), slot, item, cost });
    e.target.reset();
    render();
});

document.getElementById("stop-list").addEventListener("click", (e) => {
    const id = e.target.dataset.stop;
    if (id) {
        state.activity.stops = state.activity.stops.filter((st) => st.id !== Number(id));
        render();
    }
});

document.getElementById("replay-curtain").addEventListener("click", () => {
    playSplitCurtain();
});

document.getElementById("reset-demo").addEventListener("click", () => {
    state = structuredClone(defaultState);
    selectedDayFilter = "All";
    render();
});

render();
playSplitCurtain();