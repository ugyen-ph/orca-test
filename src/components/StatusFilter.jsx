import { STATUS_LABELS, TASK_STATUSES } from '../constants.js'

export default function StatusFilter({ value, counts, onChange }) {
  const filters = [
    { value: 'all', label: 'All' },
    ...TASK_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
  ]

  return (
    <div className="filter" role="group" aria-label="Filter tasks by status">
      {filters.map((filter) => (
        <button
          key={filter.value}
          type="button"
          className={`filter__button${value === filter.value ? ' is-active' : ''}`}
          aria-pressed={value === filter.value}
          onClick={() => onChange(filter.value)}
        >
          {filter.label}
          <span className="filter__count">{counts[filter.value] ?? 0}</span>
        </button>
      ))}
    </div>
  )
}
