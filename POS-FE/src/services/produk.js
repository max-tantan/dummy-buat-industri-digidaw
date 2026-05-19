import { apiFetch } from './api'

/**
 * Create produk baru ke backend.
 * Mengirim FormData karena ada file upload (foto_produk).
 *
 * @param {object} data - { nama_produk, harga_produk, jenis_produk }
 * @param {File|null} file - File gambar produk (opsional)
 * @returns {Promise<object>} Response dari server
 */
export async function createProduk(data, file = null) {
  const formData = new FormData()
  formData.append('nama_produk', data.nama_produk)
  formData.append('harga_produk', data.harga_produk)
  formData.append('jenis_produk', data.jenis_produk)

  if (file) {
    formData.append('foto_produk', file)
  }

  return await apiFetch('/produk', {
    method: 'POST',
    body: formData,
  })
}
