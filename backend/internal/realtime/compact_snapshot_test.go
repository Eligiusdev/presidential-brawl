package realtime

import (
	"bytes"
	"compress/gzip"
	"io"
	"testing"

	"github.com/presidential-brawl/engine"
)

func TestCompactSnapshotsInEightPlayerCombat(t *testing.T) {
	match, err := sim.NewOnlineMatch([]string{"bolivar", "aquiles", "lincoln", "robinson", "petro", "obama", "musashi", "napoleon"}, 0, 53017)
	if err != nil {
		t.Fatal(err)
	}
	var normal, compact, samples int
	for frame := 0; frame < 240; frame++ {
		inputs := make([][]string, 8)
		for slot := range inputs {
			direction := "right"
			if (slot+frame/35)%2 == 1 {
				direction = "left"
			}
			inputs[slot] = []string{direction, "light"}
			if (frame+slot)%23 == 0 {
				inputs[slot] = []string{direction, "jump", "heavy"}
			}
		}
		match.Step(inputs)
		if frame%2 != 0 {
			continue
		}
		raw, err := encodeSnapshotBinary(match.NetworkSnapshot(make([]int, 8), nil))
		if err != nil {
			t.Fatal(err)
		}
		packed := compactSnapshot(raw)
		reader, err := gzip.NewReader(bytes.NewReader(packed))
		if err != nil {
			t.Fatal(err)
		}
		restored, err := io.ReadAll(reader)
		reader.Close()
		if err != nil || !bytes.Equal(restored, raw) {
			t.Fatal("compressed snapshot changed the authoritative state")
		}
		normal += len(raw)
		compact += len(packed)
		samples++
	}
	t.Logf("%d snapshots, mean payload %d → %d bytes", samples, normal/samples, compact/samples)
	if compact*2 >= normal {
		t.Fatal("expected at least 50% smaller snapshots")
	}
}
