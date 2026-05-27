export default function Scale({ label, value, onChange, leftLabel, rightLabel, hint }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="scale">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            className={value === n ? 'selected' : ''}
            onClick={() => onChange(value === n ? null : n)}
          >
            {n}
          </button>
        ))}
      </div>
      {(leftLabel || rightLabel) && (
        <div className="scale-labels">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  )
}
