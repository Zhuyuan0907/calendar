// 管理員密碼設定（請修改成你想要的密碼）
const ADMIN_PASSWORD = 'zhuyuan0907';
const SECRET_KEY = 'zhuyuan0907'; // 用於生成動態連結

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
    console.log('Init called - isAdminMode:', window.isAdminMode, 'isAuthenticated:', isAuthenticated);
    
    // 檢查是否為管理員模式
    if (window.isAdminMode) {
        checkAdminAuth();
    } else {
        isAuthenticated = false;
        // 在主頁面隱藏管理員入口
        setupSecretAccess();
    }
    
    console.log('After checkAdminAuth - isAuthenticated:', isAuthenticated);
    
    renderCalendar();
    setupEventListeners();
    loadEvents();
    renderUpcomingEvents();
    
    // 更新 UI 以顯示管理員功能
    updateAdminUI();
    
    // 設置定時器來更新即將到來的事件
    setInterval(() => {
        renderUpcomingEvents();
    }, 60000); // 每分鐘更新一次
}

function updateAdminUI() {
    if (isAuthenticated && window.isAdminMode) {
        console.log('Updating UI for authenticated admin');
        // 確保創建按鈕可見
        const createBtn = document.getElementById('createBtn');
        if (createBtn) {
            createBtn.style.display = 'flex';
        }
        
        // 添加視覺提示
        document.body.classList.add('admin-authenticated');
    } else {
        console.log('Not in admin mode or not authenticated');
        document.body.classList.remove('admin-authenticated');
    }
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
    // 如果已經認證，不需要再次檢查
    if (isAuthenticated) {
        console.log('Already authenticated, skipping auth check');
        return;
    }
    
    // 檢查 URL 參數
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token && validateToken(token)) {
        // Token 有效，顯示密碼輸入框
        showPasswordModal();
    } else if (!isAuthenticated) {
        // Token 無效或過期，且未認證
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
    
    // 添加手機選單切換功能
    const menuBtn = document.querySelector('.menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const mobileOverlay = document.getElementById('mobileOverlay');
    
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            sidebar?.classList.toggle('active');
            mobileOverlay?.classList.toggle('active');
        });
    }
    
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', () => {
            sidebar?.classList.remove('active');
            mobileOverlay.classList.remove('active');
        });
    }
    
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
    
    // 手機版選單按鈕
    const menuBtn = document.querySelector('.menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', toggleMobileMenu);
    }
    
    // 手機版遮罩層
    const mobileOverlay = document.getElementById('mobileOverlay');
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', closeMobileMenu);
    }
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
    const firstDayOfWeek = firstDay.getDay();
    const lastDateOfMonth = lastDay.getDate();
    
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    calendarGrid.style.gridTemplateRows = 'repeat(6, 1fr)';
    calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
    
    // 添加空白格子來填充第一週之前的空間
    for (let i = 0; i < firstDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-cell empty-cell';
        calendarGrid.appendChild(emptyCell);
    }
    
    // 只渲染當前月份的日期
    for (let date = 1; date <= lastDateOfMonth; date++) {
        const cell = createCalendarCell(new Date(year, month, date), false);
        calendarGrid.appendChild(cell);
    }
    
    // 添加空白格子來填充最後一週之後的空間
    const totalCells = firstDayOfWeek + lastDateOfMonth;
    const remainingCells = 42 - totalCells;
    for (let i = 0; i < remainingCells; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-cell empty-cell';
        calendarGrid.appendChild(emptyCell);
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
    
    // 創建事件容器
    const eventsContainer = document.createElement('div');
    eventsContainer.className = 'events-container';
    
    // 獲取當天的事件
    const dayEvents = getEventsForDate(date);
    const maxEventsToShow = 3; // 最多顯示3個事件
    
    dayEvents.slice(0, maxEventsToShow).forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.className = 'event';
        eventElement.style.backgroundColor = event.color;
        
        // 創建事件內容結構
        if (!event.allDay && event.startTime) {
            const eventTime = document.createElement('span');
            eventTime.className = 'event-time';
            eventTime.textContent = event.startTime;
            eventElement.appendChild(eventTime);
        }
        
        const eventTitle = document.createElement('span');
        eventTitle.className = 'event-title';
        eventTitle.textContent = event.title;
        eventElement.appendChild(eventTitle);
        
        eventElement.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Event clicked - isAuthenticated:', isAuthenticated);
            if (isAuthenticated) {
                openEventModal(event);
            } else {
                showEventDetails(event);
            }
        });
        eventsContainer.appendChild(eventElement);
    });
    
    // 如果有更多事件，顯示提示
    if (dayEvents.length > maxEventsToShow) {
        const moreEvents = document.createElement('div');
        moreEvents.className = 'more-events';
        moreEvents.textContent = `還有 ${dayEvents.length - maxEventsToShow} 個事件`;
        eventsContainer.appendChild(moreEvents);
    }
    
    cell.appendChild(eventsContainer);
    
    // Add drag functionality only for admin
    console.log('Creating cell for date:', date, 'isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
        cell.addEventListener('click', () => {
            console.log('Cell clicked - isAuthenticated:', isAuthenticated, 'dragStartDate:', dragStartDate);
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
    renderUpcomingEvents();
}

function goToToday() {
    currentDate = new Date();
    renderCalendar();
    renderUpcomingEvents();
}

function changeView() {
    currentView = document.getElementById('viewSelector').value;
    renderCalendar();
}

function openEventModal(event = null, date = null) {
    console.log('openEventModal called - isAuthenticated:', isAuthenticated);
    if (!isAuthenticated) {
        console.log('Not authenticated, cannot open modal');
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
        form.eventColor.value = '#3b82f6';
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
    renderUpcomingEvents();
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
        renderUpcomingEvents();
        closeEventModal();
    }
}

function saveEvents() {
    localStorage.setItem('calendarEvents', JSON.stringify(events));
    renderUpcomingEvents();
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

// 在頁面載入時立即檢查認證狀態
if (window.isAdminMode) {
    // 檢查 localStorage 的認證
    const adminAuth = localStorage.getItem('adminAuth');
    if (adminAuth) {
        try {
            const [password, timestamp] = atob(adminAuth).split(':');
            // 檢查密碼和時間（24小時有效）
            if (password === ADMIN_PASSWORD && (Date.now() - parseInt(timestamp)) < 24 * 60 * 60 * 1000) {
                isAuthenticated = true;
                console.log('Auth restored from localStorage');
            }
        } catch (e) {
            console.error('Invalid auth data');
        }
    }
}

// 渲染即將到來的事件
function renderUpcomingEvents() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
        // 如果側邊欄不存在，創建它
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            const newSidebar = document.createElement('div');
            newSidebar.className = 'sidebar';
            
            // 創建按鈕（只在管理員模式下顯示）
            if (isAuthenticated) {
                const createBtn = document.createElement('button');
                createBtn.id = 'createBtn';
                createBtn.className = 'create-btn';
                createBtn.innerHTML = '<span class="plus-icon">+</span> 新增事件';
                createBtn.addEventListener('click', () => openEventModal());
                newSidebar.appendChild(createBtn);
            }
            
            // 創建即將到來的事件區域
            const upcomingSection = document.createElement('div');
            upcomingSection.className = 'upcoming-events';
            upcomingSection.innerHTML = '<h3>即將到來的事件</h3><div id="upcomingEventsList"></div>';
            newSidebar.appendChild(upcomingSection);
            
            mainContent.insertBefore(newSidebar, mainContent.firstChild);
        }
    }
    
    const upcomingEventsList = document.getElementById('upcomingEventsList');
    if (!upcomingEventsList) return;
    
    const now = new Date();
    const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    // 過濾和排序即將到來的事件
    const upcomingEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        if (event.startTime && !event.allDay) {
            const [hours, minutes] = event.startTime.split(':');
            eventDate.setHours(parseInt(hours), parseInt(minutes));
        }
        return eventDate >= now && eventDate <= fourteenDaysLater;
    }).sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (a.startTime && !a.allDay) {
            const [hoursA, minutesA] = a.startTime.split(':');
            dateA.setHours(parseInt(hoursA), parseInt(minutesA));
        }
        if (b.startTime && !b.allDay) {
            const [hoursB, minutesB] = b.startTime.split(':');
            dateB.setHours(parseInt(hoursB), parseInt(minutesB));
        }
        return dateA - dateB;
    });
    
    upcomingEventsList.innerHTML = '';
    
    if (upcomingEvents.length === 0) {
        upcomingEventsList.innerHTML = '<div class="no-events">沒有即將到來的事件</div>';
        return;
    }
    
    // 顯示最多10個即將到來的事件
    upcomingEvents.slice(0, 10).forEach(event => {
        const eventItem = document.createElement('div');
        eventItem.className = 'upcoming-event-item';
        eventItem.style.borderLeftColor = event.color;
        
        const eventDate = new Date(event.date);
        const eventTimeStr = formatEventTime(eventDate, event);
        
        eventItem.innerHTML = `
            <div class="upcoming-event-time">${eventTimeStr}</div>
            <div class="upcoming-event-title">${event.title}</div>
        `;
        
        eventItem.addEventListener('click', () => {
            if (isAuthenticated) {
                openEventModal(event);
            } else {
                showEventDetails(event);
            }
        });
        
        upcomingEventsList.appendChild(eventItem);
    });
}

