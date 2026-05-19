<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../services/auth'

const router = useRouter()
const form = reactive({
  username: '',
  password: '',
})
const error = ref('')
const loading = ref(false)

const submitLogin = async () => {
  const username = form.username.trim()
  const password = form.password.trim()

  if (!username || !password) {
    error.value = 'Username dan password wajib diisi.'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const { role } = await login(username, password)

    if (role === 'admin') {
      router.push('/dashboard')
    } else {
      router.push('/order')
    }
  } catch (err) {
    const messages = {
      'INVALID_CREDENTIALS': 'Username atau password salah.',
      'USERNAME_PASSWORD_REQUIRED': 'Username dan password wajib diisi.',
    }
    error.value = messages[err.message] || err.message || 'Gagal login, coba lagi.'
  } finally {
    loading.value = false
  }
}

const continueAsCustomer = () => {
  localStorage.setItem('userRole', 'customer')
  localStorage.removeItem('token')
  error.value = ''
  router.push('/order')
}
</script>

<template>
  <section class="login-page">
  <div class="login-wrapper">
    <form class="login-card" @submit.prevent="submitLogin">
      <h1>Welcome Back Cashier!</h1>
      <p class="subtitle">Selamat datang kembali ingat SOP selama melakukan shift, Semangat !!</p>

      <label for="username">Username</label>
      <input id="username" v-model="form.username" type="username" placeholder="username" />

      <label for="password">Password</label>
      <input id="password" v-model="form.password" type="password" placeholder="Masukkan password" />

      <p v-if="error" class="error-text">{{ error }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Memproses...' : 'Masuk sebagai Admin' }}
      </button>
      <button type="button" class="btn-skip" @click="continueAsCustomer">
        Lewati, lanjut sebagai pelanggan
      </button>
    </form>
  </div>
  </section>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: start;
  background-color: #020617;
  background-image: url('../assets/coffeshop.jpg');
  background-size: 6
  0% 100%;
  background-position: right center;
  background-repeat: no-repeat;
}

.login-wrapper {
  width: 100%;
  min-height: 100vh;
  display: flex;
  justify-content: flex-start;
}

.login-card {
  width: 100%;
  max-width: 900px;
  min-height: 100vh;
  padding: 40px 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: rgb(15, 23, 42);
  box-shadow: 0 20px 40px rgba(2, 6, 23, 0.45);
  border-radius: 0 18px 18px 0;
  gap: 10px;
}

.login-card h1 {
  margin: 0;
  font-size: 28px;
  color: #f8fafc;
  text-align: left;
}

.login-card .subtitle {
  margin: 0 0 18px;
  color: #94a3b8;
  text-align: left;
}

.login-card label {
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

.login-card input {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 50px;
  padding: 11px 12px;
  font-size: 14px;
  color: #f8fafc;
  background-color: rgba(30, 41, 59, 0.9);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.login-card input:focus {
  background-color: rgba(30, 41, 59, 0.9);
  outline: none;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25);
  border-color: #22c55e;
  color: #f8fafc;
}

.login-card input::placeholder {
  color: #94a3b8;
}

.login-card input:-webkit-autofill,
.login-card input:-webkit-autofill:hover,
.login-card input:-webkit-autofill:focus,
.login-card input:-webkit-autofill:active {
  -webkit-text-fill-color: #f8fafc;
  -webkit-box-shadow: 0 0 0 1000px rgba(30, 41, 59, 0.9) inset;
  box-shadow: 0 0 0 1000px rgba(30, 41, 59, 0.9) inset;
  caret-color: #f8fafc;
  transition: background-color 5000s ease-in-out 0s;
}

.error-text {
  margin: 4px 0;
  color: #dc2626;
  font-size: 13px;
}

.login-card button {
  margin-top: 8px;
  border: 0;
  border-radius: 50px;
  padding: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  background: #22c55e;
  color: #ecfdf5;
  margin: 28px 0 0;
}

.login-card button:hover {
  background: #16a34a;
}

.login-card .btn-skip {
  margin-top: 4px;
  background: #14244a;
  color: #f8fafc;
}

.login-card .btn-skip:hover {
  background: #1e293b;
}
</style>
