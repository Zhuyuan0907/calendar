// 設定你的密碼（請修改成你想要的密碼）
const ADMIN_PASSWORD = 'your-password-here';

let currentDate = new Date();
let currentView = 'month';
let events = JSON.parse(localStorage.getItem('calendarEvents')) || [];
let selectedEvent = null;
let isAuthenticated = false;
let dragStartDate = null;
let dragEndDate = null;

const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

function init() {
    checkAuthentication();
    renderCalendar();
    setupEventListeners();
    loadEvents();
}

function checkAuthentication() {
    const authToken = localStorage.getItem('calendarAuthToken');
    if (authToken === btoa(ADMIN_PASSWORD)) {
        isAuthenticated = true;
    }
}

function setupEventListeners() {
    document.getElementById('prevBtn').addEventListener('click', () => navigateMonth(-1));
    document.getElementById('nextBtn').addEventListener('click', () => navigateMonth(1));
    document.getElementById('todayBtn').addEventListener('click', goToToday);
    document.getElementById('viewSelector').addEventListener('change', changeView);
    document.getElementById('createBtn').addEventListener('click', () => {
        if (isAuthenticated) {
            openEventModal();
        } else {
            showAuthModal();
        }
    });
    document.querySelector('.close').addEventListener('click', closeEventModal);
    document.getElementById('cancelBtn').addEventListener('click', closeEventModal);
    document.getElementById('eventForm').addEventListener('submit', saveEvent);
    document.getElementById('deleteBtn').addEventListener('click', deleteEvent);
    document.getElementById('authForm').addEventListener('submit', authenticate);
    document.getElementById('allDayEvent').addEventListener('change', toggleTimeInputs);
    
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('eventModal')) {
            closeEventModal();
        }
    });
}

function toggleTimeInputs() {
    const allDayCheckbox = document.getElementById('allDayEvent');
    const timeInputs = document.getElementById('timeInputs');
    const startTime = document.getElementById('eventStartTime');
    const endTime = document.getElementById('eventEndTime');
    
    if (allDayCheckbox.checked) {
        timeInputs.style.display = 'none';
        startTime.removeAttribute('required');
        endTime.removeAttribute('required');
    } else {
        timeInputs.style.display = 'block';
        startTime.setAttribute('required', 'required');
        endTime.setAttribute('required', 'required');
    }
}

function showAuthModal() {
    document.getElementById('authModal').style.display = 'block';
}

function authenticate(e) {
    e.preventDefault();
    const password = document.getElementById('authPassword').value;
    
    if (password === ADMIN_PASSWORD) {
        isAuthenticated = true;
        localStorage.setItem('calendarAuthToken', btoa(password));
        document.getElementById('authModal').style.display = 'none';
        document.getElementById('authPassword').value = '';
        openEventModal();
    } else {
        alert('密碼錯誤');
    }
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
    
    // Previous month days
    for (let i = firstDayOfWeek; i > 0; i--) {
        const cell = createCalendarCell(
            new Date(year, month - 1, prevLastDate - i + 1),
            true
        );
        calendarGrid.appendChild(cell);
    }
    
    // Current month days
    for (let date = 1; date <= lastDateOfMonth; date++) {
        const cell = createCalendarCell(new Date(year, month, date), false);
        calendarGrid.appendChild(cell);
    }
    
    // Next month days
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
    
    cell.dataset.date = formatDate(date);
    
    const dateNumber = document.createElement('div');
    dateNumber.className = 'date-number';
    dateNumber.textContent = date.getDate();
    cell.appendChild(dateNumber);
    
    // Get events for this date
    const dayEvents = getEventsForDate(date);
    dayEvents.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.className = 'event';
        eventElement.style.backgroundColor = event.color;
        eventElement.textContent = event.allDay ? `整天: ${event.title}` : event.title;
        eventElement.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isAuthenticated) {
                openEventModal(event);
            } else {
                showEventDetails(event);
            }
        });
        cell.appendChild(eventElement);
    });
    
    // Add drag functionality
    if (isAuthenticated) {
        cell.addEventListener('click', () => {
            openEventModal(null, date);
        });
        
        cell.addEventListener('mousedown', (e) => {
            if (e.target === cell || e.target.className === 'date-number') {
                dragStartDate = date;
                cell.classList.add('dragging');
            }
        });
        
        cell.addEventListener('mouseenter', () => {
            if (dragStartDate) {
                cell.classList.add('drag-over');
                dragEndDate = date;
                highlightDateRange(dragStartDate, date);
            }
        });
        
        cell.addEventListener('mouseup', () => {
            if (dragStartDate && dragEndDate) {
                openEventModalWithRange(dragStartDate, dragEndDate);
                clearDragSelection();
            }
        });
    }
    
    return cell;
}

