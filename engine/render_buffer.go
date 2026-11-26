package sim

const (
	RenderSlots  = 8
	RenderStride = 8
	RenderFloats = RenderSlots * RenderStride
)

type RenderBuffer [RenderFloats]float32

// WriteRenderBuffer projects the corrected timeline into a fixed visual buffer.
// Coordinates are the horizontal center and feet of the fighter. Animation is
// a state index, independent of the chosen texture atlas.
func (t *RollbackTimeline) WriteRenderBuffer(out *RenderBuffer) {
	writeFighterRenderBuffer(t.match.Fighters, out)
}

func writeFighterRenderBuffer(fighters []*Fighter, out *RenderBuffer) {
	clear(out[:])
	for _, fighter := range fighters {
		slot := fighter.Slot
		if slot < 0 || slot >= RenderSlots || fighter.Stocks <= 0 {
			continue
		}
		base := slot * RenderStride
		if fighter.Dead == 0 {
			out[base] = 1
		}
		out[base+1] = float32(fighter.CX())
		out[base+2] = float32(fighter.Y + fighter.H)
		out[base+3] = float32(fighter.Face)
		out[base+4] = renderPose(fighter)
		out[base+5] = float32(fighter.Pct)
		out[base+6] = float32(min(1, max(0, fighter.Vote/100)))
		out[base+7] = float32(fighter.Stocks)
	}
}

func renderPose(f *Fighter) float32 {
	switch {
	case f.Stun > 0:
		return 5
	case f.Atk != nil:
		return 4
	case f.DashT > 0:
		return 3
	case !f.On:
		return 2
	case f.VX > .4 || f.VX < -.4:
		return 1
	default:
		return 0
	}
}

// WriteMatchRenderBuffer is also used by local Wasm consumers.
func (m *Match) WriteMatchRenderBuffer(out *RenderBuffer) {
	writeFighterRenderBuffer(m.Fighters, out)
}
