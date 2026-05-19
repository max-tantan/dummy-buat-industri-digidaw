<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const statusFilters = ['Semua', 'Diproses', 'Dikirim', 'Selesai', 'Dibatalkan']
const periodFilters = ['Semua', 'Hari Ini']
const productTypes = ['Makanan', 'Minuman', 'Snack', 'Lainnya']
const today = new Date().toISOString().slice(0, 10)
const userRole = ref(localStorage.getItem('userRole') ?? '')
const isAdmin = computed(() => userRole.value === 'admin')
const isCustomer = computed(() => userRole.value === 'customer')
const router = useRouter()

const orders = ref([])
const searchQuery = ref('')
const activeStatus = ref('Semua')
const activePeriod = ref('Semua')
const selectedOrderId = ref(null)
const nextOrderNumber = ref(1037)
const formMode = ref('create')
const editingOrderId = ref(null)
const formError = ref('')
const showProductForm = ref(false)
const productFormError = ref('')
const menuEditError = ref('')
const productImageInputKey = ref(0)
const editImageInputKey = ref(0)

const menuOptions = ref([
  {
    name: 'Telur Mata Sapi',
    type: 'Makanan',
    price: 12000,
    image:
      'https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Jus Jeruk',
    type: 'Minuman',
    price: 10000,
    image:
      'https://cdn.pixabay.com/photo/2012/11/28/09/31/orange-juice-67556__340.jpg',
  },
  {
    name: 'Nasi Anget',
    type: 'Makanan',
    price: 5000,
    image:
    'https://i.gojekapi.com/darkroom/gofood-indonesia/v2/images/uploads/7e26a3a0-c2f3-4d50-91cb-3e8eac22c10d_d346f44f-e621-423c-8642-3db4d3bb7211_Go-Biz_20191001_044300.jpeg',
  },
  {
    name: 'Ayam Geprek jos jos',
    type: 'Makanan',
    price: 15000,
    image:
    '',
  },
  {
    name: 'Ayam Sayur',
    type: 'Makanan',
    price: 15000,
    image:
    '',
  }
])
const customerOrderNumber = ref('')

const productForm = reactive({
  name: 'Produk Baru',
  type: productTypes[0],
  price: 10000,
  image: '',
})

const menuEditIndex = ref(null)
const menuEditDraft = reactive({
  name: '',
  type: productTypes[0],
  price: 0,
  image: '',
})

const form = reactive({
  customer: '',
})
const selectedMenus = ref([])
const menuQtyDraft = reactive({})

const normalizeName = (value) => value.trim().toLowerCase()

const formatRupiah = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)

const getCurrentTimeLabel = () =>
  new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

const statusClass = (status) => {
  const map = {
    Diproses: 'processing',
    Dikirim: 'shipped',
    Selesai: 'completed',
    Dibatalkan: 'cancelled',
  }

  return map[status] || 'processing'
}

const findMenuOptionByName = (name) =>
  menuOptions.value.find((option) => normalizeName(option.name) === normalizeName(name))

const selectedMenuItems = computed(() =>
  selectedMenus.value
    .map((menuName) => {
      const option = findMenuOptionByName(menuName)
      if (!option) {
        return null
      }

      const qty = Math.max(1, Number(menuQtyDraft[menuName]) || 1)
      return {
        name: option.name,
        price: option.price,
        qty,
        subtotal: option.price * qty,
      }
    })
    .filter(Boolean),
)

const estimatedTotal = computed(() => selectedMenuItems.value.reduce((sum, item) => sum + item.subtotal, 0))
const estimatedTotalQty = computed(() => selectedMenuItems.value.reduce((sum, item) => sum + item.qty, 0))

const setDefaultMenuSelection = () => {
  selectedMenus.value = []
  Object.keys(menuQtyDraft).forEach((key) => {
    delete menuQtyDraft[key]
  })

  const firstMenu = menuOptions.value[0]
  if (firstMenu) {
    selectedMenus.value = [firstMenu.name]
    menuQtyDraft[firstMenu.name] = 1
  }
}

const syncFormSelectionByMenuOptions = () => {
  const validMenuNames = menuOptions.value.map((menu) => menu.name)
  const validSet = new Set(validMenuNames.map((name) => normalizeName(name)))

  selectedMenus.value = selectedMenus.value.filter((name) => validSet.has(normalizeName(name)))

  Object.keys(menuQtyDraft).forEach((name) => {
    if (!validSet.has(normalizeName(name))) {
      delete menuQtyDraft[name]
    }
  })

  if (!selectedMenus.value.length && menuOptions.value.length) {
    selectedMenus.value = [menuOptions.value[0].name]
  }

  selectedMenus.value.forEach((name) => {
    const qty = Number(menuQtyDraft[name])
    if (!Number.isFinite(qty) || qty < 1) {
      menuQtyDraft[name] = 1
    }
  })
}

const toggleMenuSelection = (menuName, checked) => {
  if (checked) {
    if (!selectedMenus.value.includes(menuName)) {
      selectedMenus.value = [...selectedMenus.value, menuName]
    }

    if (!menuQtyDraft[menuName]) {
      menuQtyDraft[menuName] = 1
    }
    return
  }

  selectedMenus.value = selectedMenus.value.filter((name) => name !== menuName)
  delete menuQtyDraft[menuName]
}

const setMenuQuantity = (menuName, value) => {
  const qty = Math.max(1, Number(value) || 1)
  menuQtyDraft[menuName] = qty
}

