package sim

import (
	"bytes"
	"testing"
)

func TestIdenticalSeedAndInputsProduceIdenticalSnapshots(t *testing.T) {
	newMatch := func() *Match {
		match, err := NewOnlineMatch([]string{"bolivar", "aquiles"}, 0, 53017)
		if err != nil {
			t.Fatal(err)
		}
		return match
	}
	first, second := newMatch(), newMatch()
	for tick := 0; tick < 600; tick++ {
		inputs := [][]string{{}, {}}
		switch tick % 120 {
		case 0, 20:
			inputs = [][]string{{"jump", "right"}, {"left"}}
		case 35, 45:
			inputs = [][]string{{"light"}, {"heavy"}}
		case 65:
			inputs = [][]string{{"dash"}, {"jump", "heavy"}}
		default:
			if tick%120 < 35 {
				inputs = [][]string{{"right"}, {"left"}}
			}
		}
		first.Step(inputs)
		second.Step(inputs)
		if !bytes.Equal(first.SnapshotJSON(), second.SnapshotJSON()) {
			t.Fatalf("visual state diverged at input frame %d", tick)
		}
	}
}
