const taskInput = document.getElementById('task-input');
const subtaskInput = document.getElementById('subtask-input');
const taskDate = document.getElementById('task-date');
const taskPriority = document.getElementById('task-priority');
const taskCategory = document.getElementById('task-category');
const addBtn = document.getElementById('add-btn');
const taskList = document.getElementById('task-list');
const clearBtn = document.getElementById('clear-btn');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentFilter = 'all';

renderTasks();

// Add Task
addBtn.addEventListener('click', () => {
  const text = taskInput.value.trim();
  if (!text) return;

  const subtasks = subtaskInput.value
    .split(',')
    .map(s => s.trim())
    .filter(s => s)
    .map(s => ({ text: s, completed: false }));

  const task = {
    id: Date.now(),
    text,
    date: taskDate.value,
    priority: taskPriority.value,
    category: taskCategory.value,
    completed: false,
    subtasks
  };

  tasks.push(task);
  saveTasks();
  renderTasks();
  taskInput.value = '';
  subtaskInput.value = '';
  taskDate.value = '';
});

// Clear All
clearBtn.addEventListener('click', () => {
  if (confirm('Clear all tasks?')) {
    tasks = [];
    saveTasks();
    renderTasks();
  }
});

// Search
searchInput.addEventListener('input', renderTasks);

// Filters
filterBtns.forEach(btn =>
  btn.addEventListener('click', e => {
    currentFilter = e.target.dataset.filter;
    renderTasks();
  })
);

// Dark mode
darkModeToggle.addEventListener('click', () =>
  document.body.classList.toggle('dark')
);

// Export
exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(tasks, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tasks.json';
  a.click();
});

// Import
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', () => {
  const file = importFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    tasks = JSON.parse(e.target.result);
    saveTasks();
    renderTasks();
  };
  reader.readAsText(file);
});

// Save to localStorage
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Render tasks
function renderTasks() {
  taskList.innerHTML = '';
  let filteredTasks = tasks.filter(task => {
    const search = searchInput.value.toLowerCase();
    if (currentFilter === 'active')
      return !task.completed && task.text.toLowerCase().includes(search);
    if (currentFilter === 'completed')
      return task.completed && task.text.toLowerCase().includes(search);
    return task.text.toLowerCase().includes(search);
  });

  filteredTasks.forEach(task => addTaskToDOM(task));
  updateProgress();
  checkReminders();
}

// Add Task to DOM
function addTaskToDOM(task) {
  const li = document.createElement('li');
  li.className = `p-4 rounded-2xl shadow glass ${
    task.completed
      ? 'line-through text-gray-500'
      : task.priority === 'high'
      ? 'bg-red-100'
      : task.priority === 'medium'
      ? 'bg-yellow-100'
      : 'bg-green-100'
  }`;

  li.innerHTML = `
    <div>
      <span class="font-semibold">${task.text}</span>
      ${task.date ? `<span class="ml-2 text-xs">(${task.date})</span>` : ''}
      <span class="ml-2 text-xs px-2 py-0.5 rounded-full ${
        task.priority === 'high'
          ? 'bg-red-500 text-white'
          : task.priority === 'medium'
          ? 'bg-yellow-500 text-white'
          : 'bg-green-500 text-white'
      }">${task.priority}</span>
      <span class="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-500 text-white">
        ${task.category}
      </span>
    </div>
    <div class="flex gap-2 mt-2">
      <button class="toggle-btn bg-green-500 text-white px-2 py-1 rounded">Done</button>
      <button class="edit-btn bg-blue-500 text-white px-2 py-1 rounded">Edit</button>
      <button class="delete-btn bg-red-500 text-white px-2 py-1 rounded">Delete</button>
    </div>
    <ul class="mt-2 ml-4 space-y-1">
      ${task.subtasks
        .map(
          (s, i) =>
            `<li class="flex items-center gap-2">
              <input type="checkbox" class="subtask-toggle" data-task="${task.id}" data-index="${i}" ${
              s.completed ? 'checked' : ''
            }>
              <span class="${s.completed ? 'line-through text-gray-500' : ''}">${s.text}</span>
            </li>`
        )
        .join('')}
    </ul>
  `;

  // Toggle complete
  li.querySelector('.toggle-btn').addEventListener('click', () => {
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
  });

  // Edit
  li.querySelector('.edit-btn').addEventListener('click', () => {
    const newText = prompt('Edit Task', task.text);
    if (newText) {
      task.text = newText.trim();
      saveTasks();
      renderTasks();
    }
  });

  // Delete
  li.querySelector('.delete-btn').addEventListener('click', () => {
    tasks = tasks.filter(t => t.id !== task.id);
    saveTasks();
    renderTasks();
  });

  // Subtask toggles
  li.querySelectorAll('.subtask-toggle').forEach(cb =>
    cb.addEventListener('change', e => {
      const index = e.target.dataset.index;
      task.subtasks[index].completed = e.target.checked;
      saveTasks();
      renderTasks();
    })
  );

  taskList.appendChild(li);
}

// Progress
function updateProgress() {
  const total = tasks.length;
  const done = tasks.filter(t => t.completed).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  progressBar.style.width = percent + '%';
  progressText.textContent = `${percent}% completed`;
}

// Reminders
function checkReminders() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
  const today = new Date().toISOString().split('T')[0];
  tasks.forEach(task => {
    if (task.date === today && !task.completed) {
      new Notification('Reminder', { body: task.text });
    }
  });
}


