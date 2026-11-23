package sim

import "math"

func has(a []string, k string) bool {
	for _, x := range a { if x == k { return true } }
	return false
}

type Platform struct{ X, Y, W float64 }
type Hitbox struct{ X,Y,W,H,Dmg,BK,KX,KY float64; Owner,Life int; Heavy bool }

type Projectile struct {
	X,Y,W,H,VX,VY float64
	Owner int
	Dmg,BK,KX,KY float64
	Life int
}

type Fighter struct {
	Slot int; FighterID string; Stats Stats
	X,Y,W,H float64; VX,VY float64
	Facing int; On bool; Dead int; Stocks int
	Damage float64; UltCharge float64
	Stun,MaxStun,Inv int
	JumpTick,DashT,DashCD int
	Combo int; FastFall bool
	Winning bool; WinT int
	MoveKind string; AtkT,AtkDur int; AtkKind string; AtkHeavy bool
	Ammo,MaxAmmo,ReloadT,ReloadDur int
	Crouch bool; HitFlash int; SquashX,SquashY float64
	AirJumps int; UpSpecUsed bool
}

type OnlineMatch struct {
	Players []*Fighter
	Stage int; Seed uint32; Tick uint32
	OnEnd func([]int); standings []int
	main struct{ X,Y,W,H float64 }
	blast struct{ L,R,T,B float64 }
	plats []Platform
	hits []Hitbox
	projs []Projectile
	rng *RNG
	ended bool
}

type simpleErr string
func (e simpleErr) Error() string { return string(e) }
func fmtErr(s string) error { return simpleErr(s) }

func NewOnlineMatch(ids []string, stage int, seed uint32) (*OnlineMatch, error) {
	n := len(ids)
	if n!=2 && n!=4 && n!=6 && n!=8 { return nil, fmtErr("Capacidad de sala inválida") }
	for _, id := range ids {
		found := false
		for _, f := range fighterIDs { if f==id { found=true; break } }
		if !found { return nil, fmtErr("Luchador inválido") }
	}
	if stage < 0 || stage >= StageCount() { stage = 0 }
	m := &OnlineMatch{Stage: stage, Seed: seed, rng: NewRNG(seed)}
	m.setup(ids)
	return m, nil
}

func (m *OnlineMatch) setup(ids []string) {
	n := len(ids)
	scaleW := map[int]float64{2:1.0,4:1.15,6:1.25,8:1.4}[n]
	mw := 860.0 * scaleW
	mx, my := (1440.0-mw)/2, 560.0
	m.main = struct{ X,Y,W,H float64 }{mx,my,mw,80}
	m.blast = struct{ L,R,T,B float64 }{-180,1620,-260,990}
	m.plats = nil
	if n >= 4 {
		m.plats = append(m.plats, Platform{X:mx+mw*0.2,Y:my-120,W:140}, Platform{X:mx+mw*0.8-140,Y:my-120,W:140})
	}
	if n >= 6 { m.plats = append(m.plats, Platform{X:mx+mw*0.5-90,Y:my-220,W:180}) }
	m.Players = make([]*Fighter, n)
	for i, id := range ids {
		st := GetStats(id)
		f := &Fighter{Slot:i, FighterID:id, Stats:st, W:38, H:92, Stocks:3, MaxAmmo:6, Ammo:6, SquashX:1, SquashY:1, Facing:1, AirJumps:2}
		t := float64(i+1)/float64(n+1)
		f.X = mx + mw*t - f.W/2; f.Y = my - f.H
		if f.X+f.W/2 > mx+mw/2 { f.Facing = -1 }
		f.On = true
		m.Players[i] = f
	}
}

func (m *OnlineMatch) Step(inputs [][]string) uint32 {
	m.Tick++
	for i,f := range m.Players {
		if f==nil || f.Stocks<=0 { continue }
		var in []string; if i < len(inputs) { in = inputs[i] }
		m.stepFighter(f, in)
	}
	m.stepHits()
	m.stepProjs()
	m.checkEnd()
	return m.Tick
}

