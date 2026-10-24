import { useCallback, useEffect, useState } from 'react'
import * as tasksApi from '../api/tasks.js'

export default function useTasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    tasksApi
      .listTasks()
      .then((data) => {
        if (!active) return
        setTasks(data)
        setError(null)
      })
      .catch((err) => {
        if (active) setError(err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setTasks(await tasksApi.listTasks())
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createTask = useCallback(async (payload) => {
    const created = await tasksApi.createTask(payload)
    setTasks((current) => [created, ...current])
    return created
  }, [])

  const updateTask = useCallback(async (id, patch) => {
    const updated = await tasksApi.updateTask(id, patch)
    setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)))
    return updated
  }, [])

  const deleteTask = useCallback(async (id) => {
    await tasksApi.deleteTask(id)
    setTasks((current) => current.filter((task) => task.id !== id))
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    tasks,
    loading,
    error,
    reload,
    createTask,
    updateTask,
    deleteTask,
    clearError,
  }
}
