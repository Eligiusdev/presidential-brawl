package sim

import (
	"fmt"
	"math"
)

type damageSpec struct {
	Dmg, BK, KS, Ang float64
	Heavy, Every, Hold, Ult bool
	Pierce bool
}

func (m *Match) updateFighter(f *Fighter, in Input) {
	if f.Dead > 0 {
		f.Dead--
		if f.Dead == 0 && f.Stocks > 0 { f.Reset(m.Main.X+m.Main.W/2-f.W/2, -110, false, f.Stocks) }
		return
	}
	if f.Winning {
		if f.On {
			if f.Atk != nil && f.Atk.Spec.Effect == "hover" { f.VY = in.DownDown() }
			f.VX *= .72
			if math.Abs(f.VX) < .08 { f.VX = 0 }
		}
		return
	}

	f.Prev, f.Cur, f.Just = f.Cur, in, edge(in, f.Cur)
	if f.Atk != nil && f.Atk.Spec.Individual && f.Atk.T >= f.Atk.Spec.Dur {
		f.Atk, f.MoveKind = nil, ""
	}
	just := f.Just
	upSpecialInput := f.Moves() != nil && just.Heavy
	switch {
	case upSpecialInput || f.Stun > 0:
		f.JumpBuffer = 0
	case just.Jump:
		f.JumpBuffer = 6
	case f.JumpBuffer > 0:
		f.JumpBuffer--
	}
	dir := 0
	if in.Right { dir++ }
	if in.Left { dir-- }

	// timers
	if f.Inv > 0 { f.Inv-- }
	if f.DashCD > 0 { f.DashCD-- }
	if f.DashDanceT > 0 { f.DashDanceT-- }
	if f.Wpn > 0 {
		f.Wpn--
		if f.Wpn == 0 { f.WeaponKind = ""; f.Ammo = 0; f.ReloadT = 0 }
	}
	if f.PickupT > 0 { f.PickupT-- }
	if f.GunCD > 0 { f.GunCD-- }
	if f.ShootRecoil > 0 { f.ShootRecoil-- }
	if f.LandT > 0 { f.LandT-- }
	if f.ReloadT > 0 {
		f.ReloadT--
		if f.ReloadT == 0 {
			f.Ammo = f.MaxAmmo
			m.pushFloat("RECARGADO", f.CX(), f.Y-10, 38)
			m.sound("reloadClick")
		}
	}
	if f.DropT > 0 { f.DropT-- }
	if f.UltimateRecovery > 0 { f.UltimateRecovery-- }
	if f.Rage > 0 { f.Rage-- }
	if f.SpeedTime > 0 { f.SpeedTime-- }
	if f.Field != nil {
		f.Field.Life--
		if f.Field.Life <= 0 { f.Field = nil }
	}
	if f.Stun > 0 && f.LastAttacker >= 0 && f.LastAttacker < len(m.Fighters) && m.Fighters[f.LastAttacker].Combo > 0 {
		m.Fighters[f.LastAttacker].CT = int(math.Max(float64(m.Fighters[f.LastAttacker].CT), 34))
	}
	if f.CT > 0 {
		f.CT--
		if f.CT == 0 { f.Combo, f.JabStep = 0, 0 }
	}
	if f.HitFlash > 0 { f.HitFlash-- }
	if f.TrainingDummy && f.Stun <= 0 && f.Pct > 0 && m.Tick%90 == 0 { f.Pct = math.Max(0, f.Pct-15) }
	f.SquashX += (1 - f.SquashX) * .22
	f.SquashY += (1 - f.SquashY) * .22
	for i := range f.Afterimages { f.Afterimages[i].Alpha -= .14 }
	var aliveIm []Afterimage
	for _, a := range f.Afterimages { if a.Alpha > 0 { aliveIm = append(aliveIm, a) } }
	f.Afterimages = aliveIm

	free := f.Stun <= 0
	if !free {
		f.Stun--
		f.Floating, f.FastFall = false, false
		f.VX *= .985
	} else if f.UltimateRecovery == 0 {
		// ultimate trigger
		if f.Vote >= 100 && m.Cine == nil && m.Telegraph == nil && (just.Ult || (in.Light && in.Heavy && (just.Light || just.Heavy))) {
			o := m.aliveOpponent(f)
			oi := 1 - f.Slot
			if o != nil { oi = o.Slot }
			m.Cine = &Cine{T: 0, F: f.Slot, O: oi, Flash: true}
			f.Vote = 0
			f.Floating = false
			m.sound("siren")
			m.crowdReaction("ult", f.CX(), 24, 85)
			just.Light, just.Heavy, just.Dash = false, false, false
		}
		a := f.Atk
		// weapon throw
		if just.Light && in.Dash && f.Wpn > 0 {
			m.addProjectile(&Projectile{X: f.CX()-8, Y: f.Y+26, W: 18, H: 18,
				VX: float64(f.Face)*10.5, VY: -2.2, Life: 60, Kind: "throw", W2: f.WeaponKind,
				Dir: f.Face, Owner: f.Slot, Dmg: 10, BK: 5.5, KS: .16, Ang: -25, Heavy: true})
			f.Wpn, f.WeaponKind = 0, ""
			m.sound("sword")
		} else if just.Dash && f.DashCD <= 0 && f.DashT <= 0 && !f.specialRecovery() {
			f.DashT, f.Inv, f.DashCD = 12, int(math.Max(float64(f.Inv), 12)), 82
			f.Floating = false
			speed := 10.5
			if f.IsAgile() { speed = 12.2 }
			dashDir := dir
			if dashDir == 0 { dashDir = f.Face }
			f.VX = float64(dashDir) * speed
			f.VY = 0
			f.Atk = nil
			f.MoveKind = ""
			f.SquashX, f.SquashY = 1.28, .78
			m.sound("dash")
		}
		// weapon pickup / fire / reload
		m.weaponActions(f, in, just)
		// attacks
		m.attackActions(f, in, just, dir)
		if a != nil && f.Atk == a { m.advanceAttack(f) }
	}

	if f.DashT > 0 {
		f.DashT--
		f.VY = 0
		if f.DashT == 0 { f.VX *= .62 }
		if m.Tick%2 == 0 {
			f.Afterimages = append(f.Afterimages, Afterimage{X: f.CX(), Y: f.Y + f.H, Face: f.Face, Alpha: .9})
		}
	} else if free {
		if dir != 0 {
			if f.On && f.Atk == nil && sign(f.VX) != 0 && sign(f.VX) != float64(dir) && math.Abs(f.VX) > 1.6 {
				f.DashDanceT = 8
				f.VX = float64(dir) * f.Speed() * .27 * (1 + float64(dir)*0)
				if f.SpeedTime > 0 { f.VX *= 1.45 }
				if f.IsAgile() { f.VX *= 1.24 } else { f.VX *= 1.12 }
				m.burst(f.CX(), f.Y+f.H-2, "#cbd5e1", 5, 3, 14, "puff")
			} else {
				air := 1.0
				if f.Floating { air = 1.24 }
				accel := .125
				if f.On { accel = .27; if f.IsAgile() { accel = .31 } } else if f.Floating { accel = .16 }
				target := float64(dir) * f.Speed() * air
				if f.SpeedTime > 0 { target *= 1.45 }
				if f.Atk != nil { target *= .42 }
				f.VX += (target - f.VX) * accel
			}
			if f.Atk == nil { f.Face = dir }
		} else if f.On {
			fric := .80
			if f.DashDanceT > 0 || math.Abs(f.VX) > f.Speed()*1.12 { fric = .90 }
			f.VX *= fric
			if math.Abs(f.VX) < .08 { f.VX = 0 }
		} else {
			f.VX *= .986
		}
	}

	// jumps
	if (just.Jump || (f.JumpBuffer > 0 && f.On)) && !upSpecialInput {
		if f.On || f.Wall != 0 || f.AirJ > 0 { f.JumpBuffer = 0 }
		if f.On {
			f.JumpTick = int(m.Tick)
			f.VY = -f.JumpForce()
			f.On, f.FastFall = false, false
			f.SquashX, f.SquashY = .78, 1.26
			m.sound("jump")
			m.burst(f.CX(), f.Y+f.H, "#fff", 6, 3, 0, "")
		} else if f.Wall != 0 {
			f.JumpTick = int(m.Tick)
			f.VY = -f.JumpForce() * .95
			f.VX = -float64(f.Wall) * 7.8
			f.Face = -f.Wall
			f.FastFall = false
			f.SquashX, f.SquashY = .8, 1.24
			m.sound("jump")
		} else if f.AirJ > 0 {
			f.AirJ--
			f.JumpTick = int(m.Tick)
			f.VY = -f.JumpForce() * .92
			f.FastFall = false
			f.SquashX, f.SquashY = .84, 1.2
			m.sound("jump")
		}
	}

	// float
	if !f.On && f.IsFloatZoner() && in.Jump && f.VY >= -.8 && f.FloatT > 0 && f.Atk == nil {
		f.Floating, f.FastFall = true, false
		f.FloatT--
		f.VY = math.Sin(float64(m.Tick)*.22) * .42
		if m.Tick%4 == 0 { m.burst(f.CX(), f.Y+f.H*.6, "#7cf", 1, 1, 18, "diamond") }
	} else { f.Floating = false }

	// drop-through / crouch / fast-fall
	if (in.Down || (in.Down && just.Jump)) && !(f.Moves() != nil && just.Heavy) &&
		f.On && f.Y+f.H < m.Main.Y-1 {
		f.DropT, f.Y, f.On, f.Pl = 14, f.Y+2, false, nil
	}
	f.Crouch = f.On && in.Down && f.Y+f.H >= m.Main.Y-1 && f.Atk == nil
	if !(f.Moves() != nil && just.Heavy) && !f.On && !f.Floating && f.Atk == nil && f.VY > -1 && (just.Down || (in.Down && f.FastFall)) {
		if !f.FastFall { f.FastFall = true; f.SquashX, f.SquashY = .82, 1.22 }
		f.VY = math.Max(f.VY, 15.8)
	}

	// gravity and collisions
	if f.Atk != nil && f.Atk.Spec.Effect == "hover" {
		f.VY = 0
		if in.Down { f.VY = 1 } else if in.Jump { f.VY = -3 } else { f.VY = -1.5 }
		f.VX = float64(dir) * 4
	}
	wasOn := f.On
	if f.DashT <= 0 {
		f.VY = math.Min(f.VY+.55*m.GravityFactor*m.Cfg.Gravity, 14.5)
	}
	if free && !f.On && f.Wall != 0 && f.VY > 2.2 &&
		((f.Wall == 1 && in.Right) || (f.Wall == -1 && in.Left)) { f.VY = 2.2 }

	f.X += f.VX
	// Una plataforma móvil arrastra al luchador solo mientras siga sobre ella;
	// al salir se suelta y cae por gravedad.
	if f.On && f.Pl != nil {
		if f.X+f.W > f.Pl.X && f.X < f.Pl.X+f.Pl.W && math.Abs(f.Y+f.H-f.Pl.Y) < 24 {
			f.Y = f.Pl.Y - f.H
		} else {
			f.Pl = nil
		}
	}
	main := m.Main
	if f.X+f.W > main.X && f.X < main.X+main.W && f.Y+f.H > main.Y && f.Y < main.Y+main.H {
		if f.VX > 0 { f.X = main.X - f.W } else if f.VX < 0 { f.X = main.X + main.W }
		f.VX = 0
	}
	f.Wall = 0
	if f.Y+f.H > main.Y+3 && f.Y < main.Y+main.H {
		if math.Abs(f.X+f.W-main.X) < 2 { f.Wall = 1 } else if math.Abs(f.X-main.X-main.W) < 2 { f.Wall = -1 }
	}
	pb := f.Y + f.H
	f.Y += f.VY
	f.On = false
	if f.X+f.W > main.X && f.X < main.X+main.W && f.Y+f.H > main.Y && f.Y < main.Y+main.H {
		if f.VY >= 0 && pb <= main.Y+2 {
			f.Y = main.Y - f.H; f.VY = 0; f.On = true; f.Pl = nil
		} else if f.VY < 0 {
			f.Y = main.Y + main.H; f.VY = 0
		}
	}
	if !f.On {
		for i := range m.Plats {
			p := &m.Plats[i]
			if f.VY >= 0 && f.DropT <= 0 && pb <= p.Y+2 && f.Y+f.H >= p.Y && f.X+f.W > p.X && f.X < p.X+p.W {
				f.Y = p.Y - f.H; f.VY = 0; f.On = true; f.Pl = p; break
			}
		}
	}
	if f.Atk != nil && f.Atk.Spec.Effect == "ledge" && !f.On && f.VY >= -5 {
		edges := append([]Rect{main}, rects(m.Plats)...)
		for _, e := range edges {
			dx := math.Abs(f.X + f.W - e.X)
			if f.Face < 0 { dx = math.Abs(f.X - e.X - e.W) }
			if math.Abs(f.Y+16-e.Y) <= 13 && dx < 14 {
				if f.Face > 0 { f.X = e.X + 1 } else { f.X = e.X + e.W - f.W - 1 }
				f.Y = e.Y - f.H; f.On, f.VY, f.VX = true, 0, 0; f.Atk = nil; f.Pl = nil
				break
			}
		}
	}
	if f.On {
		f.AirJ, f.FloatT, f.Floating, f.FastFall, f.UpSpecUsed = 2, f.FloatMax, false, false, false
		if !wasOn {
			f.SquashX, f.SquashY, f.LandT = 1.3, .74, 7
			m.sound("land")
			m.burst(f.CX()-6, f.Y+f.H, "#cbd5e1", 2, 2, 10, "puff")
			m.burst(f.CX()+6, f.Y+f.H, "#cbd5e1", 2, 2, 10, "puff")
		} else if math.Abs(f.VX) > 3.2 && m.Tick%10 == 0 {
			m.sound("footstep")
		}
	} else { f.Crouch = false }

	if m.WinnerPi == nil && (f.CX() < m.Blast.L || f.CX() > m.Blast.R || f.Y < m.Blast.T || f.Y > m.Blast.B) {
		m.triggerKO(f, f.LastAttacker)
	}
}

