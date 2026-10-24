import { useMemo, useState } from 'react'
import { ListChecks, RotateCw, X } from 'lucide-react'
import StatusFilter from '../components/StatusFilter.jsx'
import TaskForm from '../components/TaskForm.jsx'
import TaskList from '../components/TaskList.jsx'
import useTasks from '../hooks/useTasks.js'
import { STATUS_LABELS } from '../constants.js'

export default function Dashboard() {
  const { tasks, loading, error, reload, createTask, updateTask, deleteTask } = useTasks()
  const [filter, setFilter] = useState('all')
  const [editingTask, setEditingTask] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState(null)

  const counts = useMemo(() => {
    const result = { all: tasks.length, pending: 0, in_progress: 0, completed: 0 }
    for (const task of tasks) {
      if (task.status === 'pending') result.pending += 1
      else if (task.status === 'in_progress') result.in_progress += 1
      else if (task.status === 'completed') result.completed += 1
    }
    return result
  }, [tasks])

  const visibleTasks = useMemo(
    () => (filter === 'all' ? tasks : tasks.filter((task) => task.status === filter)),
    [tasks, filter],
  )

  async function handleSave(payload) {
    if (editingTask) {
      await updateTask(editingTask.id, payload)
      setEditingTask(null)
    } else {
      await createTask(payload)
    }
  }

  async function handleStatusChange(task, status) {
    if (task.status === status) return

    setBusyId(task.id)
    setActionError(null)
    try {
      const updated = await updateTask(task.id, { status })
      if (editingTask?.id === task.id) setEditingTask(updated)
    } catch (err) {
      setActionError(err)
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(task) {
    const confirmed = window.confirm(`Delete "${task.title}"? This cannot be undone.`)
    if (!confirmed) return

    setBusyId(task.id)
    setActionError(null)
    try {
      await deleteTask(task.id)
      if (editingTask?.id === task.id) setEditingTask(null)
    } catch (err) {
      setActionError(err)
    } finally {
      setBusyId(null)
    }
  }

  function handleEdit(task) {
    setEditingTask(task)
  }

  function handleReload() {
    setActionError(null)
    reload()
  }

  const activeCount = counts.pending + counts.in_progress
  const isFiltered = filter !== 'all'
  const emptyTitle = isFiltered ? `No ${STATUS_LABELS[filter].toLowerCase()} tasks` : 'No tasks yet'
  const emptyMessage =
    tasks.length === 0
      ? 'Add your first task with the form and it will appear here.'
      : 'Try a different filter or add a new task.'

  return (
    <main className="dashboard">
      <header className="masthead">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <ListChecks size={22} />
          </span>
          <div>
            <h1>Task Manager</h1>
            <p className="brand__subtitle">A calm place to track what matters.</p>
          </div>
        </div>

        <dl className="stats" aria-label="Task summary">
          <div className="stat">
            <dt>Total</dt>
            <dd>{counts.all}</dd>
          </div>
          <div className="stat">
            <dt>Active</dt>
            <dd>{activeCount}</dd>
          </div>
          <div className="stat">
            <dt>Done</dt>
            <dd>{counts.completed}</dd>
          </div>
        </dl>
      </header>

      <div className="layout">
        <section className="panel panel--form" aria-labelledby="task-form-heading">
          <TaskForm
            key={editingTask ? `${editingTask.id}-${editingTask.status}` : 'new'}
            task={editingTask}
            onSubmit={handleSave}
            onCancel={() => setEditingTask(null)}
          />
        </section>

        <section className="panel panel--list" aria-labelledby="task-list-heading">
          <div className="toolbar">
            <div className="toolbar__heading">
              <h2 id="task-list-heading">Tasks</h2>
              <p>
                {visibleTasks.length} of {tasks.length} shown
              </p>
            </div>
            <StatusFilter value={filter} counts={counts} onChange={setFilter} />
          </div>

          {error ? (
            <div className="banner banner--error" role="alert">
              <div className="banner__body">
                <strong>Could not load tasks.</strong>
                <span>{error.message}</span>
              </div>
              <button className="button button--ghost button--small" type="button" onClick={handleReload}>
                <RotateCw size={14} aria-hidden="true" />
                Retry
              </button>
            </div>
          ) : null}

          {actionError ? (
            <div className="banner banner--error" role="alert">
              <span className="banner__body">{actionError.message}</span>
              <button
                className="icon-button"
                type="button"
                onClick={() => setActionError(null)}
                aria-label="Dismiss error"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ) : null}

          {error && tasks.length === 0 ? null : (
            <TaskList
              tasks={visibleTasks}
              loading={loading}
              busyId={busyId}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              emptyTitle={emptyTitle}
              emptyMessage={emptyMessage}
            />
          )}
        </section>
      </div>
    </main>
  )
}
