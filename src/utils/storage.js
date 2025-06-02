const EVENTS_KEY = 'calendar_events';

export function getEvents() {
  const stored = localStorage.getItem(EVENTS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveEvents(events) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export function addEvent(event) {
  const events = getEvents();
  const newEvent = {
    ...event,
    id: Date.now().toString()
  };
  events.push(newEvent);
  saveEvents(events);
  return newEvent;
}

export function updateEvent(id, updates) {
  const events = getEvents();
  const index = events.findIndex(e => e.id === id);
  if (index !== -1) {
    events[index] = { ...events[index], ...updates };
    saveEvents(events);
    return events[index];
  }
  return null;
}

export function deleteEvent(id) {
  const events = getEvents();
  const filtered = events.filter(e => e.id !== id);
  saveEvents(filtered);
}