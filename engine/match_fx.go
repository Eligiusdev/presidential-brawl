package sim

import "math"

func (m *Match) burst(x, y float64, col string, count int, speed, size float64, shape string) {
	if count <= 0 { return }
	// Todas las coordenadas son de mundo (las mismas que usa el renderer con sx/sy).
	x = clamp(x, -200, Data().World.W+200)
	y = clamp(y, -200, Data().World.H+200)
	if size < 3 { size = 3 }
	for i := 0; i < count; i++ {
		ang := m.VisRNG.Float() * math.Pi * 2
		sp := speed * (.3 + m.VisRNG.Float()*.7)
		life := int(18 + m.VisRNG.Float()*float64(maxInt(8, int(size))))
		m.Particles = append(m.Particles, Particle{
			X: x, Y: y, VX: math.Cos(ang)*sp, VY: math.Sin(ang)*sp - 1,
			L: life, M: life, Col: col, Z: size, Shape: shape,
			Phase: m.VisRNG.Float() * math.Pi * 2, Spin: (m.VisRNG.Float()-.5)*.4,
		})
	}
}

func (m *Match) pushFloat(text string, x, y float64, life int) {
	m.FloatTexts = append(m.FloatTexts, FloatText{T: text, X: x, Y: y, L: life, M: life})
}

func (m *Match) banner(text string, life int) {
	m.BannerMsg = FloatText{T: text, L: life, M: life}
}

func (m *Match) crowdReaction(mood string, x float64, count, life int) {
	boost := map[string]float64{"calm": .05, "hype": .28, "heavy": .56, "ult": .85, "win": 1}[mood]
	m.Crowd.Excitement = math.Min(1, math.Max(m.Crowd.Excitement, boost)+.05)
	if mood == "hype" { m.Crowd.Excitement = math.Min(1, m.Crowd.Excitement+.1) }
	m.Crowd.Mood = mood
	m.Crowd.CheerTimer = int(math.Max(float64(m.Crowd.CheerTimer), float64(life)))
	if len(m.CrowdParticles) > 260 { return }
	kinds := []string{"confetti", "flash", "cheer", "pennant"}
	for i := 0; i < count && len(m.CrowdParticles) < 260; i++ {
		kind := kinds[m.VisRNG.Int(len(kinds))]
		c := m.Crowd.AccentColor
		if i%3 == 0 { c = m.Crowd.AccentHighlight }
		m.CrowdParticles = append(m.CrowdParticles, CrowdParticle{
			X: x + (m.VisRNG.Float()-.5)*180, Y: m.Main.Y-20-m.VisRNG.Float()*100,
			VX: (m.VisRNG.Float()-.5)*3, VY: -m.VisRNG.Float()*2,
			L: life, M: life, Col: c, Kind: kind,
			Size: 3 + m.VisRNG.Float()*6, Phase: m.VisRNG.Float()*math.Pi*2,
			Spin: (m.VisRNG.Float()-.5)*.3,
		})
	}
}

func (m *Match) stepParticles() {
	var next []Particle
	for _, p := range m.Particles {
		p.L--
		if p.L <= 0 { continue }
		p.VX *= .96
		p.VY *= .96
		if p.Shape == "shell" || p.Shape == "mag" {
			p.VY += .4
			if p.Y > m.Main.Y { p.Y = m.Main.Y; p.VY *= -.45 }
		} else if p.Ex {
			p.VY = p.VY*.96 - .03
		} else {
			p.VY += .035
		}
		p.X += p.VX
		p.Y += p.VY
		next = append(next, p)
	}
	m.Particles = next
	if len(m.Particles) > 480 { m.Particles = m.Particles[len(m.Particles)-480:] }
}

func (m *Match) stepCrowd() {
	var next []CrowdParticle
	for _, p := range m.CrowdParticles {
		p.L--
		if p.L <= 0 { continue }
		p.X += p.VX + math.Sin(float64(m.Tick)*.16+p.Phase)*.6
		p.Y += p.VY
		p.VY += .02
		next = append(next, p)
	}
	m.CrowdParticles = next
	if m.Crowd.CheerTimer > 0 { m.Crowd.CheerTimer-- }
	m.Crowd.Excitement = math.Max(.08, m.Crowd.Excitement*.992)
	if m.Crowd.Excitement < .25 && m.Crowd.Mood != "calm" { m.Crowd.Mood = "calm" }
	if m.Tick%75 == 0 && m.Crowd.Excitement > .35 {
		m.CrowdParticles = append(m.CrowdParticles, CrowdParticle{X: m.Main.X + m.VisRNG.Float()*m.Main.W,
			Y: m.Main.Y-30, L: 12, M: 12, Col: "#ffffff", Kind: "flash", Size: 6})
	}
}

func (m *Match) stepFloatTexts() {
	var next []FloatText
	for _, t := range m.FloatTexts {
		t.L--
		if t.L > 0 { next = append(next, t) }
	}
	m.FloatTexts = next
	if m.BannerMsg.L > 0 { m.BannerMsg.L-- }
}

