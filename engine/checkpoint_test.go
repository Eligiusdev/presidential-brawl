package sim

import "testing"

func hashMatch(t *testing.T, match *Match) string {
	t.Helper()
	hash, err := match.StateHash()
	if err != nil {
		t.Fatal(err)
	}
	return hash
}

func TestCheckpointIsolation(t *testing.T) {
	match, err := NewOnlineMatch([]string{"bolivar", "aquiles"}, 0, 53017)
	if err != nil {
		t.Fatal(err)
	}
	fighter := match.Fighters[0]
	fighter.Pl = &match.Plats[0]
	fighter.Atk = &ActiveAtk{Spec: fighter.D.Moves.Up, Hits: map[string]bool{"first": true}}
	match.Projectiles = []*Projectile{{Done: map[int]bool{1: true}}}
	match.ReplayKeys = []ReplayKey{{F: 1, P1: []string{"left"}}}
	match.OnEnd = func([]int) { t.Fatal("restore should not invoke callbacks") }

	before := hashMatch(t, match)
	checkpoint := match.Save()
	mutate := func() {
		f := match.Fighters[0]
		f.Atk.Hits["second"] = true
		f.Pl.Y++
		f.Pl.BaseY++
		f.D.Moves.Up = nil
		f.Atk.Spec.Ph[0].A[0]++
		match.Projectiles[0].Done[0] = true
		match.ReplayKeys[0].P1[0] = "right"
		match.RNG.Uint32()
		match.VisRNG.Uint32()
	}
	// Restore first so mutating fighter definitions in the active test match
	// cannot modify the process-wide roster loaded by the engine.
	if !match.Restore(checkpoint) {
		t.Fatal("valid checkpoint rejected")
	}
	for range 2 {
		mutate()
		if hashMatch(t, match) == before {
			t.Fatal("fixture did not change the active state")
		}
		if !match.Restore(checkpoint) || hashMatch(t, match) != before {
			t.Fatal("checkpoint was modified by the active match")
		}
		if match.Fighters[0].Pl != &match.Plats[0] || match.OnEnd == nil {
			t.Fatal("restore lost platform binding or the live callback")
		}
	}
}

func TestRollbackParityFixture(t *testing.T) {
	cfg := DefaultConfig()
	cfg.StartFullVote = true
	cfg.Hazard = "frenetic"
	makeMatch := func() *Match {
		match, err := NewOnlineMatchWithConfig([]string{"bolivar", "aquiles"}, 0, 53017, cfg)
		if err != nil {
			t.Fatal(err)
		}
		return match
	}
	inputs := func(frame int, corrected bool) [][]string {
		var first, second []string
		switch frame % 100 {
		case 0:
			first, second = []string{"right", "jump"}, []string{"left"}
		case 25:
			first, second = []string{"heavy"}, []string{"light"}
		case 55:
			first, second = []string{"dash"}, []string{"ult"}
		default:
			if frame%100 < 30 {
				first, second = []string{"right"}, []string{"left"}
			}
		}
		if frame == 8 && corrected {
			second = []string{"left", "jump"}
		}
		return [][]string{first, second}
	}

	reference, predicted := makeMatch(), makeMatch()
	for frame := 0; frame < 8; frame++ {
		reference.Step(inputs(frame, true))
		predicted.Step(inputs(frame, false))
	}
	checkpoint := predicted.Save()
	for frame := 8; frame < 16; frame++ {
		reference.Step(inputs(frame, true))
		predicted.Step(inputs(frame, false))
	}
	if hashMatch(t, reference) == hashMatch(t, predicted) {
		t.Fatal("late input did not change the predicted timeline")
	}
	if !predicted.Restore(checkpoint) {
		t.Fatal("checkpoint rejected")
	}
	for frame := 8; frame < 750; frame++ {
		if frame >= 16 {
			reference.Step(inputs(frame, true))
		}
		predicted.Step(inputs(frame, true))
		if (frame == 15 || frame == 749 || frame%120 == 119) && hashMatch(t, reference) != hashMatch(t, predicted) {
			t.Fatalf("resimulation diverged at frame %d", frame)
		}
	}
	t.Logf("rollback-hash=%s", hashMatch(t, predicted))
}
