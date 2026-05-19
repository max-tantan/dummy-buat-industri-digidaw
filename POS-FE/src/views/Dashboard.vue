<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const ordersStorageKey = 'sarapantelur.orders'

const todayLabel = new Date().toLocaleDateString('id-ID', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

const formatRupiah = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)

const readStoredOrders = () => {
  try {
    const raw = localStorage.getItem(ordersStorageKey)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const orders = ref(readStoredOrders())
const syncOrders = () => {
  orders.value = readStoredOrders()
}

onMounted(() => {
  window.addEventListener('storage', syncOrders)
  window.addEventListener('focus', syncOrders)
})

onBeforeUnmount(() => {
  window.removeEventListener('storage', syncOrders)
  window.removeEventListener('focus', syncOrders)
})
const hasOrders = computed(() => orders.value.length > 0)

const statusBreakdown = computed(() => [
  { label: 'Diproses', value: orders.value.filter((item) => item.status === 'Diproses').length, color: '#60a5fa' },
  { label: 'Dikirim', value: orders.value.filter((item) => item.status === 'Dikirim').length, color: '#f59e0b' },
  { label: 'Selesai', value: orders.value.filter((item) => item.status === 'Selesai').length, color: '#22c55e' },
  { label: 'Dibatalkan', value: orders.value.filter((item) => item.status === 'Dibatalkan').length, color: '#ef4444' },
])

const totalRevenue = computed(() =>
  orders.value.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0),
)
const totalOrders = computed(() => orders.value.length)
const completionRate = computed(() => {
  if (!totalOrders.value) {
    return 0
  }
  const done = statusBreakdown.value.find((item) => item.label === 'Selesai')?.value ?? 0
  return Math.round((done / totalOrders.value) * 100)
})
const avgTicket = computed(() => {
  if (!totalOrders.value) {
    return 0
  }
  return Math.round(totalRevenue.value / totalOrders.value)
})

const getLast7Days = () => {
  const days = []
  const now = new Date()

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(now)
    date.setDate(now.getDate() - i)
    days.push({
      key: date.toISOString().slice(0, 10),
      day: date.toLocaleDateString('id-ID', { weekday: 'short' }),
    })
  }

  return days
}

const weeklyRevenue = computed(() => {
  const dayMap = new Map(getLast7Days().map((item) => [item.key, { ...item, amount: 0 }]))

  orders.value.forEach((order) => {
    if (!dayMap.has(order.date)) {
      return
    }

    const current = dayMap.get(order.date)
    current.amount += Number(order.totalAmount) || 0
  })

  return [...dayMap.values()]
})

const maxRevenue = computed(() => Math.max(...weeklyRevenue.value.map((item) => item.amount), 1))
const getBarHeight = (value) => `${Math.max(18, Math.round((value / maxRevenue.value) * 100))}%`

const topMenus = computed(() => {
  const countByMenu = new Map()

  orders.value.forEach((order) => {
    if (Array.isArray(order.items) && order.items.length) {
      order.items.forEach((item) => {
        const name = String(item.name ?? '').trim()
        if (!name) {
          return
        }
        const qty = Math.max(1, Number(item.qty) || 1)
        countByMenu.set(name, (countByMenu.get(name) ?? 0) + qty)
      })
      return
    }

    const fallbackName = String(order.menu ?? '').trim()
    if (fallbackName) {
      countByMenu.set(fallbackName, (countByMenu.get(fallbackName) ?? 0) + Math.max(1, Number(order.qty) || 1))
    }
  })

  return [...countByMenu.entries()]
    .map(([name, sold]) => ({ name, sold }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5)
})

const recentOrders = computed(() =>
  [...orders.value]
    .sort((a, b) => String(b.id).localeCompare(String(a.id), undefined, { numeric: true }))
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      customer: item.customer,
      total: Number(item.totalAmount) || 0,
      status: item.status,
    })),
)

