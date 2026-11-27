package sim

import "testing"

func TestStageProjectilesThreatenBothSeats(t *testing.T) {
	for _, seat := range []int{0, 1} {
		m := rollbackMatch(t, 2)
		m.Cfg.Hazard = "frenetic"
		m.Tick = uint32(m.hazardCycle())
		m.updateStageHazards()
		if len(m.Projectiles) != 2 || m.Projectiles[0].Owner != -1 || m.Projectiles[1].VX >= 0 {
			t.Fatal("cannon volley is not neutral and inward-facing")
		}
		f := m.Fighters[seat]
		f.X, f.Y = m.Projectiles[0].X, m.Projectiles[0].Y
		f.Inv = 0
		m.updateProjectiles()
		if f.Pct == 0 {
			t.Fatalf("cannon missed slot %d", seat)
		}
	}
}

func TestLocalCPURulesSurviveCheckpoint(t *testing.T) {
	m := rollbackMatch(t, 2)
	m.Fighters[1].CPU = true
	if !m.SetLiveRules(3, "off") || m.Fighters[1].Difficulty != 3 || m.SetLiveRules(4, "off") {
		t.Fatal("live CPU rules were not applied or validated")
	}
	m.Fighters[0].X, m.Fighters[1].X = 600, 670
	for range 12 {
		m.Step(nil)
	}
	if m.Fighters[1].AIRNG == 0 {
		t.Fatal("versus CPU did not run")
	}
	checkpoint := m.Save()
	for range 36 {
		m.Step(nil)
	}
	want := hashMatch(t, m)
	m.Restore(checkpoint)
	for range 36 {
		m.Step(nil)
	}
	if hashMatch(t, m) != want {
		t.Fatal("CPU state diverged on replay")
	}
}
