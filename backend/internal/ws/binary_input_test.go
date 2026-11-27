package ws

import (
	"slices"
	"testing"

	"github.com/presidential-brawl/server/contract"
)

func TestBinaryInputDecoding(t *testing.T) {
	msg, ok := decodeBinaryInput([]byte{42, 0, 0, 0, 18, 1})
	if !ok || msg.Seq != 42 || msg.Type != contract.CInput ||
		!slices.Equal(msg.Actions, []string{"right", "light", "reload"}) {
		t.Fatalf("invalid decoded input: %+v", msg)
	}
	for _, bad := range [][]byte{{42}, {0, 0, 0, 0, 0, 2}, {0, 0, 0, 128, 0, 0}} {
		if _, ok := decodeBinaryInput(bad); ok {
			t.Fatalf("accepted invalid frame %v", bad)
		}
	}
}
