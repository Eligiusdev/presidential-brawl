package sim

import (
	"fmt"
	"runtime"
	"slices"
	"testing"
	"time"
)

func rollbackMatch(t testing.TB, players int) *Match {
	t.Helper()
	ids := []string{"bolivar", "aquiles", "lincoln", "robinson", "musashi", "petro", "obama", "napoleon"}
	cfg := DefaultConfig()
	cfg.Hazard, cfg.Items, cfg.StartFullVote = "frenetic", "chaos", true
	match, err := NewOnlineMatchWithConfig(ids[:players], 0, 53017, cfg)
	if err != nil {
		t.Fatal(err)
	}
	return match
}

func testInputs(frame, players int) [][]string {
	inputs := make([][]string, players)
	for slot := range inputs {
		direction := "right"
		if slot%2 == 1 {
			direction = "left"
		}
		switch (frame + slot*7) % 80 {
		case 9, 48:
			inputs[slot] = []string{direction, "jump"}
		case 15, 52:
			inputs[slot] = []string{direction, "heavy"}
		case 32:
			inputs[slot] = []string{"ult"}
		default:
			inputs[slot] = []string{direction, "light"}
		}
	}
	return inputs
}

func TestRollbackWithSimulatedNetwork(t *testing.T) {
	type packet struct {
		frame, arrival int
		input          [][]string
	}
	server := rollbackMatch(t, 2)
	client := NewRollbackTimeline(server.Save(), 0)
	var packets []packet
	lastDelivery := 0
	corrections, resyncs := 0, 0
	for frame := 1; frame <= 480; frame++ {
		held := testInputs(frame, 2)
		server.Step(held)
		client.Advance(held[0])
		// One-way delivery jitter of 2–6 frames. A lost TCP segment waits
		// for retransmission, delaying all later packets on the same stream.
		delay := 2 + frame%5
		if frame%71 == 0 {
			delay += 10
		}
		lastDelivery = max(lastDelivery, frame+delay)
		packets = append(packets, packet{frame: frame, arrival: lastDelivery, input: held})
		for len(packets) > 0 && packets[0].arrival <= frame {
			next := packets[0]
			packets = packets[1:]
			switch client.Confirm(next.frame, next.input) {
			case CorrectionApplied:
				corrections++
			case CorrectionNeedsState:
				resyncs++
				if !client.Reset(server.Save(), held) {
					t.Fatal("authoritative checkpoint rejected")
				}
				if client.Confirm(next.frame, next.input) != CorrectionIgnored {
					t.Fatal("input before the authoritative reset must be ignored")
				}
				packets = nil
				lastDelivery = frame
			}
		}
	}
	for _, next := range packets {
		if client.Confirm(next.frame, next.input) == CorrectionNeedsState {
			t.Fatal("unexpected expired input during final flush")
		}
	}
	hash, err := client.StateHash()
	if err != nil || hash != hashMatch(t, server) || corrections == 0 || resyncs == 0 {
		t.Fatalf("expected convergence with corrections and resyncs: corrections=%d resyncs=%d err=%v", corrections, resyncs, err)
	}
	t.Logf("simulated TCP: %d corrections, %d authoritative resets, matching final state", corrections, resyncs)
}