const statusBadgeClass = (status) => {
  const map = {
    Diproses: 'processing',
    Dikirim: 'shipped',
    Selesai: 'completed',
    Dibatalkan: 'cancelled',
  }
  return map[status] || 'processing'
}
</script>

<template>
  <section class="dashboard-page">
    <header class="dashboard-header">
      <div>
        <p class="eyebrow">Ringkasan Operasional</p>
        <h1>Dashboard</h1>
        <p class="subtitle">Data dashboard hanya muncul dari CRUD di halaman Order.</p>
      </div>
      <p class="date-pill">{{ todayLabel }}</p>
    </header>

    <section class="kpi-grid">
      <article class="kpi-card">
        <p class="kpi-label">Omzet Total</p>
        <p class="kpi-value">{{ formatRupiah(totalRevenue) }}</p>
        <p class="kpi-meta">Akumulasi semua order tersimpan</p>
      </article>
      <article class="kpi-card">
        <p class="kpi-label">Total Order</p>
        <p class="kpi-value">{{ totalOrders }}</p>
        <p class="kpi-meta">Semua status order</p>
      </article>
      <article class="kpi-card">
        <p class="kpi-label">Completion Rate</p>
        <p class="kpi-value">{{ completionRate }}%</p>
        <p class="kpi-meta">Order selesai terhadap total</p>
      </article>
      <article class="kpi-card">
        <p class="kpi-label">Rata-rata Nilai Order</p>
        <p class="kpi-value">{{ formatRupiah(avgTicket) }}</p>
        <p class="kpi-meta">Average ticket size</p>
      </article>
    </section>

    <section class="insight-grid">
      <article class="panel">
        <div class="panel-head">
          <h2>Tren Omzet 7 Hari</h2>
          <p>Berdasarkan tanggal order</p>
        </div>
        <div class="bar-chart">
          <div v-for="item in weeklyRevenue" :key="item.key" class="bar-item">
            <div class="bar-track">
              <span class="bar-fill" :style="{ height: getBarHeight(item.amount) }" />
            </div>
            <p class="bar-value">{{ formatRupiah(item.amount) }}</p>
            <p class="bar-label">{{ item.day }}</p>
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <h2>Status Order</h2>
          <p>Distribusi saat ini</p>
        </div>
        <ul class="status-list">
          <li v-for="item in statusBreakdown" :key="item.label" class="status-item">
            <span class="status-dot" :style="{ backgroundColor: item.color }" />
            <p>{{ item.label }}</p>
            <strong>{{ item.value }}</strong>
          </li>
        </ul>
      </article>
    </section>

    <section class="bottom-grid">
      <article class="panel">
        <div class="panel-head">
          <h2>Menu Terlaris</h2>
          <p>Dihitung dari item order</p>
        </div>
        <p v-if="!topMenus.length" class="empty">Belum ada data menu. Buat order dulu di halaman Order.</p>
        <ul v-else class="rank-list">
          <li v-for="(menu, index) in topMenus" :key="menu.name" class="rank-item">
            <span class="rank-num">0{{ index + 1 }}</span>
            <div>
              <p class="rank-title">{{ menu.name }}</p>
              <p class="rank-sub">{{ menu.sold }} porsi terjual</p>
            </div>
          </li>
        </ul>
      </article>

      <article class="panel">
        <div class="panel-head">
          <h2>Order Terbaru</h2>
          <p>Aktivitas terbaru</p>
        </div>
        <p v-if="!recentOrders.length" class="empty">Belum ada order. Tambahkan data dari halaman Order.</p>
        <div v-else class="order-table-wrap">
          <table class="order-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Pelanggan</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in recentOrders" :key="order.id">
                <td>{{ order.id }}</td>
                <td>{{ order.customer }}</td>
                <td>{{ formatRupiah(order.total) }}</td>
                <td>
                  <span class="badge" :class="statusBadgeClass(order.status)">{{ order.status }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <p v-if="!hasOrders" class="empty-hint">
      Dashboard masih kosong. Isi data lewat CRUD di halaman Order.
    </p>
  </section>
</template>

<style scoped>
.dashboard-page {
  display: grid;
  gap: 18px;
  color: #e2e8f0;
}

.dashboard-header {
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.92));
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
}

