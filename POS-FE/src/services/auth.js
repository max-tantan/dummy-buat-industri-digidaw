import { apiFetch } from './api'

/**
 * Login ke server, simpan token & role ke localStorage.
 *
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object>} { token, role }
 */
export async function login(username, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })

  const token = data.token

  // Decode payload JWT untuk ambil role (bagian kedua dari token, base64)
  const payload = JSON.parse(atob(token.split('.')[1]))

  localStorage.setItem('token', token)
  localStorage.setItem('userRole', payload.role)

  return { token, role: payload.role }
}

/**
 * Logout — panggil endpoint BE lalu clear localStorage.
 */
export async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' })
  } catch {
    // Tetap clear localStorage meskipun request logout gagal
  }

  localStorage.removeItem('token')
  localStorage.removeItem('userRole')
}

/**
 * Ambil token dari localStorage.
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem('token')
}

/**
 * Ambil role user dari localStorage.
 * @returns {string|null}
 */
export function getUserRole() {
  return localStorage.getItem('userRole')
}

/**
 * Cek apakah user sudah login (punya token).
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!localStorage.getItem('token')
}