const buildMenuSummary = (items) => items.map((item) => `${item.name} x${item.qty}`).join(', ')

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('read_failed'))
    reader.readAsDataURL(file)
  })

const searchedOrders = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  if (!keyword) {
    return orders.value
  }

  return orders.value.filter((order) => {
    const haystack = `${order.id} ${order.customer} ${order.menu}`.toLowerCase()
    return haystack.includes(keyword)
  })
})

const filteredOrders = computed(() =>
  searchedOrders.value.filter((order) => {
    const passStatus = activeStatus.value === 'Semua' || order.status === activeStatus.value
    const passPeriod = activePeriod.value === 'Semua' || order.date === today
    return passStatus && passPeriod
  }),
)

const selectedOrder = computed(
  () => filteredOrders.value.find((order) => order.id === selectedOrderId.value) ?? filteredOrders.value[0] ?? null,
)

const stats = computed(() => {
  const source = filteredOrders.value
  return [
    { id: 'total', label: 'Total Order', value: source.length },
    { id: 'ongoing', label: 'Sedang Diproses', value: source.filter((item) => item.status === 'Diproses').length },
    { id: 'shipped', label: 'Dalam Pengiriman', value: source.filter((item) => item.status === 'Dikirim').length },
    { id: 'completed', label: 'Selesai', value: source.filter((item) => item.status === 'Selesai').length },
  ]
})

watch(filteredOrders, (list) => {
  if (!list.length) {
    selectedOrderId.value = null
    return
  }

  if (!list.some((item) => item.id === selectedOrderId.value)) {
    selectedOrderId.value = list[0].id
  }
})

watch(
  menuOptions,
  () => {
    syncFormSelectionByMenuOptions()
  },
  { deep: true, immediate: true },
)

const resetForm = () => {
  form.customer = ''
  setDefaultMenuSelection()
  formError.value = ''
}

const ensureMenuFromOrder = (order) => {
  const orderItems = Array.isArray(order.items) && order.items.length
    ? order.items
    : [{ name: order.menu, qty: order.qty, price: Math.max(1000, Math.round(order.totalAmount / Math.max(1, order.qty))) }]

  orderItems.forEach((item) => {
    if (!item?.name || findMenuOptionByName(item.name)) {
      return
    }

    const approxPrice = Math.max(1000, Number(item.price) || Math.round(order.totalAmount / Math.max(1, order.qty)))
    menuOptions.value.push({
      name: item.name,
      type: 'Lainnya',
      price: approxPrice,
      image:
        'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80',
    })
  })
}

const fillForm = (order) => {
  ensureMenuFromOrder(order)

  form.customer = order.customer
  selectedMenus.value = []
  Object.keys(menuQtyDraft).forEach((key) => {
    delete menuQtyDraft[key]
  })

  if (Array.isArray(order.items) && order.items.length) {
    order.items.forEach((item) => {
      if (!item?.name) {
        return
      }

      selectedMenus.value.push(item.name)
      menuQtyDraft[item.name] = Math.max(1, Number(item.qty) || 1)
    })
  } else if (order.menu) {
    selectedMenus.value = [order.menu]
    menuQtyDraft[order.menu] = Math.max(1, Number(order.qty) || 1)
  }

  syncFormSelectionByMenuOptions()
  formError.value = ''
}

const openCreateForm = () => {
  formMode.value = 'create'
  editingOrderId.value = null
  resetForm()
}

const openEditForm = (order) => {
  if (!isAdmin.value) {
    return
  }

  formMode.value = 'edit'
  editingOrderId.value = order.id
  fillForm(order)
}

const resetProductForm = () => {
  productForm.name = 'Produk Baru'
  productForm.type = productTypes[0]
  productForm.price = 10000
  productForm.image = ''
  productFormError.value = ''
  productImageInputKey.value += 1
}

const openProductForm = () => {
  if (!isAdmin.value) {
    return
  }

  showProductForm.value = true
  menuEditIndex.value = null
  menuEditDraft.name = ''
  menuEditDraft.type = productTypes[0]
  menuEditDraft.price = 0
  menuEditDraft.image = ''
  menuEditError.value = ''
  editImageInputKey.value += 1
  resetProductForm()
}

const closeProductForm = () => {
  showProductForm.value = false
  cancelEditMenuOption()
  resetProductForm()
}

const createProduct = () => {
  if (!isAdmin.value) {
    return
  }

  const name = productForm.name.trim()
  const type = productForm.type
  const price = Number(productForm.price)
  const image = productForm.image.trim()
  productFormError.value = ''

  if (!name) {
    productFormError.value = 'Nama produk wajib diisi.'
    return
  }

  if (!productTypes.includes(type)) {
    productFormError.value = 'Jenis produk tidak valid.'
    return
  }

  if (!Number.isFinite(price) || price < 1000) {
    productFormError.value = 'Harga minimal Rp1.000.'
    return
  }

  if (findMenuOptionByName(name)) {
    productFormError.value = 'Nama produk sudah ada.'
    return
  }

  menuOptions.value.push({ name, type, price, image })
  selectedMenus.value = [...selectedMenus.value, name]
  menuQtyDraft[name] = 1
  resetProductForm()
}

