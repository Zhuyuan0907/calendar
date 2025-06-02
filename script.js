// 管理員密碼設定（請修改成你想要的密碼）
const ADMIN_PASSWORD = 'mySecretPassword123';
const SECRET_KEY = 'mySecretKey456'; // 用於生成動態連結

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
    // 檢查是否為管理員模式
    if (window.isAdminMode) {
        checkAdminAuth();
    } else {
        isAuthenticated = false;
        // 在主頁面隱藏管理員入口
        setupSecretAccess();
    }
    
    renderCalendar();
    setupEventListeners();
    loadEvents();
}

function setupSecretAccess() {
    // 按下 Ctrl+Shift+A (或 Cmd+Shift+A 在 Mac) 顯示管理員連結
    let keys = {};
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && keys['A']) {
            e.preventDefault();
            showAdminLink();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        delete keys[e.key];
    });
}

function showAdminLink() {
    const token = generateDynamicToken();
    const adminUrl = `admin.html?token=${token}`;
    
    console.log('%c🔐 管理員連結（10分鐘內有效）：', 'color: #1a73e8; font-weight: bold; font-size: 14px');
    console.log('%c' + window.location.origin + '/' + adminUrl, 'color: #0f9d58; font-size: 12px');
    console.log('%c請記住您的密碼才能進入！', 'color: #f4b400; font-size: 12px');
    
    // 同時顯示提示
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1a73e8;
        color: white;
        padding: 16px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 9999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    message.textContent = '管理員連結已在控制台顯示（F12）';
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 3000);
}

function generateDynamicToken() {
    const timestamp = Date.now();
    const data = timestamp + ':' + SECRET_KEY;
    // 簡單的編碼，實際應用應使用更安全的加密方法
    return btoa(data);
}

function validateToken(token) {
    try {
        const decoded = atob(token);
        const [timestamp, key] = decoded.split(':');
        
        // 檢查密鑰
        if (key !== SECRET_KEY) {
            return false;
        }
        
        // 檢查時間（10分鐘有效期）
        const tokenTime = parseInt(timestamp);
        const currentTime = Date.now();
        const tenMinutes = 10 * 60 * 1000;
        
        return (currentTime - tokenTime) < tenMinutes;
    } catch (e) {
        return false;
    }
}

function checkAdminAuth() {
    // 檢查 URL 參數
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token && validateToken(token)) {
        // Token 有效，顯示密碼輸入框
        showPasswordModal();
    } else {
        // Token 無效或過期
        alert('連結無效或已過期，請重新獲取管理員連結');
        window.location.href = 'index.html';
    }
}

function showPasswordModal() {
    // 創建密碼輸入模態框
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <h3 style="margin-bottom: 24px;">請輸入管理員密碼</h3>
            <form id="passwordForm">
                <input type="password" id="adminPassword" placeholder="密碼" required style="width: 100%; padding: 12px; margin-bottom: 16px; border: 1px solid #dadce0; border-radius: 4px;">
                <div class="modal-buttons">
                    <button type="submit" class="save-btn">確認</button>
                    <button type="button" class="cancel-btn" onclick="window.location.href='index.html'">取消</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('passwordForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('adminPassword').value;
        
        if (password === ADMIN_PASSWORD) {
            isAuthenticated = true;
            localStorage.setItem('adminAuth', btoa(password + ':' + Date.now()));
            modal.remove();
            // 重新載入頁面以套用管理員權限
            location.reload();
        } else {
            alert('密碼錯誤');
            document.getElementById('adminPassword').value = '';
        }
    });
}

function setupEventListeners() {
    document.getElementById('prevBtn').addEventListener('click', () => navigateMonth(-1));
    document.getElementById('nextBtn').addEventListener('click', () => navigateMonth(1));
    document.getElementById('todayBtn').addEventListener('click', goToToday);
    document.getElementById('viewSelector').addEventListener('change', changeView);
    
    const createBtn = document.getElementById('createBtn');
    if (createBtn) {
        createBtn.addEventListener('click', () => openEventModal());
    }
    
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeEventModal);
    }
    
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeEventModal);
    }
    
    const eventForm = document.getElementById('eventForm');
    if (eventForm) {
        eventForm.addEventListener('submit', saveEvent);
    }
    
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteEvent);
    }
    
    const allDayCheckbox = document.getElementById('allDayEvent');
    if (allDayCheckbox) {
        allDayCheckbox.addEventListener('change', toggleTimeInputs);
    }
    
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('eventModal');
        if (e.target === modal) {
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
    calendarGrid.style.gridTemplateRows = '';
    calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
    
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
    
    // Add drag functionality only for admin
    if (isAuthenticated) {
        cell.addEventListener('click', () => {
            if (!dragStartDate) {
                openEventModal(null, date);
            }
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
            if (dragStartDate && dragEndDate && dragStartDate !== dragEndDate) {
                openEventModalWithRange(dragStartDate, dragEndDate);
            }
            clearDragSelection();
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
    calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
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
    if (!isAuthenticated) {
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
    
    toggleTimeInputs();
    modal.style.display = 'flex';
}

function closeEventModal() {
    const modal = document.getElementById('eventModal');
    if (modal) {
        modal.style.display = 'none';
    }
    selectedEvent = null;
    clearDragSelection();
}

function saveEvent(e) {
    e.preventDefault();
    
    if (!isAuthenticated) {
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

// 檢查管理員頁面的認證狀態
if (window.isAdminMode) {
    // 檢查 localStorage 的認證
    const adminAuth = localStorage.getItem('adminAuth');
    if (adminAuth) {
        try {
            const [password, timestamp] = atob(adminAuth).split(':');
            // 檢查密碼和時間（24小時有效）
            if (password === ADMIN_PASSWORD && (Date.now() - parseInt(timestamp)) < 24 * 60 * 60 * 1000) {
                isAuthenticated = true;
            }
        } catch (e) {
            console.error('Invalid auth data');
        }
    }
}

document.addEventListener('DOMContentLoaded', init);