export class AuthModal {
  constructor(container, onLogin) {
    this.container = container;
    this.onLogin = onLogin;
  }

  show() {
    this.container.innerHTML = `
      <div class="modal show">
        <div class="modal-content auth-modal">
          <h2>請輸入密碼</h2>
          <form id="auth-form">
            <div class="form-group">
              <input type="password" id="password" placeholder="密碼" required>
            </div>
            <button type="submit" class="btn btn-primary">登入</button>
          </form>
          <p id="auth-error" style="color: red; margin-top: 10px; display: none;">密碼錯誤</p>
        </div>
      </div>
    `;

    document.getElementById('auth-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });
  }

  hide() {
    this.container.innerHTML = '';
  }

  handleLogin() {
    const password = document.getElementById('password').value;
    const success = this.onLogin(password);
    
    if (success) {
      this.hide();
    } else {
      document.getElementById('auth-error').style.display = 'block';
    }
  }
}