const onProductImageChange = async (event) => {
  const file = event.target?.files?.[0]
  if (!file) {
    productForm.image = ''
    productFormError.value = ''
    return
  }

  if (!file.type.startsWith('image/')) {
    productForm.image = ''
    productFormError.value = 'File foto harus berupa gambar.'
    productImageInputKey.value += 1
    return
  }

  try {
    productForm.image = await readFileAsDataUrl(file)
    productFormError.value = ''
  } catch {
    productFormError.value = 'Gagal membaca file foto.'
    productImageInputKey.value += 1
  }
}

const beginEditMenuOption = (index) => {
  if (!isAdmin.value) {
    return
  }

  menuEditIndex.value = index
  menuEditDraft.name = menuOptions.value[index].name
  menuEditDraft.type = menuOptions.value[index].type || productTypes[0]
  menuEditDraft.price = menuOptions.value[index].price
  menuEditDraft.image = menuOptions.value[index].image || ''
  menuEditError.value = ''
  editImageInputKey.value += 1
}

const onEditImageChange = async (event) => {
  const file = event.target?.files?.[0]
  if (!file) {
    menuEditError.value = ''
    return
  }

  if (!file.type.startsWith('image/')) {
    menuEditDraft.image = ''
    menuEditError.value = 'File foto harus berupa gambar.'
    editImageInputKey.value += 1
    return
  }

  try {
    menuEditDraft.image = await readFileAsDataUrl(file)
    menuEditError.value = ''
  } catch {
    menuEditDraft.image = ''
    menuEditError.value = 'Gagal membaca file foto.'
    editImageInputKey.value += 1
  }
}

const cancelEditMenuOption = () => {
  menuEditIndex.value = null
  menuEditDraft.name = ''
  menuEditDraft.type = productTypes[0]
  menuEditDraft.price = 0
  menuEditDraft.image = ''
  menuEditError.value = ''
  editImageInputKey.value += 1
}

const saveEditMenuOption = () => {
  if (!isAdmin.value) {
    return
  }

  const index = menuEditIndex.value
  if (index === null) {
    return
  }

  const name = menuEditDraft.name.trim()
  const type = menuEditDraft.type
  const price = Number(menuEditDraft.price)
  const image = menuEditDraft.image.trim()

  if (!name || !Number.isFinite(price) || price < 1000 || !productTypes.includes(type)) {
    menuEditError.value = 'Data produk tidak valid.'
    return
  }

  const duplicate = menuOptions.value.some(
    (item, itemIndex) => itemIndex !== index && normalizeName(item.name) === normalizeName(name),
  )
  if (duplicate) {
    menuEditError.value = 'Nama produk sudah digunakan.'
    return
  }

  const previousName = menuOptions.value[index].name
  menuOptions.value[index] = { name, type, price, image }

  if (selectedMenus.value.includes(previousName)) {
    selectedMenus.value = selectedMenus.value.map((item) => (item === previousName ? name : item))
    menuQtyDraft[name] = Math.max(1, Number(menuQtyDraft[previousName]) || 1)
    delete menuQtyDraft[previousName]
  }

  orders.value = orders.value.map((order) => {
    if (Array.isArray(order.items) && order.items.length) {
      const hasMenu = order.items.some((item) => normalizeName(item.name) === normalizeName(previousName))
      if (!hasMenu) {
        return order
      }

      const nextItems = order.items.map((item) =>
        normalizeName(item.name) === normalizeName(previousName) ? { ...item, name } : item,
      )
      const nextTotalAmount = nextItems.reduce((sum, item) => sum + item.price * item.qty, 0)
      const nextQty = nextItems.reduce((sum, item) => sum + item.qty, 0)
      return {
        ...order,
        items: nextItems,
        menu: buildMenuSummary(nextItems),
        qty: nextQty,
        totalAmount: nextTotalAmount,
      }
    }

    return order.menu === previousName ? { ...order, menu: name } : order
  })

  menuEditIndex.value = null
  menuEditDraft.name = ''
  menuEditDraft.type = productTypes[0]
  menuEditDraft.price = 0
  menuEditDraft.image = ''
  menuEditError.value = ''
  editImageInputKey.value += 1
}

const removeMenuOption = (index) => {
  if (!isAdmin.value) {
    return
  }

  if (menuOptions.value.length === 1) {
    return
  }

  const removed = menuOptions.value[index]
  menuOptions.value = menuOptions.value.filter((_, itemIndex) => itemIndex !== index)

  selectedMenus.value = selectedMenus.value.filter((name) => normalizeName(name) !== normalizeName(removed.name))
  delete menuQtyDraft[removed.name]
  syncFormSelectionByMenuOptions()

  if (menuEditIndex.value === index) {
    cancelEditMenuOption()
  }
}

