package realtime

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/presidential-brawl/server/internal/room"
)

const stepMS = 1000.0 / 60.0

func StartTicker(reg *rooms.Registry) func() {
	stop := make(chan struct{})

	go func() {
		ticker := time.NewTicker(8 * time.Millisecond)
		defer ticker.Stop()
		last := time.Now()
		for {
			select {
			case <-stop:
				return
			case now := <-ticker.C:
				elapsed := float64(now.Sub(last)) / float64(time.Millisecond)
				if elapsed > 100 {
					elapsed = 100
				}
				last = now
				tickRooms(reg, elapsed)
			}
		}
	}()

	go func() {
		hb := time.NewTicker(10 * time.Second)
		defer hb.Stop()
		for {
			select {
			case <-stop:
				return
			case <-hb.C:
				heartbeat(reg)
			}
		}
	}()

	var once sync.Once
	return func() { once.Do(func() { close(stop) }) }
}

func tickRooms(reg *rooms.Registry, elapsed float64) {
	now := time.Now()
	for _, room := range reg.All() {
		room.Mu().Lock()
		for _, p := range room.Players {
			if p != nil && p.WS == nil && !p.LeftAt.IsZero() && now.Sub(p.LeftAt) >= 20*time.Second {
				slot := -1
				for i, pp := range room.Players {
					if pp == p {
						slot = i
						break
					}
				}
				if slot >= 0 {
					if room.Match != nil {
						room.Match.Leave(slot)
					}
					room.Players[slot] = nil
					reg.Notify()
				}
			}
		}
		hasAny := false
		for _, p := range room.Players {
			if p != nil {
				hasAny = true
				break
			}
		}
		if !hasAny || now.Sub(room.Updated) > 30*time.Minute {
			for _, p := range room.Players {
				if p != nil && p.WS != nil {
					p.WS.Close(websocket.StatusNormalClosure, "expired")
				}
			}
			room.Mu().Unlock()
			reg.Delete(room.Code)
			continue
		}
		if room.Match == nil || room.Standings != nil {
			room.Mu().Unlock()
			continue
		}
		hasConnected := false
		for _, p := range room.Players {
			if p != nil && p.WS != nil {
				hasConnected = true
				break
			}
		}
		if !hasConnected {
			room.Mu().Unlock()
			continue
		}

		room.ClockMS += elapsed
		snapshotDue := false
		for room.ClockMS >= stepMS && room.Standings == nil {
			room.ClockMS -= stepMS
			matchSlots := room.MatchSlots
			if len(matchSlots) == 0 {
				matchSlots = make([]int, len(room.Players))
				for i := range room.Players { matchSlots[i] = i }
			}
			inputs := make([][]string, len(matchSlots))
			var sequences []int
			if room.WantsConfirmedInputsLocked(now) { sequences = make([]int, len(matchSlots)) }
			for mi, si := range matchSlots {
				if sequences != nil { sequences[mi] = -1 }
				if si < 0 || si >= len(room.Players) { inputs[mi] = []string{}; continue }
				p := room.Players[si]
				if p == nil || p.WS == nil || now.Sub(p.InputAt) >= 500*time.Millisecond {
					if p != nil { p.Input = nil; p.Pending = nil }
					inputs[mi] = []string{}
					continue
				}
				if len(p.Pending) > 0 {
					inp := p.Pending[0]
					p.Pending = p.Pending[1:]
					p.Input = inp.Actions
					p.AppliedSeq = inp.Seq
				}
				inp := make([]string, len(p.Input))
				copy(inp, p.Input)
				inputs[mi] = inp
				if sequences != nil { sequences[mi] = p.AppliedSeq }
			}
			step := room.Match.Step(inputs)
			if sequences != nil { room.RecordConfirmedLocked(inputs, sequences) }
			if step%2 == 0 || room.Standings != nil {
				snapshotDue = true
			}
		}
		if !snapshotDue {
			room.Mu().Unlock()
			continue
		}
		ack := make([]int, len(room.Players))
		for i, p := range room.Players {
			if p != nil {
				ack[i] = p.AppliedSeq
			} else {
				ack[i] = -1
			}
		}
		bin, err := encodeSnapshotBinary(room.Match.NetworkSnapshot(ack, room.MatchSlots))
		clients := make([]*rooms.Client, 0, len(room.Players))
		for _, p := range room.Players {
			if p != nil && p.WS != nil {
				clients = append(clients, p.WS)
			}
		}
		standings := room.Standings
		room.Mu().Unlock()

		if err != nil {
			log.Printf("room snapshot encoding failed: %v", err)
		} else {
			for _, client := range clients {
				client.QueueSnapshot(websocket.MessageBinary, bin)
			}
		}
		if standings != nil {
			state := room.State()
			for _, client := range clients {
				_ = client.SendJSON(state)
			}
		}
	}
}

func heartbeat(reg *rooms.Registry) {
	for _, c := range reg.AllClients() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_ = c.Conn().Ping(ctx)
		cancel()
	}
	for _, room := range reg.All() {
		state := room.State()
		room.Mu().Lock()
		players := append([]*rooms.Player(nil), room.Players...)
		room.Mu().Unlock()
		for _, p := range players {
			if p != nil && p.WS != nil {
				_ = p.WS.SendJSON(state)
			}
		}
	}
}
