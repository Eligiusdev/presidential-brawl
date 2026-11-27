package sim

import (
	"math"

	"github.com/presidential-brawl/engine/internal/rng"
)

func (m *Match) aiInput(f *Fighter) []string {
	state := f.AIRNG
	if state == 0 { state = uint32(f.Slot+1)*7919 + m.Seed }
	random := rng.NewRNG(state)
	defer func() { f.AIRNG = random.State() }()
	o := m.aliveOpponent(f)
	if o == nil { return nil }
	var out []string
	aggro := []float64{.72, 1.05, 1.45, 1.95}[clampInt(f.Difficulty, 0, 3)]
	dx := o.CX() - f.CX()
	dy := o.CY() - f.CY()
	dist := math.Abs(dx)
	dir := 1
	if dx < 0 { dir = -1 }

	// Recuperación: prioridad máxima.
	offstage := f.CX() < m.Main.X+18 || f.CX() > m.Main.X+m.Main.W-18
	falling := f.Y > m.Main.Y+18
	if offstage || falling {
		if f.Wall != 0 && f.VY > 2.2 {
			if f.Wall == 1 { out = append(out, "right") } else { out = append(out, "left") }
			out = append(out, "jump")
			return out
		}
		if !f.On && f.AirJ > 0 && f.VY > -2 {
			out = append(out, "jump")
			if offstage { out = append(out, actionToward(m.Main.X+m.Main.W/2-f.CX())) }
			return out
		}
		if f.IsFloatZoner() && f.FloatT > 0 && !f.On && f.VY > 0 {
			return []string{"jump", actionToward(m.Main.X+m.Main.W/2-f.CX())}
		}
		if !f.UpSpecUsed && f.VY > 3 {
			return []string{"jump", "heavy", actionToward(m.Main.X+m.Main.W/2-f.CX())}
		}
		out = append(out, actionToward(m.Main.X+m.Main.W/2-f.CX()))
		if f.DashCD <= 0 { out = append(out, "dash") }
		return out
	}

	if f.Vote >= 100 && dist < 420 && m.Cine == nil && m.Telegraph == nil {
		return []string{"ult"}
	}
	if f.Wpn > 0 && f.Ammo <= 0 && f.ReloadT <= 0 { return []string{"reload"} }

	for _, it := range m.Items {
		if math.Abs(it.X-f.CX()) < 260 && f.Wpn == 0 {
			out = append(out, actionToward(it.X-f.CX()))
			if math.Abs(it.X-f.CX()) < f.W { out = append(out, "light") }
			return out
		}
	}

	f.AICool--
	if f.AICool <= 0 {
		f.AIStrafe = random.Int(3) - 1
		f.AICool = 12 + random.Int(int(24/aggro)+1)
	}

	if dist < 78 && f.On && o.On {
		if random.Float() < math.Min(.88, .32 + .22*aggro) { out = append(out, "light") }
		if random.Float() < math.Min(.70, .16 + .20*aggro) { out = append(out, "heavy") }
		if f.AIStrafe != 0 { out = append(out, actionToward(float64(f.AIStrafe))) }
		if o.Dead > 0 { out = append(out, actionToward(float64(dir))) }
		return out
	}
	if dist < 220 && !f.On && random.Float() < .5 {
		out = append(out, "light")
		if dy < -60 { out = append(out, "jump") } else if dy > 60 { out = append(out, "down") }
	}
	if dist > 60 {
		out = append(out, actionToward(dx))
		if f.On && random.Float() < .06*aggro { out = append(out, "jump") }
		if f.DashCD <= 0 && dist > 320 && random.Float() < .05*aggro { out = append(out, "dash") }
	}
	return dedupe(out)
}

func actionToward(d float64) string {
	if d > 12 { return "right" }
	if d < -12 { return "left" }
	return ""
}

func dedupe(in []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, x := range in {
		if x == "" || seen[x] { continue }
		seen[x] = true
		out = append(out, x)
	}
	return out
}

func clampInt(v, a, b int) int {
	if v < a { return a }
	if v > b { return b }
	return v
}
