package net

import (
	"encoding/json"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/coder/websocket"
	"github.com/presidential-brawl/server/contract"
	"github.com/presidential-brawl/server/rooms"
	"github.com/presidential-brawl/engine"
)

type Server struct {
	Reg          *rooms.Registry
	Origins      map[string]bool
	FighterIDs   map[string]bool
	StageCount   int
	CreateMatch  func(ids []string, stage int, onEnd func([]int)) sim.Match
}

func (s *Server) ServeWS(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if origin != "" {
		sameHost := false
		if host := r.Host; host != "" {
			// rough same-host check
			sameHost = strings.Contains(origin, "://"+host)
		}
		if !sameHost && !s.Origins[origin] {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
	}

	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		InsecureSkipVerify: true, // we checked origin above
	})
	if err != nil {
		return
	}
	conn.SetReadLimit(4096)

	c := rooms.NewClient(conn)
	s.Reg.AddClient(c)
	defer s.Reg.RemoveClient(c)

	_ = c.SendJSON(contract.HelloMessage{Type: "hello", Protocol: contract.Protocol})

	ctx := r.Context()
	for {
		_, data, err := conn.Read(ctx)
		if err != nil {
			s.handleClose(c)
			return
		}
		var msg contract.ClientMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			continue
		}
		s.handleMessage(c, msg)
	}
}

func (s *Server) handleClose(c *rooms.Client) {
	room, player := s.Reg.ClientRoom(c)
	if room != nil && player != nil {
		room.Mu().Lock()
		isCurrent := player.WS == c
		room.Mu().Unlock()
		if isCurrent {
			s.remove(room, player, true)
		}
	}
	s.Reg.ClearClient(c)
}

func failure(c *rooms.Client, code, message string) {
	_ = c.SendJSON(contract.ErrorMessage{Type: "error", Code: code, Message: message})
}

