import { getMonthDays, weekDays, getEventsForDay } from '../utils/calendar.js';
import { format } from 'date-fns';

export class Calendar {
  constructor(container, events, onDayClick, onEventClick) {
    this.container = container;
    this.events = events;
    this.onDayClick = onDayClick;
    this.onEventClick = onEventClick;
  }

  render(currentDate) {
    const days = getMonthDays(currentDate);
    
    this.container.innerHTML = `
      <div class="calendar-grid">
        <div class="calendar-header">
          ${weekDays.map(day => `<div class="day-header">${day}</div>`).join('')}
        </div>
        <div class="calendar-body">
          ${days.map(day => this.renderDay(day)).join('')}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  renderDay(day) {
    const dayEvents = getEventsForDay(this.events, day.date);
    const classes = [
      'calendar-day',
      !day.isCurrentMonth && 'other-month',
      day.isToday && 'today'
    ].filter(Boolean).join(' ');

    return `
      <div class="${classes}" data-date="${day.dateString}">
        <div class="day-number">${format(day.date, 'd')}</div>
        <div class="events-container">
          ${dayEvents.map(event => `
            <div class="event" data-event-id="${event.id}">
              ${event.title}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    this.container.querySelectorAll('.calendar-day').forEach(day => {
      day.addEventListener('click', (e) => {
        if (!e.target.classList.contains('event')) {
          this.onDayClick(day.dataset.date);
        }
      });
    });

    this.container.querySelectorAll('.event').forEach(event => {
      event.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onEventClick(event.dataset.eventId);
      });
    });
  }

  updateEvents(events) {
    this.events = events;
  }
}