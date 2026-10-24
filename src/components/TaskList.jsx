import { Inbox } from 'lucide-react'
import TaskItem from './TaskItem.jsx'

export default function TaskList({
  tasks,
  loading,
  busyId,
  onEdit,
  onDelete,
  onStatusChange,
  emptyTitle,
  emptyMessage,
}) {
  if (loading) {
    return (
      <div className="task-list" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading tasks…</span>
        {[0, 1, 2].map((key) => (
          <div className="skeleton" key={key} aria-hidden="true" />
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="empty">
        <span className="empty__icon" aria-hidden="true">
          <Inbox size={22} />
        </span>
        <h3>{emptyTitle}</h3>
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          busy={busyId === task.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />
      ))}
    </ul>
  )
}
