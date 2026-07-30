import api from './client'

export const login = async (username: string, password: string) => {
  const { data } = await api.post('/auth/login', { username, password })
  localStorage.setItem('mytube_token', data.access_token)
  return data
}

export const setupAdmin = async () => {
  const { data } = await api.post('/auth/setup')
  localStorage.setItem('mytube_token', data.access_token)
  return data
}

export const getMe = async () => {
  const { data } = await api.get('/auth/me')
  return data
}

export const changePassword = async (oldPassword: string, newPassword: string) => {
  const { data } = await api.put('/auth/change-password', null, {
    params: { old_password: oldPassword, new_password: newPassword },
  })
  return data
}

export const register = async (username: string, password: string) => {
  const { data } = await api.post('/auth/register', { username, password })
  localStorage.setItem('mytube_token', data.access_token)
  return data
}

export const logout = () => {
  localStorage.removeItem('mytube_token')
  window.location.href = '/login'
}
