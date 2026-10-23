import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api'

const http = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

function toApiError(error) {
  const apiError = error.response?.data?.error
  if (!apiError) return error

  const normalized = new Error(apiError.message)
  normalized.code = apiError.code
  normalized.details = apiError.details ?? []
  return normalized
}

async function request(config) {
  try {
    const { data } = await http.request(config)
    if (!data.success) throw new Error('Request failed.')
    return data.data
  } catch (error) {
    throw toApiError(error)
  }
}

export function listTasks() {
  return request({ method: 'GET', url: '/tasks' })
}

export function createTask(task) {
  return request({ method: 'POST', url: '/tasks', data: task })
}

export function updateTask(id, patch) {
  return request({ method: 'PUT', url: `/tasks/${id}`, data: patch })
}

export function deleteTask(id) {
  return request({ method: 'DELETE', url: `/tasks/${id}` })
}
