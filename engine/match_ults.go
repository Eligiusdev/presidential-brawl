package sim

import (
	"math"
	"strconv"
	"strings"
)

type UltMarker struct {
	X, Y float64
	K int
}

type UltState struct {
	Ultimate    *UltimateDef
	Origin      *Point
	Point       Point
	Box         Rect
	Contact     int
	OriginStock int
	TargetStock int
	Triggered   bool
	Active      bool
	Landed      bool
}

type UltEffect struct {
	Kind        string      `json:"kind"`
	T           int         `json:"t"`
	Dur         int         `json:"dur"`
	F           int         `json:"f"`
	O           int         `json:"o"`
	Dg          int         `json:"dg,omitempty"`
	Specialized *UltState   `json:"specialized,omitempty"`
	Spec        UltSpec     `json:"spec"`
	Ty          float64     `json:"ty,omitempty"`
	Tr          []Point     `json:"tr,omitempty"`
	Lx          float64     `json:"lx,omitempty"`
	Ly          float64     `json:"ly,omitempty"`
	Cy          float64     `json:"cy,omitempty"`
	Ex          float64     `json:"ex,omitempty"`
	Et          float64     `json:"et,omitempty"`
	Bx          []float64   `json:"bx,omitempty"`
	Tx          float64     `json:"tx,omitempty"`
	M           []UltMarker `json:"m,omitempty"`
	R           float64     `json:"r,omitempty"`
	Cx          float64     `json:"cx,omitempty"`
	Ux          float64     `json:"ux,omitempty"`
	H           int         `json:"h,omitempty"`
	HH          []bool      `json:"hh,omitempty"`
	VVX         float64     `json:"vvx,omitempty"`
	VVY         float64     `json:"vvy,omitempty"`
	SY          float64     `json:"sy,omitempty"`
}

func hasFlag(u *UltEffect, flag string) bool {
	if u.Specialized == nil { return false }
	for _, f := range u.Specialized.Ultimate.Profile.Flags { if f == flag { return true } }
	return false
}

func (m *Match) specializedUltimate(f *Fighter) *UltimateDef {
	if f.D.Ultimate == nil { return nil }
	u := *f.D.Ultimate
	s := u.Spec
	b := Data().Budgets[f.D.Category]
	if b.Startup == 0 { b = Data().Budgets["zone"] }
	if f.ID == "simo" { s.Damage = 28 } else {
		s.Damage = math.Round(s.Damage*.72)
		s.Damage = clamp(s.Damage, float64(b.MinDamage), float64(b.MaxDamage))
	}
	s.RangePx = clamp(s.RangePx, float64(b.MinRange), float64(b.MaxRange))
	s.Knockback = float64(b.Knockback * 60)
	switch f.ID {
	case "macron": s.DurationMs = 1200
	case "simo", "ricaurte": s.DurationMs = 100
	}
	u.Spec = s
	return &u
}

func (m *Match) ultimateOrigin(u *UltimateDef, f, o *Fighter) Point {
	prof := u.Profile
	if prof.Travel == "sweep" || prof.Travel == "lane" {
		left, right := m.Main.X-70, m.Main.X+m.Main.W+70
		face := f.Face
		if face < 0 { face = -1 } else { face = 1 }
		h := 50.0
		if id := strings.TrimPrefix(u.Spec.ID, "ult_"); id != "" {
			if v := laneHeight(id); v > 0 { h = float64(v) }
		}
		if u.Spec.ID == "ult_robinson" { h = 108 }
		x, end := left, right
		if face < 0 { x, end = right, left }
		return Point{X: x, Y: m.Main.Y - h, EndX: end, Face: face}
	}
	if prof.Travel == "cavalry" {
		start := clamp(f.CX(), m.Main.X+f.W/2, m.Main.X+m.Main.W-f.W/2)
		end := clamp(start+float64(f.Face)*435, m.Main.X+f.W/2, m.Main.X+m.Main.W-f.W/2)
		return Point{X: start, Y: m.Main.Y - f.H/2, EndX: end, Face: f.Face}
	}
	if f.ID == "simo" && f.Balance { return Point{X: o.CX(), Y: o.CY()} }
	if prof.Anchor == "target" && u.Spec.Primitive == "dashStrike" {
		r := u.Spec.RangePx
		x := clamp(clamp(o.CX(), f.CX()-r, f.CX()+r), m.Main.X+f.W/2, m.Main.X+m.Main.W-f.W/2)
		y := math.Min(clamp(o.CY(), f.CY()-r, f.CY()+r), m.Main.Y-f.H/2)
		return Point{X: x, Y: y}
	}
	if prof.Anchor == "center" { return Point{X: Data().World.W / 2, Y: m.Main.Y - 72} }
	subject := f
	if prof.Anchor == "target" { subject = o }
	return Point{X: subject.CX(), Y: subject.CY()}
}