func (m *Match) hazardColumn(hazard string, elapsed int) []float64 {
	w := Data().World.W
	switch hazard {
	case "scanner": return []float64{w/2 + math.Sin(float64(m.Tick)*.035)*470}
	case "street-lamps":
		if (elapsed/70)%2 == 1 { return []float64{w * .68} }
		return []float64{w * .32}
	case "central-updraft": return []float64{w / 2}
	case "thermal-columns": return []float64{w * .28, w * .72}
	}
	return nil
}

func (m *Match) updateStageHazards() {
	for i := range m.Plats {
		p := &m.Plats[i]
		if p.Amp != 0 {
			p.Y = p.OriginalY() + math.Sin(float64(m.Tick)/50+p.Ph)*p.Amp
		}
	}
	cycle := m.hazardCycle()
	m.HZMod = int(m.Tick) % cycle
	if m.Cfg.Hazard == "off" { m.HZPhase = 0; return }
	mod := m.HZMod
	if mod >= cycle-120 { m.HZPhase = 1 } else if m.Tick >= uint32(cycle) && mod < stageData(m.Stage).HazardDur { m.HZPhase = 2 } else { m.HZPhase = 0 }
	st := stageData(m.Stage)
	if st.Hazard == "lifts" {
		envelope := 0.0
		if m.HZPhase == 2 {
			envelope = math.Min(1, math.Min(float64(mod)/36, float64(st.HazardDur-mod)/36))
		}
		for i := range m.Plats {
			if i == 0 || i == len(m.Plats)-1 {
				base := m.Plats[i].OriginalY()
				sign := -1.0
				if i != 0 { sign = 1 }
				m.Plats[i].Y = base + math.Sin(float64(mod)*.025)*envelope*59*sign
			}
		}
	}
	if m.HZPhase == 0 { return }
	if m.HZPhase != 2 { return }
	for _, f := range m.Fighters {
		if f.Dead > 0 || f.Stocks <= 0 { continue }
		nudge := func(dx float64) {
			test := Rect{f.X + dx, f.Y, f.W, f.H}
			if !overlaps(test, m.Main) { f.X += dx }
		}
		w := Data().World.W
		switch st.Hazard {
		case "edge-volley":
			if mod%88 == 0 { m.wave(24, m.Main.Y-36, 1, 8.5); m.wave(w-58, m.Main.Y-36, -1, 8.5) }
		case "alternating-salvo":
			if mod%58 == 0 {
				side := 1
				if (mod/58)%2 == 1 { side = -1 }
				h := 38.0
				if side < 0 { h = 145 }
				m.wave(w-58, m.Main.Y-h, side, 10)
			}
		case "guard-march":
			if mod%96 == 0 {
				side := 1
				if (mod/96)%2 == 1 { side = -1 }
				m.wave(w-58, m.Main.Y-39, side, 8)
				m.wave(w-58, m.Main.Y-127, side, 7)
			}
		case "bell":
			if mod%82 == 0 {
				m.wave(w/2+24, m.Main.Y-40, 1, 9.5)
				m.wave(w/2-54, m.Main.Y-40, -1, 9.5)
			}
		case "crosswind", "mountain-gust":
			side := 1
			if (mod/88)%2 == 1 { side = -1 }
			if st.Hazard == "crosswind" { nudge(float64(side) * 1.35) } else { nudge(float64(side) * 1.28) }
		case "low-gravity": m.GravityFactor = .58
		case "central-updraft", "thermal-columns":
			for _, col := range m.hazardColumn(st.Hazard, mod) {
				half := 145.0
				if st.Hazard == "thermal-columns" { half = 86 }
				if !f.On && f.VY > -8 && math.Abs(f.CX()-col) < half { f.VY = math.Max(-8, f.VY-.71) }
			}
		case "scanner", "street-lamps":
			pulse := mod%35 == 0
			if st.Hazard == "street-lamps" { pulse = mod%70 == 44 }
			if pulse {
				for _, col := range m.hazardColumn(st.Hazard, mod) {
					half := 34.0
					if st.Hazard == "street-lamps" { half = 66 }
					if math.Abs(f.CX()-col) < half {
						dir := 1
						if f.CX() < col { dir = -1 }
						m.hurt(f, nil, damageSpec{Dmg: 5, BK: 4.5, KS: .12, Ang: -70, Heavy: true}, dir, "hazard", nil)
					}
				}
			}
		}
	}
}

func (m *Match) wave(x, y float64, dir int, speed float64) {
	m.addProjectile(&Projectile{X: x, Y: y, W: 34, H: 28, VX: float64(dir)*speed,
		Life: 158, Kind: "sonic", Dir: dir, Dmg: 7, BK: 4.8, KS: .16, Ang: -52, Heavy: true})
	m.burst(x+17, y+14, stageData(m.Stage).Palette["platformTrim"], 8, 4, 0, "")
}

func (p *PlatformDef) OriginalY() float64 {
	if p.BaseY != 0 { return p.BaseY }
	return p.Y
}
