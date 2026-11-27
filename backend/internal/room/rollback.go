package rooms

import (
	"encoding/json"
	"errors"
	"slices"
	"time"

	"github.com/presidential-brawl/engine"
)

// EffectiveInput is what the authoritative simulator received for this step.
// Seq is the acknowledged client sequence, or -1 for neutral server input.
type EffectiveInput struct {
	Seq  int      `json:"seq"`
	Held []string `json:"held"`
}

type ConfirmedFrame struct {
	Frame int              `json:"frame"`
	Slots []EffectiveInput `json:"slots"`
}

type RollbackSync struct {
	SyncRequest int              `json:"syncRequest,omitempty"`
	Type        string           `json:"type"`
	MatchID     int              `json:"matchId"`
	Frame       int              `json:"frame"`
	RoomSlots   []int            `json:"roomSlots"`
	Inputs      []ConfirmedFrame `json:"inputs,omitempty"`
	Held        []EffectiveInput `json:"held,omitempty"`
	Checkpoint  json.RawMessage  `json:"checkpoint,omitempty"`
}

const confirmedHistorySize = 32

type rollbackHistory struct {
	match        *sim.Match
	id           int
	frames       [confirmedHistorySize]ConfirmedFrame
	activeUntil  time.Time
	checkpointAt time.Time
}

// Caller holds the room lock.
func (r *Room) syncHistory() {
	if r.rollback.match != r.Match {
		r.rollback = rollbackHistory{match: r.Match, id: r.rollback.id + 1}
	}
}

// RecordConfirmedLocked records inputs by simulation slot after Match.Step.
func (r *Room) WantsConfirmedInputsLocked(now time.Time) bool {
	return r.rollback.match == r.Match && now.Before(r.rollback.activeUntil)
}

func (r *Room) ClearRollbackLocked() {
	r.rollback = rollbackHistory{id: r.rollback.id}
}

func (r *Room) RecordConfirmedLocked(inputs [][]string, sequences []int) {
	frame := r.Match.Frame
	slots := make([]EffectiveInput, len(inputs))
	for slot, held := range inputs {
		slots[slot] = EffectiveInput{Seq: sequences[slot], Held: slices.Clone(held)}
	}
	r.rollback.frames[frame%confirmedHistorySize] = ConfirmedFrame{Frame: frame, Slots: slots}
}

// RollbackSyncLocked returns recent confirmed inputs, or a replacement
// checkpoint when changing match or when the requested history expired.
func (r *Room) RollbackSyncLocked(matchID int, after *int, allowCheckpoint bool) (RollbackSync, error) {
	r.syncHistory()
	r.rollback.activeUntil = time.Now().Add(2 * time.Second)
	frame := r.Match.Frame
	reply := RollbackSync{Type: "rollbackSync", MatchID: r.rollback.id, Frame: frame, RoomSlots: slices.Clone(r.MatchSlots)}
	if len(reply.RoomSlots) == 0 {
		reply.RoomSlots = make([]int, len(r.Match.Fighters))
		for i := range reply.RoomSlots {
			reply.RoomSlots[i] = i
		}
	}
	if matchID == r.rollback.id && after != nil && *after >= 0 && *after <= frame && frame-*after <= confirmedHistorySize {
		for i := *after + 1; i <= frame; i++ {
			entry := r.rollback.frames[i%confirmedHistorySize]
			if entry.Frame != i {
				reply.Inputs = nil
				break
			}
			reply.Inputs = append(reply.Inputs, entry)
		}
		if len(reply.Inputs) == frame-*after {
			return reply, nil
		}
	}
	now := time.Now()
	if !allowCheckpoint || now.Sub(r.rollback.checkpointAt) < 200*time.Millisecond {
		return RollbackSync{}, errors.New("checkpoint cooling down")
	}
	r.rollback.checkpointAt = now
	var err error
	reply.Checkpoint, err = r.Match.MarshalCheckpoint()
	latest := r.rollback.frames[frame%confirmedHistorySize]
	if latest.Frame == frame {
		reply.Held = latest.Slots
	}
	return reply, err
}
