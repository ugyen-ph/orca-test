import { Check, Pencil, Trash2 } from 'lucide-react'
import { STATUS_LABELS, TASK_STATUSES } from '../constants.js'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date)
}

export default function TaskItem({ task, busy, onEdit, onDelete, onStatusChange }) {
  const isCompleted = task.status === 'completed'

  return (
    <li className={`task${isCompleted ? ' task--done' : ''}`} aria-busy={busy}>
      <label className="task__check">
        <input
          type="checkbox"
          checked={isCompleted}
          disabled={busy}
          onChange={(event) => onStatusChange(task, event.target.checked ? 'completed' : 'pending')}
        />
        <span aria-hidden="true">
          <Check size={14} strokeWidth={3} />
        </span>
        <span className="sr-only">
          {isCompleted ? `Mark ${task.title} as pending` : `Mark ${task.title} as completed`}
        </span>
      </label>

      <div className="task__main">
        <p className="task__title">{task.title}</p>
        {task.description ? <p className="task__description">{task.description}</p> : null}
        <div className="task__meta">
          <time dateTime={task.created_at}>{formatDate(task.created_at)}</time>
          <select
            className={`status-select status-select--${task.status}`}
            value={task.status}
            disabled={busy}
            onChange={(event) => onStatusChange(task, event.target.value)}
            aria-label={`Status for ${task.title}`}
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="task__actions">
        <button
          className="icon-button"
          type="button"
          onClick={() => onEdit(task)}
          disabled={busy}
          aria-label={`Edit ${task.title}`}
        >
          <Pencil size={16} aria-hidden="true" />
        </button>
        <button
          className="icon-button icon-button--danger"
          type="button"
          onClick={() => onDelete(task)}
          disabled={busy}
          aria-label={`Delete ${task.title}`}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}