func (f *Fighter) Moves() *MovesData { return f.D.Moves }
func (i Input) DownDown() float64 { if i.Down { return 1 }; return 0 }

func rects(ps []PlatformDef) []Rect {
	out := make([]Rect, 0, len(ps))
	for _, p := range ps { out = append(out, Rect{p.X, p.Y, p.W, 16}) }
	return out
}

func (m *Match) addProjectile(p *Projectile) {
	p.ID = m.ProjectileNext
	m.ProjectileNext++
	if p.Owner >= 0 && p.Owner < len(m.Fighters) && p.OwnerColor == "" {
		p.OwnerColor = m.Fighters[p.Owner].D.Palette.Base
		p.OwnerHighlight = m.Fighters[p.Owner].D.Palette.Highlight
	}
	if p.Done == nil { p.Done = map[int]bool{} }
	m.Projectiles = append(m.Projectiles, p)
}

func (m *Match) weaponActions(f *Fighter, in Input, just InputEdge) {
	if just.Light && f.Wpn == 0 && f.PickupT == 0 {
		for i, it := range m.Items {
			if overlaps(Rect{it.X, it.Y, it.W, it.H}, f.Rect()) {
				m.Items = append(m.Items[:i], m.Items[i+1:]...)
				f.PickupT, f.GunCD = 14, 14
				f.Wpn = 950
				f.WeaponKind = it.Kind
				if it.Kind == "mg" { f.MaxAmmo, f.Ammo = 30, 30 } else if it.Kind == "rocket" { f.MaxAmmo, f.Ammo = 4, 4 } else { f.MaxAmmo, f.Ammo = 0, 0 }
				f.ReloadT = 0
				break
			}
		}
	}
	if just.Reload && f.Wpn > 0 && (f.WeaponKind == "mg" || f.WeaponKind == "rocket") && f.ReloadT <= 0 && f.Ammo < f.MaxAmmo {
		f.ReloadDur, f.ReloadT = 42, 42
		if f.WeaponKind == "rocket" { f.ReloadDur, f.ReloadT = 54, 54 }
		m.sound("reloadStart")
	}
	if (just.Light || (in.Light && f.WeaponKind == "mg")) && f.Wpn > 0 &&
		(f.WeaponKind == "mg" || f.WeaponKind == "rocket") && f.GunCD <= 0 && f.ReloadT <= 0 {
		if f.Ammo <= 0 {
			f.ReloadDur, f.ReloadT = 42, 42
			if f.WeaponKind == "rocket" { f.ReloadDur, f.ReloadT = 54, 54 }
		} else if f.WeaponKind == "mg" {
			f.GunCD, f.Ammo, f.ShootRecoil = 8, f.Ammo-1, 5
			m.addProjectile(&Projectile{X: f.CX()+float64(f.Face)*28, Y: f.Y+38, W: 12, H: 5,
				VX: float64(f.Face)*15.5, VY: (m.RNG.Float()-0.5)*.85, Life: 40, Kind: "bullet",
				Dir: f.Face, Owner: f.Slot, Dmg: 3.4, BK: 2.1, KS: .05, Ang: -12})
			f.VX -= float64(f.Face) * .65
			m.sound("gunshot")
		} else {
			f.GunCD, f.Ammo, f.ShootRecoil = 32, f.Ammo-1, 9
			m.addProjectile(&Projectile{X: f.CX()+float64(f.Face)*28, Y: f.Y+36, W: 18, H: 8,
				VX: float64(f.Face)*9.8, Life: 75, Kind: "rocket",
				Dir: f.Face, Owner: f.Slot, Dmg: 14.5, BK: 8.2, KS: .25, Ang: -42, Heavy: true})
			f.VX -= float64(f.Face) * 2.6
			m.sound("rocket")
		}
	}
}

