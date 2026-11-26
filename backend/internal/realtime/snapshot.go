package realtime

import (
	"encoding/json"

	"github.com/presidential-brawl/engine"
	pb "github.com/presidential-brawl/server/gen/go"
	"google.golang.org/protobuf/proto"
)

func encodeSnapshotBinary(snap *sim.RichSnapshot) ([]byte, error) {
	payload, err := json.Marshal(snap)
	if err != nil {
		return nil, err
	}
	return proto.Marshal(&pb.Snapshot{
		Tick: snap.Tick,
		Stage: int32(snap.Stage),
		SnapshotJson: payload,
	})
}
