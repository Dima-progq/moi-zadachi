
(() => {
  "use strict";

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  const els = {
    categoryTabs: $("#categoryTabs"),
    summary: $("#summary"),
    taskList: $("#taskList"),
    emptyState: $("#emptyState"),
    openAddBtn: $("#openAddBtn"),
    modalOverlay: $("#modalOverlay"),
    modalTitle: $("#modalTitle"),
    modalClose: $("#modalClose"),
    taskForm: $("#taskForm"),
    taskTitle: $("#taskTitle"),
    taskDesc: $("#taskDesc"),
    categoryPicker: $("#categoryPicker"),
    taskDate: $("#taskDate"),
    taskTime: $("#taskTime"),
    taskDone: $("#taskDone"),
    deleteBtn: $("#deleteBtn")
  };

  const STORAGE_KEY = "moi-zadachi-tasks-v1";

  const categoryNames = {
    work: "Работа",
    home: "Дом",
    sunday: "Воскресная школа"
  };

  let tasks = [];
  let activeCategory = "all";
  let editingId = null;

  const makeId = () =>
    window.crypto?.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + Math.random().toString(16).slice(2);

  const localDate = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 10);
  };

  function loadTasks() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );
      tasks = Array.isArray(saved) ? saved : [];
    } catch (error) {
      console.warn(error);
      tasks = [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      alert("Не удалось сохранить задачи. Проверьте память браузера.");
      console.error(error);
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function formatDate(date) {
    if (!date) return "";
    const parts = date.split("-");
    return parts.length === 3
      ? `${parts[2]}.${parts[1]}.${parts[0]}`
      : date;
  }

  function isOverdue(task) {
    if (!task.date || task.done) return false;
    const due = new Date(`${task.date}T${task.time || "23:59"}`);
    return due.getTime() < Date.now();
  }

  function renderSummary() {
    if (!els.summary) return;

    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const pending = total - done;
    const overdue = tasks.filter(isOverdue).length;

    els.summary.innerHTML = `
      <div class="summary-card"><strong>${total}</strong><span>Всего</span></div>
      <div class="summary-card"><strong>${pending}</strong><span>Активные</span></div>
      <div class="summary-card"><strong>${done}</strong><span>Выполнено</span></div>
      <div class="summary-card"><strong>${overdue}</strong><span>Просрочено</span></div>
    `;
  }

  function renderTasks() {
    if (!els.taskList) return;

    const visible = tasks
      .filter(t => activeCategory === "all" || t.category === activeCategory)
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        const ad = a.date ? `${a.date}T${a.time || "23:59"}` : "9999";
        const bd = b.date ? `${b.date}T${b.time || "23:59"}` : "9999";
        return ad.localeCompare(bd);
      });

    if (els.emptyState) els.emptyState.hidden = visible.length > 0;
    els.taskList.innerHTML = "";

    visible.forEach(task => {
      const overdue = isOverdue(task);
      const card = document.createElement("article");

      card.className =
        `task-card${task.done ? " is-done" : ""}${overdue ? " is-overdue" : ""}`;

      card.dataset.id = task.id;

      const dateText = task.date
        ? `${formatDate(task.date)}${task.time ? " · " + escapeHTML(task.time) : ""}`
        : "Без срока";

      card.innerHTML = `
        <div class="task-card-main">
          <label class="task-check">
            <input type="checkbox" class="task-toggle" ${task.done ? "checked" : ""}>
            <span></span>
          </label>
          <div class="task-content">
            <div class="task-heading">
              <h3 class="task-title">${escapeHTML(task.title)}</h3>
              <span class="task-category">${escapeHTML(categoryNames[task.category] || "Личные")}</span>
            </div>
            ${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ""}
            <div class="task-meta ${overdue ? "overdue-label" : ""}">
              <span>◷ ${dateText}</span>
              ${overdue ? "<b>Просрочено</b>" : ""}
            </div>
          </div>
          <button type="button" class="task-edit">✎</button>
        </div>
      `;

      $(".task-toggle", card).addEventListener("change", event => {
        task.done = event.target.checked;
        saveTasks();
        render();
      });

      $(".task-edit", card).addEventListener("click", () => openModal(task));

      card.addEventListener("click", event => {
        if (event.target.closest("button, input, label")) return;
        openModal(task);
      });

      els.taskList.appendChild(card);
    });

    renderSummary();
  }

  function render() {
    renderTasks();
    updateCategoryTabs();
  }

  function updateCategoryTabs() {
    if (!els.categoryTabs) return;

    $$(".tab", els.categoryTabs).forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.category === activeCategory
      );
    });
  }

  function setCategory(category) {
    activeCategory = category || "all";
    render();
  }

  function openModal(task = null) {
    if (!els.modalOverlay || !els.taskForm) return;

    editingId = task ? task.id : null;
    els.taskForm.reset();

    if (els.modalTitle) {
      els.modalTitle.textContent = task ? "Изменить задачу" : "Новая задача";
    }

    if (els.taskTitle) els.taskTitle.value = task?.title || "";
    if (els.taskDesc) els.taskDesc.value = task?.description || "";
    if (els.taskDate) els.taskDate.value = task?.date || localDate();
    if (els.taskTime) els.taskTime.value = task?.time || "";
    if (els.taskDone) els.taskDone.checked = Boolean(task?.done);

    const category = task?.category || "work";

    if (els.categoryPicker) {
      $$(".cat-option", els.categoryPicker).forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.category === category
        );
      });
    }

    if (els.deleteBtn) els.deleteBtn.hidden = !task;

    els.modalOverlay.hidden = false;
    document.body.classList.add("modal-open");

    setTimeout(() => els.taskTitle?.focus(), 50);
  }

  function closeModal() {
    if (!els.modalOverlay) return;

    els.modalOverlay.hidden = true;
    document.body.classList.remove("modal-open");
    editingId = null;
  }

  function selectedCategory() {
    const active = els.categoryPicker
      ? $(".cat-option.active", els.categoryPicker)
      : null;

    return active?.dataset.category || "work";
  }

  function saveFromForm(event) {
    event.preventDefault();

    const title = (els.taskTitle?.value || "").trim();

    if (!title) {
      els.taskTitle?.focus();
      return;
    }

    const data = {
      title,
      description: (els.taskDesc?.value || "").trim(),
      category: selectedCategory(),
      date: els.taskDate?.value || "",
      time: els.taskTime?.value || "",
      done: Boolean(els.taskDone?.checked),
      updatedAt: new Date().toISOString()
    };

    if (editingId) {
      const index = tasks.findIndex(t => t.id === editingId);

      if (index !== -1) {
        tasks[index] = { ...tasks[index], ...data };
      }
    } else {
      tasks.push({
        id: makeId(),
        ...data,
        createdAt: new Date().toISOString()
      });
    }

    saveTasks();
    closeModal();
    render();
  }

  function deleteCurrentTask() {
    if (!editingId) return;

    if (!confirm("Удалить эту задачу?")) return;

    tasks = tasks.filter(t => t.id !== editingId);

    saveTasks();
    closeModal();
    render();
  }

  function bindEvents() {
    els.openAddBtn?.addEventListener("click", () => openModal());

    els.modalClose?.addEventListener("click", closeModal);

    els.modalOverlay?.addEventListener("click", event => {
      if (event.target === els.modalOverlay) closeModal();
    });

    els.taskForm?.addEventListener("submit", saveFromForm);

    els.deleteBtn?.addEventListener("click", deleteCurrentTask);

    els.categoryTabs?.addEventListener("click", event => {
      const button = event.target.closest("[data-category]");

      if (button) setCategory(button.dataset.category);
    });

    els.categoryPicker?.addEventListener("click", event => {
      const button = event.target.closest(".cat-option");

      if (!button) return;

      $$(".cat-option", els.categoryPicker).forEach(item => {
        item.classList.remove("active");
      });

      button.classList.add("active");
    });

    document.addEventListener("keydown", event => {
      if (
        event.key === "Escape" &&
        els.modalOverlay &&
        !els.modalOverlay.hidden
      ) {
        closeModal();
      }
    });
  }

  loadTasks();
  bindEvents();
  render();

  function showDueNotifications() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const today = localDate();
    const key = "moi-zadachi-notified-" + today;
    let notified = [];

    try {
      notified = JSON.parse(localStorage.getItem(key) || "[]");
    } catch (_) {}

    const now = Date.now();

    tasks.forEach(task => {
      if (task.done || !task.date) return;

      const dueTime = new Date(
        `${task.date}T${task.time || "09:00"}`
      ).getTime();

      if (dueTime <= now && !notified.includes(task.id)) {
        try {
          new Notification("Мои задачи", {
            body: `Срок задачи: ${task.title}`,
            tag: task.id
          });
          notified.push(task.id);
        } catch (error) {
          console.warn(error);
        }
      }
    });

    try {
      localStorage.setItem(key, JSON.stringify(notified));
    } catch (_) {}
  }

  window.enableTaskNotifications = async function () {
    if (!("Notification" in window)) {
      alert("Этот браузер не поддерживает уведомления.");
      return false;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      showDueNotifications();
      alert("Уведомления разрешены. Проверка сроков работает, пока приложение открыто.");
      return true;
    }

    alert("Разрешение на уведомления не предоставлено.");
    return false;
  };

  showDueNotifications();

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) showDueNotifications();
  });
})();
