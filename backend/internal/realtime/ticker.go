package realtime

import (
	"context"
	"encoding/json"
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
				elapsed := float64(now.Sub(last).Milliseconds())
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
			for mi, si := range matchSlots {
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
			}
			step := room.Match.Step(inputs)
			if step%2 == 0 || room.Standings != nil {
				snapshotDue = true
			}
		}
		if !snapshotDue {
			room.Mu().Unlock()
			continue
		}
		snap := room.Match.Snapshot()
		matchSlots := append([]int(nil), room.MatchSlots...)
		if len(matchSlots) > 0 {
			if m, ok := snap.(map[string]any); ok {
				if players, ok := m["players"].([]map[string]any); ok {
					for _, pl := range players {
						if sl, ok := pl["slot"].(int); ok && sl >= 0 && sl < len(matchSlots) {
							pl["slot"] = matchSlots[sl]
							pl["id"] = matchSlots[sl]
						}
					}
				}
				if standings, ok := m["standings"].([]int); ok {
					for i, st := range standings {
						if st >= 0 && st < len(matchSlots) { standings[i] = matchSlots[st] }
					}
				}
			}
		}
		ack := make([]int, len(room.Players))
		for i, p := range room.Players {
			if p != nil {
				ack[i] = p.AppliedSeq
			} else {
				ack[i] = -1
			}
		}
		bin, ok := encodeSnapshotBinary(snap, ack)
		var jsonData []byte
		if !ok {
			msg := map[string]any{"type": "snapshot", "ack": ack}
			if m, ok := snap.(map[string]any); ok {
				for k, v := range m {
					if k == "type" || k == "ack" {
						continue
					}
					msg[k] = v
				}
			}
			jsonData, _ = json.Marshal(msg)
		}
		players := append([]*rooms.Player(nil), room.Players...)
		standings := room.Standings
		room.Mu().Unlock()

		for _, p := range players {
			if p != nil && p.WS != nil {
				if ok {
					_ = p.WS.SendBinary(bin)
				} else {
					_ = p.WS.SendJSONRaw(jsonData)
				}
			}
		}
		if standings != nil {
			state := room.State()
			for _, p := range players {
				if p != nil && p.WS != nil {
					_ = p.WS.SendJSON(state)
				}
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