func laneHeight(id string) int {
	m := map[string]int{"noboa": 58, "washington": 54, "uribe": 75, "espartaco": 55, "biden": 132, "kast": 70, "alfaro": 75}
	return m[id]
}

func hitShape(shape string) (float64, float64) {
	switch shape {
	case "orb": return .36, .35
	case "beam": return .15, .74
	case "slash": return .33, .28
	case "ground": return .41, .19
	case "ring": return .61, .56
	default: return .32, .5
	}
}

func ultimatePoint(u *UltimateDef, origin Point, progress float64) Point {
	t := clamp(progress, 0, 1)
	prof := u.Profile
	route := prof.Route
	if len(route) == 0 { return origin }
	if origin.EndX != 0 && prof.Travel != "lane" {
		return Point{X: origin.X + (origin.EndX-origin.X)*t, Y: origin.Y}
	}
	segment := t * float64(len(route)-1)
	index := int(math.Floor(segment))
	blend := segment - float64(index)
	if index >= len(route)-1 { index = len(route)-2; if index < 0 { index = 0 }; blend = 1 }
	x0, y0 := route[index][0], route[index][1]
	x1, y1 := route[index+1][0], route[index+1][1]
	if prof.Tempo != nil && prof.Tempo.Distance > 0 && prof.Travel != "lane" {
		goal := prof.Tempo.Distance * t
		next := -1
		for i, s := range prof.Tempo.Steps { if s > goal { next = i; break } }
		if next < 0 { index = len(route)-1; blend = 0 } else {
			index = next - 1
			if index < 0 { index = 0 }
			den := prof.Tempo.Steps[next] - prof.Tempo.Steps[index]
			if den != 0 { blend = (goal-prof.Tempo.Steps[index])/den } else { blend = 0 }
		}
		if index < len(route)-1 { x0, y0 = route[index][0], route[index][1]; x1, y1 = route[index+1][0], route[index+1][1] }
	}
	rx := x0 + (x1-x0)*blend
	ry := y0 + (y1-y0)*blend
	r := u.Spec.RangePx
	face := origin.Face
	if face == 0 { face = 1 }
	return Point{X: origin.X + rx*r*float64(face), Y: origin.Y + ry*r, Face: face}
}

func ultimateBox(u *UltimateDef, p Point) Rect {
	if u.Profile.Travel != "" && u.Profile.Travel != "lane" {
		w, h := 170.0, 100.0
		if u.Spec.ID == "ult_robinson" { w, h = 104, 220 }
		if u.Profile.Travel == "cavalry" { w, h = 112, 104 }
		return Rect{X: p.X - w/2, Y: p.Y - h/2, W: w, H: h}
	}
	sw, sh := hitShape(u.Profile.Shape)
	w, h := u.Spec.RangePx*sw*2, u.Spec.RangePx*sh*2
	return Rect{X: p.X - w/2, Y: p.Y - h/2, W: w, H: h}
}

