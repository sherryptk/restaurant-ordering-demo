// Dev-only: flips the menu page between real data and the worst-case fixtures via ?data=
const STATES = [
  ['', 'Demo'],
  ['worst', 'Worst case'],
  ['empty', 'Empty'],
  ['one', 'One'],
  ['huge', '480 rows'],
]

export default function DataToggle() {
  const current = new URLSearchParams(window.location.search).get('data') || ''
  const go = (value) => {
    const url = new URL(window.location.href)
    if (value) url.searchParams.set('data', value)
    else url.searchParams.delete('data')
    window.location.href = url.toString()
  }
  return (
    <div
      style={{
        position: 'fixed', left: '50%', bottom: 12, transform: 'translateX(-50%)', zIndex: 2000,
        display: 'flex', gap: 2, padding: 3, background: '#d6d6d6', borderRadius: 999,
        font: '12px system-ui, sans-serif',
      }}
    >
      {STATES.map(([value, label]) => (
        <button
          key={label}
          onClick={() => go(value)}
          style={{
            border: 0, padding: '5px 10px', borderRadius: 999, cursor: 'pointer', font: 'inherit',
            background: current === value ? '#fff' : 'transparent', color: '#111',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
