const AUTH_KEY = 'calendar_auth';
const ADMIN_PASSWORD = 'your-secret-password';

export function checkAuth() {
  return localStorage.getItem(AUTH_KEY) === 'authenticated';
}

export function login(password) {
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem(AUTH_KEY, 'authenticated');
    return true;
  }
  return false;
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
}