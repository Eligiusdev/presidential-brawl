package rooms

import (
	"testing"

	"github.com/coder/websocket"
)

func TestQueueSnapshotReplacesStaleFrame(t *testing.T) {
	client := &Client{
		snapshots: make(chan snapshotFrame, 1),
		stopped:   make(chan struct{}),
	}

	client.QueueSnapshot(websocket.MessageBinary, []byte("old"))
	client.QueueSnapshot(websocket.MessageBinary, []byte("latest"))

	frame := <-client.snapshots
	if got, want := string(frame.data), "latest"; got != want {
		t.Fatalf("queued snapshot = %q, want %q", got, want)
	}
}