function highlightDateRange(startDate, endDate) {
    const cells = document.querySelectorAll('.calendar-cell');
    const start = Math.min(startDate.getTime(), endDate.getTime());
    const end = Math.max(startDate.getTime(), endDate.getTime());
    
    cells.forEach(cell => {
        const cellDate = new Date(cell.dataset.date).getTime();
        if (cellDate >= start && cellDate <= end) {
            cell.classList.add('drag-over');
        } else {
            cell.classList.remove('drag-over');
        }
    });
}

function clearDragSelection() {
    document.querySelectorAll('.calendar-cell').forEach(cell => {
        cell.classList.remove('dragging', 'drag-over');
    });
    dragStartDate = null;
    dragEndDate = null;
}

function openEventModalWithRange(startDate, endDate) {
    const start = new Date(Math.min(startDate.getTime(), endDate.getTime()));
    const end = new Date(Math.max(startDate.getTime(), endDate.getTime()));
    
    openEventModal(null, start);
    document.getElementById('eventEndDate').value = formatDate(end);
}

function showEventDetails(event) {
    let details = `標題: ${event.title}\n`;
    details += `日期: ${event.date}`;
    if (event.endDate) {
        details += ` 至 ${event.endDate}`;
    }
    details += '\n';
    
    if (event.allDay) {
        details += '整天活動\n';
    } else {
        details += `時間: ${event.startTime} - ${event.endTime}\n`;
    }
    
    if (event.description) {
        details += `說明: ${event.description}`;
    }
    
    alert(details);
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
    if (!isAuthenticated && !event) {
        showAuthModal();
        return;
    }
    
    selectedEvent = event;
    const modal = document.getElementById('eventModal');
    const form = document.getElementById('eventForm');
    const modalTitle = document.getElementById('modalTitle');
    const deleteBtn = document.getElementById('deleteBtn');
    
    if (event) {
        modalTitle.textContent = '編輯事件';
        form.eventTitle.value = event.title;
        form.eventDate.value = event.date;
        form.eventEndDate.value = event.endDate || '';
        form.allDayEvent.checked = event.allDay || false;
        form.eventStartTime.value = event.startTime || '';
        form.eventEndTime.value = event.endTime || '';
        form.eventDescription.value = event.description || '';
        form.eventColor.value = event.color;
        deleteBtn.style.display = isAuthenticated ? 'inline-block' : 'none';
    } else {
        modalTitle.textContent = '新增事件';
        form.reset();
        if (date) {
            form.eventDate.value = formatDate(date);
        }
        form.eventColor.value = '#4285f4';
        deleteBtn.style.display = 'none';
    }
    
    toggleTimeInputs();
    modal.style.display = 'block';
}

function closeEventModal() {
    document.getElementById('eventModal').style.display = 'none';
    selectedEvent = null;
    clearDragSelection();
}

function saveEvent(e) {
    e.preventDefault();
    
    if (!isAuthenticated) {
        showAuthModal();
        return;
    }
    
    const form = e.target;
    const eventData = {
        id: selectedEvent ? selectedEvent.id : Date.now().toString(),
        title: form.eventTitle.value,
        date: form.eventDate.value,
        endDate: form.eventEndDate.value || null,
        allDay: form.allDayEvent.checked,
        startTime: form.allDayEvent.checked ? null : form.eventStartTime.value,
        endTime: form.allDayEvent.checked ? null : form.eventEndTime.value,
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
    if (!isAuthenticated) {
        showAuthModal();
        return;
    }
    
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
    return events.filter(event => {
        if (event.endDate) {
            const eventStart = new Date(event.date);
            const eventEnd = new Date(event.endDate);
            const checkDate = new Date(dateStr);
            return checkDate >= eventStart && checkDate <= eventEnd;
        }
        return event.date === dateStr;
    });
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Add global mouse up event to clear drag selection
document.addEventListener('mouseup', () => {
    if (dragStartDate && !dragEndDate) {
        clearDragSelection();
    }
});

document.addEventListener('DOMContentLoaded', init);