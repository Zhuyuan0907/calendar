// Calendar Application
class CalendarApp {
    constructor() {
        this.currentDate = new Date();
        this.currentView = 'month';
        this.events = [];
        this.categories = {};
        this.settings = {};
        this.selectedCategory = '';
        this.searchQuery = '';
        
        this.init();
    }
    
    async init() {
        await this.loadEvents();
        this.setupEventListeners();
        this.render();
        this.updateMiniCalendar();
        this.updateUpcomingEvents();
        this.updateMobileUpcomingEvents();
        this.updateCategoryLegend();
        this.checkTheme();
    }
    
    async loadEvents() {
        try {
            const response = await fetch('events.json');
            const data = await response.json();
            this.events = data.events;
            this.categories = data.categories;
            this.settings = data.settings;
            
            // 處理重複事件
            this.processRecurringEvents();
            
            // 更新分類過濾器
            this.updateCategoryFilter();
        } catch (error) {
            console.error('Failed to load events:', error);
            this.events = [];
        }
    }
    
    processRecurringEvents() {
        const processedEvents = [];
        const endDate = new Date(this.currentDate.getFullYear() + 1, 11, 31); // 處理到明年年底
        
        this.events.forEach(event => {
            if (event.recurrence && event.recurrence.type !== 'none') {
                const recurring = this.generateRecurringEvents(event, endDate);
                processedEvents.push(...recurring);
            } else {
                processedEvents.push(event);
            }
        });
        
        this.events = processedEvents;
    }
    
    generateRecurringEvents(event, endDate) {
        const events = [];
        const startDate = new Date(event.startDate);
        const eventEndDate = new Date(event.endDate);
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const newEvent = {
                ...event,
                id: `${event.id}_${currentDate.getTime()}`,
                startDate: this.formatDate(currentDate),
                endDate: this.formatDate(new Date(currentDate.getTime() + (eventEndDate - startDate))),
                originalId: event.id
            };
            
            events.push(newEvent);
            
            // 計算下一個重複日期
            switch (event.recurrence.type) {
                case 'daily':
                    currentDate.setDate(currentDate.getDate() + event.recurrence.interval);
                    break;
                case 'weekly':
                    currentDate.setDate(currentDate.getDate() + 7 * event.recurrence.interval);
                    break;
                case 'monthly':
                    currentDate.setMonth(currentDate.getMonth() + event.recurrence.interval);
                    break;
                case 'yearly':
                    currentDate.setFullYear(currentDate.getFullYear() + event.recurrence.interval);
                    break;
            }
        }
        
