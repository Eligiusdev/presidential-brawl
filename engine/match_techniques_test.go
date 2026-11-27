package sim

import "testing"

func TestTechniqueChainAndReflect(t *testing.T) {
	m := rollbackMatch(t, 2)
	f, o := m.Fighters[0], m.Fighters[1]
	f.X, o.X = 600, 650
	m.startAttack(f, f.Move("jab"), "jab", false, 0, false)
	if m.techniqueActions(f, InputEdge{Medium: true}, 0) {
		t.Fatal("cancelled an attack before contact")
	}
	f.Atk.Hits["0"] = true
	if !m.techniqueActions(f, InputEdge{}, 0) || f.Atk.Spec.MoveKind != "medium" {
		t.Fatal("buffered medium failed to cancel a confirmed light")
	}
	f.Atk.Hits["0"] = true
	if !m.techniqueActions(f, InputEdge{Heavy: true}, 0) || !f.Atk.Spec.Heavy {
		t.Fatal("confirmed medium failed to cancel into heavy")
	}
	f.Atk.Hits["0"] = true
	if !m.techniqueActions(f, InputEdge{Special: true}, 0) || f.Atk.Spec.MoveKind != "energy" {
		t.Fatal("confirmed heavy failed to cancel into the pulse")
	}
	f.Atk = nil
	if !m.techniqueActions(f, InputEdge{Special: true}, -1) || !f.canReflect(-1) || f.canReflect(1) {
		t.Fatal("reflect did not cover the incoming side")
	}
	p := &Projectile{X: f.CX(), Y: f.CY(), W: 10, H: 10, VX: -2, Dir: -1, Owner: o.Slot, Life: 15}
	m.addProjectile(p)
	m.updateProjectiles()
	if p.Owner != f.Slot || p.Dir != 1 || p.VX != 2 || f.canReflect(-1) {
		t.Fatal("projectile did not change owners or reflect did not enter recovery")
	}
}

func TestTechniqueCheckpointParity(t *testing.T) {
	for _, size := range []int{2, 8} {
		m := rollbackMatch(t, size)
		m.Fighters[0].X, m.Fighters[1].X = 600, 650
		in := make([][]string, size)
		in[0] = []string{"left", "special"}
		m.Step(in)
		if m.Fighters[0].ReflectTicks == 0 {
			t.Fatal("reflect input did not reach simulation")
		}
		checkpoint := m.Save()
		wire, err := m.MarshalCheckpoint()
		if err != nil {
			t.Fatal(err)
		}
		decoded, err := DecodeCheckpoint(wire)
		if err != nil {
			t.Fatal(err)
		}
		replay := func() string {
			for i := range 60 {
				in[0] = nil
				if i == 24 {
					in[0] = []string{"medium"}
				}
				if i == 52 {
					in[0] = []string{"special"}
				}
				m.Step(in)
			}
			return hashMatch(t, m)
		}
		want := replay()
		for _, saved := range []Checkpoint{checkpoint, decoded} {
			if !m.Restore(saved) || replay() != want {
				t.Fatalf("%d players: technique state diverged after restoring", size)
			}
		}
		t.Logf("technique-hash-%d=%s", size, want)
	}
}
