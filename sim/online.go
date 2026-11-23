package sim

import "math"

func has(a []string, k string) bool {
	for _, x := range a { if x == k { return true } }
	return false
}

type Platform struct{ X, Y, W float64 }
type Hitbox struct{ X,Y,W,H,Dmg,BK,KS,Ang float64; Owner,Life int; Heavy bool; Dir int }

type Projectile struct {
	X,Y,W,H,VX,VY float64
	Owner int
	Dmg,BK,KS,Ang float64
	Life int; Kind string
	Bounces int; Hold int
}

type ActiveAtk struct {
	Spec MoveSpec
	T int
	Hits map[int]bool
	Heavy bool
	MoveKind string
}

type Fighter struct {
	Slot int; FighterID string; Stats Stats
	Moves [4]MoveSpec // jab, neutral, up, down
	X,Y,W,H float64; VX,VY float64
	Facing int; On bool; Dead int; Stocks int
	Damage float64; UltCharge float64
	Stun,MaxStun,Inv int
	JumpTick,DashT,DashCD int
	Combo int; FastFall bool
	Winning bool; WinT int
	MoveKind string
	Ammo,MaxAmmo,ReloadT,ReloadDur int
	Crouch bool; HitFlash int; SquashX,SquashY float64
	AirJumps int; UpSpecUsed bool
	Atk *ActiveAtk
	ProjectileCD int
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

func buildMoves(id string) [4]MoveSpec {
	rep := repertoire[id]
	lab := moveLabels[id]
	// defaults
	jabScore, neuScore, upScore, downScore := "toque", "punta", "alto", "bajo"
	jabName, neuName, upName, downName := "Jab", "Especial", "Arriba", "Abajo"
	if len(rep) >= 4 { jabScore, neuScore, upScore, downScore = rep[0], rep[1], rep[2], rep[3] }
	if len(lab) >= 3 { jabName, upName, downName = lab[0], lab[1], lab[2] }
	// neutral name: use MOVE_NAMES-like fallback - just use sigName style
	neuName = "Especial"
	if n, ok := sigNames[id]; ok { neuName = n }
	m := [4]MoveSpec{ ParseMove(jabName,jabScore), ParseMove(neuName,neuScore), ParseMove(upName,upScore), ParseMove(downName,downScore) }
	// mark up as launch move if it has launch-like beat (carga/alto/punta) - approximate
	m[2].Effect = "launch"
	return m
}

var sigNames = map[string]string{
	"washington":"Cañonazo de Delaware","lincoln":"Hacha del Riel","teddy":"Carga de San Juan","fdr":"Cortina del New Deal",
	"eisenhower":"Bombardeo D-Day","kennedy":"Órbita Lunar","bolivar":"Onda Patriótica","sanmartin":"Cruce de los Andes",
	"juarez":"Reforma Imparable","cardenas":"Expropiación","ohiggins":"Carga de Rancagua","sarmiento":"Cañón de la Educación",
	"alfaro":"Tren Libertario","batlle":"Escudo Social","vargas":"Estado Novo","kubitschek":"Avance 50 Años",
	"allende":"Unidad Popular","sucre":"Carga de Ayacucho","artigas":"Lanza Federal","mujica":"Arado del Pueblo",
	"degaulle":"Cruz de Lorena","mitterrand":"Rosa de Acero","chirac":"Escudo Nuclear","masaryk":"Veto de Acero",
	"havel":"Revolución de Terciopelo","walesa":"Martillo Solidario","pertini":"Resistencia Alpina","kekkonen":"Línea Finlandesa",
	"robinson":"Campo Escudo","mandela":"Puño de la Libertad","sankara":"Furia del Sahel","nkrumah":"Estrella de Ghana",
	"nyerere":"Ujamaa","ataturk":"Llama de Ankara","sunyatsen":"Tres Principios","kalam":"Misil Agni",
	"cesar":"Gladius Voraz","alejandro":"Estocada de Caballería","aquiles":"Furia de Tesalia","lula":"Martillo del Pueblo",
	"juana":"Estandarte de Orleans","espartaco":"Ruptura de cadenas","musashi":"Cruce de los dos cielos","policarpa":"Finta de La Pola",
	"wallace":"Grito de Stirling","elcid":"Tizona","ricaurte":"Mecha de San Mateo","simo":"Muerte Blanca",
	"abelardo":"Furia Llanera","petro":"Órbita de la plaza","uribe":"Seguridad Democrática","santos":"Nobel de Paz",
	"duque":"Centro Democrático","bukele":"Doble destello","sheinbaum":"Trayectoria orbital","milei":"Motosierra",
	"trump":"Muro Dorado","macron":"En Marche","noboa":"Mano Firme","kast":"Orden Republicano",
	"biden":"Unión Americana","maduro":"Puño del Pueblo","putin":"Oso Siberiano","obama":"Hope Strike",
	"napoleon":"Cañón de Austerlitz","antoinette":"Guillotina","bathory":"Baño de Sangre","xiomara":"Refundación",
	"diazcanel":"Continuidad","ortega":"Frente Sandinista","gengis":"Horda Dorada",
}

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
	g := ArenaGeometry(m.Stage, n)
	m.main = g.Main
	m.blast = g.Blast
	m.plats = g.Plats
	m.Players = make([]*Fighter, n)
	for i, id := range ids {
		st := GetStats(id)
		f := &Fighter{Slot:i, FighterID:id, Stats:st, Moves: buildMoves(id), W:38, H:92, Stocks:3, MaxAmmo:6, Ammo:6, SquashX:1, SquashY:1, Facing:1, AirJumps:2}
		sp := g.Spawns[i%len(g.Spawns)]
		f.X = sp.X - f.W/2; f.Y = sp.Y - f.H
		if f.X+f.W/2 > m.main.X+m.main.W/2 { f.Facing = -1 }
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
	if f.ProjectileCD>0 { f.ProjectileCD-- }
	if f.Stun>0 { f.Stun--; f.VX *= 0.9 }
	if f.Dead>0 {
		f.Dead--; f.VX,f.VY=0,0
		if f.Dead==0 && f.Stocks>0 {
			f.X = m.main.X+m.main.W/2-f.W/2; f.Y = m.main.Y-f.H-120
			f.VX,f.VY=0,0; f.Damage=0; f.Inv=90; f.Stun=0
			f.Atk=nil; f.MoveKind=""; f.AirJumps=2; f.UpSpecUsed=false; f.FastFall=false
		}
		return
	}

	left,right,jump,down := has(in,"left"),has(in,"right"),has(in,"jump"),has(in,"down")
	light,heavy,dash,ult,reload := has(in,"light"),has(in,"heavy"),has(in,"dash"),has(in,"ult"),has(in,"reload")
	if down && !f.On { f.FastFall = true }

	canAct := f.Stun<=0 && f.Atk==nil
	if canAct {
		spd := 3.0 + f.Stats.Spd*0.25
		if dash && f.DashCD==0 { f.DashT=10; f.DashCD=28; f.VX=float64(f.Facing)*(spd+3.5) }
		if f.DashT>0 { f.DashT-- } else {
			if left { f.VX -= 0.7; f.Facing = -1 }
			if right { f.VX += 0.7; f.Facing = 1 }
			if !left && !right { f.VX *= 0.82; if math.Abs(f.VX)<0.1 { f.VX=0 } }
			if f.VX>spd { f.VX=spd }; if f.VX < -spd { f.VX=-spd }
		}
		if jump {
			if f.On {
				f.VY = -12.5 - f.Stats.Spd*0.15; f.On=false; f.JumpTick=int(m.Tick); f.AirJumps=2; f.UpSpecUsed=false; f.SquashX,f.SquashY=0.88,1.12
			} else if f.AirJumps>0 && f.VY > -4 {
				f.AirJumps--; f.VY = -11.5; f.JumpTick=int(m.Tick); f.SquashX,f.SquashY=0.9,1.1
			}
		}
		if reload && f.ReloadT<=0 && f.Ammo<f.MaxAmmo { f.ReloadT=90 }
		if f.ReloadT>0 { f.ReloadT--; if f.ReloadT==0 { f.Ammo=f.MaxAmmo } }

		if heavy && jump && !f.On && !f.UpSpecUsed {
			f.UpSpecUsed=true; f.FastFall=false; f.VY=-14.5; if left||right { f.VX=float64(f.Facing)*5.2 }
			spec := f.Moves[2]; spec.Dur = 32
			f.Atk = &ActiveAtk{Spec:spec, T:0, Hits:map[int]bool{}, Heavy:true, MoveKind:"upSpec"}
			f.MoveKind="upSpec"
		} else if ult && f.UltCharge >= 100 {
			f.UltCharge = 0
			m.spawnUlt(f)
		} else if heavy {
			idx := 1 // neutral/special
			if down { idx = 3 } else if jump { idx = 2 }
			spec := f.Moves[idx]
			if len(spec.Sp)>0 && f.ProjectileCD>0 { spec.Sp = nil } else if len(spec.Sp)>0 { f.ProjectileCD = 45 }
			f.Atk = &ActiveAtk{Spec:spec, T:0, Hits:map[int]bool{}, Heavy:true, MoveKind:[]string{"sig","sig","upSpec","downSpec"}[idx]}
			f.MoveKind = f.Atk.MoveKind
		} else if light {
			spec := f.Moves[0]
			f.Atk = &ActiveAtk{Spec:spec, T:0, Hits:map[int]bool{}, Heavy:false, MoveKind:"jab"}
			f.MoveKind="jab"
		}
	} else if f.Atk != nil {
		m.advanceAtk(f)
		if !left && !right { f.VX *= 0.9 }
	} else {
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
		f.Atk=nil; f.MoveKind=""
	}
}

func (m *OnlineMatch) advanceAtk(f *Fighter) {
	a := f.Atk; if a==nil { return }
	a.T++
	// fire shots
	for _, s := range a.Spec.Sp {
		if s.T == a.T {
			p := s.P
			x := f.X + f.W/2 + p.FX*float64(f.Facing)
			if f.Facing < 0 { x = f.X + f.W/2 - p.FX - p.W }
			y := f.Y + f.H + p.Y
			m.projs = append(m.projs, Projectile{X:x,Y:y,W:p.W,H:p.H,VX:p.VX*float64(f.Facing),VY:p.VY,Owner:f.Slot,Dmg:p.Dmg*f.Stats.Pwr,BK:p.BK,KS:p.KS,Ang:p.Ang,Life:p.Life,Kind:p.Kind,Bounces:p.Bounces,Hold:p.Hold})
		}
	}
	// active phases -> spawn hitboxes
	for i, ph := range a.Spec.Ph {
		if a.T >= ph.A[0] && a.T <= ph.A[1] && !a.Hits[i] {
			hb := ph.HB
			if hb == nil { continue }
			x := f.X + f.W/2 + hb.FX*float64(f.Facing)
			if f.Facing < 0 { x = f.X + f.W/2 - hb.FX - hb.W }
			y := f.Y + f.H + hb.Y
			dir := f.Facing
			life := ph.A[1] - a.T + 1
			if life < 1 { life = 1 }
			m.hits = append(m.hits, Hitbox{X:x,Y:y,W:hb.W,H:hb.H,Dmg:ph.Dmg*f.Stats.Pwr,BK:ph.BK,KS:ph.KS,Ang:ph.Ang,Owner:f.Slot,Life:life,Heavy:a.Heavy,Dir:dir})
			a.Hits[i] = true
		}
	}
	if a.T >= a.Spec.Dur {
		f.Atk=nil; f.MoveKind=""
	}
}

func (m *OnlineMatch) spawnUlt(f *Fighter) {
	w,h := 140.0,90.0
	x := f.X + f.W; if f.Facing<0 { x = f.X - w }
	y := f.Y - 10
	m.hits = append(m.hits, Hitbox{X:x,Y:y,W:w,H:h,Dmg:28*f.Stats.Pwr,BK:14,KS:0.18,Ang:-35,Owner:f.Slot,Life:12,Heavy:true,Dir:f.Facing})
}

func (m *OnlineMatch) stepHits() {
	alive := m.hits[:0]
	for i := range m.hits {
		h := &m.hits[i]
		if h.Life<=0 { continue }
		for _,f := range m.Players {
			if f==nil || f.Slot==h.Owner || f.Stocks<=0 || f.Dead>0 || f.Inv>0 { continue }
			if h.X < f.X+f.W && h.X+h.W > f.X && h.Y < f.Y+f.H && h.Y+h.H > f.Y {
				f.Damage += h.Dmg
				kb := (h.BK + (f.Damage*h.KS)/math.Max(0.7,f.Stats.Wgt))
				rad := h.Ang * math.Pi / 180
				dir := float64(h.Dir)
				f.VX = math.Cos(rad)*kb*dir
				f.VY = math.Sin(rad)*kb
				f.Stun = int(math.Min(58, math.Max(10, math.Round(10+kb*1.85))))
				f.MaxStun = f.Stun
				f.HitFlash = 6; f.On=false
				f.Atk=nil; f.MoveKind=""
				f.UltCharge = math.Min(100, f.UltCharge + h.Dmg*0.8)
				if h.Owner>=0 && h.Owner < len(m.Players) && m.Players[h.Owner]!=nil { m.Players[h.Owner].UltCharge = math.Min(100, m.Players[h.Owner].UltCharge + h.Dmg*0.6) }
				h.Life = 0
				break
			}
		}
		h.Life--
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
		if p.Kind=="arco" { p.VY += 0.25 }
		hit := false
		for _,f := range m.Players {
			if f==nil || f.Slot==p.Owner || f.Stocks<=0 || f.Dead>0 || f.Inv>0 { continue }
			if p.X < f.X+f.W && p.X+p.W > f.X && p.Y < f.Y+f.H && p.Y+p.H > f.Y {
				f.Damage += p.Dmg; kb := (p.BK + (f.Damage*p.KS)/math.Max(0.7,f.Stats.Wgt))
				rad := p.Ang * math.Pi / 180; dir := 1.0; if p.VX<0 { dir = -1 }
				f.VX = math.Cos(rad)*kb*dir; f.VY = math.Sin(rad)*kb
				f.Stun = int(math.Min(58, math.Max(10, math.Round(10+kb*1.85))))
				f.HitFlash=6; f.On=false; f.Atk=nil; f.MoveKind=""
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
