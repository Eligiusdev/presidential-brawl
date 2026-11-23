package sim

import (
	"math"
)

func has(a []string, k string) bool {
	for _, x := range a {
		if x == k {
			return true
		}
	}
	return false
}

type Platform struct{ X, Y, W float64 }

type Hitbox struct {
	X, Y, W, H float64
	Dmg        float64
	BK         float64
	KX, KY     float64
	Owner      int
	Life       int
}

type Fighter struct {
	Slot      int
	FighterID string
	Stats     Stats
	X, Y      float64
	W, H      float64
	VX, VY    float64
	Facing    int
	On        bool
	Dead      int
	Stocks    int
	Damage    float64
	UltCharge float64
	Stun      int
	MaxStun   int
	Inv       int
	JumpTick  int
	DashT     int
	DashCD    int
	Combo     int
	FastFall  bool
	Winning   bool
	WinT      int
	MoveKind  string
	AtkT      int
	AtkDur    int
	AtkKind   string
	Ammo      int
	MaxAmmo   int
	ReloadT   int
	ReloadDur int
	Crouch    bool
	HitFlash  int
	SquashX   float64
	SquashY   float64
	HitCD     int
}

type OnlineMatch struct {
	Players   []*Fighter
	Stage     int
	Seed      uint32
	Tick      uint32
	OnEnd     func([]int)
	standings []int
	main      struct{ X, Y, W, H float64 }
	blast     struct{ L, R, T, B float64 }
	plats     []Platform
	hits      []Hitbox
	rng       *RNG
	ended     bool
}

type simpleErr string

func (e simpleErr) Error() string { return string(e) }
func fmtErr(s string) error       { return simpleErr(s) }

func NewOnlineMatch(ids []string, stage int, seed uint32) (*OnlineMatch, error) {
	n := len(ids)
	if n != 2 && n != 4 && n != 6 && n != 8 {
		return nil, fmtErr("Capacidad de sala inválida")
	}
	for _, id := range ids {
		found := false
		for _, f := range fighterIDs {
			if f == id {
				found = true
				break
			}
		}
		if !found {
			return nil, fmtErr("Luchador inválido")
		}
	}
	if stage < 0 || stage >= StageCount() {
		stage = 0
	}
	m := &OnlineMatch{Stage: stage, Seed: seed, rng: NewRNG(seed)}
	m.setup(ids)
	return m, nil
}

func (m *OnlineMatch) setup(ids []string) {
	n := len(ids)
	scaleW := map[int]float64{2: 1.0, 4: 1.15, 6: 1.25, 8: 1.4}[n]
	mw := 860.0 * scaleW
	mx, my := (1440.0-mw)/2, 560.0
	m.main = struct{ X, Y, W, H float64 }{mx, my, mw, 80}
	m.blast = struct{ L, R, T, B float64 }{-180, 1620, -260, 990}
	m.plats = nil
	if n >= 4 {
		m.plats = append(m.plats, Platform{X: mx + mw*0.2, Y: my - 120, W: 140}, Platform{X: mx + mw*0.8 - 140, Y: my - 120, W: 140})
	}
	if n >= 6 {
		m.plats = append(m.plats, Platform{X: mx + mw*0.5 - 90, Y: my - 220, W: 180})
	}
	m.Players = make([]*Fighter, n)
	for i, id := range ids {
		st := GetStats(id)
		f := &Fighter{
			Slot: i, FighterID: id, Stats: st, W: 38, H: 92, Stocks: 3, MaxAmmo: 6, Ammo: 6,
			SquashX: 1, SquashY: 1, Facing: 1,
		}
		t := float64(i+1) / float64(n+1)
		f.X = mx + mw*t - f.W/2
		f.Y = my - f.H
		if f.X+f.W/2 > mx+mw/2 {
			f.Facing = -1
		}
		f.On = true
		m.Players[i] = f
	}
}

func (m *OnlineMatch) Step(inputs [][]string) uint32 {
	m.Tick++
	for i, f := range m.Players {
		if f == nil || f.Stocks <= 0 {
			continue
		}
		var in []string
		if i < len(inputs) {
			in = inputs[i]
		}
		m.stepFighter(f, in)
	}
	m.stepHits()
	m.checkEnd()
	return m.Tick
}

