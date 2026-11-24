package sim

import (
	"fmt"
	"math"

	"github.com/presidential-brawl/engine/internal/rng"
)

type Config struct {
	Stocks int
	Knockback float64
	Gravity float64
	Hazard string // off | normal | frenetic
	Items string // off | normal | chaos
	VoteGain float64
	StartFullVote bool
	AIDifficulty int
	Hitstop bool
	Training bool
	CampaignRound int
}

func DefaultConfig() Config {
	return Config{Stocks: 3, Knockback: 1, Gravity: 1, Hazard: "normal", Items: "normal",
		VoteGain: 1, AIDifficulty: 1, Hitstop: true}
}

type Particle struct {
	X  float64 `json:"x"`
	Y  float64 `json:"y"`
	VX float64 `json:"vx"`
	VY float64 `json:"vy"`
	L  int     `json:"l"`
	M  int     `json:"m"`
	Col string `json:"col"`
	Z float64 `json:"z"`
	Shape string `json:"shape,omitempty"`
	Kind string `json:"kind,omitempty"`
	Phase float64 `json:"phase"`
	Spin float64 `json:"spin"`
	Ex bool `json:"ex,omitempty"`
}

type CrowdParticle struct {
	X  float64 `json:"x"`
	Y  float64 `json:"y"`
	VX float64 `json:"vx"`
	VY float64 `json:"vy"`
	L  int `json:"l"`
	M  int `json:"m"`
	Col string `json:"col"`
	Kind string `json:"kind"`
	Size float64 `json:"size"`
	Phase float64 `json:"phase"`
	Spin float64 `json:"spin"`
}

type Crowd struct {
	Excitement float64 `json:"excitement"`
	CheerTimer int `json:"cheerTimer"`
	Mood string `json:"mood"`
	AccentColor string `json:"accentColor"`
	AccentHighlight string `json:"accentHighlight"`
	Seed uint32 `json:"seed"`
}

type Projectile struct {
	ID int `json:"id"`
	X float64 `json:"x"`
	Y float64 `json:"y"`
	W float64 `json:"w"`
	H float64 `json:"h"`
	VX float64 `json:"vx"`
	VY float64 `json:"vy"`
	Kind string `json:"kind"`
	W2 string `json:"w2,omitempty"`
	Dir int `json:"dir"`
	Life int `json:"life"`
	Owner int `json:"owner"`
	OwnerColor string `json:"ownerColor,omitempty"`
	OwnerHighlight string `json:"ownerHighlight,omitempty"`
	Dmg float64 `json:"dmg"`
	BK float64 `json:"bk"`
	KS float64 `json:"ks"`
	Ang float64 `json:"ang"`
	Bounces int `json:"bounces,omitempty"`
	Hold int `json:"hold,omitempty"`
	Heavy bool `json:"heavy,omitempty"`
	Hit int `json:"hit,omitempty"`
	Done map[int]bool `json:"-"`
}

type Item struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	W float64 `json:"w"`
	H float64 `json:"h"`
	VY float64 `json:"vy"`
	Kind string `json:"kind"`
}

type FloatText struct {
	T string `json:"t"`
	X float64 `json:"x"`
	Y float64 `json:"y"`
	L int `json:"l"`
	M int `json:"m"`
}

type Strike struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	W float64 `json:"w"`
	H float64 `json:"h"`
	Color string `json:"color"`
	Highlight string `json:"highlight,omitempty"`
	Direction int `json:"direction"`
	Weapon string `json:"weapon,omitempty"`
}

type Hitbox struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	W float64 `json:"w"`
	H float64 `json:"h"`
	Kind string `json:"kind"`
}

type Cine struct {
	T int `json:"t"`
	F int `json:"f"`
	O int `json:"o"`
	Name string `json:"name,omitempty"`
	Flash bool `json:"flash,omitempty"`
}

type Telegraph struct {
	F int `json:"f"`
	O int `json:"o"`
	T int `json:"t"`
	Duration int `json:"duration"`
	UltimateID string `json:"ultimateId,omitempty"`
	Zones []Rect `json:"zones"`
	Aim Point `json:"aim"`
	Origin *Point `json:"origin,omitempty"`
}

type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	EndX float64 `json:"endX,omitempty"`
	Face int `json:"face,omitempty"`
	Zoom float64 `json:"zoom,omitempty"`
}

