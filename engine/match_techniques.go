package sim

const (
	chainMedium     uint8 = 2
	chainHeavy      uint8 = 3
	chainSpecial    uint8 = 4
	reflectRecovery       = 20
	reflectActive         = 6
)

func (m *Match) techniqueActions(f *Fighter, just InputEdge, dir int) bool {
	if just.Medium {
		f.ChainMove = chainMedium
	} else if just.Special {
		f.ChainMove = chainSpecial
	} else if just.Heavy && f.Atk != nil {
		f.ChainMove = chainHeavy
	} else if f.ChainMove == 0 {
		return false
	}
	if just.Medium || just.Special || (just.Heavy && f.Atk != nil) {
		f.ChainTicks = 7
	}

	if f.Atk == nil && just.Special && dir != 0 && f.DashT == 0 {
		if target := m.aliveOpponent(f); target != nil && target.Stocks > 0 && target.Dead == 0 && (target.CX()-f.CX())*float64(dir) < 0 {
			f.ReflectFace, f.ReflectTicks = -dir, reflectRecovery
			f.ChainMove, f.ChainTicks = 0, 0
			f.VX = 0
			m.sound("dash")
			return true
		}
	}
	if f.DashT > 0 {
		return false
	}
	if atk := f.Atk; atk != nil {
		if len(atk.Hits) == 0 || attackChainRank(atk) >= f.ChainMove {
			return false
		}
	} else if f.ChainMove == chainHeavy {
		return false
	}
	switch f.ChainMove {
	case chainMedium:
		move := moveData("medium", []int{5, 11}, &BoxDef{8, -80, 62, 50}, 6*f.Power(), 3, .09, -25, 21)
		m.startAttack(f, move, "medium", false, dir, false)
	case chainHeavy:
		move := f.Move("neutral")
		if move == nil {
			return false
		}
		m.startAttack(f, move, "sig", true, dir, false)
	case chainSpecial:
		m.startAttack(f, &MoveData{Name: "energy", Dur: 21}, "energy", false, dir, false)
	default:
		return false
	}
	f.ChainMove, f.ChainTicks = 0, 0
	return true
}

func attackChainRank(atk *ActiveAtk) uint8 {
	switch {
	case atk.Spec.MoveKind == "energy":
		return chainSpecial
	case atk.Spec.Heavy:
		return chainHeavy
	case atk.Spec.MoveKind == "medium":
		return chainMedium
	default:
		return 1
	}
}

func (f *Fighter) canReflect(incoming int) bool {
	return f.ReflectTicks > reflectRecovery-reflectActive && f.Stun == 0 &&
		incoming != 0 && incoming == -f.ReflectFace
}

func (m *Match) reflectCue(f *Fighter) {
	f.ReflectTicks = 8
	m.burst(f.CX(), f.CY(), "#78eaff", 9, 4, 17, "spark")
	m.sound("heavy")
}