// 格式化事件時間顯示
function formatEventTime(date, event) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateOptions = { month: 'numeric', day: 'numeric' };
    let dateStr = '';
    
    if (date.toDateString() === now.toDateString()) {
        dateStr = '今天';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        dateStr = '明天';
    } else {
        dateStr = date.toLocaleDateString('zh-TW', dateOptions);
    }
    
    if (event.allDay) {
        return `${dateStr} · 整天`;
    } else if (event.startTime) {
        return `${dateStr} · ${event.startTime}`;
    } else {
        return dateStr;
    }
}

// 新增：渲染即將到來的事件
function renderUpcomingEvents() {
    const upcomingList = document.getElementById('upcomingEventsList');
    if (!upcomingList) return;
    
    const now = new Date();
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    // 獲取所有事件並排序
    const upcomingEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        if (event.allDay) {
            eventDate.setHours(23, 59, 59);
        } else {
            const [hours, minutes] = event.startTime.split(':');
            eventDate.setHours(parseInt(hours), parseInt(minutes));
        }
        return eventDate > now && eventDate <= twoWeeksLater;
    }).sort((a, b) => {
        const dateA = new Date(a.date + ' ' + (a.startTime || '00:00'));
        const dateB = new Date(b.date + ' ' + (b.startTime || '00:00'));
        return dateA - dateB;
    });
    
    upcomingList.innerHTML = '';
    
    if (upcomingEvents.length === 0) {
        upcomingList.innerHTML = '<div class="no-events">未來兩週沒有事件</div>';
        return;
    }
    
    // 顯示最多10個事件
    upcomingEvents.slice(0, 10).forEach(event => {
        const eventItem = document.createElement('div');
        eventItem.className = 'upcoming-event-item';
        eventItem.style.borderLeftColor = event.color;
        
        const eventDate = new Date(event.date);
        const dateStr = formatEventDate(eventDate);
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'upcoming-event-time';
        if (event.allDay) {
            timeDiv.textContent = dateStr + ' - 整天';
        } else {
            timeDiv.textContent = dateStr + ' ' + event.startTime;
        }
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'upcoming-event-title';
        titleDiv.textContent = event.title;
        
        eventItem.appendChild(timeDiv);
        eventItem.appendChild(titleDiv);
        
        eventItem.addEventListener('click', () => {
            if (isAuthenticated) {
                openEventModal(event);
            } else {
                showEventDetails(event);
            }
        });
        
        upcomingList.appendChild(eventItem);
    });
}

function formatEventDate(date) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
        return '今天';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return '明天';
    } else {
        return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
}

// 新增：手機版選單切換
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobileOverlay');
    if (sidebar) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

function closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobileOverlay');
    if (sidebar) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
}

// 初始化函數
window.addEventListener('DOMContentLoaded', init);