func (m *Match) getUltZones(f, o *Fighter, origin *Point) []Rect {
	u := m.specializedUltimate(f)
	if u != nil {
		org := *origin
		if org.X == 0 { org = m.ultimateOrigin(u, f, o) }
		samples := len(u.Profile.Route)
		if u.Profile.Tempo != nil && samples < 6 { samples = 6 }
		if samples < 1 { samples = 1 }
		var zones []Rect
		for i := 0; i < samples; i++ {
			p := ultimatePoint(u, org, float64(i)/float64(maxInt(1, samples-1)))
			zones = append(zones, ultimateBox(u, p))
		}
		return zones
	}
	switch f.D.PowerSourceID {
	case "muralla":
		return []Rect{{X: 720 - 220, Y: m.Main.Y - 180, W: 440, H: 180}, {X: 720 - 80, Y: 0, W: 160, H: m.Main.Y - 180}}
	case "libertario":
		return []Rect{{X: math.Min(f.CX(), o.CX()) - 30, Y: math.Min(f.Y, o.Y) - 15,
			W: math.Abs(o.CX()-f.CX()) + 60, H: math.Abs(o.Y-f.Y) + 110}}
	case "barrotes":
		return []Rect{{X: o.CX() - 140, Y: o.Y + o.H - 240, W: 280, H: 240}}
	case "pulso": return []Rect{{X: 0, Y: 0, W: 120, H: Data().World.H}}
	case "tigre": return []Rect{{X: 0, Y: m.Main.Y - 190, W: Data().World.W, H: 200}}
	case "lenador": return []Rect{{X: 0, Y: m.Main.Y - 120, W: Data().World.W, H: 126}}
	case "libertador":
		if f.Face > 0 { return []Rect{{X: f.CX(), Y: 80, W: Data().World.W - f.CX(), H: 520}} }
		return []Rect{{X: 0, Y: 80, W: f.CX(), H: 520}}
	case "sabio": return []Rect{{X: f.CX() - 280, Y: f.Y + f.H*.48 - 280, W: 560, H: 560}}
	}
	return nil
}

func (m *Match) openTelegraph() {
	if m.Cine == nil { return }
	c := m.Cine
	m.Cine = nil
	f, o := m.Fighters[c.F], m.Fighters[c.O]
	u := m.specializedUltimate(f)
	var org *Point
	duration := 20
	if f.Balance && u != nil {
		pt := m.ultimateOrigin(u, f, o)
		org = &pt
		switch f.ID {
		case "simo": duration = 42
		case "ricaurte": duration = 39
		default:
			if u.Profile.Tempo != nil && u.Profile.Tempo.Startup > 0 { duration = u.Profile.Tempo.Startup } else if b := Data().Budgets[f.D.Category]; b.Startup > 0 { duration = b.Startup }
		}
	}
	id := ""
	if u != nil { id = u.Spec.ID }
	f.Inv = int(math.Max(float64(f.Inv), 24))
	if f.Balance { f.Inv = int(math.Max(float64(f.Inv), float64(Data().Limits.MaxUltimateInvulnerability))) }
	m.Telegraph = &Telegraph{F: c.F, O: c.O, T: 0, Duration: duration, UltimateID: id,
		Zones: m.getUltZones(f, o, org), Origin: org,
		Aim: Point{X: f.CX(), Y: f.CY()}}
	m.Shake = 12
}