func moveData(name string, a []int, hb *BoxDef, dmg, bk, ks, ang float64, dur int) *MoveData {
	return &MoveData{Name: name, K: "l", Dur: dur, Ph: []PhaseData{{A: a, HB: hb, Dmg: dmg, BK: bk, KS: ks, Ang: ang}}}
}

func (f *Fighter) specialRecovery() bool {
	if f.Atk == nil || !f.Atk.Spec.Heavy || f.Atk.Spec.Frames == nil { return false }
	frames := f.Atk.Spec.Frames
	return f.Atk.T > frames.Startup + frames.Active
}

func (m *Match) attackActions(f *Fighter, in Input, just InputEdge, dir int) {
	if f.Atk != nil && !(f.Atk.Spec.K == "l" && !f.Atk.Spec.Balanced && f.Atk.T >= int(float64(f.Atk.Spec.Dur)*.55)) {
		return
	}
	// Entrada mantenida también dispara ataques (como en el motor anterior y en
	// los tests de paridad), no solo el flanco de pulsación.
	neutralJab := in.Light && !in.Dash && !in.Down && !in.Jump && dir == 0
	if (neutralJab && f.Atk == nil) || (in.Heavy && f.Atk == nil) {
		up := just.Heavy && in.Jump && !in.Down
		if !up || !f.UpSpecUsed {
			var mv *MoveData
			var mk string
			if just.Heavy {
				if in.Down { mv, mk = f.Move("down"), "sig" } else if up { mv, mk = f.Move("up"), "upSpec" } else { mv, mk = f.Move("neutral"), "sig" }
			} else { mv, mk = f.Move("jab"), "jab" }
			if mv != nil {
				m.startAttack(f, mv, mk, just.Heavy, dir, up)
				return
			}
		}
	}
	if in.Light && !in.Dash && f.Atk == nil {
		isSaber := f.D.WeaponType == "saber" && f.Wpn <= 0
		P := f.Power()
		var mv *MoveData
		if !f.On {
			switch {
			case in.Jump: mv = moveData("uair", []int{4, 12}, &BoxDef{-22, -124, 56, 54}, 6.2*P, 4.5, .12, -82, 22)
			case in.Down: mv = moveData("dair", []int{5, 16}, &BoxDef{-20, -6, 44, 40}, 7.4*P, 4.6, .14, 78, 25)
			case dir != 0 && dir != f.Face: mv = moveData("bair", []int{5, 13}, &BoxDef{-62, -82, 54, 38}, 6.8*P, 4.8, .13, -158, 23)
			case dir != 0: w := 50.0; if isSaber { w = 64 }; mv = moveData("fair", []int{4, 13}, &BoxDef{12, -84, w, 40}, 5.8*P, 4.0, .11, -28, 20)
			default: mv = moveData("nair", []int{4, 14}, &BoxDef{-28, -88, 56, 56}, 5*P, 3.4, .09, -38, 21)
			}
		} else {
			switch {
			case in.Jump: mv = moveData("utilt", []int{4, 12}, &BoxDef{-12, -122, 56, 66}, 5.4*P, 4.0, .1, -84, 20)
			case in.Down: w := 50.0; if isSaber { w = 60 }; mv = moveData("dtilt", []int{4, 11}, &BoxDef{10, -36, w, 32}, 4.6*P, 3.6, .08, -68, 18)
			case dir != 0: w := 50.0; if isSaber { w = 66 }; mv = moveData("ftilt", []int{4, 12}, &BoxDef{10, -78, w, 36}, 5.2*P, 3.4, .11, -24, 19)
			default:
				fin := f.JabStep%3 == 2
				w := 46.0; if isSaber { w = 58 }
				dmg, bk, ks, ang, dur := 3.8, 2.3, .07, -18.0, 16
				if fin { dmg, bk, ks, ang, dur = 5.6, 4.8, .14, -30, 22 }
				mv = moveData("jab", []int{3, 10}, &BoxDef{10, -76, w, 36}, dmg*P, bk, ks, ang, dur)
				f.JabStep++
			}
		}
		f.MoveKind = mv.Name
		m.startAttack(f, mv, mv.Name, false, dir, false)
	}
}

