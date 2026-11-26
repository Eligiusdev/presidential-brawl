package sim

import "testing"

func TestBufferedJumpAfterLanding(t *testing.T) {
	m, err := NewOnlineMatch([]string{"bolivar", "aquiles"}, 0, 1)
	if err != nil {
		t.Fatal(err)
	}
	f := m.Fighters[0]
	f.X = m.Main.X + 30
	f.Y = m.Main.Y - f.H - 3
	f.VY = 4
	f.On, f.Pl, f.AirJ = false, nil, 0
	m.updateFighter(f, Input{Jump: true})
	if !f.On || f.JumpBuffer == 0 {
		t.Fatal("jump should remain buffered when landing without an air jump")
	}
	m.updateFighter(f, Input{})
	if f.On || f.VY >= 0 || f.JumpBuffer != 0 {
		t.Fatal("landing should consume the buffered jump")
	}
}

func TestDuelMovesAndRecovery(t *testing.T) {
	m, err := NewOnlineMatch([]string{"bolivar", "aquiles"}, 0, 1)
	if err != nil {
		t.Fatal(err)
	}
	bolivar, aquiles := m.Fighters[0], m.Fighters[1]
	thrust, charge := bolivar.Move("neutral"), aquiles.Move("neutral")
	if thrust.Name != "Estocada del Libertador" || charge.Name != "Carga de los Mirmidones" {
		t.Fatal("expected the duel's generated move data")
	}
	if !charge.Ph[0].Armor || charge.Ph[len(charge.Ph)-1].Armor {
		t.Fatal("shield armor should only cover the first phase")
	}
	if bolivar.Move("up").Launch.VX <= aquiles.Move("up").Launch.VX ||
		bolivar.Move("up").Launch.VY <= aquiles.Move("up").Launch.VY {
		t.Fatal("Bolivar should recover farther forward and Achilles higher")
	}
	m.startAttack(bolivar, thrust, "sig", true, 0, false)
	bolivar.Atk.T = thrust.Frames.Startup + thrust.Frames.Active + 1
	m.updateFighter(bolivar, Input{Dash: true})
	if bolivar.DashCD != 0 {
		t.Fatal("a dash should not cancel attack recovery")
	}
	bolivar.Atk.T = thrust.Dur
	m.updateFighter(bolivar, Input{})
	m.updateFighter(bolivar, Input{Dash: true})
	if bolivar.DashCD == 0 {
		t.Fatal("dash should be available after attack recovery")
	}
}
