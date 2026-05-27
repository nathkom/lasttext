export default function PillSelect({ label, options, value, onChange, hint, allowClear = true }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="pill-group">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            className={`pill ${value === opt.value ? 'selected' : ''}`}
            onClick={() => onChange(allowClear && value === opt.value ? null : opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  )
}