func (m *OnlineMatch) stepFighter(f *Fighter, in []string) {
	if f.HitFlash>0 { f.HitFlash-- }
	if f.DashCD>0 { f.DashCD-- }
	if f.Stun>0 { f.Stun--; f.VX *= 0.9 }
	if f.Dead>0 {
		f.Dead--; f.VX,f.VY=0,0
		if f.Dead==0 && f.Stocks>0 {
			f.X = m.main.X+m.main.W/2-f.W/2; f.Y = m.main.Y-f.H-120
			f.VX,f.VY=0,0; f.Damage=0; f.Inv=90; f.Stun=0
			f.AtkT,f.AtkDur,f.AtkKind,f.MoveKind,f.AtkHeavy = 0,0,"","",false
			f.AirJumps=2; f.UpSpecUsed=false; f.FastFall=false
		}
		return
	}

	left,right,jump,down := has(in,"left"),has(in,"right"),has(in,"jump"),has(in,"down")
	light,heavy,dash,ult,reload := has(in,"light"),has(in,"heavy"),has(in,"dash"),has(in,"ult"),has(in,"reload")
	if down && !f.On { f.FastFall = true }

	canAct := f.Stun<=0 && f.AtkT<=0
	if canAct {
		spd := 3.0 + f.Stats.Spd*0.25
		if dash && f.DashCD==0 { f.DashT=10; f.DashCD=28; f.VX=float64(f.Facing)*(spd+3.5) }
		if f.DashT>0 { f.DashT-- } else {
			if left { f.VX -= 0.7; f.Facing = -1 }
			if right { f.VX += 0.7; f.Facing = 1 }
			if !left && !right { f.VX *= 0.82; if math.Abs(f.VX)<0.1 { f.VX=0 } }
			if f.VX>spd { f.VX=spd }; if f.VX< -spd { f.VX=-spd }
		}
		if jump {
			if f.On {
				f.VY = -12.5 - f.Stats.Spd*0.15; f.On=false; f.JumpTick=int(m.Tick); f.AirJumps=2; f.UpSpecUsed=false; f.SquashX,f.SquashY=0.88,1.12
			} else if f.AirJumps>0 && f.VY > -4 {
				f.AirJumps--; f.VY = -11.5; f.JumpTick=int(m.Tick); f.SquashX,f.SquashY=0.9,1.1
			}
		}
		if reload && f.ReloadT<=0 && f.Ammo<f.MaxAmmo { f.ReloadT = f.ReloadDur }
		if f.ReloadT>0 { f.ReloadT--; if f.ReloadT==0 { f.Ammo=f.MaxAmmo } }

		// Up special: jump+heavy while airborne and not used
		if heavy && jump && !f.On && !f.UpSpecUsed {
			f.UpSpecUsed=true; f.FastFall=false; f.VY=-14.5; f.VX=float64(f.Facing)*4.5
			f.AtkKind="upSpec"; f.AtkDur=28; f.AtkT=28; f.MoveKind="upSpec"; f.AtkHeavy=true
			m.spawnMelee(f, 9.0*f.Stats.Pwr, 6.5, 56, 64, -28, -50)
		} else if light || heavy || ult {
			if ult && f.UltCharge >= 100 { f.UltCharge = 0; m.spawnUlt(f) }
			if light || heavy {
				f.AtkKind="light"; f.AtkDur=14; f.AtkHeavy=false
				dmg,bk := 5.0*f.Stats.Pwr, 4.0
				w,h,oy := 34.0,26.0,20.0
				if heavy { f.AtkKind="heavy"; f.AtkDur=22; f.AtkHeavy=true; dmg,bk=9.0*f.Stats.Pwr,7.0; w,h,oy=42,32,16 }
				f.AtkT=f.AtkDur; f.MoveKind=f.AtkKind
				m.spawnMelee(f,dmg,bk,w,h,0,oy)
			}
		}
	} else {
		if f.AtkT>0 { f.AtkT--; if f.AtkT==0 { f.AtkKind=""; f.MoveKind=""; f.AtkHeavy=false } }
		if !left && !right { f.VX *= 0.9 }
	}

	grav := 0.62
	f.VY += grav
	maxFall := 14.0; if f.FastFall { maxFall=16.5 }
	if f.VY>maxFall { f.VY=maxFall }
	f.X += f.VX; f.Y += f.VY

	f.On=false
	if f.VY>=0 && f.Y+f.H >= m.main.Y && f.Y+f.H-f.VY <= m.main.Y+8 && f.X+f.W > m.main.X && f.X < m.main.X+m.main.W {
		f.Y=m.main.Y-f.H; f.VY=0; f.On=true; f.FastFall=false; f.AirJumps=2; f.UpSpecUsed=false
	}
	for _,p := range m.plats {
		if !down && f.VY>=0 && f.Y+f.H >= p.Y && f.Y+f.H-f.VY <= p.Y+8 && f.X+f.W > p.X && f.X < p.X+p.W {
			f.Y=p.Y-f.H; f.VY=0; f.On=true; f.FastFall=false; f.AirJumps=2; f.UpSpecUsed=false
		}
	}
	if f.On { f.SquashX += (1-f.SquashX)*0.2; f.SquashY += (1-f.SquashY)*0.2 } else { f.SquashX += (1-f.SquashX)*0.1; f.SquashY += (1-f.SquashY)*0.1 }
	if f.Inv>0 { f.Inv-- }
	if f.X < m.blast.L || f.X > m.blast.R || f.Y < m.blast.T || f.Y > m.blast.B {
		f.Stocks--; if f.Stocks<=0 { f.Stocks=0; f.Dead=9999 } else { f.Dead=60 }
		f.AtkT,f.AtkDur,f.AtkKind,f.MoveKind,f.AtkHeavy=0,0,"","",false
	}
}

