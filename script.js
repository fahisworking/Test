const STORAGE_KEY = "simple-todo-items";
const CATEGORY_STORAGE_KEY = "simple-todo-categories";

// Filter values that aren't category ids. Category ids always start with "cat-".
const FILTER_ALL = "all";
const FILTER_NONE = "none";

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const categorySelect = document.getElementById("todo-category");
const list = document.getElementById("todo-list");
const empty = document.getElementById("todo-empty");
const count = document.getElementById("todo-count");
const clearDone = document.getElementById("clear-done");
const filters = document.getElementById("category-filters");
const categoryForm = document.getElementById("category-form");
const categoryInput = document.getElementById("category-input");

let categories = loadCategories();
let todos = loadTodos();
let activeFilter = FILTER_ALL;

function loadList(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function loadCategories() {
  return loadList(CATEGORY_STORAGE_KEY).filter(
    (category) => typeof category?.id === "string" && typeof category?.name === "string"
  );
}

function loadTodos() {
  // Tasks saved before categories existed have no categoryId, so they load as uncategorized.
  return loadList(STORAGE_KEY).map((todo) => ({
    ...todo,
    categoryId: categories.some((category) => category.id === todo.categoryId) ? todo.categoryId : null,
  }));
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
  } catch {
    // Storage can be blocked (e.g. private browsing); the app still works until reload.
  }
}

function update() {
  save();
  render();
}

function matchesFilter(todo, filter = activeFilter) {
  if (filter === FILTER_ALL) return true;
  if (filter === FILTER_NONE) return todo.categoryId === null;
  return todo.categoryId === filter;
}

function remainingIn(filter) {
  return todos.filter((todo) => !todo.done && matchesFilter(todo, filter)).length;
}

function fillCategorySelect(select, selectedId) {
  const options = [["", "No category"], ...categories.map((category) => [category.id, category.name])];
  select.replaceChildren(...options.map(([value, text]) => new Option(text, value)));
  select.value = selectedId ?? "";
  // The selected category may just have been deleted.
  if (select.selectedIndex < 0) select.value = "";
}

function createItem(todo) {
  const item = document.createElement("li");
  item.className = todo.done ? "todo-item done" : "todo-item";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = `todo-${todo.id}`;
  checkbox.checked = todo.done;
  checkbox.addEventListener("change", () => {
    todo.done = checkbox.checked;
    update();
  });

  const label = document.createElement("label");
  label.htmlFor = checkbox.id;
  label.textContent = todo.text;

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "delete-button";
  remove.textContent = "×";
  remove.setAttribute("aria-label", `Delete "${todo.text}"`);
  remove.addEventListener("click", () => {
    todos = todos.filter((other) => other.id !== todo.id);
    update();
  });

  item.append(checkbox, label);

  if (categories.length > 0) {
    const select = document.createElement("select");
    select.className = "item-category";
    select.setAttribute("aria-label", `Category for "${todo.text}"`);
    fillCategorySelect(select, todo.categoryId);
    select.addEventListener("change", () => {
      todo.categoryId = select.value || null;
      update();
    });
    item.append(select);
  }

  item.append(remove);
  return item;
}

function createFilterButton(filter, name) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "filter-button";
  button.dataset.filter = filter;
  button.setAttribute("aria-pressed", String(filter === activeFilter));
  button.textContent = `${name} (${remainingIn(filter)})`;
  button.addEventListener("click", () => setFilter(filter));
  return button;
}

function createCategoryChip(category) {
  const chip = document.createElement("span");
  chip.className = "category-chip";

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "delete-button";
  remove.textContent = "×";
  remove.setAttribute("aria-label", `Delete category "${category.name}"`);
  remove.addEventListener("click", () => deleteCategory(category));

  chip.append(createFilterButton(category.id, category.name), remove);
  return chip;
}

function render() {
  const visible = todos.filter((todo) => matchesFilter(todo));
  list.replaceChildren(...visible.map(createItem));
  empty.hidden = visible.length > 0;

  const remaining = visible.filter((todo) => !todo.done).length;
  count.textContent = `${remaining} ${remaining === 1 ? "task" : "tasks"} left`;
  clearDone.hidden = visible.length === remaining;

  const buttons = [createFilterButton(FILTER_ALL, "All")];
  if (categories.length > 0) {
    buttons.push(createFilterButton(FILTER_NONE, "No category"), ...categories.map(createCategoryChip));
  }
  filters.replaceChildren(...buttons);

  fillCategorySelect(categorySelect, categorySelect.value);
}

function setFilter(filter) {
  activeFilter = filter;
  // New tasks default to the category being viewed.
  categorySelect.value = filter === FILTER_ALL || filter === FILTER_NONE ? "" : filter;
  render();
  // Rendering replaces the buttons, so put keyboard focus back on the one just pressed.
  filters.querySelector(`[data-filter="${filter}"]`).focus();
}

function deleteCategory(category) {
  const affected = todos.filter((todo) => todo.categoryId === category.id);
  if (affected.length > 0) {
    const tasks = affected.length === 1 ? "1 task" : `${affected.length} tasks`;
    if (!confirm(`Delete category "${category.name}"? ${tasks} will move to No category.`)) return;
  }

  affected.forEach((todo) => {
    todo.categoryId = null;
  });
  categories = categories.filter((other) => other.id !== category.id);
  // With no categories left, the "No category" filter is no longer shown either.
  if (activeFilter === category.id || categories.length === 0) activeFilter = FILTER_ALL;
  update();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  todos.push({ id: Date.now(), text, done: false, categoryId: categorySelect.value || null });
  input.value = "";
  input.focus();
  update();
});

categoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = categoryInput.value.trim();
  if (!name) return;

  const isDuplicate = categories.some((category) => category.name.toLowerCase() === name.toLowerCase());
  if (isDuplicate) {
    categoryInput.setCustomValidity(`"${name}" already exists.`);
    categoryInput.reportValidity();
    return;
  }

  const category = { id: `cat-${Date.now()}`, name };
  categories.push(category);
  categoryInput.value = "";
  update();
  // Ready to add a task straight into the new category.
  categorySelect.value = category.id;
});

categoryInput.addEventListener("input", () => categoryInput.setCustomValidity(""));

clearDone.addEventListener("click", () => {
  // Only clears what's on screen, so tasks hidden by the filter are never removed.
  todos = todos.filter((todo) => !todo.done || !matchesFilter(todo));
  update();
});

render();
