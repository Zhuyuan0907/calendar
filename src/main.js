import { Calendar } from './components/Calendar.js';
import { EventModal } from './components/EventModal.js';
import { AuthModal } from './components/AuthModal.js';
import { formatMonthYear } from './utils/calendar.js';
import { getEvents, addEvent, updateEvent, deleteEvent } from './utils/storage.js';
import { checkAuth, login } from './utils/auth.js';
import { addMonths, subMonths } from 'date-fns';

class CalendarApp {
  constructor() {
    this.currentDate = new Date();
    this.events = getEvents();
    this.isAuthenticated = checkAuth();
    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
    this.calendar = new Calendar(
      document.getElementById('calendar-container'),
      this.events,
      (date) => this.handleDayClick(date),
      (eventId) => this.handleEventClick(eventId)
    );
    this.eventModal = new EventModal(
      document.getElementById('modal-container'),
      (event) => this.handleEventSave(event),
      (eventId) => this.handleEventDelete(eventId)
    );
    this.authModal = new AuthModal(
      document.getElementById('auth-modal-container'),
      (password) => this.handleLogin(password)
    );
    
    this.updateCalendar();
  }

  render() {
    document.getElementById('app').innerHTML = `
      <div class="app-container">
        <header class="header">
          <h1>我的行事曆</h1>
          <div class="header-controls">
            <button id="prev-month" class="btn">&lt;</button>
            <span id="current-month">${formatMonthYear(this.currentDate)}</span>
            <button id="next-month" class="btn">&gt;</button>
            ${this.isAuthenticated ? '<button id="add-event" class="btn btn-primary">新增活動</button>' : ''}
          </div>
        </header>
        <div class="calendar-container" id="calendar-container"></div>
      </div>
      <div id="modal-container"></div>
      <div id="auth-modal-container"></div>
    `;
  }

  attachEventListeners() {
    document.getElementById('prev-month').addEventListener('click', () => {
      this.currentDate = subMonths(this.currentDate, 1);
      this.updateCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
      this.currentDate = addMonths(this.currentDate, 1);
      this.updateCalendar();
    });

    const addEventBtn = document.getElementById('add-event');
    if (addEventBtn) {
      addEventBtn.addEventListener('click', () => {
        this.eventModal.show();
      });
    }
  }

  updateCalendar() {
    document.getElementById('current-month').textContent = formatMonthYear(this.currentDate);
    this.calendar.render(this.currentDate);
  }

  handleDayClick(date) {
    if (this.isAuthenticated) {
      this.eventModal.show(null, date);
    } else {
      this.authModal.show();
    }
  }

  handleEventClick(eventId) {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      if (this.isAuthenticated) {
        this.eventModal.show(event);
      }
    }
  }

  handleEventSave(eventData) {
    if (eventData.id) {
      updateEvent(eventData.id, eventData);
    } else {
      addEvent(eventData);
    }
    this.events = getEvents();
    this.calendar.updateEvents(this.events);
    this.updateCalendar();
  }

  handleEventDelete(eventId) {
    deleteEvent(eventId);
    this.events = getEvents();
    this.calendar.updateEvents(this.events);
    this.updateCalendar();
  }

  handleLogin(password) {
    const success = login(password);
    if (success) {
      this.isAuthenticated = true;
      this.render();
      this.attachEventListeners();
      this.updateCalendar();
    }
    return success;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CalendarApp();
});