        return events;
    }
    
    setupEventListeners() {
        // 導航按鈕
        document.getElementById('prevBtn').addEventListener('click', () => this.navigate(-1));
        document.getElementById('nextBtn').addEventListener('click', () => this.navigate(1));
        document.getElementById('todayBtn').addEventListener('click', () => this.goToToday());
        
        // 視圖切換
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });
        
        // 主題切換
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // 搜尋
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.render();
            this.updateMobileUpcomingEvents();
        });
        
        // 分類過濾
        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.selectedCategory = e.target.value;
            this.render();
            this.updateMobileUpcomingEvents();
        });
        
        // 匯出功能
        document.getElementById('exportBtn').addEventListener('click', () => this.exportEvents());
        
        // 模態視窗關閉
        document.querySelector('.modal-close').addEventListener('click', () => this.closeModal());
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });
        
        // 視窗大小變化時重新渲染（用於響應式設計）
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.currentView === 'week' || this.currentView === 'day') {
                    this.render();
                }
            }, 250);
        });
    }
    
    navigate(direction) {
        switch (this.currentView) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + direction);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + (7 * direction));
                break;
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + direction);
                break;
        }
        this.render();
        this.updateMiniCalendar();
        this.updateMobileUpcomingEvents();
    }
    
    goToToday() {
        this.currentDate = new Date();
        // 在手機版只需要更新即將到來的事件
        if (window.innerWidth <= 768) {
            this.updateMobileUpcomingEvents();
        } else {
            this.render();
            this.updateMiniCalendar();
            this.updateMobileUpcomingEvents();
        }
    }
    
    switchView(view) {
        this.currentView = view;
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        document.querySelectorAll('.view-container').forEach(container => {
            container.classList.remove('active');
        });
        document.getElementById(`${view}View`).classList.add('active');
        this.render();
    }
    
    render() {
        switch (this.currentView) {
            case 'month':
                this.renderMonthView();
                break;
            case 'week':
                this.renderWeekView();
                break;
            case 'day':
                this.renderDayView();
                break;
            case 'list':
                this.renderListView();
                break;
        }
        this.updatePeriodDisplay();
    }
    
    renderMonthView() {
        const calendar = document.getElementById('calendar');
        calendar.innerHTML = '';
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const prevLastDay = new Date(year, month, 0);
        
        const firstDayOfWeek = firstDay.getDay();
        const totalDays = lastDay.getDate();
        const prevDays = prevLastDay.getDate();
        
        // 上個月的日期
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = prevDays - i;
            const date = new Date(year, month - 1, day);
            this.createDayElement(date, true);
        }
        
        // 當月的日期
        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(year, month, day);
            this.createDayElement(date, false);
        }
        
        // 下個月的日期
        const remainingDays = 42 - (firstDayOfWeek + totalDays);
        for (let day = 1; day <= remainingDays; day++) {
            const date = new Date(year, month + 1, day);
            this.createDayElement(date, true);
        }
    }
    
    createDayElement(date, isOtherMonth) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        if (isOtherMonth) dayEl.classList.add('other-month');
        if (this.isToday(date)) dayEl.classList.add('today');
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();
        dayEl.appendChild(dayNumber);
        
        const events = this.getEventsForDate(date);
        if (events.length > 0) {
            const eventsContainer = document.createElement('div');
            eventsContainer.className = 'day-events';
            
            events.slice(0, 3).forEach(event => {
                const eventEl = document.createElement('div');
                eventEl.className = `event-item event-${event.category}`;
                eventEl.textContent = event.title;
                eventEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showEventDetails(event);
                });
                eventsContainer.appendChild(eventEl);
            });
            
            if (events.length > 3) {
                const moreEl = document.createElement('div');
                moreEl.className = 'event-item more-events';
                moreEl.textContent = `+${events.length - 3} 更多`;
                moreEl.style.background = '#94a3b8';
                eventsContainer.appendChild(moreEl);
            }
            
            dayEl.appendChild(eventsContainer);
        }
        
        dayEl.addEventListener('click', () => this.onDayClick(date));
        document.getElementById('calendar').appendChild(dayEl);
    }
    
    renderWeekView() {
        const weekDays = document.getElementById('weekDays');
        const weekGrid = document.getElementById('weekGrid');
        const timeColumn = document.getElementById('timeColumn');
        
        weekDays.innerHTML = '';
        weekGrid.innerHTML = '';
        timeColumn.innerHTML = '';
        
        // 獲取本週的日期
        const startOfWeek = this.getStartOfWeek(this.currentDate);
        
        // 渲染星期標題
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            
            const dayHeader = document.createElement('div');
            dayHeader.className = 'week-day-header';
            dayHeader.innerHTML = `
                <div class="week-day-name">${this.getDayName(date.getDay())}</div>
                <div class="week-day-date ${this.isToday(date) ? 'today' : ''}">${date.getDate()}</div>
            `;
            weekDays.appendChild(dayHeader);
        }
        
        // 渲染時間軸
        for (let hour = 0; hour < 24; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.textContent = `${hour.toString().padStart(2, '0')}:00`;
            timeColumn.appendChild(timeSlot);
        }
        
        // 渲染週視圖網格
        const isMobile = window.innerWidth <= 768;
        const hourHeight = isMobile ? 40 : 60;
        const totalHeight = 24 * hourHeight;
        
        weekGrid.style.position = 'relative';
        weekGrid.style.height = `${totalHeight}px`;
        
        for (let i = 0; i < 7; i++) {
            const dayColumn = document.createElement('div');
            dayColumn.className = 'week-day-column';
            dayColumn.style.position = 'relative';
            dayColumn.style.height = `${totalHeight}px`;
            
            // 創建時間背景格子
            for (let hour = 0; hour < 24; hour++) {
                const hourSlot = document.createElement('div');
                hourSlot.className = 'hour-slot';
                hourSlot.style.height = `${hourHeight}px`;
                hourSlot.style.borderBottom = '1px solid var(--border)';
                dayColumn.appendChild(hourSlot);
            }
            
            // 添加當天的事件
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            const events = this.getEventsForDate(date);
            
            events.forEach(event => {
                if (!event.allDay && event.startTime) {
                    const eventEl = this.createWeekEventElement(event, date);
                    dayColumn.appendChild(eventEl);
                }
            });
            
            weekGrid.appendChild(dayColumn);
        }
    }
    
    renderDayView() {
        const dayTitle = document.getElementById('dayTitle');
        const dayEvents = document.getElementById('dayEvents');
        const dayTimeColumn = document.getElementById('dayTimeColumn');
        
        dayTitle.textContent = this.formatDateLong(this.currentDate);
        dayEvents.innerHTML = '';
        dayTimeColumn.innerHTML = '';
        
        // 渲染時間軸
        for (let hour = 0; hour < 24; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.textContent = `${hour.toString().padStart(2, '0')}:00`;
            dayTimeColumn.appendChild(timeSlot);
        }
        
        // 清空並重新設置日事件容器
        dayEvents.innerHTML = '';
        dayEvents.style.position = 'relative';
        
        // 根據螢幕寬度調整時間軸高度
        const isMobile = window.innerWidth <= 768;
        const hourHeight = isMobile ? 40 : 60;
        const totalHeight = 24 * hourHeight;
        
        dayEvents.style.height = `${totalHeight}px`;
        dayEvents.style.overflow = 'visible';
        
        // 渲染當天事件
        const events = this.getEventsForDate(this.currentDate);
        
        // 時間事件 - 直接添加到容器
        const timeEvents = events.filter(e => !e.allDay && e.startTime);
        timeEvents.forEach(event => {
            const eventEl = this.createDayEventElement(event);
            dayEvents.appendChild(eventEl);
        });
        
        // 全天事件 - 添加到頂部
        const allDayEvents = events.filter(e => e.allDay);
        if (allDayEvents.length > 0) {
            const allDayContainer = document.createElement('div');
            allDayContainer.className = 'all-day-events-fixed';
            allDayContainer.innerHTML = '<h4>全天事件</h4>';
            
            allDayEvents.forEach(event => {
                const eventEl = document.createElement('div');
                eventEl.className = `event-item event-${event.category}`;
                eventEl.textContent = event.title;
                eventEl.addEventListener('click', () => this.showEventDetails(event));
                allDayContainer.appendChild(eventEl);
            });
            
            // 添加到父容器而不是dayEvents
            const dayContent = document.querySelector('.day-content');
            dayContent.insertBefore(allDayContainer, dayEvents);
        }
    }
    
    renderListView() {
        const eventsList = document.getElementById('eventsList');
        eventsList.innerHTML = '';
        
        // 獲取未來30天的事件
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        
        const upcomingEvents = this.getEventsBetweenDates(new Date(), endDate);
        
        // 按日期分組
        const groupedEvents = {};
        upcomingEvents.forEach(event => {
            const dateKey = event.startDate;
            if (!groupedEvents[dateKey]) {
                groupedEvents[dateKey] = [];
            }
            groupedEvents[dateKey].push(event);
        });
        
        // 渲染事件列表
        Object.keys(groupedEvents).sort().forEach(dateKey => {
            const date = new Date(dateKey);
            const dateHeader = document.createElement('h3');
            dateHeader.className = 'list-date-header';
            dateHeader.textContent = this.formatDateLong(date);
            eventsList.appendChild(dateHeader);
            
            groupedEvents[dateKey].forEach(event => {
                const eventItem = document.createElement('div');
                eventItem.className = 'list-event-item';
                eventItem.innerHTML = `
                    <div class="event-date-block">
                        <div class="month">${this.getMonthShort(date.getMonth())}</div>
                        <div class="day">${date.getDate()}</div>
                    </div>
                    <div class="event-details">
                        <h4>${event.title}</h4>
                        <p>${event.description || ''}</p>
                        <div class="event-meta">
                            ${event.startTime ? `<span>${event.startTime}</span>` : ''}
                            ${event.location ? `<span>${event.location}</span>` : ''}
                            <span class="event-category" style="background: ${this.categories[event.category]?.color}">${this.categories[event.category]?.name}</span>
                        </div>
                    </div>
                `;
                eventItem.addEventListener('click', () => this.showEventDetails(event));
                eventsList.appendChild(eventItem);
            });
        });
    }
    
    createWeekEventElement(event, date) {
        const eventEl = document.createElement('div');
        eventEl.className = `week-event event-${event.category}`;
        
        const startHour = parseInt(event.startTime.split(':')[0]);
        const startMinute = parseInt(event.startTime.split(':')[1]);
        const endHour = event.endTime ? parseInt(event.endTime.split(':')[0]) : startHour + 1;
        const endMinute = event.endTime ? parseInt(event.endTime.split(':')[1]) : 0;
        
        // 根據螢幕寬度調整時間軸高度
        const isMobile = window.innerWidth <= 768;
        const hourHeight = isMobile ? 40 : 60;
        
        const top = startHour * hourHeight + (startMinute * hourHeight / 60);
        const endPos = endHour * hourHeight + (endMinute * hourHeight / 60);
        const height = Math.max(endPos - top, isMobile ? 25 : 30);
        
        // 明確設定樣式
        eventEl.style.position = 'absolute';
        eventEl.style.top = `${top}px`;
        eventEl.style.height = `${height}px`;
        eventEl.style.left = '4px';
        eventEl.style.right = '4px';
        eventEl.style.zIndex = '100';
        eventEl.style.backgroundColor = event.color || '#3b82f6';
        eventEl.style.color = 'white';
        eventEl.style.padding = '4px';
        eventEl.style.borderRadius = '4px';
        eventEl.style.fontSize = '11px';
        eventEl.style.overflow = 'hidden';
        eventEl.style.cursor = 'pointer';
        eventEl.style.boxSizing = 'border-box';
        eventEl.style.lineHeight = '1.1';
        
        console.log(`Week Event: ${event.title} at ${event.startTime} -> top: ${top}px, height: ${height}px`);
        
        // 根據事件高度調整內容顯示
        let content = '';
        if (height >= 50) {
            // 高度足夠時顯示時間和標題
            content = `
                <div style="font-size: 10px; font-weight: bold;">${event.startTime}</div>
                <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${event.title}</div>
            `;
        } else if (height >= 30) {
            // 較小高度時只顯示標題
            content = `<div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 10px;">${event.title}</div>`;
        }
        
        eventEl.innerHTML = content;
        eventEl.addEventListener('click', () => this.showEventDetails(event));
        
        return eventEl;
    }
    
    createDayEventElement(event) {
        const eventEl = document.createElement('div');
        eventEl.className = `day-event event-${event.category}`;
        
        const startHour = parseInt(event.startTime.split(':')[0]);
        const startMinute = parseInt(event.startTime.split(':')[1]);
        const endHour = event.endTime ? parseInt(event.endTime.split(':')[0]) : startHour + 1;
        const endMinute = event.endTime ? parseInt(event.endTime.split(':')[1]) : 0;
        
        // 根據螢幕寬度調整時間軸高度
        const isMobile = window.innerWidth <= 768;
        const hourHeight = isMobile ? 40 : 60;
        
        const top = startHour * hourHeight + (startMinute * hourHeight / 60);
        const endPos = endHour * hourHeight + (endMinute * hourHeight / 60);
        const height = Math.max(endPos - top, isMobile ? 30 : 40);
        
        // 明確設定樣式
        eventEl.style.position = 'absolute';
        eventEl.style.top = `${top}px`;
        eventEl.style.height = `${height}px`;
        eventEl.style.left = '8px';
        eventEl.style.right = '8px';
        eventEl.style.zIndex = '100';
        eventEl.style.backgroundColor = event.color || '#3b82f6';
        eventEl.style.color = 'white';
        eventEl.style.padding = '6px';
        eventEl.style.borderRadius = '6px';
        eventEl.style.fontSize = '12px';
        eventEl.style.overflow = 'hidden';
        eventEl.style.cursor = 'pointer';
        eventEl.style.boxSizing = 'border-box';
        eventEl.style.wordWrap = 'break-word';
        eventEl.style.lineHeight = '1.2';
        
        console.log(`Day Event: ${event.title} at ${event.startTime} -> top: ${top}px, height: ${height}px`);
        
        // 根據事件高度調整內容顯示
        let content = `<div style="font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${event.title}</div>`;
        
        if (height >= 60) {
            // 高度足夠時顯示完整資訊
            content += `<div style="font-size: 11px; margin-top: 2px;">${event.startTime} - ${event.endTime || ''}</div>`;
            if (event.location && height >= 80) {
                content += `<div style="font-size: 10px; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;">${event.location}</div>`;
            }
        } else if (height >= 40) {
            // 中等高度時只顯示時間
            content += `<div style="font-size: 10px; margin-top: 1px;">${event.startTime}</div>`;
        }
        // 高度太小時只顯示標題
        
        eventEl.innerHTML = content;
        eventEl.addEventListener('click', () => this.showEventDetails(event));
        
        return eventEl;
    }
    
    getEventsForDate(date) {
        const dateStr = this.formatDate(date);
        return this.filterEvents(this.events.filter(event => {
            const eventStartDate = new Date(event.startDate);
            const eventEndDate = new Date(event.endDate);
            const checkDate = new Date(dateStr);
            
            return checkDate >= eventStartDate && checkDate <= eventEndDate;
        }));
    }
    
    getEventsBetweenDates(startDate, endDate) {
        return this.filterEvents(this.events.filter(event => {
            const eventStartDate = new Date(event.startDate);
            return eventStartDate >= startDate && eventStartDate <= endDate;
        }));
    }
    
    filterEvents(events) {
        return events.filter(event => {
            const matchesCategory = !this.selectedCategory || event.category === this.selectedCategory;
            const matchesSearch = !this.searchQuery || 
                event.title.toLowerCase().includes(this.searchQuery) ||
                (event.description && event.description.toLowerCase().includes(this.searchQuery));
            
            return matchesCategory && matchesSearch;
        });
    }
    
    showEventDetails(event) {
        const modal = document.getElementById('eventModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        modalTitle.textContent = event.title;
        
        modalBody.innerHTML = `
            <div class="event-detail">
                <div class="event-category-badge" style="background: ${this.categories[event.category]?.color}">
                    ${this.categories[event.category]?.name}
                </div>
                
                ${event.description ? `<p class="event-description">${event.description}</p>` : ''}
                
                <div class="event-info">
                    <div class="info-row">
                        <span class="info-label">日期：</span>
                        <span>${this.formatDateLong(new Date(event.startDate))}${event.startDate !== event.endDate ? ` - ${this.formatDateLong(new Date(event.endDate))}` : ''}</span>
                    </div>
                    
                    ${event.startTime ? `
                    <div class="info-row">
                        <span class="info-label">時間：</span>
                        <span>${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}</span>
                    </div>
                    ` : ''}
                    
                    ${event.location ? `
                    <div class="info-row">
                        <span class="info-label">地點：</span>
                        <span>${event.location}</span>
                    </div>
                    ` : ''}
                    
                    ${event.instructor ? `
                    <div class="info-row">
                        <span class="info-label">講師：</span>
                        <span>${event.instructor}</span>
                    </div>
                    ` : ''}
                    
                    ${event.participants ? `
                    <div class="info-row">
                        <span class="info-label">參與人數：</span>
                        <span>${event.participants} 人</span>
                    </div>
                    ` : ''}
                    
                    ${event.price ? `
                    <div class="info-row">
                        <span class="info-label">費用：</span>
                        <span>NT$ ${event.price.toLocaleString()}</span>
                    </div>
                    ` : ''}
                    
                    ${event.tags && event.tags.length > 0 ? `
                    <div class="info-row">
                        <span class="info-label">標籤：</span>
                        <div class="event-tags">
                            ${event.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                ${event.registrationUrl ? `
                <div class="event-actions">
                    <a href="${event.registrationUrl}" target="_blank" class="register-btn">立即報名</a>
                </div>
                ` : ''}
            </div>
        `;
        
        modal.style.display = 'block';
    }
    
    closeModal() {
        document.getElementById('eventModal').style.display = 'none';
    }
    
    onDayClick(date) {
        this.currentDate = new Date(date);
        this.switchView('day');
    }
    
    updatePeriodDisplay() {
        const periodEl = document.getElementById('currentPeriod');
        
        switch (this.currentView) {
            case 'month':
                periodEl.textContent = `${this.currentDate.getFullYear()}年${this.currentDate.getMonth() + 1}月`;
                break;
            case 'week':
                const startOfWeek = this.getStartOfWeek(this.currentDate);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(endOfWeek.getDate() + 6);
                periodEl.textContent = `${this.formatDateShort(startOfWeek)} - ${this.formatDateShort(endOfWeek)}`;
                break;
            case 'day':
                periodEl.textContent = this.formatDateLong(this.currentDate);
                break;
            case 'list':
                periodEl.textContent = '事件列表';
                break;
        }
    }
    
    updateMiniCalendar() {
        const miniCalendar = document.getElementById('miniCalendar');
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        miniCalendar.innerHTML = `<h4>${year}年${month + 1}月</h4>`;
        
        const miniGrid = document.createElement('div');
        miniGrid.className = 'mini-calendar-grid';
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const firstDayOfWeek = firstDay.getDay();
        const totalDays = lastDay.getDate();
        
        // 星期標題
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        weekdays.forEach(day => {
            const dayEl = document.createElement('div');
            dayEl.className = 'mini-weekday';
            dayEl.textContent = day;
            miniGrid.appendChild(dayEl);
        });
        
        // 空白日期
        for (let i = 0; i < firstDayOfWeek; i++) {
            const emptyEl = document.createElement('div');
            miniGrid.appendChild(emptyEl);
        }
        
        // 日期
        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(year, month, day);
            const dayEl = document.createElement('div');
            dayEl.className = 'mini-day';
            
            // 檢查是否是今天
            if (this.isToday(date)) dayEl.classList.add('today');
            
            // 檢查是否是選中的日期
            if (this.currentDate.getDate() === day && 
                this.currentDate.getMonth() === month && 
                this.currentDate.getFullYear() === year) {
                dayEl.classList.add('selected');
            }
            
            // 檢查是否有事件
            if (this.getEventsForDate(date).length > 0) dayEl.classList.add('has-events');
            
            dayEl.textContent = day;
            dayEl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Mini calendar clicked:', {
                    originalDate: date,
                    day: day,
                    month: month,
                    year: year
                });
                
                // 創建精確的日期對象
                const selectedDate = new Date(year, month, day);
                console.log('Created date:', selectedDate);
                
                // 更新當前日期
                this.currentDate = selectedDate;
                
                // 如果不是日視圖，切換到日視圖
                if (this.currentView !== 'day') {
                    console.log('Switching to day view');
                    this.switchView('day');
                } else {
                    console.log('Already in day view, just rendering');
                    this.render();
                }
                
                // 更新期間顯示
                this.updatePeriodDisplay();
                
                // 更新側邊欄
                this.updateMiniCalendar();
                this.updateUpcomingEvents();
                
                console.log('Mini calendar update complete');
            });
            miniGrid.appendChild(dayEl);
        }
        
        miniCalendar.appendChild(miniGrid);
    }
    
    updateUpcomingEvents() {
        const upcomingList = document.getElementById('upcomingList');
        upcomingList.innerHTML = '';
        
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const upcomingEvents = this.getEventsBetweenDates(today, nextWeek)
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
            .slice(0, 5);
        
        upcomingEvents.forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = 'upcoming-event';
            eventEl.innerHTML = `
                <div class="upcoming-date">${new Date(event.startDate).getDate()}</div>
                <div class="upcoming-details">
                    <h5>${event.title}</h5>
                    <p>${event.startTime || '全天'}</p>
                </div>
            `;
            eventEl.addEventListener('click', () => this.showEventDetails(event));
            upcomingList.appendChild(eventEl);
        });
        
        if (upcomingEvents.length === 0) {
            upcomingList.innerHTML = '<p class="no-events">接下來一週沒有事件</p>';
        }
    }
    
    updateMobileUpcomingEvents() {
        console.log('updateMobileUpcomingEvents called');
        
        const mobileUpcomingList = document.getElementById('mobileUpcomingList');
        const mobileUpcoming = document.getElementById('mobileUpcoming');
        
        console.log('mobileUpcoming element:', mobileUpcoming);
        console.log('mobileUpcomingList element:', mobileUpcomingList);
        
        if (!mobileUpcomingList) {
            console.log('Mobile upcoming list element not found');
            return;
        }
        
        // 先添加測試內容
        mobileUpcomingList.innerHTML = '<p style="color: red; font-size: 20px;">測試：手機版事件載入中...</p>';
        
        const today = new Date();
        const nextTwoWeeks = new Date();
        nextTwoWeeks.setDate(nextTwoWeeks.getDate() + 14);
        
        const upcomingEvents = this.getEventsBetweenDates(today, nextTwoWeeks)
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
            .slice(0, 8);
        
        console.log('Mobile upcoming events:', upcomingEvents.length);
        console.log('Events:', upcomingEvents);
        
        // 清空測試內容
        mobileUpcomingList.innerHTML = '';
        
        upcomingEvents.forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = 'mobile-upcoming-event';
            const eventDate = new Date(event.startDate);
            const categoryColor = this.categories[event.category]?.color || '#3b82f6';
            const categoryName = this.categories[event.category]?.name || '';
            
            eventEl.innerHTML = `
                <div class="mobile-upcoming-date">${eventDate.getDate()}</div>
                <div class="mobile-upcoming-details">
                    <h5>${event.title}</h5>
                    <p>${event.startTime || '全天'} ${event.location ? `• ${event.location}` : ''}</p>
                    <span class="event-category" style="background: ${categoryColor}">${categoryName}</span>
                </div>
            `;
            eventEl.addEventListener('click', () => this.showEventDetails(event));
            mobileUpcomingList.appendChild(eventEl);
        });
        
        if (upcomingEvents.length === 0) {
            mobileUpcomingList.innerHTML = '<p class="no-events">接下來兩週沒有事件</p>';
        }
        
        console.log('Mobile upcoming events updated, final HTML:', mobileUpcomingList.innerHTML);
    }
    
    updateCategoryLegend() {
        const legendEl = document.getElementById('categoryLegend');
        legendEl.innerHTML = '';
        
        Object.entries(this.categories).forEach(([key, category]) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'legend-item';
            if (this.selectedCategory === key) {
                itemEl.classList.add('active');
            }
            itemEl.innerHTML = `
                <div class="legend-color" style="background: ${category.color}"></div>
                <span class="legend-label">${category.name}</span>
            `;
            itemEl.addEventListener('click', () => {
                this.selectedCategory = this.selectedCategory === key ? '' : key;
                document.getElementById('categoryFilter').value = this.selectedCategory;
                this.render();
                this.updateCategoryLegend();
            });
            legendEl.appendChild(itemEl);
        });
    }
    
    updateCategoryFilter() {
        const filter = document.getElementById('categoryFilter');
        filter.innerHTML = '<option value="">所有分類</option>';
        
        Object.entries(this.categories).forEach(([key, category]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = category.name;
            filter.appendChild(option);
        });
    }
    
    exportEvents() {
        const events = this.filterEvents(this.events);
        const csv = this.convertToCSV(events);
        this.downloadCSV(csv, `calendar_events_${this.formatDate(new Date())}.csv`);
    }
    
    convertToCSV(events) {
        const headers = ['標題', '描述', '開始日期', '結束日期', '開始時間', '結束時間', '地點', '分類'];
        const rows = events.map(event => [
            event.title,
            event.description || '',
            event.startDate,
            event.endDate,
            event.startTime || '',
            event.endTime || '',
            event.location || '',
            this.categories[event.category]?.name || ''
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        return '\ufeff' + csvContent; // 添加 BOM 以支援中文
    }
    
    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }
    
    toggleTheme() {
        const currentTheme = document.body.dataset.theme || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.dataset.theme = newTheme;
        localStorage.setItem('theme', newTheme);
        
        const themeBtn = document.getElementById('themeToggle');
        themeBtn.textContent = newTheme === 'light' ? '◐' : '◑';
    }
    
    checkTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.dataset.theme = savedTheme;
        
        const themeBtn = document.getElementById('themeToggle');
        themeBtn.textContent = savedTheme === 'light' ? '◐' : '◑';
    }
    
    // 輔助方法
    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }
    
    formatDate(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    formatDateShort(date) {
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }
    
    formatDateLong(date) {
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        return date.toLocaleDateString('zh-TW', options);
    }
    
    getDayName(dayIndex) {
        const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        return days[dayIndex];
    }
    
    getMonthShort(monthIndex) {
        const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        return months[monthIndex];
    }
    
    getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }
}

// 初始化應用程式
document.addEventListener('DOMContentLoaded', () => {
    new CalendarApp();
});