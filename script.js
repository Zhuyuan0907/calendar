let currentDate = new Date();
let currentView = 'month';
let events = JSON.parse(localStorage.getItem('calendarEvents')) || [];
let selectedEvent = null;

const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

function init() {
    renderCalendar();
    setupEventListeners();
    loadEvents();
}

function setupEventListeners() {
    document.getElementById('prevBtn').addEventListener('click', () => navigateMonth(-1));
    document.getElementById('nextBtn').addEventListener('click', () => navigateMonth(1));
    document.getElementById('todayBtn').addEventListener('click', goToToday);
    document.getElementById('viewSelector').addEventListener('change', changeView);
    document.getElementById('createBtn').addEventListener('click', () => openEventModal());
    document.querySelector('.close').addEventListener('click', closeEventModal);
    document.getElementById('cancelBtn').addEventListener('click', closeEventModal);
    document.getElementById('eventForm').addEventListener('submit', saveEvent);
    document.getElementById('deleteBtn').addEventListener('click', deleteEvent);
    
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('eventModal')) {
            closeEventModal();
        }
    });
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    document.getElementById('currentMonth').textContent = `${year}年 ${monthNames[month]}`;
    
    renderCalendarHeader();
    
    if (currentView === 'month') {
        renderMonthView(year, month);
    } else if (currentView === 'week') {
        renderWeekView();
    } else if (currentView === 'day') {
        renderDayView();
    }
}

function renderCalendarHeader() {
    const headerElement = document.getElementById('calendarHeader');
    headerElement.innerHTML = '';
    
    dayNames.forEach(day => {
        const cell = document.createElement('div');
        cell.className = 'calendar-header-cell';
        cell.textContent = day;
        headerElement.appendChild(cell);
    });
}

function renderMonthView(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    const firstDayOfWeek = firstDay.getDay();
    const lastDateOfMonth = lastDay.getDate();
    const prevLastDate = prevLastDay.getDate();
    
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    for (let i = firstDayOfWeek; i > 0; i--) {
        const cell = createCalendarCell(
            new Date(year, month - 1, prevLastDate - i + 1),
            true
        );
        calendarGrid.appendChild(cell);
    }
    
    for (let date = 1; date <= lastDateOfMonth; date++) {
        const cell = createCalendarCell(new Date(year, month, date), false);
        calendarGrid.appendChild(cell);
    }
    
    const remainingCells = 42 - (firstDayOfWeek + lastDateOfMonth);
    for (let date = 1; date <= remainingCells; date++) {
        const cell = createCalendarCell(new Date(year, month + 1, date), true);
        calendarGrid.appendChild(cell);
    }
}

function createCalendarCell(date, isOtherMonth) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    if (isOtherMonth) cell.classList.add('other-month');
    if (isToday(date)) cell.classList.add('today');
    
    const dateNumber = document.createElement('div');
    dateNumber.className = 'date-number';
    dateNumber.textContent = date.getDate();
    cell.appendChild(dateNumber);
    
    const dayEvents = getEventsForDate(date);
    dayEvents.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.className = 'event';
        eventElement.style.backgroundColor = event.color;
        eventElement.textContent = event.title;
        eventElement.addEventListener('click', (e) => {
            e.stopPropagation();
            openEventModal(event);
        });
        cell.appendChild(eventElement);
    });
    
    cell.addEventListener('click', () => {
        openEventModal(null, date);
    });
    
    return cell;
}

function renderWeekView() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    calendarGrid.style.gridTemplateRows = 'repeat(24, 60px)';
    
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    for (let hour = 0; hour < 24; hour++) {
        for (let day = 0; day < 7; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell';
            cell.style.fontSize = '10px';
            
            if (day === 0) {
                cell.textContent = `${hour}:00`;
            }
            
            calendarGrid.appendChild(cell);
        }
    }
}

function renderDayView() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    calendarGrid.style.gridTemplateColumns = '80px 1fr';
    calendarGrid.style.gridTemplateRows = 'repeat(24, 60px)';
    
    for (let hour = 0; hour < 24; hour++) {
        const timeCell = document.createElement('div');
        timeCell.className = 'calendar-cell';
        timeCell.textContent = `${hour}:00`;
        timeCell.style.fontSize = '12px';
        calendarGrid.appendChild(timeCell);
        
        const eventCell = document.createElement('div');
        eventCell.className = 'calendar-cell';
        calendarGrid.appendChild(eventCell);
    }
}

function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

function navigateMonth(direction) {
    if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() + direction);
    } else if (currentView === 'week') {
        currentDate.setDate(currentDate.getDate() + (direction * 7));
    } else if (currentView === 'day') {
        currentDate.setDate(currentDate.getDate() + direction);
    }
    renderCalendar();
}

function goToToday() {
    currentDate = new Date();
    renderCalendar();
}

function changeView() {
    currentView = document.getElementById('viewSelector').value;
    renderCalendar();
}

function openEventModal(event = null, date = null) {
    selectedEvent = event;
    const modal = document.getElementById('eventModal');
    const form = document.getElementById('eventForm');
    const modalTitle = document.getElementById('modalTitle');
    const deleteBtn = document.getElementById('deleteBtn');
    
    if (event) {
        modalTitle.textContent = '編輯事件';
        form.eventTitle.value = event.title;
        form.eventDate.value = event.date;
        form.eventStartTime.value = event.startTime;
        form.eventEndTime.value = event.endTime;
        form.eventDescription.value = event.description || '';
        form.eventColor.value = event.color;
        deleteBtn.style.display = 'inline-block';
    } else {
        modalTitle.textContent = '新增事件';
        form.reset();
        if (date) {
            form.eventDate.value = formatDate(date);
        }
        form.eventColor.value = '#4285f4';
        deleteBtn.style.display = 'none';
    }
    
    modal.style.display = 'block';
}

function closeEventModal() {
    document.getElementById('eventModal').style.display = 'none';
    selectedEvent = null;
}

function saveEvent(e) {
    e.preventDefault();
    
    const form = e.target;
    const eventData = {
        id: selectedEvent ? selectedEvent.id : Date.now().toString(),
        title: form.eventTitle.value,
        date: form.eventDate.value,
        startTime: form.eventStartTime.value,
        endTime: form.eventEndTime.value,
        description: form.eventDescription.value,
        color: form.eventColor.value
    };
    
    if (selectedEvent) {
        const index = events.findIndex(e => e.id === selectedEvent.id);
        events[index] = eventData;
    } else {
        events.push(eventData);
    }
    
    saveEvents();
    renderCalendar();
    closeEventModal();
}

function deleteEvent() {
    if (selectedEvent && confirm('確定要刪除這個事件嗎？')) {
        events = events.filter(e => e.id !== selectedEvent.id);
        saveEvents();
        renderCalendar();
        closeEventModal();
    }
}

function saveEvents() {
    localStorage.setItem('calendarEvents', JSON.stringify(events));
}

function loadEvents() {
    events = JSON.parse(localStorage.getItem('calendarEvents')) || [];
}

function getEventsForDate(date) {
    const dateStr = formatDate(date);
    return events.filter(event => event.date === dateStr);
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

document.addEventListener('DOMContentLoaded', init);