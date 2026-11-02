const STORAGE_KEY = "simple-todo-items";

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const count = document.getElementById("todo-count");
const clearDone = document.getElementById("clear-done");

let todos = loadTodos();

function loadTodos() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // Storage can be blocked (e.g. private browsing); the app still works until reload.
  }
}

function update() {
  saveTodos();
  render();
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

  item.append(checkbox, label, remove);
  return item;
}

function render() {
  list.replaceChildren(...todos.map(createItem));

  const remaining = todos.filter((todo) => !todo.done).length;
  count.textContent = `${remaining} ${remaining === 1 ? "task" : "tasks"} left`;
  clearDone.hidden = todos.length === remaining;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  todos.push({ id: Date.now(), text, done: false });
  input.value = "";
  input.focus();
  update();
});

clearDone.addEventListener("click", () => {
  todos = todos.filter((todo) => !todo.done);
  update();
});

render();
