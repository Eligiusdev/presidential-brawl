package sim

import "slices"

// RollbackFrames bounds both the replay work and the number of retained checkpoints.
const RollbackFrames = 8

type rollbackFrame struct {
	frame     int
	before    Checkpoint
	local     []string
	remote    [][]string
	used      [][]string
	confirmed bool
}

// RollbackTimeline owns a speculative simulation. Frame numbers count calls to
// Step, including hitstop, and are independent of the simulation tick.
type RollbackTimeline struct {
	match            Match
	localSlot        int
	confirmedThrough int
	lastRemote       [][]string
	history          [RollbackFrames]rollbackFrame
}

func NewRollbackTimeline(checkpoint Checkpoint, localSlot int) *RollbackTimeline {
	t := &RollbackTimeline{localSlot: localSlot}
	if !t.Reset(checkpoint, nil) {
		return nil
	}
	return t
}

// Reset applies a full authoritative checkpoint and clears speculative history.
// remote is the authoritative held-input state at that checkpoint.
func (t *RollbackTimeline) Reset(checkpoint Checkpoint, remote [][]string) bool {
	if checkpoint.state == nil || t.localSlot < 0 || t.localSlot >= len(checkpoint.state.Fighters) ||
		(remote != nil && len(remote) != len(checkpoint.state.Fighters)) {
		return false
	}
	t.match.Restore(checkpoint)
	t.confirmedThrough = t.match.Frame
	t.history = [RollbackFrames]rollbackFrame{}
	t.lastRemote = cloneInputs(remote, len(t.match.Fighters))
	return true
}

func (t *RollbackTimeline) Advance(local []string) int {
	frame := t.match.Frame + 1
	entry := &t.history[frame%RollbackFrames]
	*entry = rollbackFrame{frame: frame, before: t.match.Save(), local: slices.Clone(local)}
	t.simulate(entry)
	return frame
}

type CorrectionResult uint8

const (
	CorrectionIgnored CorrectionResult = iota
	CorrectionApplied
	CorrectionMatched
	CorrectionNeedsState
)

// Confirm applies the server's effective inputs for an already simulated frame.
// Confirmed frames use server inputs for every slot. Later predicted frames
// keep their buffered local input. A correction outside the window
// requires an authoritative checkpoint instead of unbounded re-simulation.
func (t *RollbackTimeline) Confirm(frame int, remote [][]string) CorrectionResult {
	if frame <= t.confirmedThrough || frame > t.match.Frame || len(remote) != len(t.match.Fighters) {
		return CorrectionIgnored
	}
	entry := &t.history[frame%RollbackFrames]
	if entry.frame != frame {
		return CorrectionNeedsState
	}
	if entry.confirmed {
		return CorrectionIgnored
	}
	latest := t.match.Frame
	entry.remote = cloneInputs(remote, len(t.match.Fighters))
	entry.confirmed = true
	same := true
	for slot, held := range remote {
		predicted := entry.used[slot]
		if slot == t.localSlot {
			predicted = entry.local
		}
		if !slices.Equal(predicted, held) {
			same = false
			break
		}
	}
	if same {
		return CorrectionMatched
	}
	t.lastRemote = entry.used
	t.match.Restore(entry.before)
	for i := frame; i <= latest; i++ {
		next := &t.history[i%RollbackFrames]
		next.before = t.match.Save()
		t.simulate(next)
	}
	return CorrectionApplied
}

func (t *RollbackTimeline) simulate(entry *rollbackFrame) {
	entry.used = t.lastRemote
	if entry.confirmed {
		t.lastRemote = entry.remote
		t.match.Step(entry.remote)
		return
	}
	inputs := slices.Clone(t.lastRemote)
	inputs[t.localSlot] = entry.local
	t.match.Step(inputs)
}

func (t *RollbackTimeline) StateHash() (string, error) { return t.match.StateHash() }

func cloneInputs(inputs [][]string, count int) [][]string {
	out := make([][]string, count)
	for i, held := range inputs {
		out[i] = slices.Clone(held)
	}
	return out
}