func (m *Match) fireUlt(t *Telegraph) {
	f, o := m.Fighters[t.F], m.Fighters[t.O]
	u := m.specializedUltimate(f)
	if u == nil {
		id := f.D.PowerSourceID
		dur := map[string]int{"muralla": 90, "libertario": 120, "barrotes": 110, "pulso": 115,
			"tigre": 95, "lenador": 80, "libertador": 130, "sabio": 55}[id]
		if dur == 0 { dur = 90 }
		if hasUltFlag(f, "heal") { f.Pct = math.Max(0, f.Pct-8) }
		if hasUltFlag(f, "guard") && !strings.Contains(id, "counter") { f.Inv = int(math.Max(float64(f.Inv), 20)) }
		m.UltEffects = append(m.UltEffects, &UltEffect{Kind: id, F: t.F, O: t.O, T: 0, Dur: dur,
			Spec: uSpec(id), Ux: float64(f.Face) * 11})
		return
	}
	if f.Dead > 0 || o.Dead > 0 { return }
	f.Atk = nil
	f.UltimateRecovery = 0
	org := t.Origin
	if org == nil { p := m.ultimateOrigin(u, f, o); org = &p }
	point := ultimatePoint(u, *org, 0)
	triggered := u.Spec.Primitive != "counterStance" || f.ID == "macron"
	m.UltEffects = append(m.UltEffects, &UltEffect{
		Kind: u.Spec.ID, F: t.F, O: t.O, T: 0, Dur: int(math.Round(u.Spec.DurationMs * 60 / 1000)),
		Spec: u.Spec,
		Specialized: &UltState{Ultimate: u, Origin: org, Point: point, Box: ultimateBox(u, point),
			OriginStock: f.Stocks, TargetStock: o.Stocks, Contact: -1,
			Triggered: triggered, Active: f.ID == "macron" && f.Balance},
	})
	m.burst(org.X, org.Y, u.Spec.Colors[0], 14, 5, 0, "")
}

func hasUltFlag(f *Fighter, flag string) bool {
	if f.D.Ultimate == nil { return false }
	for _, x := range f.D.Ultimate.Profile.Flags { if x == flag { return true } }
	return false
}

func uSpec(id string) UltSpec {
	if p := president(id); p != nil && p.Ultimate != nil { return p.Ultimate.Spec }
	return UltSpec{ID: id, Colors: []string{"#ffd23f", "#ffffff"}}
}

func (m *Match) updateUltEffects() {
	var next []*UltEffect
	for _, u := range m.UltEffects {
		u.T++
		f, o := m.Fighters[u.F], m.Fighters[u.O]
		if u.Specialized != nil {
			m.advanceSpecialized(u, f, o)
			if f.Balance && f.Dead <= 0 && u.T >= u.Dur {
				rec := Data().Budgets[f.D.Category].Whiff
				if f.ID == "ricaurte" { rec = 24 }
				if u.Specialized.Landed { rec = 0 }
				f.UltimateRecovery = int(math.Max(float64(f.UltimateRecovery), float64(rec)))
			}
			if u.T < u.Dur { next = append(next, u) }
			continue
		}
		m.advanceLegacy(u, f, o)
		if u.T < u.Dur { next = append(next, u) }
	}
	m.UltEffects = next
}