const saveOrder = () => {
  const customer = form.customer.trim()
  const orderItems = selectedMenuItems.value.map((item) => ({ ...item }))
  formError.value = ''

  if (!customer || !orderItems.length) {
    formError.value = 'Isi customer dan pilih minimal 1 menu.'
    return
  }

  const totalAmount = estimatedTotal.value
  const totalQty = estimatedTotalQty.value
  const menuSummary = buildMenuSummary(orderItems)
  const actorLabel = isAdmin.value ? 'admin' : 'pelanggan'

  if (formMode.value === 'create') {
    const newOrder = {
      id: `#ORD-${nextOrderNumber.value}`,
      customer,
      menu: menuSummary,
      qty: totalQty,
      items: orderItems,
      totalAmount,
      status: 'Diproses',
      time: getCurrentTimeLabel(),
      date: today,
      timeline: [{ id: 1, text: `Order dibuat ${actorLabel}`, meta: getCurrentTimeLabel() }],
    }

    nextOrderNumber.value += 1
    orders.value = [newOrder, ...orders.value]

    if (isCustomer.value) {
      customerOrderNumber.value = newOrder.id
      resetForm()
      return
    }

    selectedOrderId.value = newOrder.id
    openCreateForm()
    return
  }

  if (!isAdmin.value) {
    formError.value = 'Mode pelanggan hanya bisa membuat order baru.'
    formMode.value = 'create'
    return
  }

  orders.value = orders.value.map((order) => {
    if (order.id !== editingOrderId.value) {
      return order
    }

    const nextTimelineId = (order.timeline.at(-1)?.id ?? 0) + 1
    return {
      ...order,
      customer,
      menu: menuSummary,
      qty: totalQty,
      items: orderItems,
      totalAmount,
      timeline: [...order.timeline, { id: nextTimelineId, text: 'Order diperbarui admin', meta: getCurrentTimeLabel() }],
    }
  })

  selectedOrderId.value = editingOrderId.value
  openCreateForm()
}

const cancelOrder = (orderId) => {
  if (!isAdmin.value) {
    return
  }

  orders.value = orders.value.map((order) => {
    if (order.id !== orderId || order.status === 'Dibatalkan' || order.status === 'Selesai') {
      return order
    }

    const nextTimelineId = (order.timeline.at(-1)?.id ?? 0) + 1
    return {
      ...order,
      status: 'Dibatalkan',
      timeline: [...order.timeline, { id: nextTimelineId, text: 'Order dibatalkan admin', meta: getCurrentTimeLabel() }],
    }
  })
}

const advanceOrderStatus = (orderId) => {
  if (!isAdmin.value) {
    return
  }

  const statusFlow = {
    Diproses: { next: 'Dikirim', text: 'Order masuk pengiriman' },
    Dikirim: { next: 'Selesai', text: 'Order selesai' },
  }

  orders.value = orders.value.map((order) => {
    if (order.id !== orderId || !statusFlow[order.status]) {
      return order
    }

    const nextTimelineId = (order.timeline.at(-1)?.id ?? 0) + 1
    const { next, text } = statusFlow[order.status]
    return {
      ...order,
      status: next,
      timeline: [...order.timeline, { id: nextTimelineId, text, meta: getCurrentTimeLabel() }],
    }
  })
}

const deleteOrder = (orderId) => {
  if (!isAdmin.value) {
    return
  }

  const order = orders.value.find((item) => item.id === orderId)
  if (!order) {
    return
  }

  if (!window.confirm(`Hapus order ${order.id} milik ${order.customer}?`)) {
    return
  }

  orders.value = orders.value.filter((item) => item.id !== orderId)
  if (editingOrderId.value === orderId) {
    openCreateForm()
  }
}

const switchToAdmin = () => {
  localStorage.removeItem('userRole')
  localStorage.removeItem('isLoggedIn')
  router.push('/login')
}

resetForm()
</script>

