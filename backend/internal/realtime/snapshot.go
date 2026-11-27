package realtime

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"io"
	"sync"

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
		Tick:         snap.Tick,
		Stage:        int32(snap.Stage),
		SnapshotJson: payload,
	})
}

var snapshotGzip = sync.Pool{New: func() any {
	writer, _ := gzip.NewWriterLevel(io.Discard, gzip.BestSpeed)
	return writer
}}

// A compressed snapshot is independently decodable after a skipped frame.
func compactSnapshot(frame []byte) []byte {
	if len(frame) < 2048 {
		return frame
	}
	var out bytes.Buffer
	writer := snapshotGzip.Get().(*gzip.Writer)
	writer.Reset(&out)
	_, writeErr := writer.Write(frame)
	closeErr := writer.Close()
	writer.Reset(io.Discard)
	snapshotGzip.Put(writer)
	if writeErr != nil || closeErr != nil || out.Len() >= len(frame) {
		return frame
	}
	return out.Bytes()
}
