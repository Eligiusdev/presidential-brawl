package sim

import "testing"

func tagFixture(t *testing.T) *Match {
	t.Helper()
	cfg := DefaultConfig()
	cfg.Hazard, cfg.Items, cfg.Hitstop = "off", "off", false
	m, err := NewTagMatch([2][3]string{
		{"bolivar", "aquiles", "lincoln"},
		{"aquiles", "bolivar", "washington"},
	}, 0, 43, cfg)
	if err != nil {
		t.Fatal(err)
	}
	return m
}

func TestTagCoreParity(t *testing.T) {
	m := tagFixture(t)
	first := m.Fighters[0]
	m.applyTagDamage(first, 30)
	team := &m.Tag.Teams[0]
	if team.Members[0].Health != 700 || team.Members[0].BlueHealth != 100 {
		t.Fatal("damage did not split into permanent and recoverable health")
	}
	m.Step([][]string{{"assist1", "right"}, nil})
	if first.ID != "aquiles" || first.Slot != 0 || len(m.Fighters) != 2 {
		t.Fatal("tag did not preserve the player seat")
	}
	m.Step(nil)
	m.Step([][]string{{"assist1"}, {"assist2"}})
	wire, err := m.MarshalCheckpoint()
	if err != nil {
		t.Fatal(err)
	}
	local := m.Save()
	decoded, err := DecodeCheckpoint(wire)
	if err != nil {
		t.Fatal(err)
	}
	replay := func() string {
		for range 11 {
			m.Step(nil)
		}
		left, right := m.Tag.Teams[0], m.Tag.Teams[1]
		if left.AssistTicks == 0 || right.AssistTicks == 0 ||
			left.Members[0].AssistCDTicks == 0 || right.Members[2].AssistCDTicks == 0 ||
			left.Members[0].Health <= 700 || len(m.Projectiles) < 2 {
			t.Fatal("simultaneous assists or reserve recovery failed")
		}
		return hashMatch(t, m)
	}
	want := replay()
	for _, checkpoint := range []Checkpoint{local, decoded} {
		if !m.Restore(checkpoint) || replay() != want {
			t.Fatal("tag rollback diverged")
		}
	}
	t.Logf("tag-hash=%s", want)
}

func TestTagEliminationAndClock(t *testing.T) {
	m := tagFixture(t)
	f := m.Fighters[0]
	for i := range 3 {
		m.applyTagDamage(f, 1000)
		m.Step(nil)
		if f.Stocks != 2-i {
			t.Fatalf("unexpected stocks after KO: %d", f.Stocks)
		}
		if i < 2 {
			f.Dead = 1
			m.Step(nil)
			if f.ID != m.Tag.Teams[0].Members[i+1].FighterID {
				t.Fatal("wrong replacement")
			}
		}
	}
	if m.WinnerPi == nil || *m.WinnerPi != 1 {
		t.Fatal("team extinction did not end the match")
	}

	m = tagFixture(t)
	m.applyTagDamage(m.Fighters[1], 1)
	m.Tick = TagRoundTicks - 1
	m.Step(nil)
	if m.WinnerPi == nil || *m.WinnerPi != 0 {
		t.Fatal("clock did not use total team health")
	}
}