func (m *OnlineMatch) spawnMelee(f *Fighter, dmg,bk,w,h,ox,oy float64) {
	x := f.X + f.W + ox; if f.Facing<0 { x = f.X - w - ox }
	y := f.Y + oy
	kx := float64(f.Facing)*(2.5+bk*0.35); ky := -3.5-bk*0.25
	m.hits = append(m.hits, Hitbox{X:x,Y:y,W:w,H:h,Dmg:dmg,BK:bk,KX:kx,KY:ky,Owner:f.Slot,Life:5,Heavy:f.AtkHeavy})
}

func (m *OnlineMatch) spawnUlt(f *Fighter) {
	// simple ult: big hitbox in front
	w,h := 140.0,90.0
	x := f.X + f.W; if f.Facing<0 { x = f.X - w }
	y := f.Y - 10
	m.hits = append(m.hits, Hitbox{X:x,Y:y,W:w,H:h,Dmg:28*f.Stats.Pwr,BK:14,KX:float64(f.Facing)*10,KY:-9,Owner:f.Slot,Life:12,Heavy:true})
}

func (m *OnlineMatch) stepHits() {
	alive := m.hits[:0]
	for i := range m.hits {
		h := &m.hits[i]; h.Life--
		if h.Life<=0 { continue }
		for _,f := range m.Players {
			if f==nil || f.Slot==h.Owner || f.Stocks<=0 || f.Dead>0 || f.Inv>0 { continue }
			if h.X < f.X+f.W && h.X+h.W > f.X && h.Y < f.Y+f.H && h.Y+h.H > f.Y {
				f.Damage += h.Dmg
				kb := 1.0 + f.Damage*0.015
				wgt := math.Max(0.7, f.Stats.Wgt)
				f.VX = h.KX * kb / wgt; f.VY = h.KY * kb / wgt
				f.Stun = int(8 + h.BK*1.5); f.HitFlash = 6; f.On=false
				f.AtkT,f.AtkKind,f.MoveKind,f.AtkHeavy = 0,"","",false
				f.UltCharge = math.Min(100, f.UltCharge + h.Dmg*0.8)
				// give attacker ult charge
				if h.Owner>=0 && h.Owner < len(m.Players) && m.Players[h.Owner]!=nil { m.Players[h.Owner].UltCharge = math.Min(100, m.Players[h.Owner].UltCharge + h.Dmg*0.6) }
				h.Life = 0
				break
			}
		}
		if h.Life>0 { alive = append(alive, *h) }
	}
	m.hits = alive
}

func (m *OnlineMatch) stepProjs() {
	alive := m.projs[:0]
	for i := range m.projs {
		p := &m.projs[i]
		p.X += p.VX; p.Y += p.VY; p.Life--
		if p.Life<=0 { continue }
		hit := false
		for _,f := range m.Players {
			if f==nil || f.Slot==p.Owner || f.Stocks<=0 || f.Dead>0 || f.Inv>0 { continue }
			if p.X < f.X+f.W && p.X+p.W > f.X && p.Y < f.Y+f.H && p.Y+p.H > f.Y {
				f.Damage += p.Dmg; kb := 1.0 + f.Damage*0.015; wgt := math.Max(0.7, f.Stats.Wgt)
				f.VX = p.KX*kb/wgt; f.VY = p.KY*kb/wgt; f.Stun = int(8+p.BK*1.5); f.HitFlash=6; f.On=false
				if p.Owner>=0 && p.Owner < len(m.Players) && m.Players[p.Owner]!=nil { m.Players[p.Owner].UltCharge = math.Min(100, m.Players[p.Owner].UltCharge + p.Dmg*0.6) }
				hit=true; break
			}
		}
		if !hit { alive = append(alive, *p) }
	}
	m.projs = alive
}

func (m *OnlineMatch) checkEnd() {
	if m.ended { return }
	alive := []int{}
	for i,f := range m.Players { if f.Stocks>0 { alive = append(alive, i) } }
	if len(alive)<=1 && len(m.Players)>1 {
		m.ended=true
		order := make([]int,0,len(m.Players))
		order = append(order, alive...)
		for i := range m.Players {
			isAlive := false; for _,a := range alive { if a==i { isAlive=true } }
			if !isAlive { order = append(order, i) }
		}
		m.standings = order
		if m.OnEnd != nil { m.OnEnd(order) }
	}
}

func (m *OnlineMatch) Leave(slot int) {
	if slot>=0 && slot < len(m.Players) { f := m.Players[slot]; if f!=nil && f.Stocks>0 { f.Stocks=0; f.Dead=9999 } }
	m.checkEnd()
}

func (m *OnlineMatch) Standings() []int { return m.standings }
