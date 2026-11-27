package realtime

import (
	"encoding/json"
	"testing"

	"github.com/presidential-brawl/engine"
	pb "github.com/presidential-brawl/server/gen/go"
	"google.golang.org/protobuf/proto"
)

func TestNetworkSnapshotSharesStateWithoutDuplicatingWorldEntities(t *testing.T) {
	match, err := sim.NewOnlineMatch([]string{"lincoln", "robinson"}, 0, 3)
	if err != nil {
		t.Fatal(err)
	}
	match.Freeze = 1
	match.Step(nil)
	legacy, err := json.Marshal(match.Snapshot())
	if err != nil {
		t.Fatal(err)
	}
	frame, err := encodeSnapshotBinary(match.NetworkSnapshot([]int{-1, 8, -1, 12}, []int{1, 3}))
	if err != nil {
		t.Fatal(err)
	}
	var envelope pb.Snapshot
	if err := proto.Unmarshal(frame, &envelope); err != nil {
		t.Fatal(err)
	}
	var snapshot sim.RichSnapshot
	if err := json.Unmarshal(envelope.SnapshotJson, &snapshot); err != nil {
		t.Fatal(err)
	}
	if snapshot.Frame != 1 || snapshot.Tick != 0 {
		t.Fatal("frame must advance even when hitstop freezes the tick")
	}
	if len(snapshot.Players) != 2 || snapshot.Players[1].PI != 1 ||
		snapshot.Players[1].Slot != 3 || snapshot.Ack[3] != 12 {
		t.Fatal("room seats or input acknowledgements were lost")
	}
	if len(snapshot.World.Fighters) != 0 || !snapshot.World.Rich {
		t.Fatal("fighters should only be sent once, using the rich format")
	}
	t.Logf("initial duel: legacy JSON %d bytes; new protobuf frame %d bytes", len(legacy), len(frame))
	if len(frame) >= len(legacy) {
		t.Fatal("expected smaller frame")
	}
}