func (m *Match) advanceSpecialized(u *UltEffect, f, o *Fighter) {
	s := u.Specialized
	if s == nil { return }
	u_ := s.Ultimate
	prof := u_.Profile
	if f.Dead > 0 || f.Stocks != s.OriginStock || o.Stocks != s.TargetStock { u.T = u.Dur; return }
	if !s.Triggered {
		p := Point{X: f.CX(), Y: f.CY()}
		s.Origin = &p
		s.Point = p
		s.Box = ultimateBox(u_, p)
		return
	}
	macron := f.Balance && f.ID == "macron"
	if macron {
		s.Point = Point{X: f.CX(), Y: f.CY()}
		s.Box = ultimateBox(u_, s.Point)
		s.Active = true
	}
	if prof.Travel == "cavalry" && f.Stun > 0 { u.T = u.Dur; return }
	previous := s.Point
	progress := float64(u.T) / float64(maxInt(1, u.Dur))
	if !macron {
		if prof.Travel != "" && s.Origin != nil {
			s.Point = ultimatePoint(u_, *s.Origin, progress)
		} else {
			s.Point = ultimatePoint(u_, *s.Origin, progress)
		}
		s.Box = ultimateBox(u_, s.Point)
	}
	dash := u_.Spec.Primitive == "dashStrike"
	if dash && f.Stun <= 0 {
		travel := 17.0
		if prof.Travel == "cavalry" { travel = 24 } else if hasFlag(u, "speed") { travel = 23 }
		x := clamp(s.Point.X, m.Main.X+f.W/2, m.Main.X+m.Main.W-f.W/2)
		y := math.Min(s.Point.Y, m.Main.Y-f.H/2)
		f.X += clamp(x-f.CX(), -travel, travel)
		f.Y += clamp(y-f.CY(), -travel, travel)
		f.On = f.Y+f.H >= m.Main.Y
		f.Pl, f.VX, f.VY = nil, 0, 0
		s.Point = Point{X: f.CX(), Y: f.CY()}
		s.Box = ultimateBox(u_, s.Point)
	}
	phase := int(math.Min(float64(maxInt(1, u_.Spec.Hits)-1), math.Floor(progress*float64(u_.Spec.Hits))))
	instant := f.Balance && (f.ID == "simo" || f.ID == "ricaurte")
	follows := prof.Tempo != nil && (u_.Spec.Primitive == "dashStrike" || u_.Spec.Primitive == "spawnEntity" || u_.Spec.Primitive == "spawnProjectile")
	damageActive := instant || prof.Travel != "" || follows
	if !damageActive {
		if u_.Spec.Hits == 1 {
			need := .65
			if prof.Tempo != nil { need = .38 }
			damageActive = progress >= need
		} else {
			need := .25
			if prof.Tempo != nil { need = .12 }
			damageActive = progress*float64(u_.Spec.Hits)-float64(phase) >= need
		}
	}
	s.Active = macron || damageActive
	if !damageActive { return }
	box := s.Box
	if (u_.Spec.Primitive == "spawnProjectile" && f.Balance && !instant) || prof.Travel != "" || follows {
		box = Rect{
			X: math.Min(s.Box.X, previous.X-s.Box.W/2), Y: math.Min(s.Box.Y, previous.Y-s.Box.H/2),
			W: s.Box.W + math.Abs(s.Point.X-previous.X), H: s.Box.H + math.Abs(s.Point.Y-previous.Y),
		}
	}
	for _, target := range m.Fighters {
		if target == f || target.Dead > 0 || target.Stocks <= 0 || !overlaps(box, target.Rect()) { continue }
		toward := 1
		if s.Point.X < previous.X { toward = -1 }
		m.contactUltimate(u, f, target, phase, toward)
	}
}

func (m *Match) ultHit(u *UltEffect, ang float64, dir int, override damageSpec) bool {
	o := m.Fighters[u.O]
	if u.Dg > 0 { return true }
	if o.DashT > 0 && o.Dead <= 0 {
		u.Dg = 1
		m.perfectDodge(o)
		return true
	}
	if override.Dmg == 0 { override.Dmg = 36 }
	if override.BK == 0 { override.BK = 15 }
	override.KS, override.Ang, override.Heavy, override.Ult = .5, ang, true, true
	return m.hurt(o, m.Fighters[u.F], override, dir, "ult", nil)
}

func (m *Match) perfectDodge(o *Fighter) {
	o.Vote = math.Min(100, o.Vote+20*o.D.Balance.Vote)
	o.PerfectDodges++
	m.SlowMo = 12
	m.pushFloat("¡ESQUIVE PERFECTO!", o.CX(), o.Y-12, 70)
	m.sound("tone")
	m.burst(o.CX(), o.CY(), "#7cf", 12, 5, 0, "")
	m.crowdReaction("hype", o.CX(), 16, 44)
}