func (m *Match) startAttack(f *Fighter, source *MoveData, mk string, heavy bool, dir int, up bool) {
	spec := *source
	if up {
		if f.IsFloatZoner() {
			spec = MoveData{Name: mk, K: "h", Dur: 32, Heavy: true,
				Ph: []PhaseData{{A: []int{2, 18}, HB: &BoxDef{-34, -110, 68, 98}, Dmg: 8.5 * f.Power(), BK: 5.8, KS: .18, Ang: -75, Fx: "gold"}}}
		} else {
			spec = MoveData{Name: mk, K: "h", Dur: 34, Heavy: true,
				Ph: []PhaseData{{A: []int{3, 20}, HB: &BoxDef{-6, -120, 64, 94}, Dmg: 9.8 * f.Power(), BK: 6.4, KS: .22, Ang: -78, Fx: "sword"}}}
		}
		f.VY = -14.5
		if f.IsFloatZoner() { f.VY = -14.8 }
		if dir != 0 { f.VX = float64(dir) * 5.2 }
		f.On, f.Floating, f.FastFall = false, false, false
		f.SquashX, f.SquashY = .78, 1.28
	}
	sp := spec.Sp
	if spec.Balanced && spec.K == "h" && spec.MoveKind != "" && f.ProjectileCD > 0 { sp = nil }
	spec.Sp = sp
	spec.MoveKind = mk
	spec.Heavy = spec.Heavy || heavy
	spec.K = "l"
	if heavy { spec.K = "h" }
	spec.Individual = source.Individual
	spec.DownSpecial = heavy && m.CurInput(f).Down
	if source.Effect == "hover" { spec.Dur = 120 }
	if spec.Dur <= 0 { spec.Dur = 20 }
	f.MoveKind = mk
	f.Atk = &ActiveAtk{Spec: &spec, Hits: map[string]bool{}, Baseline: spec.Dur}
	if source.Launch != nil && !source.Balanced {
		f.On, f.UpSpecUsed, f.FastFall = false, true, false
		f.VY = source.Launch.VY
		f.VX = source.Launch.VX * float64(f.Face)
	}
	if spec.Effect == "rage" { f.Rage = 300 }
	if spec.Effect == "seal" || spec.Effect == "barrier" {
		life := 150
		if spec.Effect == "seal" { life = Data().Limits.FieldLifetime }
		f.Field = &Field{Kind: spec.Effect, Rect: Rect{X: f.CX() - 32, Y: m.Main.Y - 8, W: 64, H: 8}, Life: life, FloorY: m.Main.Y}
		if spec.Effect == "barrier" { f.Field = &Field{Kind: "barrier", Rect: Rect{X: f.CX() + float64(f.Face)*48 - 5, Y: f.Y - 10, W: 10, H: f.H + 20}, Life: 150} }
	}
}