func (m *OnlineMatch) stepFighter(f *Fighter, in []string) {
	if f.HitFlash > 0 { f.HitFlash-- }
	if f.HitCD > 0 { f.HitCD-- }
	if f.DashCD > 0 { f.DashCD-- }
	if f.Stun > 0 {
		f.Stun--
		f.VX *= 0.9
	}
	if f.Dead > 0 {
		f.Dead--
		f.VX, f.VY = 0, 0
		if f.Dead == 0 && f.Stocks > 0 {
			f.X = m.main.X + m.main.W/2 - f.W/2
			f.Y = m.main.Y - f.H - 120
			f.VX, f.VY = 0, 0
			f.Damage = 0
			f.Inv = 90
			f.Stun = 0
			f.AtkT, f.AtkDur, f.AtkKind, f.MoveKind = 0, 0, "", ""
		}
		return
	}

	left, right, jump, down := has(in, "left"), has(in, "right"), has(in, "jump"), has(in, "down")
	light, heavy, dash, ult, reload := has(in, "light"), has(in, "heavy"), has(in, "dash"), has(in, "ult"), has(in, "reload")
	_ = ult
	if down && !f.On { f.FastFall = true }

	if f.Stun <= 0 && f.AtkT <= 0 {
		spd := 3.0 + f.Stats.Spd*0.25
		if dash && f.DashCD == 0 {
			f.DashT = 10
			f.DashCD = 28
			f.VX = float64(f.Facing) * (spd + 3.5)
		}
		if f.DashT > 0 {
			f.DashT--
		} else {
			if left { f.VX -= 0.7; f.Facing = -1 }
			if right { f.VX += 0.7; f.Facing = 1 }
			if !left && !right { f.VX *= 0.82; if math.Abs(f.VX) < 0.1 { f.VX = 0 } }
			if f.VX > spd { f.VX = spd }
			if f.VX < -spd { f.VX = -spd }
		}
		if jump && f.On {
			f.VY = -12.5 - f.Stats.Spd*0.15
			f.On = false
			f.JumpTick = int(m.Tick)
			f.SquashX, f.SquashY = 0.88, 1.12
		}
		if reload && f.ReloadT <= 0 && f.Ammo < f.MaxAmmo { f.ReloadT = f.ReloadDur }
		if f.ReloadT > 0 {
			f.ReloadT--
			if f.ReloadT == 0 { f.Ammo = f.MaxAmmo }
		}
		if light || heavy {
			f.AtkKind = "light"
			f.AtkDur = 14
			dmg, bk := 5.0*f.Stats.Pwr, 4.0
			if heavy { f.AtkKind = "heavy"; f.AtkDur = 22; dmg, bk = 9.0*f.Stats.Pwr, 7.0 }
			f.AtkT = f.AtkDur
			f.MoveKind = f.AtkKind
			f.HitCD = 0
			m.spawnMelee(f, dmg, bk)
		}
	} else {
		if f.AtkT > 0 {
			f.AtkT--
			if f.AtkT == 0 { f.AtkKind = ""; f.MoveKind = "" }
		}
		if !left && !right { f.VX *= 0.9 }
	}

	grav := 0.62
	f.VY += grav
	maxFall := 14.0
	if f.FastFall { maxFall = 16.0 }
	if f.VY > maxFall { f.VY = maxFall }
	f.X += f.VX
	f.Y += f.VY

	f.On = false
	if f.VY >= 0 && f.Y+f.H >= m.main.Y && f.Y+f.H-f.VY <= m.main.Y+8 && f.X+f.W > m.main.X && f.X < m.main.X+m.main.W {
		f.Y = m.main.Y - f.H
		f.VY = 0
		f.On = true
		f.FastFall = false
	}
	for _, p := range m.plats {
		if !down && f.VY >= 0 && f.Y+f.H >= p.Y && f.Y+f.H-f.VY <= p.Y+8 && f.X+f.W > p.X && f.X < p.X+p.W {
			f.Y = p.Y - f.H
			f.VY = 0
			f.On = true
			f.FastFall = false
		}
	}
	if f.On { f.SquashX += (1 - f.SquashX) * 0.2; f.SquashY += (1 - f.SquashY) * 0.2 } else { f.SquashX += (1-f.SquashX)*0.1; f.SquashY += (1-f.SquashY)*0.1 }
	if f.Inv > 0 { f.Inv-- }

	if f.X < m.blast.L || f.X > m.blast.R || f.Y < m.blast.T || f.Y > m.blast.B {
		f.Stocks--
		if f.Stocks <= 0 { f.Stocks = 0; f.Dead = 9999 } else { f.Dead = 60 }
		f.AtkT, f.AtkDur, f.AtkKind, f.MoveKind = 0, 0, "", ""
	}
}

func (m *OnlineMatch) spawnMelee(f *Fighter, dmg, bk float64) {
	w, h := 34.0, 26.0
	x := f.X + f.W
	if f.Facing < 0 { x = f.X - w }
	y := f.Y + 20
	m.hits = append(m.hits, Hitbox{X: x, Y: y, W: w, H: h, Dmg: dmg, BK: bk, KX: float64(f.Facing) * (2.5 + bk*0.35), KY: -3.5 - bk*0.25, Owner: f.Slot, Life: 5})
}

func (m *OnlineMatch) stepHits() {
	alive := m.hits[:0]
	for i := range m.hits {
		h := &m.hits[i]
		h.Life--
		if h.Life <= 0 { continue }
		for _, f := range m.Players {
			if f == nil || f.Slot == h.Owner || f.Stocks <= 0 || f.Dead > 0 || f.Inv > 0 { continue }
			if h.X < f.X+f.W && h.X+h.W > f.X && h.Y < f.Y+f.H && h.Y+h.H > f.Y {
				f.Damage += h.Dmg
				kb := 1.0 + f.Damage*0.015
				f.VX = h.KX * kb / math.Max(0.7, f.Stats.Wgt)
				f.VY = h.KY * kb / math.Max(0.7, f.Stats.Wgt)
				f.Stun = int(8 + h.BK*1.5)
				f.HitFlash = 6
				f.On = false
				f.AtkT, f.AtkKind, f.MoveKind = 0, "", ""
				h.Life = 0
				break
			}
		}
		if h.Life > 0 { alive = append(alive, *h) }
	}
	m.hits = alive
}

func (m *OnlineMatch) checkEnd() {
	if m.ended { return }
	alive := []int{}
	for i, f := range m.Players { if f.Stocks > 0 { alive = append(alive, i) } }
	if len(alive) <= 1 && len(m.Players) > 1 {
		m.ended = true
		order := make([]int, 0, len(m.Players))
		order = append(order, alive...)
		for i := range m.Players {
			isAlive := false
			for _, a := range alive { if a == i { isAlive = true } }
			if !isAlive { order = append(order, i) }
		}
		m.standings = order
		if m.OnEnd != nil { m.OnEnd(order) }
	}
}

func (m *OnlineMatch) Leave(slot int) {
	if slot >= 0 && slot < len(m.Players) {
		f := m.Players[slot]
		if f != nil && f.Stocks > 0 { f.Stocks = 0; f.Dead = 9999 }
	}
	m.checkEnd()
}

func (m *OnlineMatch) Standings() []int { return m.standings }