func TestRollbackPerformanceFixture(t *testing.T) {
	if testing.Short() {
		t.Skip("Wasm performance fixture")
	}
	for _, players := range []int{2, 8} {
		t.Run(fmt.Sprintf("%d_players", players), func(t *testing.T) {
			match := rollbackMatch(t, players)
			const samples = 120
			save, restore, replay := make([]time.Duration, 0, samples), make([]time.Duration, 0, samples), make([]time.Duration, 0, samples)
			var ring [RollbackFrames]Checkpoint
			correction := make([]time.Duration, 0, samples)
			frames := make([][][]string, samples+10)
			for i := range frames {
				frames[i] = testInputs(i+1, players)
			}
			runtime.GC()
			var before, retained, freed runtime.MemStats
			runtime.ReadMemStats(&before)
			for i := 0; i < samples; i++ {
				match.Step(frames[i])
				start := time.Now()
				checkpoint := match.Save()
				save = append(save, time.Since(start))
				ring[i%len(ring)] = checkpoint
				start = time.Now()
				var speculative Match
				speculative.Restore(checkpoint)
				restore = append(restore, time.Since(start))
				start = time.Now()
				for _, input := range frames[i+1 : i+11] {
					speculative.Step(input)
				}
				replay = append(replay, time.Since(start))

				timeline := NewRollbackTimeline(checkpoint, 0)
				var firstFrame int
				for j, input := range frames[i+1 : i+1+RollbackFrames] {
					frame := timeline.Advance(input[0])
					if j == 0 {
						firstFrame = frame
					}
				}
				start = time.Now()
				result := timeline.Confirm(firstFrame, frames[i+1])
				correction = append(correction, time.Since(start))
				if result != CorrectionApplied {
					t.Fatal("fixture did not trigger an eight-frame correction")
				}
			}
			runtime.GC()
			runtime.ReadMemStats(&retained)
			runtime.KeepAlive(ring)
			ring = [RollbackFrames]Checkpoint{}
			runtime.GC()
			runtime.ReadMemStats(&freed)
			runtime.KeepAlive(match)
			p95 := func(values []time.Duration) time.Duration {
				slices.Sort(values)
				return values[len(values)*95/100-1]
			}
			t.Logf("p95 save=%s restore=%s replay10=%s correction8=%s Go heap baseline=%d retained=%d after drop=%d bytes",
				p95(save), p95(restore), p95(replay), p95(correction), before.HeapAlloc, retained.HeapAlloc, freed.HeapAlloc)
		})
	}
}

func TestRollbackEarlierConfirmationPreservesLaterConfirmedInputs(t *testing.T) {
	server := rollbackMatch(t, 2)
	client := NewRollbackTimeline(server.Save(), 0)
	for frame := 1; frame <= RollbackFrames; frame++ {
		// Each confirmed range holds remote input until the next change.
		remote := []string{"left"}
		if frame >= 4 {
			remote = []string{"right"}
		}
		server.Step([][]string{{}, remote})
		client.Advance(nil)
	}
	if client.Confirm(4, [][]string{nil, {"right"}}) != CorrectionApplied ||
		client.Confirm(1, [][]string{nil, {"left"}}) != CorrectionApplied {
		t.Fatal("expected both corrections to be applied")
	}
	hash, err := client.StateHash()
	if err != nil || hash != hashMatch(t, server) {
		t.Fatalf("later authoritative input was lost: %v", err)
	}
}

func TestRollbackBatchPreservesNewerUnconfirmedLocalInput(t *testing.T) {
	server := rollbackMatch(t, 2)
	client := NewRollbackTimeline(server.Save(), 0)
	for frame := 1; frame <= 5; frame++ {
		predicted := []string{"right"}
		corrected := predicted
		if frame <= 3 {
			corrected = nil
		}
		server.Step([][]string{corrected, {"left"}})
		client.Advance(predicted)
	}
	confirmed := [][][]string{
		{nil, {"left"}}, {nil, {"left"}}, {nil, {"left"}},
	}
	if client.ConfirmBatch(1, confirmed) != CorrectionApplied {
		t.Fatal("expected a single correction for three confirmed frames")
	}
	hash, err := client.StateHash()
	if err != nil || hash != hashMatch(t, server) {
		t.Fatalf("replay lost unconfirmed local input: %v", err)
	}
	for range RollbackFrames {
		client.Advance(nil)
	}
	if client.ConfirmBatch(4, [][][]string{{nil, nil}}) != CorrectionNeedsState {
		t.Fatal("old correction must request a checkpoint")
	}
}