func (m *Match) CurInput(f *Fighter) Input { return f.Cur }

func (m *Match) advanceAttack(f *Fighter) {
	a := f.Atk
	if a == nil { return }
	a.T++
	sp := a.Spec
	t := a.T
	if sp.Balanced && sp.Frames != nil && t == sp.Frames.Startup+1 {
		if sp.Launch != nil {
			f.On, f.UpSpecUsed, f.FastFall = false, true, false
			f.VY = sp.Launch.VY
			f.VX = sp.Launch.VX * float64(f.Face)
		}
		if sp.Effect == "seal" || sp.Effect == "barrier" {
			life := Data().Limits.FieldLifetime
			if sp.Effect == "barrier" { life = 150 }
			f.Field = &Field{Kind: sp.Effect, Rect: Rect{X: f.CX() - 32, Y: m.Main.Y - 8, W: 64, H: 8}, Life: life, FloorY: m.Main.Y}
		}
	}
	a.Armor = false
	for _, p := range sp.Ph { if p.Armor && t >= p.A[0] && t <= p.A[1] { a.Armor = true } }
	if sp.Hop != nil && t == sp.Hop.T { f.VY = sp.Hop.VY; f.On = false; f.Pl = nil }
	for _, s := range sp.Sp {
		if s.T != t { continue }
		if sp.Balanced && sp.K == "h" && sp.MoveKind == "sig" && !sp.DownSpecial { f.ProjectileCD = Data().Limits.ProjectileCooldown }
		travelDir := f.Face
		if s.P.Back { travelDir = -f.Face }
		x := f.CX() + s.P.FX*float64(travelDir)
		if travelDir < 0 { x = f.CX() - s.P.FX - s.P.W }
		m.addProjectile(&Projectile{X: x, Y: f.Y+f.H+s.P.Y, W: s.P.W, H: s.P.H,
			VX: s.P.VX*float64(travelDir), VY: s.P.VY, Bounces: s.P.Bounces, Life: s.P.Life,
			Kind: s.P.Kind, Dir: travelDir, Owner: f.Slot, Dmg: s.P.Dmg, BK: s.P.BK, KS: s.P.KS, Ang: s.P.Ang})
	}
	for idx, p := range sp.Ph {
		if t < p.A[0] || t > p.A[1] || p.HB == nil { continue }
		if p.MV != nil && *p.MV >= 0 { f.VX = float64(f.Face) * *p.MV }
		rect := f.hitRect(*p.HB)
		if p.Fx == "saw" && m.Tick%3 == 0 { m.burst(f.CX()+float64(f.Face)*40, f.Y+40, "#ffd23f", 2, 3, 12, "spark") }
		if p.Fx == "sword" && m.Tick%2 == 0 { m.burst(f.CX()+float64(f.Face)*40, f.Y+30, "#e2e8f0", 2, 2, 10, "spark") }
		key := fmt.Sprintf("%d:%d", idx, 0)
		if p.Every > 0 { key = fmt.Sprintf("%d:%d", idx, int(math.Floor(float64(t-p.A[0])/float64(p.Every)))) }
		m.Strikes = append(m.Strikes, Strike{X: rect.X, Y: rect.Y, W: rect.W, H: rect.H,
			Color: f.D.Palette.Base, Highlight: f.D.Palette.Highlight,
			Direction: f.Face, Weapon: f.D.WeaponType})
		for _, o := range m.Fighters {
			if o == f || o.Dead > 0 || o.Stocks <= 0 { continue }
			k := key
			if m.Capacity > 2 { k = fmt.Sprintf("%s:%d", key, o.Slot) }
			if a.Hits[k] || !overlaps(rect, o.Rect()) { continue }
			dir := f.Face
			if sp.MoveKind == "bair" { dir = -f.Face }
			boost := 1.0
			if f.Wpn > 0 && f.WeaponKind == "case" && sp.K == "l" { boost = 1.35 }
			ds := damageSpec{Dmg: (p.Dmg) * boost, BK: p.BK, KS: p.KS, Ang: p.Ang,
				Heavy: sp.Heavy && p.Every == 0, Every: p.Every > 0, Pierce: p.Pierce}
			if ds.Ang == 0 { ds.Ang = -25 }
			if ds.BK == 0 { ds.BK = 3 }
			if ds.KS == 0 { ds.KS = .1 }
			if m.hurt(o, f, ds, dir, "melee", &rect) { a.Hits[k] = true }
		}
	}
	if !sp.Balanced && !a.Whiff && f.IsAgile() && sp.K == "h" && sp.MoveKind == "sig" && t == a.Baseline-6 {
		a.Whiff = true
		if len(a.Hits) == 0 { sp.Dur += 6 }
	}
	if !sp.Individual && t >= sp.Dur { f.Atk = nil; f.MoveKind = "" }
}

