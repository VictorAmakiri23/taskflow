(function () {
  "use strict";

  // ---------- STATE ----------
  let tasks = [];
  let editingId = null;

  // ---------- DOM REFS ----------
  const taskForm = document.getElementById("taskForm");
  const taskIdInput = document.getElementById("taskId");
  const titleInput = document.getElementById("title");
  const descInput = document.getElementById("description");
  const prioritySelect = document.getElementById("priority");
  const dueDateInput = document.getElementById("dueDate");
  const statusSelect = document.getElementById("status");
  const submitBtn = document.getElementById("submitBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const formTitle = document.getElementById("formTitle");
  const taskListContainer = document.getElementById("taskListContainer");
  const filterStatus = document.getElementById("filterStatus");
  const filterPriority = document.getElementById("filterPriority");
  const searchInput = document.getElementById("searchInput");
  const toastEl = document.getElementById("toast");
  const statTotal = document.getElementById("statTotal");
  const statPending = document.getElementById("statPending");
  const statCompleted = document.getElementById("statCompleted");

  // ---------- LOCAL STORAGE ----------
  const STORAGE_KEY = "taskflow_tasks_v2";

  function loadTasks() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        tasks = JSON.parse(stored);
        if (!Array.isArray(tasks)) tasks = [];
        tasks = tasks.filter(
          (t) => t && typeof t === "object" && t.id && t.title,
        );
      } catch (e) {
        tasks = [];
      }
    } else {
      // Seed tasks
      tasks = [
        {
          id: "seed-1",
          title: "Finalise project proposal",
          description: "Review scope with stakeholders and lock the timeline.",
          priority: "High",
          dueDate: new Date(Date.now() + 86400000 * 2)
            .toISOString()
            .split("T")[0],
          status: "In Progress",
          createdAt: Date.now(),
        },
        {
          id: "seed-2",
          title: "Update design tokens",
          description:
            "Sync spacing and colour variables with the new brand guide.",
          priority: "Medium",
          dueDate: new Date(Date.now() + 86400000 * 5)
            .toISOString()
            .split("T")[0],
          status: "Pending",
          createdAt: Date.now() - 86400000,
        },
        {
          id: "seed-3",
          title: "Team sync notes",
          description: "Share meeting summary with the product squad.",
          priority: "Low",
          dueDate: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          status: "Completed",
          createdAt: Date.now() - 172800000,
        },
      ];
    }
    saveTasks();
  }

  function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  // ---------- TOAST ----------
  let toastTimer = null;
  function showToast(message, type = "success") {
    toastEl.textContent = message;
    toastEl.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("show");
    }, 2600);
  }

  // ---------- HELPERS ----------
  function generateId() {
    return "task_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "No due date";
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return "Invalid date";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function isOverdue(task) {
    if (!task.dueDate || task.status === "Completed") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate + "T00:00:00");
    return due < today;
  }

  // ---------- STATS UPDATE ----------
  function updateStats() {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === "Pending").length;
    const completed = tasks.filter((t) => t.status === "Completed").length;
    statTotal.textContent = total;
    statPending.textContent = pending;
    statCompleted.textContent = completed;
  }

  // ---------- RENDER TASKS ----------
  function renderTasks() {
    const statusFilter = filterStatus.value;
    const priorityFilter = filterPriority.value;
    const searchTerm = searchInput.value.trim().toLowerCase();

    let filtered = tasks.filter((task) => {
      const matchesStatus =
        statusFilter === "All" || task.status === statusFilter;
      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;
      const matchesSearch =
        searchTerm === "" ||
        task.title.toLowerCase().includes(searchTerm) ||
        (task.description &&
          task.description.toLowerCase().includes(searchTerm));
      return matchesStatus && matchesPriority && matchesSearch;
    });

    // Sort: overdue first, then by due date, then priority
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    filtered.sort((a, b) => {
      const aOverdue = isOverdue(a);
      const bOverdue = isOverdue(b);
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

      const aDate = a.dueDate || "9999-12-31";
      const bDate = b.dueDate || "9999-12-31";
      if (aDate !== bDate) return aDate.localeCompare(bDate);

      return (
        (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
      );
    });

    if (filtered.length === 0) {
      taskListContainer.innerHTML = `
        <div class="empty-state">
          <p>✨ No tasks match</p>
          <p style="font-size:0.9rem;">Try adjusting filters or create a new task.</p>
        </div>
      `;
      updateStats();
      return;
    }

    let html = "";
    filtered.forEach((task) => {
      const priorityClass = `priority-${task.priority.toLowerCase()}`;
      const isComplete = task.status === "Completed";
      const overdue = isOverdue(task);
      const dueDisplay = task.dueDate
        ? formatDate(task.dueDate)
        : "No due date";
      const dueStyle = overdue ? "color: #f43f5e; font-weight: 700;" : "";
      const completedStyle = isComplete
        ? "opacity: 0.6; text-decoration: line-through;"
        : "";

      html += `
        <div class="task-card ${priorityClass}" data-id="${task.id}">
          <div class="task-main">
            <div class="task-title" style="${completedStyle}">${escapeHtml(task.title)}</div>
            ${task.description ? `<div class="task-desc" style="${completedStyle}">${escapeHtml(task.description)}</div>` : ""}
            <div class="task-meta">
              <span class="task-meta-item">📅 <span style="${dueStyle}">${dueDisplay}</span>${overdue ? " ⚠️" : ""}</span>
              <span class="priority-badge ${task.priority.toLowerCase()}">${task.priority}</span>
              <select class="status-select" data-id="${task.id}" aria-label="Change status">
                <option value="Pending" ${task.status === "Pending" ? "selected" : ""}>⏳ Pending</option>
                <option value="In Progress" ${task.status === "In Progress" ? "selected" : ""}>🔄 In Progress</option>
                <option value="Completed" ${task.status === "Completed" ? "selected" : ""}>✅ Completed</option>
              </select>
            </div>
          </div>
          <div class="task-actions">
            <button class="icon-btn edit" data-id="${task.id}" title="Edit task">✏️</button>
            <button class="icon-btn delete" data-id="${task.id}" title="Delete task">🗑️</button>
          </div>
        </div>
      `;
    });

    taskListContainer.innerHTML = html;
    updateStats();
  }

  // Escape HTML
  function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // ---------- FORM SUBMIT ----------
  function handleFormSubmit(e) {
    e.preventDefault();

    const title = titleInput.value.trim();
    if (!title) {
      showToast("Title is required", "error");
      titleInput.focus();
      return;
    }
    if (title.length < 2) {
      showToast("Title must be at least 2 characters", "error");
      titleInput.focus();
      return;
    }

    const description = descInput.value.trim();
    const priority = prioritySelect.value;
    const dueDate = dueDateInput.value;
    const status = statusSelect.value;

    if (dueDate && isNaN(new Date(dueDate + "T00:00:00").getTime())) {
      showToast("Please enter a valid due date", "error");
      dueDateInput.focus();
      return;
    }

    if (editingId) {
      const taskIndex = tasks.findIndex((t) => t.id === editingId);
      if (taskIndex !== -1) {
        tasks[taskIndex] = {
          ...tasks[taskIndex],
          title,
          description,
          priority,
          dueDate: dueDate || "",
          status,
        };
        saveTasks();
        showToast("Task updated", "success");
      }
      resetForm();
    } else {
      const newTask = {
        id: generateId(),
        title,
        description,
        priority,
        dueDate: dueDate || "",
        status,
        createdAt: Date.now(),
      };
      tasks.push(newTask);
      saveTasks();
      showToast("Task created", "success");
      resetForm();
    }

    renderTasks();
  }

  // ---------- RESET FORM ----------
  function resetForm() {
    taskForm.reset();
    taskIdInput.value = "";
    editingId = null;
    prioritySelect.value = "Medium";
    statusSelect.value = "Pending";
    dueDateInput.value = "";
    formTitle.textContent = "➕ New task";
    submitBtn.textContent = "Add task";
    cancelEditBtn.style.display = "none";
  }

  // ---------- EDIT TASK ----------
  function editTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    editingId = id;
    taskIdInput.value = id;
    titleInput.value = task.title;
    descInput.value = task.description || "";
    prioritySelect.value = task.priority;
    dueDateInput.value = task.dueDate || "";
    statusSelect.value = task.status;

    formTitle.textContent = "✏️ Edit task";
    submitBtn.textContent = "Save changes";
    cancelEditBtn.style.display = "inline-flex";

    titleInput.focus();
    document
      .querySelector(".form-panel")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- DELETE TASK ----------
  function deleteTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (confirm(`Delete "${task.title}"? This cannot be undone.`)) {
      tasks = tasks.filter((t) => t.id !== id);
      saveTasks();
      if (editingId === id) resetForm();
      renderTasks();
      showToast("Task deleted", "success");
    }
  }

  // ---------- EVENT DELEGATION ----------
  function handleTaskListClick(e) {
    const target = e.target.closest("button");
    if (!target) return;

    const taskId = target.dataset.id;
    if (!taskId) return;

    if (target.classList.contains("edit")) {
      editTask(taskId);
    } else if (target.classList.contains("delete")) {
      deleteTask(taskId);
    }
  }

  // ---------- STATUS CHANGE ----------
  function handleStatusChange(e) {
    if (!e.target.classList.contains("status-select")) return;
    const select = e.target;
    const taskId = select.dataset.id;
    const newStatus = select.value;
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== newStatus) {
      task.status = newStatus;
      saveTasks();
      renderTasks();
      showToast(`Status moved to ${newStatus}`, "success");
    }
  }

  // ---------- FILTERS ----------
  function setupFilters() {
    filterStatus.addEventListener("change", renderTasks);
    filterPriority.addEventListener("change", renderTasks);
    searchInput.addEventListener("input", renderTasks);
  }

  // ---------- INIT ----------
  function init() {
    loadTasks();
    renderTasks();
    setupFilters();

    taskForm.addEventListener("submit", handleFormSubmit);
    cancelEditBtn.addEventListener("click", resetForm);
    taskListContainer.addEventListener("click", handleTaskListClick);
    taskListContainer.addEventListener("change", handleStatusChange);

    updateStats();
  }

  init();
})();