type Match struct {
	Tick uint32
	Stage int
	Seed uint32
	Capacity int
	Mode string // versus | training | campaign | attract
	Cfg Config
	Main Rect
	Plats []PlatformDef
	Blast Blast
	Spawns []Point
	Fighters []*Fighter
	Projectiles []*Projectile
	Items []*Item
	Particles []Particle
	CrowdParticles []CrowdParticle
	Crowd Crowd
	UltEffects []*UltEffect
	Cine *Cine
	Telegraph *Telegraph
	Shake float64
	Freeze, SlowMo int
	GravityFactor float64
	BannerMsg FloatText
	FloatTexts []FloatText
	Strikes []Strike
	Hitboxes []Hitbox
	WinnerPi *int
	EndT int
	Eliminated []int
	StandingsList []int
	OnEnd func([]int)
	RNG, VisRNG *rng.RNG
	HZPhase, HZMod int
	ProjectileNext int
	SoundEvents []string
	ReplayKeys []ReplayKey
	LastP1, LastP2 string
	Frame int
}

type ReplayKey struct {
	F int
	P1, P2 []string
}

type OnlineMatch = Match

func newMatch(ids []string, stage int, seed uint32, capacity int, cfg Config, mode string) (*Match, error) {
	if len(ids) < 2 || len(ids) > 8 {
		return nil, fmt.Errorf("número de luchadores inválido")
	}
	d := Data()
	if stage < 0 || stage >= len(d.Stages) { stage = 0 }
	scale := d.ArenaScale[fmt.Sprintf("%d", capacity)]
	if scale.Width == 0 { scale = d.ArenaScale["2"] }
	st := stageData(stage)
	g := geometry(st, capacity, scale)
	m := &Match{
		Stage: stage, Seed: seed, Capacity: capacity, Mode: mode, Cfg: cfg,
		Main: g.main, Plats: g.plats, Blast: g.blast, Spawns: g.spawns,
		RNG: rng.NewRNG(seed), VisRNG: rng.NewRNG(seed ^ 0x9e3779b9),
		Crowd: Crowd{Excitement: 0.12, Mood: "calm", AccentColor: st.Palette["platformTrim"],
			AccentHighlight: "#fff3a0", Seed: seed},
		GravityFactor: 1,
		BannerMsg: FloatText{L: 0, M: 1},
		ProjectileNext: 1,
	}
	if cfg.Hazard == "off" { m.HZPhase = 0 }
	for i, id := range ids {
		p := president(id)
		if p == nil { return nil, fmt.Errorf("luchador inválido: %s", id) }
		// No mutar los datos globales del roster (el boss de campaña es por partida).
		pCopy := *p
		pCopy.Stats = p.Stats
		f := &Fighter{Slot: i, ID: id, D: &pCopy, W: 38, H: 92, Balance: true,
			LastAttacker: -1, Difficulty: cfg.AIDifficulty, MaxStocks: cfg.Stocks}
		sp := g.spawns[i%len(g.spawns)]
		f.Reset(sp.X-f.W/2, sp.Y-f.H, true, cfg.Stocks)
		if sp.X < m.Main.X+m.Main.W/2 { f.Face = 1 } else { f.Face = -1 }
		f.Pl = m.platAt(sp.X, sp.Y)
		if mode == "training" && i == 1 {
			f.TrainingDummy = true
			f.Stocks, f.MaxStocks = 99, 99
		}
		if cfg.StartFullVote { f.Vote = 100 }
		if mode == "campaign" && i == 1 {
			if cfg.CampaignRound >= 3 { f.Difficulty = 2 }
			if cfg.CampaignRound == 6 { f.Difficulty = 3; f.Boss = true; f.D.Stats.Weight *= 1.18 }
		}
		m.Fighters = append(m.Fighters, f)
	}
	return m, nil
}

func NewOnlineMatch(ids []string, stage int, seed uint32) (*Match, error) {
	return newMatch(ids, stage, seed, len(ids), DefaultConfig(), "versus")
}

func NewLocalMatch(ids []string, stage int, seed uint32, cfg Config, mode string) (*Match, error) {
	return newMatch(ids, stage, seed, 2, cfg, mode)
}

type geometryResult struct {
	main Rect
	plats []PlatformDef
	blast Blast
	spawns []Point
}

