import { useId, useState } from 'react'
import { Plus, Save, X } from 'lucide-react'
import { STATUS_LABELS, TASK_STATUSES } from '../constants.js'

const EMPTY_VALUES = { title: '', description: '', status: 'pending' }
const MAX_TITLE = 255
const MAX_DESCRIPTION = 5000

function toValues(task) {
  if (!task) return EMPTY_VALUES
  return {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
  }
}

function validate(values) {
  const errors = {}
  const title = values.title.trim()
  const description = values.description.trim()

  if (!title) errors.title = 'Title is required.'
  else if (title.length > MAX_TITLE) errors.title = 'Title must be 255 characters or fewer.'

  if (description.length > MAX_DESCRIPTION) {
    errors.description = 'Description must be 5000 characters or fewer.'
  }

  return errors
}

function mapDetails(details) {
  if (!Array.isArray(details)) return {}

  return details.reduce((fields, detail) => {
    if (detail?.field) fields[detail.field] = detail.message
    return fields
  }, {})
}

export default function TaskForm({ task, onSubmit, onCancel }) {
  const formId = useId()
  const titleId = `${formId}-title`
  const descriptionId = `${formId}-description`
  const statusId = `${formId}-status`

  const [values, setValues] = useState(() => toValues(task))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setFormError(null)

    try {
      await onSubmit({
        title: values.title.trim(),
        description: values.description.trim() || null,
        status: values.status,
      })
      if (!task) setValues(EMPTY_VALUES)
    } catch (error) {
      setErrors(mapDetails(error.details))
      setFormError(error.message ?? 'The task could not be saved.')
    } finally {
      setSubmitting(false)
    }
  }

  const isEditing = Boolean(task)
  const descriptionLength = values.description.length

  return (
    <div className="form">
      <div className="form__header">
        <h2 id="task-form-heading">{isEditing ? 'Edit task' : 'Add a task'}</h2>
        <p>{isEditing ? 'Update the details, then save.' : 'Capture what needs doing.'}</p>
      </div>

      {formError ? (
        <div className="banner banner--error" role="alert">
          <span>{formError}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor={titleId}>Title</label>
          <input
            id={titleId}
            name="title"
            type="text"
            autoFocus={isEditing}
            value={values.title}
            onChange={(event) => updateField('title', event.target.value)}
            placeholder="What needs doing?"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? `${titleId}-error` : undefined}
            disabled={submitting}
          />
          {errors.title ? (
            <p className="field__error" id={`${titleId}-error`}>
              {errors.title}
            </p>
          ) : null}
        </div>

        <div className="field">
          <div className="field__label-row">
            <label htmlFor={descriptionId}>Description</label>
            <span className={descriptionLength > MAX_DESCRIPTION ? 'field__counter is-over' : 'field__counter'}>
              {descriptionLength} / {MAX_DESCRIPTION}
            </span>
          </div>
          <textarea
            id={descriptionId}
            name="description"
            rows={4}
            value={values.description}
            onChange={(event) => updateField('description', event.target.value)}
            placeholder="Add context, links, or acceptance notes."
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? `${descriptionId}-error` : undefined}
            disabled={submitting}
          />
          {errors.description ? (
            <p className="field__error" id={`${descriptionId}-error`}>
              {errors.description}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor={statusId}>Status</label>
          <select
            id={statusId}
            name="status"
            value={values.status}
            onChange={(event) => updateField('status', event.target.value)}
            disabled={submitting}
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <div className="form__actions">
          <button className="button button--primary" type="submit" disabled={submitting}>
            {submitting ? (
              'Saving…'
            ) : isEditing ? (
              <>
                <Save size={16} aria-hidden="true" />
                Save changes
              </>
            ) : (
              <>
                <Plus size={16} aria-hidden="true" />
                Add task
              </>
            )}
          </button>
          {isEditing ? (
            <button className="button button--ghost" type="button" onClick={onCancel} disabled={submitting}>
              <X size={16} aria-hidden="true" />
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </div>
  )
}
