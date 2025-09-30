document.addEventListener('DOMContentLoaded', function() {
    function makeDraggable() {
        document.querySelectorAll('.task').forEach(function(card) {
            card.setAttribute('draggable', 'true');
            card.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', card.dataset.id);
            });
        });
    }

    function setupDropZones() {
        const columns = {
            'todo': document.getElementById('todo-col'),
            'in_progress': document.getElementById('inprogress-col'),
            'done': document.getElementById('done-col')
        };
        Object.entries(columns).forEach(([status, col]) => {
            col.addEventListener('dragover', function(e) {
                e.preventDefault();
            });
            col.addEventListener('drop', function(e) {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                if (!id) return;
                fetch(`/api/tasks/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                }).then(resp => resp.json()).then(() => {
                    // Re-render board after update
                    if (window.renderTasks) {
                        window.renderTasks();
                    }
                });
            });
        });
    }

    // Patch renderTasks to add draggable and data-id
    window.renderTasks = function() {
        console.log("Rendering tasks...");
        fetch('/api/tasks').then(resp => resp.json()).then(tasks => {
            const columns = {
                'todo': document.getElementById('todo-col'),
                'in_progress': document.getElementById('inprogress-col'),
                'done': document.getElementById('done-col')
            };
            Object.values(columns).forEach(col => {
                while (col.children.length > 1) {
                    col.removeChild(col.lastChild);
                }
            });
            tasks.forEach(task => {
                const el = document.createElement('div');
                el.className = 'task';
                el.dataset.id = task.id;
                el.innerHTML = `<span class='task-id'>${task.id}</span>${task.text}<div class='tags'>${task.tags.join(', ')}</div>`;
                columns[task.status].appendChild(el);
            });
            makeDraggable();
        });
    };

    setupDropZones();
    window.renderTasks();
});

