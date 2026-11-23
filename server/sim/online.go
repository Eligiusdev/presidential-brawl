package sim

import (
	"math"
)

type ActionSet map[string]bool

func has(a []string, k string) bool {
	for _, x := range a {
		if x == k {
			return true
		}
	}
	return false
}

type Fighter struct {
	Slot      int
	FighterID string
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
	Ammo      int
	MaxAmmo   int
	ReloadT   int
	ReloadDur int
	Crouch    bool
	HitFlash  bool
	SquashX   float64
	SquashY   float64
}

type Platform struct {
	X, Y, W float64
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
	rng       *RNG
	ended     bool
}

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

type simpleErr string

func (e simpleErr) Error() string { return string(e) }
func fmtErr(s string) error       { return simpleErr(s) }

func (m *OnlineMatch) setup(ids []string) {
	n := len(ids)
	// base arena scaled by capacity - simplified but compatible
	scaleW := map[int]float64{2: 1.0, 4: 1.15, 6: 1.25, 8: 1.4}[n]
	scaleH := map[int]float64{2: 1.0, 4: 1.0, 6: 1.05, 8: 1.1}[n]
	mw, mh := 860.0*scaleW, 80.0
	mx, my := (1440.0-mw*1.0)/2, 560.0*scaleH-20
	if n > 2 {
		my = 560.0
	}
	m.main = struct{ X, Y, W, H float64 }{mx, my, mw, mh}
	m.blast = struct{ L, R, T, B float64 }{-180, 1620, -260, 990}
	m.plats = nil
	if n >= 4 {
		m.plats = append(m.plats, Platform{X: mx + mw*0.2, Y: my - 120, W: 140}, Platform{X: mx + mw*0.8 - 140, Y: my - 120, W: 140})
	}
	if n >= 6 {
		m.plats = append(m.plats, Platform{X: mx + mw*0.5 - 90, Y: my - 220, W: 180})
	}

	spawns := make([][2]float64, n)
	for i := 0; i < n; i++ {
		t := float64(i+1) / float64(n+1)
		spawns[i] = [2]float64{mx + mw*t, my}
	}

	m.Players = make([]*Fighter, n)
	for i, id := range ids {
		f := &Fighter{
			Slot: i, FighterID: id, W: 38, H: 92, Stocks: 3, MaxAmmo: 6, Ammo: 6,
			SquashX: 1, SquashY: 1,
		}
		f.X = spawns[i][0] - f.W/2
		f.Y = spawns[i][1] - f.H
		if spawns[i][0] < mx+mw/2 {
			f.Facing = 1
		} else {
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
	m.checkEnd()
	return m.Tick
}

func (m *OnlineMatch) stepFighter(f *Fighter, in []string) {
	if f.Dead > 0 {
		f.Dead--
		if f.Dead == 0 && f.Stocks > 0 {
			f.X = m.main.X + m.main.W/2 - f.W/2
			f.Y = m.main.Y - f.H - 120
			f.VX, f.VY = 0, 0
			f.Damage = 0
			f.Inv = 60
		}
		return
	}

	left, right, jump, down := has(in, "left"), has(in, "right"), has(in, "jump"), has(in, "down")
	_ = down

	spd := 4.2
	if left {
		f.VX -= 0.8
		f.Facing = -1
	}
	if right {
		f.VX += 0.8
		f.Facing = 1
	}
	if !left && !right {
		f.VX *= 0.82
		if math.Abs(f.VX) < 0.1 {
			f.VX = 0
		}
	}
	if f.VX > spd {
		f.VX = spd
	}
	if f.VX < -spd {
		f.VX = -spd
	}

	if jump && f.On {
		f.VY = -13.5
		f.On = false
		f.JumpTick = int(m.Tick)
	}

	// gravity
	grav := 0.62
	f.VY += grav
	if f.VY > 14 {
		f.VY = 14
	}
	if f.FastFall && f.VY < 8 {
		f.VY = 8
	}

	f.X += f.VX
	f.Y += f.VY

	// platform/main collision
	f.On = false
	// main
	if f.VY >= 0 && f.Y+f.H >= m.main.Y && f.Y+f.H-f.VY <= m.main.Y+8 && f.X+f.W > m.main.X && f.X < m.main.X+m.main.W {
		f.Y = m.main.Y - f.H
		f.VY = 0
		f.On = true
	}
	for _, p := range m.plats {
		if f.VY >= 0 && f.Y+f.H >= p.Y && f.Y+f.H-f.VY <= p.Y+8 && f.X+f.W > p.X && f.X < p.X+p.W {
			f.Y = p.Y - f.H
			f.VY = 0
			f.On = true
		}
	}

	if f.Inv > 0 {
		f.Inv--
	}

	// blast
	if f.X < m.blast.L || f.X > m.blast.R || f.Y < m.blast.T || f.Y > m.blast.B {
		f.Stocks--
		if f.Stocks <= 0 {
			f.Stocks = 0
			f.Dead = 9999
		} else {
			f.Dead = 60
		}
	}
}

func (m *OnlineMatch) checkEnd() {
	if m.ended {
		return
	}
	alive := []int{}
	for i, f := range m.Players {
		if f.Stocks > 0 {
			alive = append(alive, i)
		}
	}
	if len(alive) <= 1 && len(m.Players) > 1 {
		m.ended = true
		// simple standings: alive first, rest by stocks/damage
		order := make([]int, 0, len(m.Players))
		for _, a := range alive {
			order = append(order, a)
		}
		for i := range m.Players {
			dead := false
			for _, a := range alive {
				if a == i {
					dead = true
				}
			}
			if !dead {
				order = append(order, i)
			}
		}
		m.standings = order
		if m.OnEnd != nil {
			m.OnEnd(order)
		}
	}
}

func (m *OnlineMatch) Leave(slot int) {
	if slot >= 0 && slot < len(m.Players) {
		f := m.Players[slot]
		if f != nil && f.Stocks > 0 {
			f.Stocks = 0
			f.Dead = 9999
		}
	}
	m.checkEnd()
}

func (m *OnlineMatch) Standings() []int { return m.standings }
