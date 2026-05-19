import { apiFetch } from './api'

/**
 * Ambil semua order dari backend.
 * GET /orders (membutuhkan token)
 *
 * @returns {Promise<object[]>} Array of orders
 */
export async function getOrders() {
  const data = await apiFetch('/orders', { method: 'GET' })
  return data.data || []
}

/**
 * Buat order baru di backend.
 * POST /orders (membutuhkan token)
 *
 * BE menerima single product per order:
 * { nama_pelanggan, produk_id, jumlah, total_harga }
 *
 * @param {object} orderData
 * @returns {Promise<object>} Created order
 */
export async function createOrder(orderData) {
  const data = await apiFetch('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  })
  return data.data || data
}
