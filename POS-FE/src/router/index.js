import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/Dashboard.vue'
import OrderAdminView from '../views/OrderAdmin.vue'
import OrderCustomerView from '../views/OrderCustomer.vue'
import LoginView from '../views/Login.vue'

const routes = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: {
      hideSidebar: true,
      guestOnly: true,
    },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView,
    meta: {
      requiresAdmin: true,
    },
  },
  {
    path: '/order',
    name: 'order',
    component: OrderCustomerView,
    meta: {
      requiresCustomer: true,
    },
  },
  {
    path: '/order-admin',
    name: 'order-admin',
    component: OrderAdminView,
    meta: {
      requiresAdmin: true,
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const getUserRole = () => localStorage.getItem('userRole')
const hasToken = () => !!localStorage.getItem('token')

router.beforeEach((to) => {
  const role = getUserRole()
  const isAdmin = role === 'admin' && hasToken()
  const isCustomer = role === 'customer'
  const isAuthenticated = isAdmin || isCustomer

  if (to.path === '/') {
    if (isAdmin) {
      return { name: 'dashboard' }
    }

    if (isCustomer) {
      return { name: 'order' }
    }

    return { name: 'login' }
  }

  if (to.meta.requiresAdmin && !isAdmin) {
    return isCustomer ? { name: 'order' } : { name: 'login' }
  }

  if (to.meta.requiresCustomer && !isCustomer) {
    return isAdmin ? { name: 'order-admin' } : { name: 'login' }
  }

  if ((to.meta.requiresAdmin || to.meta.requiresCustomer) && !isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.guestOnly && isAuthenticated) {
    return isAdmin ? { name: 'dashboard' } : { name: 'order' }
  }

  return true
})

export default router

