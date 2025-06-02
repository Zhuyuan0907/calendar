export class EventModal {
  constructor(container, onSave, onDelete) {
    this.container = container;
    this.onSave = onSave;
    this.onDelete = onDelete;
    this.currentEvent = null;
    this.selectedDate = null;
  }

  show(event = null, date = null) {
    this.currentEvent = event;
    this.selectedDate = date;
    
    const isEdit = !!event;
    const title = isEdit ? '編輯活動' : '新增活動';
    const deleteBtn = isEdit ? `<button type="button" class="btn" onclick="window.eventModal.handleDelete()">刪除</button>` : '';
    
    this.container.innerHTML = `
      <div class="modal show">
        <div class="modal-content">
          <div class="modal-header">
            <h2>${title}</h2>
            <button class="close-btn" onclick="window.eventModal.hide()">&times;</button>
          </div>
          <form id="event-form">
            <div class="form-group">
              <label for="event-title">活動標題</label>
              <input type="text" id="event-title" value="${event?.title || ''}" required>
            </div>
            <div class="form-group">
              <label for="event-date">日期</label>
              <input type="date" id="event-date" value="${event?.date || date || ''}" required>
            </div>
            <div class="form-group">
              <label for="event-time">時間</label>
              <input type="time" id="event-time" value="${event?.time || ''}">
            </div>
            <div class="form-group">
              <label for="event-description">描述</label>
              <textarea id="event-description" rows="3">${event?.description || ''}</textarea>
            </div>
            <div class="form-actions">
              ${deleteBtn}
              <button type="button" class="btn" onclick="window.eventModal.hide()">取消</button>
              <button type="submit" class="btn btn-primary">儲存</button>
            </div>
          </form>
        </div>
      </div>
    `;

    window.eventModal = this;
    
    document.getElementById('event-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSave();
    });
  }

  hide() {
    this.container.innerHTML = '';
    delete window.eventModal;
  }

  handleSave() {
    const formData = {
      title: document.getElementById('event-title').value,
      date: document.getElementById('event-date').value,
      time: document.getElementById('event-time').value,
      description: document.getElementById('event-description').value
    };

    if (this.currentEvent) {
      this.onSave({ ...this.currentEvent, ...formData });
    } else {
      this.onSave(formData);
    }
    
    this.hide();
  }

  handleDelete() {
    if (this.currentEvent && confirm('確定要刪除這個活動嗎？')) {
      this.onDelete(this.currentEvent.id);
      this.hide();
    }
  }
}