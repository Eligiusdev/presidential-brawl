package ws

import (
	"encoding/binary"

	"github.com/presidential-brawl/server/contract"
)

// Wire order is shared with frontend/src/network/binaryInput.ts.
var binaryInputActions = [...]string{"left", "right", "jump", "down", "light", "heavy", "dash", "ult", "reload"}

func decodeBinaryInput(frame []byte) (contract.ClientMessage, bool) {
	if len(frame) != 6 {
		return contract.ClientMessage{}, false
	}
	seq := binary.LittleEndian.Uint32(frame)
	mask := binary.LittleEndian.Uint16(frame[4:])
	if seq > 0x7fffffff || mask>>len(binaryInputActions) != 0 {
		return contract.ClientMessage{}, false
	}
	msg := contract.ClientMessage{Type: contract.CInput, Seq: int(seq)}
	for index, action := range binaryInputActions {
		if mask&(1<<index) != 0 {
			msg.Actions = append(msg.Actions, action)
		}
	}
	return msg, true
}
