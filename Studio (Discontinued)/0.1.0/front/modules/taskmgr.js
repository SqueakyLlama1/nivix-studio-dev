const processes = [];

// ======================
// Task Management
// ======================

function newTask(id) {
    if (processes.includes(id)) return resTask(id);

    const taskElement = $('<div>', { class: 'task', id: `task-${id}` });
    const taskBar = $('<div>', { class: 'bar' });
    const closeBtn = $('<button>').text('X').on('click', () => endTask(id));
    const minBtn = $('<button>').text('-').on('click', () => minTask(id));
    taskBar.append(minBtn, closeBtn);
    taskElement.append(taskBar);
    const iframe = $('<iframe>', { src: `http://127.0.0.1:58000/apps/${id}/index.html`, id: `task-${id}-iframe` });
    taskElement.append(iframe);

    processes.push(id);
    $('body').css('overflow', 'hidden').append(taskElement);

    taskElement.css({ opacity: 0, transform: 'scale(0.8)' }).show().animate({ opacity: 1 }, {
        duration: 200,
        step: function(now) {
            const scale = 0.8 + 0.2 * now + 0.05 * Math.sin(now * Math.PI * 3);
            $(this).css('transform', `scale(${scale})`);
        }
    });
}

function minTask(id) {
    const el = $(`#task-${id}`);
    el.animate({ opacity: 0, top: '+=50px' }, { duration: 200, complete: () => el.hide().css({ top: 0 }) });
}

function resTask(id) {
    const el = $(`#task-${id}`);
    el.show().css({ opacity: 0, top: '50px' });
    el.animate({ opacity: 1, top: '0px' }, { duration: 200 });
}

function endTask(id) {
    const el = $(`#task-${id}`);
    el.animate({ opacity: 0, top: '-=50px' }, {
        duration: 200,
        step: function(now) {
            const scale = 1 - 0.2 * now;
            $(this).css('transform', `scale(${scale})`);
        },
        complete: function() {
            const element = document.getElementById(`task-${id}`);
            if (element) element.remove();
            const index = processes.indexOf(id);
            if (index !== -1) processes.splice(index, 1);
        }
    });
}