func (f *Fighter) hitRect(hb BoxDef) Rect {
	w := hb.W
	if f.Wpn > 0 && f.WeaponKind == "case" { w *= 1.35 }
	x := f.CX() + hb.FX*float64(f.Face)
	if f.Face < 0 { x = f.CX() - hb.FX - w }
	y := f.Y + f.H + hb.Y
	return Rect{x, y, w, hb.H}
}

func (m *Match) resolveIndividualStrikes() {
	type hit struct{ fn func() }
	var pending []hit
	for _, f := range m.Fighters {
		a := f.Atk
		if a == nil || !a.Spec.Individual || f.Dead > 0 { continue }
		for idx, p := range a.Spec.Ph {
			if p.HB == nil || a.T < p.A[0] || a.T > p.A[1] { continue }
			boost := 1.0
			if a.Spec.K == "l" && f.Wpn > 0 && f.WeaponKind == "case" { boost = 1.35 }
			box := f.hitRect(*p.HB)
			progress := float64(a.T-p.A[0]+1) / float64(maxInt(1, p.A[1]-p.A[0]+1))
			box.W *= .75 + .25*math.Sin(progress*math.Pi)
			ds := damageSpec{Dmg: p.Dmg * boost, BK: p.BK, KS: p.KS, Ang: p.Ang, Heavy: a.Spec.Heavy, Pierce: p.Pierce}
			if ds.BK == 0 { ds.BK = 3 }
			if ds.KS == 0 { ds.KS = .12 }
			if ds.Ang == 0 { ds.Ang = -30 }
			for _, o := range m.Fighters {
				if o == f || o.Dead > 0 || o.Stocks <= 0 { continue }
				key := fmt.Sprintf("%d", idx)
				if m.Capacity > 2 { key = fmt.Sprintf("%d:%d", idx, o.Slot) }
				if a.Hits[key] { continue }
				if !overlaps(box, o.Rect()) { continue }
				target := &box
				a2 := a
				o2 := o
				pending = append(pending, hit{fn: func() {
					if m.hurt(o2, f, ds, f.Face, "melee", target) { a2.Hits[key] = true }
				}})
			}
		}
	}
	for _, h := range pending { h.fn() }
}