func (s *Server) publish(room *rooms.Room) {
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

func (s *Server) remove(room *rooms.Room, player *rooms.Player, resume bool) {
	room.Mu().Lock()
	slot := -1
	for i, p := range room.Players {
		if p == player {
			slot = i
			break
		}
	}
	if slot < 0 {
		room.Mu().Unlock()
		return
	}
	player.WS = nil
	player.Input = nil
	player.Pending = nil
	player.Ready = false
	if resume {
		player.LeftAt = time.Now()
	} else {
		player.LeftAt = time.Unix(1, 0)
		if room.Match != nil {
			room.Match.Leave(slot)
		}
		room.Players[slot] = nil
	}
	if room.HostSlot == slot {
		room.HostSlot = -1
		for i, p := range room.Players {
			if p != nil && p.WS != nil {
				room.HostSlot = i
				break
			}
		}
	}
	room.Mu().Unlock()
	s.publish(room)
}

func (s *Server) handleMessage(c *rooms.Client, msg contract.ClientMessage) {
	if msg.Type == contract.CPing {
		_ = c.SendJSON(contract.PongMessage{Type: "pong"})
		return
	}

	room, player := s.Reg.ClientRoom(c)

	if player == nil {
		if msg.Protocol != contract.Protocol {
			failure(c, "PROTOCOL", "Actualiza la página para conectarte con esta versión del servidor.")
			return
		}
		if msg.Type == contract.CCreate {
			if !rooms.ValidCapacity(msg.MaxPlayers) {
				failure(c, "CAPACITY", "Elige 2, 4, 6 u 8 jugadores.")
				return
			}
			if s.Reg.Count() >= 100 {
				failure(c, "LIMIT", "El servidor ya tiene demasiadas salas.")
				return
			}
			room = s.Reg.Create(msg.MaxPlayers)
		} else if msg.Type == contract.CJoin || msg.Type == contract.CResume {
			room = s.Reg.Get(msg.Code)
			if room == nil {
				failure(c, "ROOM_MISSING", "La sala no existe o caducó.")
				return
			}
		} else {
			return
		}

		var slot int
		if msg.Type == contract.CResume {
			room.Mu().Lock()
			slot = -1
			for i, p := range room.Players {
				if p != nil && p.Token == msg.Token {
					slot = i
					player = p
					break
				}
			}
			if slot < 0 || player == nil {
				room.Mu().Unlock()
				failure(c, "RESUME", "Ya no se puede recuperar este puesto.")
				return
			}
			if !player.LeftAt.IsZero() && time.Since(player.LeftAt) >= contract.ResumeMS*time.Millisecond {
				room.Mu().Unlock()
				failure(c, "RESUME", "Expiró el plazo para recuperar este puesto.")
				return
			}
			prev := player.WS
			player.WS = nil
			player.Input = nil
			player.Pending = nil
			room.Mu().Unlock()
			if prev != nil && prev != c {
				prev.Close(websocket.StatusCode(4001), "replaced")
			}
		} else {
			room.Mu().Lock()
			slot = -1
			for i, p := range room.Players {
				if p == nil {
					slot = i
					break
				}
			}
			if slot < 0 {
				room.Mu().Unlock()
				failure(c, "ROOM_FULL", "La sala está llena.")
				return
			}
			if room.Match != nil {
				room.Mu().Unlock()
				failure(c, "IN_MATCH", "La partida ya comenzó.")
				return
			}
			player = &rooms.Player{Token: rooms.NewToken(), AppliedSeq: -1, Seq: -1}
			room.Players[slot] = player
			room.Mu().Unlock()
		}

		room.Mu().Lock()
		player.WS = c
		player.LeftAt = time.Time{}
		room.Updated = time.Now()
		if room.HostSlot < 0 {
			room.HostSlot = slot
		}
		seq := player.Seq
		token := player.Token
		code := room.Code
		room.Mu().Unlock()

		s.Reg.BindClient(c, room, player, slot)
		_ = c.SendJSON(contract.SeatMessage{Type: "seat", Code: code, Slot: slot, Token: token, Seq: seq})
		s.publish(room)
		return
	}

	// authenticated
	room.Mu().Lock()
	if player.WS != c {
		room.Mu().Unlock()
		return
	}
	room.Updated = time.Now()
	slot := c.Slot()
	room.Mu().Unlock()

	switch msg.Type {
	case contract.CInput:
		if room.Match == nil || room.Standings != nil {
			return
		}
		if msg.Seq <= player.Seq || len(msg.Actions) > len(rooms.Actions) {
			return
		}
		for _, a := range msg.Actions {
			if !rooms.Actions[a] {
				return
			}
		}
		// dedupe
		seen := map[string]bool{}
		next := make([]string, 0, len(msg.Actions))
		for _, a := range msg.Actions {
			if !seen[a] {
				seen[a] = true
				next = append(next, a)
			}
		}
		room.Mu().Lock()
		player.Seq = msg.Seq
		last := player.Input
		if len(player.Pending) > 0 {
			last = player.Pending[len(player.Pending)-1].Actions
		}
		same := len(last) == len(next)
		if same {
			for _, a := range next {
				if !slices.Contains(last, a) {
					same = false
					break
				}
			}
		}
		if same {
			if len(player.Pending) > 0 {
				player.Pending[len(player.Pending)-1].Seq = msg.Seq
			} else {
				player.AppliedSeq = msg.Seq
			}
		} else {
			if len(player.Pending) >= 6 {
				player.Pending = player.Pending[1:]
			}
			player.Pending = append(player.Pending, rooms.PendingInput{Seq: msg.Seq, Actions: next})
		}
		player.InputAt = time.Now()
		room.Mu().Unlock()

	case contract.CSelect:
		if room.Match != nil || !s.FighterIDs[msg.FighterID] {
			return
		}
		room.Mu().Lock()
		player.FighterID = msg.FighterID
		player.Ready = false
		room.Mu().Unlock()
		s.publish(room)

	case contract.CReady:
		if room.Match != nil || player.FighterID == "" || msg.Ready == nil {
			return
		}
		room.Mu().Lock()
		player.Ready = *msg.Ready
		room.Mu().Unlock()
		s.publish(room)

	case contract.CStage:
		if room.Match != nil || slot != room.HostSlot || msg.Stage == nil {
			return
		}
		st := *msg.Stage
		if st < 0 || st >= s.StageCount {
			return
		}
		room.Mu().Lock()
		room.Stage = st
		room.Mu().Unlock()
		s.publish(room)

	case contract.CStart:
		if slot != room.HostSlot {
			return
		}
		room.Mu().Lock()
		if room.Match != nil {
			room.Mu().Unlock()
			return
		}
		allReady := true
		ids := make([]string, len(room.Players))
		for i, p := range room.Players {
			if p == nil || p.WS == nil || !p.Ready || p.FighterID == "" {
				allReady = false
				break
			}
			ids[i] = p.FighterID
		}
		if !allReady {
			room.Mu().Unlock()
			failure(c, "NOT_READY", "Todos los puestos deben estar conectados y listos.")
			return
		}
		room.Standings = nil
		stage := room.Stage
		room.Match = s.CreateMatch(ids, stage, func(standings []int) {
			room.Standings = standings
		})
		room.Mu().Unlock()
		s.publish(room)

	case contract.CLobby:
		room.Mu().Lock()
		if room.Standings == nil || slot != room.HostSlot {
			room.Mu().Unlock()
			return
		}
		room.Match = nil
		room.Standings = nil
		for _, p := range room.Players {
			if p != nil {
				p.Ready = false
				p.Input = nil
				p.Pending = nil
			}
		}
		room.Mu().Unlock()
		s.publish(room)

	case contract.CLeave:
		s.remove(room, player, false)
		c.Close(websocket.StatusNormalClosure, "leave")
	}
}