func geometry(st *StageData, capacity int, scale ScaleData) geometryResult {
	main := st.Main
	center := main.X + main.W/2
	main.W *= scale.Width
	main.X = center - main.W/2
	width := main.W * .23
	yAt := func(level int) float64 { return main.Y - (104 + 92*float64(level-1))*scale.Height }
	symmetric := func(level int, spread float64, span float64) []PlatformDef {
		return []PlatformDef{
			{X: center - main.W*spread - span/2, Y: yAt(level), W: span},
			{X: center + main.W*spread - span/2, Y: yAt(level), W: span},
		}
	}
	var plats []PlatformDef
	switch capacity {
	case 2:
		plats = append(plats, st.Plats...)
	case 4:
		for _, p := range st.Plats {
			plats = append(plats, PlatformDef{X: center + (p.X-center)*scale.Width, Y: main.Y - (main.Y-p.Y)*scale.Height, W: p.W * scale.Width, Amp: p.Amp, Ph: p.Ph})
		}
		plats = append(plats, PlatformDef{X: center - width/2, Y: yAt(1), W: width})
	case 6:
		plats = symmetric(1, .29, width)
	default:
		plats = append(plats, symmetric(1, .34, main.W*.16)...)
		plats = append(plats, symmetric(2, .13, main.W*.14)...)
	}
	for i := range plats {
		plats[i].BaseY = plats[i].Y
	}
	groundCount := capacity
	if groundCount > 4 { groundCount = 4 }
	var spawns []Point
	for i := 0; i < groundCount; i++ {
		spawns = append(spawns, Point{X: main.X + main.W*float64(i+1)/float64(groundCount+1), Y: main.Y})
	}
	if capacity >= 6 {
		for i := 0; i < capacity-groundCount && i < len(plats); i++ {
			spawns = append(spawns, Point{X: plats[i].X + plats[i].W/2, Y: plats[i].Y})
		}
	}
	blast := Blast{
		L: 720 - 900*scale.Width, R: 720 + 900*scale.Width,
		T: -260*scale.Height, B: 990*scale.Height,
	}
	return geometryResult{main, plats, blast, spawns}
}

func (m *Match) platAt(x, y float64) *PlatformDef {
	for i := range m.Plats {
		p := &m.Plats[i]
		if x >= p.X && x <= p.X+p.W && math.Abs(y-p.Y) < 4 { return p }
	}
	return nil
}

func (m *Match) hazardCycle() int {
	switch m.Cfg.Hazard {
	case "off": return 9999999
	case "frenetic": return 620
	default: return 1200
	}
}

func (m *Match) sound(name string) { m.SoundEvents = append(m.SoundEvents, name) }

func (m *Match) aliveOpponent(f *Fighter) *Fighter {
	var best *Fighter
	bd := math.Inf(1)
	for _, o := range m.Fighters {
		if o == f || o.Stocks <= 0 || o.Dead > 0 { continue }
		d := hypot(o.CX()-f.CX(), o.CY()-f.CY())
		if d < bd { bd, best = d, o }
	}
	if best == nil {
		for _, o := range m.Fighters { if o != f { return o } }
	}
	return best
}

