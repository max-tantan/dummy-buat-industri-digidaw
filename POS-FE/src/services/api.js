const API_BASE_URL = 'http://localhost:3000'

/**
 * Wrapper fetch untuk semua request ke backend API.
 * Otomatis set header JSON dan attach token jika ada.
 * Jika body berupa FormData, Content-Type tidak di-set (browser otomatis set multipart boundary).
 *
 * @param {string} endpoint - Path endpoint (contoh: '/auth/login')
 * @param {object} options - Opsi fetch (method, body, dll)
 * @returns {Promise<object>} Response JSON dari server
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token')
  const isFormData = options.body instanceof FormData

  const headers = {
    ...options.headers,
  }

  // Jangan set Content-Type untuk FormData, browser otomatis set dengan boundary
  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
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