func (m *Match) hurt(f, o *Fighter, d damageSpec, dir int, source string, contact *Rect) bool {
	if f.Inv > 0 || f.Dead > 0 { return false }
	if f.Atk != nil && f.Atk.Spec.Effect == "hover" && !d.Ult && !d.Pierce {
		fr := f.Atk.Spec.Frames
		if fr == nil || (f.Atk.T > fr.Startup && f.Atk.T <= fr.Startup+fr.Active) { return false }
	}
	if f.Atk != nil && f.Atk.Spec.Effect == "testudo" && source == "melee" && o != nil && !d.Pierce {
		f.Atk = nil
		m.hurt(o, f, damageSpec{Dmg: 8, BK: 6, KS: .14, Ang: -38}, -dir, "melee", nil)
		return true
	}
	if f.Rage > 0 && contact != nil && dir == f.Face {
		d.Dmg *= 2
	}
	if f.Atk != nil && f.Atk.Armor && !f.Atk.AR && !d.Ult && (!f.Atk.Spec.Tank || d.Dmg <= float64(Data().Limits.TankArmorDamage)) {
		f.Atk.AR = true
		f.Pct += d.Dmg * .5
		f.HitFlash = 10
		m.sound("heavy")
		m.Shake = math.Max(m.Shake, 6)
		m.burst(f.CX(), f.Y+f.H*.46, "#ffd700", 14, 0, 0, "")
		return true
	}
	applied := d.Dmg
	if o != nil {
		if o.CT <= 0 && f.Stun <= 0 { o.Combo = 0 }
		o.Combo++
		o.CT, o.CTMax = 110, 110
		o.MaxCombo = int(math.Max(float64(o.MaxCombo), float64(o.Combo)))
		f.LastAttacker = o.Slot
		mult := m.comboMult(o.Combo)
		if d.Ult && o.Balance { mult = 1 }
		applied *= mult
		o.DamageDealt += applied
		if o.Combo >= 2 { m.pushFloat(fmt.Sprintf("%d HITS! ×%.2f", o.Combo, mult), f.CX(), f.Y-16, 52) }
	}
	if !d.Ult {
		f.Vote = math.Min(100, f.Vote+5*m.Cfg.VoteGain*f.D.Balance.Vote)
		if o != nil {
			v := 8.0
			if d.Heavy { v = 15 } else if d.Every { v = 3 }
			o.Vote = math.Min(100, o.Vote+v*m.Cfg.VoteGain*o.D.Balance.Vote)
		}
	}
	f.Pct += applied
	f.HitFlash = 14
	f.SquashX, f.SquashY = 1.28, .76
	f.Floating, f.FastFall = false, false
	kb := (d.BK + f.Pct*d.KS/f.Weight()) * m.Cfg.Knockback
	if o != nil && o.Rage > 0 { kb *= 1.55 }
	rad := d.Ang * math.Pi / 180
	vx, vy := math.Cos(rad)*kb*float64(dir), math.Sin(rad)*kb
	f.Atk = nil
	f.DashT = 0
	f.Stun = int(clamp(math.Round(10+kb*1.85), 10, 58))
	f.MaxStun = f.Stun
	f.Face = -dir
	if vy < 0 { f.On = false; f.Pl = nil }
	if d.Hold {
		f.Stun = 30
		f.MaxStun = f.Stun
		f.VX, f.VY = 0, 0
	} else { f.VX, f.VY = vx, vy }
	if m.Cfg.Hitstop { m.Freeze = 2; if d.Heavy { m.Freeze = 4 } }
	m.Shake = math.Max(m.Shake, 3.5)
	if d.Heavy { m.Shake = math.Max(m.Shake, 10) }
	m.sound("hit")
	m.burst(f.CX(), f.Y+f.H*.5, "#ffd23f", 10, 0, 0, "")
	mood := "calm"
	if d.Ult { mood = "ult" } else if d.Heavy { mood = "heavy" }
	m.crowdReaction(mood, f.CX(), 24, 70)
	return true
}

func (m *Match) comboMult(n int) float64 { return 1 + math.Min(.6, math.Max(0, float64(n-1)*.08)) }

func (m *Match) triggerKO(f *Fighter, attacker int) {
	m.burst(f.CX(), f.Y+f.H*.48, "#fff", 56, 10, 30, "")
	m.sound("ko")
	m.crowdReaction("win", f.CX(), 38, 96)
	m.Shake = 22
	if m.Cfg.Hitstop { m.Freeze = 6 }
	if m.Mode != "training" {
		f.Stocks--
		if f.Stocks <= 0 && m.Capacity > 2 { m.Eliminated = append(m.Eliminated, f.Slot) }
	} else { f.Stocks = 99 }
	// El renderer ya dibuja el "KO!" definitivo cuando hay ganador; el banner
	// solo se usa para KOs parciales (evita texto duplicado).
	if f.Stocks > 0 { m.banner("KO!", 48) }
	if attacker >= 0 && attacker < len(m.Fighters) { m.Fighters[attacker].KOsDelivered++ }
	f.Field, f.Rage, f.SpeedTime = nil, 0, 0
	f.KOVisual = &KOVis{X: clamp(f.CX(), m.Main.X+50, m.Main.X+m.Main.W-50), Tick: int(m.Tick)}
	f.Dead = 75
	if f.Stocks <= 0 { f.Dead = 9999 }
	f.Atk = nil
	f.X, f.Y = -999, -999
}