.eyebrow {
  margin: 0;
  font-size: 12px;
  color: #86efac;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 700;
}

h1 {
  margin: 6px 0 0;
  font-size: 30px;
  color: #f8fafc;
}

.subtitle {
  margin: 6px 0 0;
  color: #94a3b8;
}

.date-pill {
  margin: 0;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: #cbd5e1;
  padding: 10px 14px;
  font-size: 13px;
  white-space: nowrap;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.kpi-card {
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.92));
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  padding: 16px;
}

.kpi-label {
  margin: 0;
  color: #94a3b8;
  font-size: 13px;
}

.kpi-value {
  margin: 10px 0 0;
  color: #f8fafc;
  font-size: 28px;
  font-weight: 800;
  line-height: 1.1;
}

.kpi-meta {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 12px;
}

.insight-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 14px;
}

.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1.35fr;
  gap: 14px;
}

.panel {
  background: rgba(15, 23, 42, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 16px;
  padding: 16px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.panel-head h2 {
  margin: 0;
  color: #f8fafc;
  font-size: 16px;
}

.panel-head p {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}

.bar-chart {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
}

.bar-item {
  display: grid;
  gap: 8px;
  justify-items: center;
}

.bar-track {
  width: 100%;
  height: 150px;
  border-radius: 10px;
  display: flex;
  align-items: flex-end;
  background: rgba(30, 41, 59, 0.75);
  overflow: hidden;
}

.bar-fill {
  display: block;
  width: 100%;
  border-radius: 10px;
  background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
}

.bar-value {
  margin: 0;
  text-align: center;
  color: #cbd5e1;
  font-size: 11px;
}

.bar-label {
  margin: 0;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
}

.status-list,
.rank-list {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.status-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  border-radius: 12px;
  background: rgba(30, 41, 59, 0.7);
  padding: 10px 12px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.status-item p {
  margin: 0;
  font-size: 13px;
  color: #cbd5e1;
}

.status-item strong {
  color: #f8fafc;
  font-size: 14px;
}

.rank-item {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 12px;
  border-radius: 12px;
  background: rgba(30, 41, 59, 0.7);
  padding: 12px;
}

.rank-num {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(34, 197, 94, 0.24);
  color: #86efac;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 12px;
}

.rank-title {
  margin: 0;
  font-size: 13px;
  color: #f1f5f9;
}

.rank-sub {
  margin: 3px 0 0;
  color: #94a3b8;
  font-size: 12px;
}

.order-table-wrap {
  margin-top: 16px;
  overflow-x: auto;
}

.order-table {
  width: 100%;
  border-collapse: collapse;
}

.order-table th,
.order-table td {
  padding: 10px;
  text-align: left;
  font-size: 13px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.order-table th {
  color: #94a3b8;
  font-weight: 600;
}

.order-table td {
  color: #e2e8f0;
}

.badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 9px;
  font-size: 11px;
  font-weight: 700;
}

.badge.processing {
  background: rgba(59, 130, 246, 0.2);
  color: #bfdbfe;
}

.badge.shipped {
  background: rgba(245, 158, 11, 0.2);
  color: #fde68a;
}

.badge.completed {
  background: rgba(34, 197, 94, 0.2);
  color: #bbf7d0;
}

.badge.cancelled {
  background: rgba(239, 68, 68, 0.2);
  color: #fecaca;
}

.empty {
  margin: 16px 0 0;
  color: #94a3b8;
  font-size: 13px;
}

.empty-hint {
  margin: 0;
  color: #86efac;
  font-size: 13px;
}

@media (max-width: 1200px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .insight-grid,
  .bottom-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .dashboard-header {
    flex-direction: column;
  }

  h1 {
    font-size: 26px;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .bar-chart {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