<template>
  <section class="order-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">{{ isAdmin ? 'Order Management' : 'Customer Order' }}</p>
        <h1>{{ isAdmin ? 'Order' : 'Buat Pesanan' }}</h1>
        <p class="subtitle">
          {{ isAdmin ? 'Kelola order ubah status, edit, dan monitor timeline.' : 'Pilih menu, isi qty, lalu buat pesanan.' }}
        </p>
      </div>
      <div class="header-actions">
        <button v-if="isAdmin" type="button" class="btn btn-primary" @click="openProductForm">
          Tambah Produk
        </button>
        <button v-if="isCustomer" type="button" class="btn btn-soft" @click="switchToAdmin">
          Masuk sebagai admin
        </button>
      </div>
    </header>

    <div v-if="isAdmin" class="stats-grid">
      <article v-for="item in stats" :key="item.id" class="stat-card">
        <p class="stat-label">{{ item.label }}</p>
        <p class="stat-value">{{ item.value }}</p>
        <p class="stat-meta">Data mengikuti filter aktif</p>
      </article>
    </div>

    <div v-if="isAdmin" class="content-grid">
      <section class="table-card">
        <div class="table-toolbar">
          <input
            v-model="searchQuery"
            class="search"
            type="text"
            :placeholder="isAdmin ? 'Cari order, pelanggan, atau menu' : 'Cari order atau menu'"
          />
          <div v-if="isAdmin" class="table-actions">
            <button
              v-for="status in statusFilters"
              :key="status"
              class="btn btn-soft small"
              :class="{ active: activeStatus === status }"
              @click="activeStatus = status"
            >
              {{ status }}
          </button>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID Order</th>
                <th>Pelanggan</th>
                <th>Menu</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Status</th>
                <th>Waktu</th>
                <th v-if="isAdmin">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="order in filteredOrders"
                :key="order.id"
                class="row-click"
                :class="{ selected: selectedOrder?.id === order.id }"
                @click="selectedOrderId = order.id"
              >
                <td class="order-id">{{ order.id }}</td>
                <td>{{ order.customer }}</td>
                <td class="menu-col">{{ order.menu }}</td>
                <td>{{ order.qty }}</td>
                <td>{{ formatRupiah(order.totalAmount) }}</td>
                <td>
                  <span class="badge" :class="statusClass(order.status)">
                    {{ order.status }}
                  </span>
                </td>
                <td>{{ order.time }}</td>
                <td v-if="isAdmin">
                  <div class="row-actions">
                    <button
                      class="btn btn-success xsmall"
                      :disabled="order.status === 'Selesai' || order.status === 'Dibatalkan'"
                      @click.stop="advanceOrderStatus(order.id)"
                    >
                      {{ order.status === 'Diproses' ? 'Kirim' : 'Selesaikan' }}
                    </button>
                    <button class="btn btn-soft xsmall" @click.stop="openEditForm(order)">Edit</button>
                    <button
                      class="btn btn-warning xsmall"
                      :disabled="order.status === 'Dibatalkan' || order.status === 'Selesai'"
                      @click.stop="cancelOrder(order.id)"
                    >
                      Batalkan
                    </button>
                    <button class="btn btn-danger xsmall" @click.stop="deleteOrder(order.id)">Hapus</button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredOrders.length">
                <td :colspan="isAdmin ? 8 : 7" class="empty">Belum ada order. Buat pesanan dari form di kanan.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside class="side-panel">
        <section class="side-card highlight" v-if="selectedOrder">
          <p class="side-label">Order Dipilih</p>
          <p class="side-big">{{ selectedOrder.id }}</p>
          <p class="side-sub">
            {{ selectedOrder.customer }} • {{ selectedOrder.qty }} item • {{ formatRupiah(selectedOrder.totalAmount) }}
          </p>
          <span class="badge" :class="statusClass(selectedOrder.status)">{{ selectedOrder.status }}</span>
          <div v-if="isAdmin" class="detail-actions">
            <button
              class="btn btn-success"
              :disabled="selectedOrder.status === 'Selesai' || selectedOrder.status === 'Dibatalkan'"
              @click="advanceOrderStatus(selectedOrder.id)"
            >
              {{ selectedOrder.status === 'Diproses' ? 'Kirim Order' : 'Selesaikan Order' }}
            </button>
            <button class="btn btn-soft" @click="openEditForm(selectedOrder)">Edit Order</button>
            <button
              class="btn btn-warning"
              :disabled="selectedOrder.status === 'Dibatalkan' || selectedOrder.status === 'Selesai'"
              @click="cancelOrder(selectedOrder.id)"
            >
              Batalkan Order
            </button>
            <button class="btn btn-danger" @click="deleteOrder(selectedOrder.id)">Hapus Order</button>
          </div>
        </section>

        <section class="side-card" v-if="selectedOrder">
          <h2>Timeline</h2>
          <ul class="timeline">
            <li v-for="item in selectedOrder.timeline" :key="item.id">
              <div>
                <p>{{ item.text }}</p>
                <span>{{ item.meta }}</span>
              </div>
            </li>
          </ul>
        </section>

        <section class="side-card">
          <h2>{{ isAdmin ? (formMode === 'create' ? 'Tambah Order Cepat' : 'Edit Order') : 'Form Pesanan' }}</h2>
          <form class="order-form" @submit.prevent="saveOrder">
            <label>
              Customer
              <input v-model="form.customer" type="text" placeholder="Nama customer" />
            </label>

            <div class="multi-menu-panel">
              <p class="multi-menu-title">Menu (bisa pilih lebih dari 1)</p>
              <div class="multi-menu-grid">
                <div
                  v-for="option in menuOptions"
                  :key="option.name"
                  class="menu-option-card"
                  :class="{ selected: selectedMenus.includes(option.name) }"
                >
                  <div class="menu-option-main">
                    <div v-if="option.image" class="menu-option-thumb-wrap">
                      <img class="menu-option-thumb" :src="option.image" :alt="option.name" />
                    </div>
                    <div v-else class="menu-option-thumb empty">No Image</div>

                    <div class="menu-option-meta">
                      <p class="menu-option-name">{{ option.name }}</p>
                      <p class="menu-option-type">{{ option.type || 'Lainnya' }}</p>
                      <p class="menu-option-price">{{ formatRupiah(option.price) }}</p>
                    </div>
                  </div>

                  <div class="menu-option-controls">
                    <label class="menu-check-label">
                      <input
                        class="menu-option-check"
                        type="checkbox"
                        :checked="selectedMenus.includes(option.name)"
                        @change="toggleMenuSelection(option.name, $event.target.checked)"
                      />
                      <span>Pilih</span>
                    </label>
                    <input
                      v-if="selectedMenus.includes(option.name)"
                      class="qty-inline"
                      type="number"
                      min="1"
                      :value="menuQtyDraft[option.name] ?? 1"
                      @input="setMenuQuantity(option.name, $event.target.value)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="auto-summary">
              <p>
                Total otomatis:
                <strong>{{ formatRupiah(estimatedTotal) }}</strong>
              </p>
              <p>
                Total item:
                <strong>{{ estimatedTotalQty }}</strong>
              </p>
              <p>Status default order baru: <strong>Diproses</strong></p>
            </div>
            <p v-if="formError" class="form-error">{{ formError }}</p>

            <div class="form-actions">
              <button v-if="isAdmin" type="button" class="btn btn-soft" @click="openCreateForm">Reset</button>
              <button type="submit" class="btn btn-primary">
                {{ isCustomer ? 'Buat Pesanan' : formMode === 'create' ? 'Simpan Order' : 'Update Order' }}
              </button>
            </div>
          </form>
        </section>
      </aside>
    </div>

    <div v-else class="customer-content">
      <section class="customer-card">
        <h2>Menu Hari Ini</h2>
        <p class="customer-note">Pilih menu favorit kamu, lalu isi form pesanan di bawah.</p>
        <div class="menu-gallery">
          <article v-for="menu in menuOptions" :key="menu.name" class="menu-card">
            <img
              :src="menu.image || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80'"
              :alt="menu.name"
            />
            <div class="menu-card-body">
              <div>
                <p class="menu-name">{{ menu.name }}</p>
                <p class="menu-type">{{ menu.type || 'Lainnya' }}</p>
              </div>
              <p class="menu-price">{{ formatRupiah(menu.price) }}</p>
            </div>
          </article>
        </div>
      </section>

      <section class="customer-card">
        <h2>Form Pesanan</h2>
        <form class="order-form" @submit.prevent="saveOrder">
          <label>
            Nama
            <input v-model="form.customer" type="text" placeholder="Nama kamu" />
          </label>

          <div class="multi-menu-panel">
            <p class="multi-menu-title">Menu (bisa pilih lebih dari 1)</p>
            <div class="multi-menu-grid">
              <div
                v-for="option in menuOptions"
                :key="option.name"
                class="menu-option-card"
                :class="{ selected: selectedMenus.includes(option.name) }"
              >
                <div class="menu-option-main">
                  <div v-if="option.image" class="menu-option-thumb-wrap">
                    <img class="menu-option-thumb" :src="option.image" :alt="option.name" />
                  </div>
                  <div v-else class="menu-option-thumb empty">No Image</div>

                  <div class="menu-option-meta">
                    <p class="menu-option-name">{{ option.name }}</p>
                    <p class="menu-option-type">{{ option.type || 'Lainnya' }}</p>
                    <p class="menu-option-price">{{ formatRupiah(option.price) }}</p>
                  </div>
                </div>

                <div class="menu-option-controls">
                  <label class="menu-check-label">
                    <input
                      class="menu-option-check"
                      type="checkbox"
                      :checked="selectedMenus.includes(option.name)"
                      @change="toggleMenuSelection(option.name, $event.target.checked)"
                    />
                    <span>Pilih</span>
                  </label>
                  <input
                    v-if="selectedMenus.includes(option.name)"
                    class="qty-inline"
                    type="number"
                    min="1"
                    :value="menuQtyDraft[option.name] ?? 1"
                    @input="setMenuQuantity(option.name, $event.target.value)"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="auto-summary">
            <p>
              Total:
              <strong>{{ formatRupiah(estimatedTotal) }}</strong>
            </p>
            <p>
              Total item:
              <strong>{{ estimatedTotalQty }}</strong>
            </p>
          </div>

          <p v-if="formError" class="form-error">{{ formError }}</p>

          <p v-if="customerOrderNumber" class="order-number-info">
            Nomor order kamu: <strong>{{ customerOrderNumber }}</strong>
          </p>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Buat Pesanan</button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="isAdmin && showProductForm" class="product-modal-backdrop" @click.self="closeProductForm">
      <section class="product-modal">
        <div class="product-modal-header">
          <h2>Kelola Produk</h2>
          <button type="button" class="btn btn-danger xsmall" @click="closeProductForm">X</button>
        </div>

        <form class="order-form" @submit.prevent="createProduct">
          <label>
            Nama Produk
            <input v-model="productForm.name" type="text" />
          </label>
          <label>
            Jenis Produk
            <select v-model="productForm.type">
              <option v-for="type in productTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </label>
          <label>
            Harga Produk
            <input v-model.number="productForm.price" type="number" min="1000" />
          </label>
          <label>
            Foto Produk
            <input :key="productImageInputKey" class="product-image-input" type="file" accept="image/*" @change="onProductImageChange" />
          </label>
          <div v-if="productForm.image" class="product-image-preview">
            <img :src="productForm.image" alt="Preview foto produk" />
          </div>
          <p v-if="productFormError" class="form-error">{{ productFormError }}</p>
          <div class="form-actions">
            <button type="button" class="btn btn-soft" @click="resetProductForm">Reset</button>
            <button type="submit" class="btn btn-primary">Simpan Produk</button>
          </div>
        </form>

        <ul class="product-list">
          <li v-for="(menu, index) in menuOptions" :key="menu.name">
            <div v-if="menuEditIndex !== index" class="product-row">
              <div>
                <p class="menu-name">{{ menu.name }}</p>
                <p class="menu-type">{{ menu.type || 'Lainnya' }} • {{ formatRupiah(menu.price) }}</p>
              </div>
              <div class="menu-option-actions">
                <button type="button" class="btn btn-soft xsmall" @click="beginEditMenuOption(index)">Edit</button>
                <button type="button" class="btn btn-danger xsmall" @click="removeMenuOption(index)">Hapus</button>
              </div>
            </div>

            <div v-else class="product-edit-grid">
              <input v-model="menuEditDraft.name" type="text" />
              <select v-model="menuEditDraft.type">
                <option v-for="type in productTypes" :key="`edit-${type}`" :value="type">{{ type }}</option>
              </select>
              <input v-model.number="menuEditDraft.price" type="number" min="1000" />
              <input :key="editImageInputKey" class="product-image-input" type="file" accept="image/*" @change="onEditImageChange" />
              <div v-if="menuEditDraft.image" class="product-image-preview product-image-preview-small">
                <img :src="menuEditDraft.image" alt="Preview foto edit produk" />
              </div>
              <p v-if="menuEditError" class="form-error product-edit-error">{{ menuEditError }}</p>
              <div class="menu-option-actions">
                <button type="button" class="btn btn-success xsmall" @click="saveEditMenuOption">Simpan</button>
                <button
                  type="button"
                  class="btn btn-soft xsmall"
                  @click="cancelEditMenuOption"
                >
                  Batal
                </button>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>