func (m *Match) Step(inputs [][]string) uint32 {
	m.SoundEvents = nil
	m.Frame++
	m.stepParticles()
	m.stepCrowd()
	m.stepFloatTexts()
	m.Shake *= 0.88
	if m.Shake < 0.3 { m.Shake = 0 }

	if m.Cine != nil {
		m.Cine.T++
		need := 34
		if m.Fighters[m.Cine.F].Balance { need = Data().Limits.ActivationHitstop }
		if m.Cine.T >= need { m.openTelegraph() }
		return m.Tick
	}
	if m.Freeze > 0 { m.Freeze--; return m.Tick }
	if m.SlowMo > 0 {
		m.SlowMo--
		if m.SlowMo%3 != 0 { return m.Tick }
	}

	m.Tick++
	m.Strikes = nil
	m.Hitboxes = nil
	m.GravityFactor = 1
	m.updateStageHazards()

	parsed := make([]Input, len(m.Fighters))
	for i := range m.Fighters {
		var acts []string
		if m.Mode == "attract" || m.Fighters[i].TrainingDummy {
			acts = m.aiInput(m.Fighters[i])
		} else if m.Capacity > 2 || m.Mode == "campaign" || m.Mode == "versus" {
			if i < len(inputs) { acts = inputs[i] }
			if len(acts) == 0 && m.Mode != "versus" { acts = m.aiInput(m.Fighters[i]) }
		} else if i < len(inputs) {
			acts = inputs[i]
		}
		parsed[i] = parseInput(acts)
	}

	for i, f := range m.Fighters {
		if m.Mode == "versus" && i == 0 && m.Capacity == 2 && len(parsed) > 1 && parsed[1].Light {
			// dos jugadores locales: el segundo input también se aplica en updateFighter
		}
		if m.Telegraph != nil && m.Telegraph.F == i { f.Inv = int(math.Max(float64(f.Inv), 15)) }
		m.updateFighter(f, parsed[i])
	}
	m.resolveIndividualStrikes()
	m.updateUltEffects()
	m.updateProjectiles()
	m.updateItems()

	if m.Telegraph != nil {
		m.Telegraph.T++
		if m.Telegraph.T >= m.Telegraph.Duration {
			t := m.Telegraph
			m.Telegraph = nil
			m.fireUlt(t)
			m.Shake = 10
		}
	}

	if m.Mode == "attract" {
		for _, f := range m.Fighters {
			if f.Stocks <= 0 { f.Reset(m.Main.X+m.Main.W/2-f.W/2, -110, false, 3) }
		}
		return m.Tick
	}

	if m.Capacity > 2 {
		alive := 0
		var last int
		for _, f := range m.Fighters { if f.Stocks > 0 { alive++; last = f.Slot } }
		if alive <= 1 && m.WinnerPi == nil {
			m.WinnerPi = &last
			var order []int
			for _, f := range m.Fighters { if f.Stocks > 0 { order = append(order, f.Slot) } }
			for i := len(m.Eliminated)-1; i >= 0; i-- { order = append(order, m.Eliminated[i]) }
			m.StandingsList = order
			if m.OnEnd != nil { m.OnEnd(order) }
		}
		return m.Tick
	}

	if m.Mode != "training" {
		dead := -1
		for _, f := range m.Fighters { if f.Stocks <= 0 { dead = f.Slot; break } }
		if dead >= 0 && m.WinnerPi == nil {
			for _, f := range m.Fighters {
				if f.Slot != dead { m.WinnerPi = &f.Slot; break }
			}
			m.EndT = 135
			if m.StandingsList == nil {
				loser := dead
				order := []int{*m.WinnerPi, loser}
				m.StandingsList = order
				if m.OnEnd != nil { m.OnEnd(order) }
			}
			m.sound("win")
			m.crowdReaction("win", m.Main.X+m.Main.W/2, 46, 120)
		}
		if m.WinnerPi != nil {
			m.EndT--
			for _, f := range m.Fighters {
				if f.Slot == *m.WinnerPi && f.On && !f.Winning {
					f.Winning = true
					f.Inv = 999
					f.Stun = 0
					f.VX *= .72
				}
				if f.Winning { f.WinT++ }
			}
		}
	}
	return m.Tick
}

func (m *Match) Leave(slot int) {
	if slot < 0 || slot >= len(m.Fighters) { return }
	f := m.Fighters[slot]
	if f.Stocks > 0 {
		f.Stocks = 0
		f.Dead = 9999
		f.Atk = nil
		f.Pl = nil
		m.Eliminated = append(m.Eliminated, slot)
	}
	// Un jugador que abandona a media partida debe dar por terminado el combate
	// y publicar la clasificación, igual que un KO normal.
	if m.WinnerPi == nil {
		winner := -1
		for _, other := range m.Fighters {
			if other.Slot != slot && other.Stocks > 0 { winner = other.Slot; break }
		}
		if winner >= 0 {
			m.WinnerPi = &winner
			order := []int{winner}
			for _, other := range m.Fighters { if other.Slot != winner { order = append(order, other.Slot) } }
			m.StandingsList = order
			if m.OnEnd != nil { m.OnEnd(order) }
		}
	}
}

func (m *Match) Standings() []int { return m.StandingsList }

func (m *Match) Camera() (float64, float64, float64) {
	var minX, maxX, minY, maxY float64
	minX, maxX, minY, maxY = math.Inf(1), math.Inf(-1), math.Inf(1), math.Inf(-1)
	n := 0
	for _, f := range m.Fighters {
		if f.Dead > 0 || f.Stocks <= 0 { continue }
		x, y := clamp(f.CX(), -120, 1560), clamp(f.Y+f.H*.5, -140, 820)
		minX, maxX = math.Min(minX, x), math.Max(maxX, x)
		minY, maxY = math.Min(minY, y), math.Max(maxY, y)
		n++
	}
	if n == 0 { return 720, 425, 1.1 }
	spanX := math.Max(540, maxX-minX+420)
	spanY := math.Max(305, maxY-minY+280)
	z := clamp(math.Min(1440/spanX, 810/spanY), .82, 2.15)
	midX := (minX+maxX)*.5*.82 + 720*.18
	midY := (minY+maxY)*.5*.78 + 425*.22 - 20
	return clamp(midX, math.Min(720, 720/z-140), math.Max(720, 1580-720/z)),
		clamp(midY, math.Min(405, 405/z-180), math.Max(405, 860-405/z)), z
}
