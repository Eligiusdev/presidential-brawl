package realtime

import (
	"context"
	pb "github.com/presidential-brawl/server/gen/go"
	"google.golang.org/protobuf/proto"
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
				for i := range room.Players {
					matchSlots[i] = i
				}
			}
			inputs := make([][]string, len(matchSlots))
			for mi, si := range matchSlots {
				if si < 0 || si >= len(room.Players) {
					inputs[mi] = []string{}
					continue
				}
				p := room.Players[si]
				if p == nil || p.WS == nil || now.Sub(p.InputAt) >= 500*time.Millisecond {
					if p != nil {
						p.Input = nil
						p.Pending = nil
					}
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
			}
			room.Match.Step(inputs)
			if room.Match.Frame%2 == 0 || room.Standings != nil {
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
		payload, err := room.Match.NetworkSnapshotJSON(ack, room.MatchSlots)
		envelope := &pb.Snapshot{Tick: uint32(room.Match.Frame), Stage: int32(room.Stage), Ack: toI32(ack), SnapshotJson: payload}
		clients := connectedClients(room)
		standings := room.Standings
		room.Mu().Unlock()
		if err != nil {
			log.Printf("encode room snapshot: %v", err)
			continue
		}
		bin, err := proto.Marshal(envelope)
		if err != nil {
			log.Printf("encode snapshot envelope: %v", err)
			continue
		}
		for _, client := range clients {
			client.QueueSnapshot(websocket.MessageBinary, bin)
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
		clients := connectedClients(room)
		room.Mu().Unlock()
		for _, client := range clients {
			_ = client.SendJSON(state)
		}
	}
}

// Caller holds the room mutex; copy connections before releasing it.
func connectedClients(room *rooms.Room) []*rooms.Client {
	clients := make([]*rooms.Client, 0, len(room.Players))
	for _, player := range room.Players {
		if player != nil && player.WS != nil {
			clients = append(clients, player.WS)
		}
	}
	return clients
}