<style scoped>
.order-page {
  display: grid;
  gap: 20px;
  color: #dbe9f5;
}

.page-header {
  background: linear-gradient(135deg, #173c5e, #1c5a7e);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
  color: #a3d6f8;
}

h1 {
  margin: 6px 0;
  font-size: clamp(28px, 3vw, 34px);
  color: #f3fbff;
}

.subtitle {
  margin: 0;
  color: #cae5f8;
  font-size: 14px;
}

.btn {
  border: 0;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-soft {
  background: rgba(226, 232, 240, 0.15);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.btn-soft.active {
  background: rgba(148, 197, 230, 0.35);
  color: #f8fafc;
}

.btn.small {
  padding: 8px 10px;
  font-size: 12px;
}

.btn-primary {
  background: #f5c65d;
  color: #1f2937;
}

.btn-warning {
  background: #f59e0b;
  color: #1f2937;
}

.btn-success {
  background: #22c55e;
  color: #052e16;
}

.btn-danger {
  background: #ef4444;
  color: #fef2f2;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.xsmall {
  padding: 6px 8px;
  font-size: 11px;
  border-radius: 10px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  background: #16324b;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  padding: 16px;
}

.stat-label {
  margin: 0;
  color: #9ec3de;
  font-size: 12px;
}

.stat-value {
  margin: 6px 0 4px;
  font-size: 26px;
  font-weight: 700;
  color: #f8fafc;
}

.stat-meta {
  margin: 0;
  font-size: 12px;
  color: #7dd3ab;
}

.content-grid {
  display: grid;
  grid-template-columns: 1.45fr 0.95fr;
  gap: 16px;
}

.customer-content {
  display: grid;
  gap: 16px;
}

.customer-card {
  background: #16324b;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  padding: 16px;
}

.customer-note {
  margin: -4px 0 14px;
  color: #cae5f8;
  font-size: 13px;
}

.menu-gallery {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.menu-card {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: #0f2a41;
}

.menu-card img {
  width: 100%;
  height: 250px;
  object-fit: cover;
  display: block;
}

.menu-card-body {
  padding: 10px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.menu-name {
  margin: 0;
  color: #e2e8f0;
  font-weight: 600;
}

.menu-type {
  margin: 2px 0 0;
  color: #94a3b8;
  font-size: 12px;
}

.menu-price {
  margin: 0;
  color: #7dd3ab;
  font-size: 13px;
  font-weight: 600;
}

.table-card,
.side-card {
  background: #16324b;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
}

.table-card {
  padding: 16px;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.search {
  width: 100%;
  max-width: 360px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  background: #0f2a41;
  color: #dbe9f5;
  padding: 10px 12px;
}

.search::placeholder {
  color: #7fa5c0;
}

.table-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 860px;
}

th,
td {
  text-align: left;
  padding: 12px 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  font-size: 13px;
}

th {
  color: #9ec3de;
  font-weight: 600;
}

td {
  color: #dbe9f5;
}

.row-click {
  cursor: pointer;
}

.row-click.selected {
  background: rgba(147, 197, 253, 0.12);
}

.order-id {
  color: #93c5fd;
  font-weight: 700;
}

.menu-col {
  max-width: 240px;
}

.row-actions {
  display: flex;
  gap: 6px;
}

.empty {
  text-align: center;
  color: #9ec3de;
}

.badge {
  display: inline-block;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}

.badge.processing {
  background: rgba(250, 204, 21, 0.2);
  color: #fde68a;
}

.badge.shipped {
  background: rgba(59, 130, 246, 0.2);
  color: #bfdbfe;
}

.badge.completed {
  background: rgba(34, 197, 94, 0.2);
  color: #bbf7d0;
}

.badge.cancelled {
  background: rgba(239, 68, 68, 0.2);
  color: #fecaca;
}

.side-panel {
  display: grid;
  gap: 12px;
}

.side-card {
  padding: 16px;
}

.side-card.highlight {
  background: linear-gradient(145deg, #185887, #1f6a99);
}

.side-label {
  margin: 0;
  color: #c9e7fb;
  font-size: 12px;
}

.side-big {
  margin: 8px 0 4px;
  font-size: 26px;
  font-weight: 700;
  color: #f8fafc;
}

.side-sub {
  margin: 0 0 14px;
  color: #d9ecf8;
  font-size: 13px;
}

.detail-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

h2 {
  margin: 0 0 14px;
  font-size: 18px;
  color: #f1f5f9;
}

.timeline {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.timeline li {
  padding: 10px 12px;
  background: #0f2a41;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.timeline p {
  margin: 0;
  font-size: 13px;
  color: #e2e8f0;
}

.timeline span {
  display: inline-block;
  margin-top: 5px;
  font-size: 12px;
  color: #9ec3de;
}

.order-form {
  display: grid;
  gap: 10px;
}

.order-form label {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: #9ec3de;
}

.order-form input,
.order-form select {
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  background: #0f2a41;
  color: #dbe9f5;
  padding: 10px 12px;
}

.multi-menu-panel {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 12px;
  background: rgba(15, 42, 65, 0.45);
  padding: 12px;
  display: grid;
  gap: 10px;
}

.multi-menu-title {
  margin: 0;
  font-size: 12px;
  color: #bae6fd;
  font-weight: 700;
}

.multi-menu-grid {
  display: grid;
  gap: 8px;
}

.menu-option-card {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 12px;
  background: rgba(11, 37, 57, 0.8);
  padding: 10px;
  display: grid;
  gap: 8px;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s ease;
}

.menu-option-card:hover {
  transform: translateY(-1px);
}

.menu-option-card.selected {
  border-color: rgba(56, 189, 248, 0.65);
  background: rgba(15, 67, 102, 0.52);
}

.menu-option-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-option-thumb-wrap {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}

.menu-option-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.menu-option-thumb.empty {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 10px;
  color: #94a3b8;
  background: rgba(30, 41, 59, 0.8);
  border: 1px dashed rgba(148, 163, 184, 0.35);
}

.menu-option-meta {
  min-width: 0;
}

.menu-option-name {
  margin: 0;
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 600;
}

.menu-option-price {
  margin: 4px 0 0;
  color: #86efac;
  font-size: 12px;
}

.menu-option-type {
  margin: 2px 0 0;
  color: #93c5fd;
  font-size: 11px;
}

.menu-option-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.menu-check-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #bfdbfe;
  font-size: 12px;
}

.menu-option-check {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1.5px solid rgba(148, 163, 184, 0.65);
  background: #0f2a41;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  position: relative;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.menu-option-check:hover {
  border-color: #7dd3fc;
}

.menu-option-check:checked {
  background: #0284c7;
  border-color: #7dd3fc;
  box-shadow: 0 0 0 2px rgba(125, 211, 252, 0.2);
}

.menu-option-check:checked::after {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #e0f2fe;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.qty-inline {
  width: 88px;
  padding: 8px 10px !important;
}

.auto-summary {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 12px;
  background: rgba(15, 42, 65, 0.45);
  padding: 10px;
}

.auto-summary p {
  margin: 0;
  font-size: 12px;
  color: #cfe5f5;
}

.auto-summary p + p {
  margin-top: 6px;
}

.menu-option-panel {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 12px;
  background: rgba(15, 42, 65, 0.45);
  padding: 10px;
  display: grid;
  gap: 8px;
}

.menu-option-title {
  margin: 0;
  color: #9ec3de;
  font-size: 12px;
}

.menu-option-create {
  display: grid;
  grid-template-columns: 1fr 130px auto;
  gap: 8px;
}

.menu-option-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.menu-option-list li {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
}

.menu-option-list li input {
  width: 100%;
}

.menu-option-list span {
  font-size: 13px;
  color: #dbe9f5;
}

.menu-option-actions {
  display: flex;
  gap: 6px;
}

.product-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.62);
  backdrop-filter: blur(2px);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 100;
}

.product-modal {
  width: min(760px, 100%);
  max-height: 90vh;
  overflow: auto;
  background: #16324b;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 16px;
  padding: 16px;
  display: grid;
  gap: 12px;
}

.product-modal-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.product-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.product-list li {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
  padding: 10px;
  background: rgba(15, 42, 65, 0.42);
}

.product-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.product-edit-grid {
  display: grid;
  grid-template-columns: 1fr 140px 120px auto;
  gap: 8px;
  align-items: center;
}

.product-image-input {
  grid-column: 1 / span 3;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  background: #0f2a41;
  color: #dbe9f5;
  padding: 6px;
  font-size: 12px;
}

.product-image-input::file-selector-button {
  border: 1px solid rgba(125, 211, 252, 0.35);
  border-radius: 8px;
  background: rgba(14, 116, 144, 0.28);
  color: #e0f2fe;
  padding: 7px 10px;
  margin-right: 10px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}

.product-image-input::-webkit-file-upload-button {
  border: 1px solid rgba(125, 211, 252, 0.35);
  border-radius: 8px;
  background: rgba(14, 116, 144, 0.28);
  color: #e0f2fe;
  padding: 7px 10px;
  margin-right: 10px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}

.product-image-preview {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 10px;
  padding: 8px;
  background: rgba(15, 42, 65, 0.42);
  width: fit-content;
}

.product-image-preview img {
  width: 92px;
  height: 92px;
  object-fit: cover;
  border-radius: 8px;
  display: block;
}

.product-image-preview-small {
  grid-column: 1 / span 3;
}

.product-edit-error {
  grid-column: 1 / span 3;
}

.form-error {
  margin: 0;
  color: #fca5a5;
  font-size: 12px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.order-number-info {
  margin: 0;
  border: 1px solid rgba(125, 211, 171, 0.35);
  background: rgba(22, 163, 74, 0.12);
  border-radius: 10px;
  padding: 10px;
  color: #dcfce7;
  font-size: 13px;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .menu-gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .page-header {
    flex-direction: column;
  }

  .header-actions,
  .table-toolbar {
    width: 100%;
  }

  .table-toolbar {
    flex-direction: column;
  }

  .search {
    max-width: none;
  }

  .table-actions {
    justify-content: flex-start;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .menu-option-create {
    grid-template-columns: 1fr;
  }

  .menu-option-list li {
    grid-template-columns: 1fr;
  }

  .menu-option-main {
    align-items: flex-start;
  }

  .menu-option-controls {
    flex-wrap: wrap;
  }

  .qty-inline {
    width: 100%;
  }

  .product-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .product-edit-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    justify-content: flex-start;
  }
}
</style>