func (m *Match) contactUltimate(u *UltEffect, f, o *Fighter, phase int, toward int) {
	s := u.Specialized
	if s == nil { return }
	spec := s.Ultimate.Spec
	prof := s.Ultimate.Profile
	if s.Contact == phase { return }
	if o.DashT > 0 {
		m.perfectDodge(o)
		return
	}
	dir := toward
	if dir == 0 { if o.CX() >= s.Origin.X { dir = 1 } else { dir = -1 } }
	finished := phase == maxInt(1, spec.Hits)-1
	category := f.D.Category
	angle := -46.0
	switch {
	case prof.Travel == "cavalry": angle = -27
	case prof.Travel == "sweep" && spec.ID == "ult_lincoln": angle = -38
	case category == "zone": if finished { angle = -45 } else { angle = -20 }
	case category == "sweep": angle = -23
	case prof.Shape == "beam": angle = -75
	case prof.Shape == "ground": angle = -32
	}
	damage := spec.Damage / float64(maxInt(1, spec.Hits))
	if f.ID == "simo" && hypot(o.CX()-f.CX(), o.Y-f.Y) > 240 { damage = 22 }
	if f.ID == "nyerere" && finished { damage += 3 * math.Min(3, float64(phase+1)) }
	scale := .45
	if finished { scale = 1 }
	bk := spec.Knockback * scale / 60
	applied := m.hurt(o, f, damageSpec{Dmg: damage, BK: bk, KS: .5, Ang: angle, Heavy: true, Ult: true}, dir, "ult", nil)
	if !applied { return }
	s.Contact = phase
	s.Landed = true
	if f.ID == "mandela" && !f.HealedThisStock {
		f.Pct = math.Max(0, f.Pct-8)
		f.HealedThisStock = true
	}
	if category == "zone" && !finished { o.VX = clamp((s.Point.X-o.CX())*.08, -5, 5) }
	if hasFlag(u, "slow") { o.Stun = int(math.Max(float64(o.Stun), 28)); o.MaxStun = int(math.Max(float64(o.MaxStun), float64(o.Stun))) }
	if hasFlag(u, "pull") && prof.Travel == "" && !(category == "zone" && finished) {
		o.VX = clamp((s.Origin.X-o.CX())*.13, -12, 12)
	}
	m.burst(s.Point.X, s.Point.Y, spec.Colors[1], 8, 4, 0, "")
}