func (m *Match) updateProjectiles() {
	for i := len(m.Projectiles) - 1; i >= 0; i-- {
		p := m.Projectiles[i]
		prevY := p.Y
		p.X += p.VX
		p.Y += p.VY
		if (p.Kind == "orb" && p.Bounces == 0) || p.Kind == "arco" { p.VY += .24 }
		if p.Kind == "throw" { p.VY += .35 }
		if (p.Kind == "pulse" || p.Kind == "orb") && p.Bounces > 0 {
			p.VY += .24
			hitMain := p.VY >= 0 && p.Y+p.H >= m.Main.Y && prevY+p.H <= m.Main.Y+8 && p.X+p.W > m.Main.X && p.X < m.Main.X+m.Main.W
			var py float64
			if hitMain { py = m.Main.Y } else if p.VY >= 0 {
				for _, pl := range m.Plats {
					if p.Y+p.H >= pl.Y && prevY+p.H <= pl.Y+8 && p.X+p.W > pl.X && p.X < pl.X+pl.W { py = pl.Y; break }
				}
			}
			if py > 0 {
				p.Y = py - p.H; p.VY = -5.8; p.Bounces--
				m.burst(p.X, p.Y, "#fff", 4, 3, 12, "")
			}
		}
		p.Life--
		for _, u := range m.UltEffects {
			if u.Specialized == nil || u.F == p.Owner || !u.Specialized.Active { continue }
			if hasFlag(u, "clear") || hasFlag(u, "reflect") {
				if hasFlag(u, "reflect") {
					p.Owner = u.F; p.VX = -p.VX; p.Dir = -p.Dir
					p.OwnerColor = u.Spec.Colors[0]; p.OwnerHighlight = u.Spec.Colors[1]
					p.Hit = 0; p.Done = map[int]bool{}
					u.Specialized.Triggered = true; u.T = 0
				} else {
					m.Projectiles = append(m.Projectiles[:i], m.Projectiles[i+1:]...)
				}
				break
			}
		}
		if i >= len(m.Projectiles) || m.Projectiles[i] != p { continue }
		blocked := false
		for _, o := range m.Fighters {
			if o.Slot == p.Owner || o.Dead > 0 || o.Stocks <= 0 { continue }
			if (o.Field != nil && o.Field.Kind == "barrier" && overlaps(Rect{p.X, p.Y, p.W, p.H}, o.Field.Rect)) ||
				(o.Atk != nil && o.Atk.Spec.Effect == "testudo" && overlaps(Rect{p.X, p.Y, p.W, p.H}, o.Rect())) {
				blocked = true; break
			}
		}
		if blocked { m.Projectiles = append(m.Projectiles[:i], m.Projectiles[i+1:]...); continue }
		if p.Hit == 0 {
			for _, o := range m.Fighters {
				if o.Slot == p.Owner || o.Dead > 0 || o.Stocks <= 0 || p.Done[o.Slot] { continue }
				if !overlaps(Rect{p.X, p.Y, p.W, p.H}, o.Rect()) { continue }
				var attacker *Fighter
				if p.Owner >= 0 && p.Owner < len(m.Fighters) { attacker = m.Fighters[p.Owner] }
				if m.hurt(o, attacker, damageSpec{Dmg: p.Dmg, BK: p.BK, KS: p.KS, Ang: p.Ang, Heavy: p.Heavy}, p.Dir, "projectile", &Rect{p.X, p.Y, p.W, p.H}) {
					p.Done[o.Slot] = true
					if p.Kind != "wall" && p.Kind != "bars" { p.Life = 0 }
					break
				}
			}
		}
		if p.Life <= 0 || p.X < m.Blast.L+60 || p.X > m.Blast.R-60 || p.Y > m.Blast.B-60 {
			m.Projectiles = append(m.Projectiles[:i], m.Projectiles[i+1:]...)
		}
	}
}

func (m *Match) updateItems() {
	rate := map[string]int{"off": 0, "normal": 660, "chaos": 260}[m.Cfg.Items]
	if rate > 0 && m.Tick > 0 && int(m.Tick)%rate == 0 && len(m.Items) < 3 {
		kinds := []string{"mg", "rocket", "case"}
		kind := kinds[m.RNG.Int(3)]
		m.Items = append(m.Items, &Item{X: m.Main.X + 80 + m.RNG.Float()*(m.Main.W-160), Y: -30, W: 26, H: 20, Kind: kind})
	}
	for _, it := range m.Items {
		if it.Y+it.H < m.Main.Y {
			it.VY = math.Min(it.VY+.3, 5)
			it.Y += it.VY
			if it.Y+it.H >= m.Main.Y { it.Y = m.Main.Y - it.H }
		}
	}
}
