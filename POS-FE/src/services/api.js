const API_BASE_URL = 'http://localhost:3000'

/**
 * Wrapper fetch untuk semua request ke backend API.
 * Otomatis set header JSON dan attach token jika ada.
 *
 * @param {string} endpoint - Path endpoint (contoh: '/auth/login')
 * @param {object} options - Opsi fetch (method, body, dll)
 * @returns {Promise<object>} Response JSON dari server
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token')

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    const error = new Error(data.message || 'Terjadi kesalahan pada server')
    error.statusCode = response.status
    throw error
  }

  return data
}
