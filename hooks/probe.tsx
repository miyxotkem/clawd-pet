import type { ClientModule } from 'claude-code'

// Measures the bars above Clawd's strip: laid out behind them at their full height, it draws nothing
// and reports how many rows they take each time that changes, so Clawd knows how high it can go.
const Probe: ClientModule<null, { rows: number }> = (_, s) => {
  const { Box } = s.elements
  if (s.rows !== (s.state?.rows ?? -1)) {
    s.setState({ rows: s.rows })
    s.post({ barRows: s.rows })
  }

  return <Box />
}

export default Probe