func (m *Match) advanceLegacy(u *UltEffect, f, o *Fighter) {
	dir := 1
	if o.CX() < f.CX() { dir = -1 }
	switch u.Kind {
	case "muralla":
		p := math.Min(1, float64(u.T)/30)
		u.Ty = -640 + (m.Main.Y-540+640)*p*p
		if u.H == 0 && u.T <= 34 && overlaps(Rect{720-80, u.Ty, 160, 540}, o.Rect()) && m.ultHit(u, -65, dir, damageSpec{}) { u.H = 1 }
		if u.T == 30 { m.Shake = 24; m.sound("explosion"); m.burst(720, m.Main.Y, "#ffd700", 42, 10, 0, "") }
	case "libertario":
		if u.VVX == 0 && u.VVY == 0 { u.VVX, u.VVY = float64(dir)*13, -9 }
		if u.T%35 == 0 {
			dx, dy := o.CX()-f.CX(), o.CY()-f.CY()
			d := hypot(dx, dy)
			if d == 0 { d = 1 }
			u.VVX, u.VVY = dx/d*15, dy/d*15
		}
		f.X += u.VVX; f.Y += u.VVY
		if f.X < 20 || f.X > 1380 { u.VVX = -u.VVX }
		if f.Y < 40 || f.Y > 670 { u.VVY = -u.VVY }
		f.VX, f.VY, f.Stun, f.Atk, f.DashT, f.AirJ = 0, 0, 0, nil, 0, 2
		f.Inv = int(math.Max(float64(f.Inv), 4))
		u.Tr = append(u.Tr, Point{X: f.CX(), Y: f.CY()})
		if len(u.Tr) > 18 { u.Tr = u.Tr[1:] }
		if u.T%9 == 0 && overlaps(Rect{f.X-8, f.Y-8, f.W+16, f.H+16}, o.Rect()) {
			m.sound("saw"); m.ultHit(u, -25, dir, damageSpec{Dmg: 8, BK: 3})
		}
	case "barrotes":
		if u.T < 36 { u.Lx, u.Ly = o.CX(), o.Y+o.H }
		if u.T >= 45 && u.Ex == 0 {
			u.Cy = -220 + float64(u.T-45)*30
			cage := Rect{u.Lx-65, u.Cy, 130, 160}
			if cage.Y+160 >= u.Ly || cage.Y > 730 || overlaps(cage, o.Rect()) {
				u.Ex, u.Et = 1, float64(u.T)
				m.Shake = 26; m.sound("explosion")
				if hypot(o.CX()-u.Lx, o.CY()-u.Ly) < 145 { m.ultHit(u, -72, dir, damageSpec{}) }
			}
		}
	case "pulso":
		x0 := -120 + float64(u.T)*(1440+680)/100
		if len(u.HH) < 3 { u.HH = []bool{false, false, false} }
		u.Bx = nil
		for k := 0; k < 3; k++ {
			bx := x0 - float64(k)*240
			u.Bx = append(u.Bx, bx)
			if !u.HH[k] && overlaps(Rect{bx-40, -60, 80, 810+120}, o.Rect()) {
				ds := damageSpec{}
				if k != 0 { ds.Dmg, ds.BK = 14, 8 }
				if m.ultHit(u, -55, 1, ds) { u.HH[k] = true }
			}
		}
	case "tigre", "lenador":
		span, height := 760.0, 180.0
		if u.Kind == "lenador" { span, height = 840, 120 }
		p := math.Min(1, float64(u.T)/70)
		if u.Kind == "lenador" { p = math.Min(1, float64(u.T)/55) }
		if f.Face > 0 { u.Tx = -span/2 + p*(1440+span) } else { u.Tx = 1440+span/2 - p*(1440+span) }
		w := 260.0
		if u.Kind == "lenador" { w = 400 }
		if u.H == 0 && overlaps(Rect{u.Tx-w/2, m.Main.Y-height, w, height+10}, o.Rect()) {
			ang := -28.0
			if u.Kind == "lenador" { ang = -38 }
			if m.ultHit(u, ang, f.Face, damageSpec{}) { u.H = 1 }
		}
	case "libertador":
		if u.SY == 0 { u.SY = f.Y }
		d := f.Face
		f.VX, f.VY, f.Stun, f.Atk, f.DashT, f.AirJ = 0, 0, 0, nil, 0, 2
		if u.T <= 18 { f.Y = u.SY - 140*math.Sin(float64(u.T)/18*math.Pi/2) } else { f.Y = u.SY - 140 }
		if u.T >= 20 && u.T < 80 && (u.T-20)%6 == 0 {
			u.M = append(u.M, UltMarker{X: f.CX() + float64(d)*36, Y: 110 + float64(u.T-20)/6*52, K: (u.T - 20) / 6})
		}
		for _, mk := range u.M {
			mk.X += float64(d) * 17
			if u.H == 0 && overlaps(Rect{mk.X-14, mk.Y-84, 114, 168}, o.Rect()) && m.ultHit(u, -35, d, damageSpec{}) { u.H = 1 }
		}
	case "sabio":
		u.R = math.Min(280, float64(u.T)*11)
		u.Cx, u.Cy = f.CX(), f.CY()
		if u.H == 0 && hypot(o.CX()-u.Cx, o.CY()-u.Cy) < u.R+14 && m.ultHit(u, -18, dir, damageSpec{BK: 20}) { u.H = 1 }
	}
}

func maxInt(a, b int) int { if a > b { return a }; return b }

func (m *Match) toStringID(i int) string { return strconv.Itoa(i) }
