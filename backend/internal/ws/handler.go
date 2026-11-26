package ws

import (
	"encoding/json"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/coder/websocket"
	"github.com/presidential-brawl/server/contract"
	"github.com/presidential-brawl/server/internal/room"
	"github.com/presidential-brawl/engine"
)

type Server struct {
	Reg          *rooms.Registry
	Origins      map[string]bool
	FighterIDs   map[string]bool
	StageCount   int
	CreateMatch  func(ids []string, stage int, stocks int, onEnd func([]int)) *sim.Match
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
		CompressionMode: websocket.CompressionDisabled,
		InsecureSkipVerify: true, // we checked origin above
	})
	if err != nil {
		return
	}
	conn.SetReadLimit(4096)

	c := rooms.NewClient(conn)
	s.Reg.AddClient(c)
	defer s.Reg.RemoveClient(c)

	_ = c.SendJSON(contract.HelloMessage{Type: "hello", Protocol: contract.Protocol, BinaryInput: true, CheckpointVersion: sim.CheckpointVersion})

	ctx := r.Context()
	for {
		kind, data, err := conn.Read(ctx)
		if err != nil {
			s.handleClose(c)
			return
		}
		var msg contract.ClientMessage
		if kind == websocket.MessageBinary {
			var ok bool
			msg, ok = decodeBinaryInput(data)
			if !ok { continue }
		} else if err := json.Unmarshal(data, &msg); err != nil {
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

func cleanName(name string) string {
	name = strings.TrimSpace(name)
	runes := []rune(name)
	if len(runes) > 18 { runes = runes[:18] }
	return string(runes)
}

func validClientID(id string) bool {
	if len(id) < 8 || len(id) > 80 { return false }
	for _, r := range id {
		if (r < 'a' || r > 'z') && (r < 'A' || r > 'Z') && (r < '0' || r > '9') && r != '-' && r != '_' {
			return false
		}
	}
	return true
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
	s.Reg.Notify()
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
		if s.Reg.IsBanned(msg.ClientID) {
			failure(c, "BANNED", "Has sido vetado de las salas de este servidor.")
			return
		}
		if msg.ClientID != "" && !validClientID(msg.ClientID) {
			failure(c, "IDENTITY", "Identidad de jugador no válida.")
			return
		}
		if msg.Protocol != contract.Protocol {
			failure(c, "PROTOCOL", "Actualiza la página para conectarte con esta versión del servidor.")
			return
		}
		if msg.Type == contract.CCreate {
			if !rooms.ValidCapacity(msg.MaxPlayers) {
				failure(c, "CAPACITY", "Elige 2, 4, 6 u 8 jugadores.")
				return
			}
			mode := msg.Mode
			if mode != "champion" && mode != "tournament" { mode = "ffa" }
			ts := msg.TeamSize
			if ts <= 0 { ts = 1 }
			if ts != 1 && ts != 2 && ts != 3 && ts != 4 {
				failure(c, "FORMAT", "Formato de equipo inválido.")
				return
			}
			if msg.MaxPlayers%ts != 0 {
				failure(c, "FORMAT", "El formato no coincide con la cantidad de jugadores.")
				return
			}
			if s.Reg.Count() >= 100 {
				failure(c, "LIMIT", "El servidor ya tiene demasiadas salas.")
				return
			}
			public := true
			if msg.Public != nil { public = *msg.Public }
			room = s.Reg.Create(msg.MaxPlayers, mode, ts, public)
			if msg.Stocks != nil {
				stocks := *msg.Stocks
				if stocks < 1 || stocks > 5 {
					failure(c, "STOCKS", "Elige entre 1 y 5 vidas.")
					s.Reg.Delete(room.Code)
					return
				}
				room.Mu().Lock()
				room.Stocks = stocks
				room.Mu().Unlock()
			}
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
			player = &rooms.Player{Token: rooms.NewToken(), AppliedSeq: -1, Seq: -1,
				ClientID: msg.ClientID, Name: cleanName(msg.Name)}
			if player.Name == "" { player.Name = "Jugador" }
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
	case contract.CRollbackSync:
		room.Mu().Lock()
		now := time.Now()
		if player.WS != c || room.Match == nil || now.Sub(player.RollbackSyncAt) < 30*time.Millisecond {
			room.Mu().Unlock()
			return
		}
		player.RollbackSyncAt = now
		reply, err := room.RollbackSyncLocked(msg.MatchID, msg.AfterFrame, now.Sub(player.RollbackCheckpointAt) >= time.Second)
		if len(reply.Checkpoint) > 0 {
			player.RollbackCheckpointAt = now
		}
		reply.SyncRequest = msg.SyncRequest
		room.Mu().Unlock()
		if err == nil {
			_ = c.TrySendRollback(reply)
		}

	case contract.CInput:
		if len(msg.Actions) > len(rooms.Actions) {
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
		if player.WS != c || room.Match == nil || room.Standings != nil || msg.Seq <= player.Seq {
			room.Mu().Unlock()
			return
		}
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

	case contract.CName:
		name := cleanName(msg.Name)
		if name == "" { return }
		room.Mu().Lock()
		player.Name = name
		room.Mu().Unlock()
		s.publish(room)

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

	case contract.CRoomConfig:
		// Host-only match settings, valid while everyone is still in the lobby.
		if room.Match != nil || slot != room.HostSlot {
			return
		}
		room.Mu().Lock()
		mode := room.Mode
		if msg.Mode == "ffa" || msg.Mode == "tournament" || msg.Mode == "champion" {
			mode = msg.Mode
		}
		teamSize := room.TeamSize
		if teamSize <= 0 {
			teamSize = 1
		}
		if msg.TeamSize > 0 {
			teamSize = msg.TeamSize
		}
		if teamSize < 1 || teamSize > 4 {
			room.Mu().Unlock()
			failure(c, "FORMAT", "Formato de equipo inválido.")
			return
		}
		maxPlayers := len(room.Players)
		if msg.MaxPlayers > 0 {
			maxPlayers = msg.MaxPlayers
		}
		occupied := 0
		for _, p := range room.Players {
			if p != nil {
				occupied++
			}
		}
		if !rooms.ValidCapacity(maxPlayers) || maxPlayers < occupied {
			room.Mu().Unlock()
			failure(c, "CAPACITY", "Elige entre 2, 4, 6 u 8 jugadores sin dejar a nadie fuera.")
			return
		}
		if mode == "tournament" {
			if teamSize < 2 || maxPlayers%teamSize != 0 {
				room.Mu().Unlock()
				failure(c, "FORMAT", "El formato no coincide con la cantidad de jugadores.")
				return
			}
		} else {
			teamSize = 1
		}
		stocks := room.Stocks
		if stocks <= 0 {
			stocks = 3
		}
		if msg.Stocks != nil {
			stocks = *msg.Stocks
			if stocks < 1 || stocks > 5 {
				room.Mu().Unlock()
				failure(c, "STOCKS", "Elige entre 1 y 5 vidas.")
				return
			}
		}
		players := make([]*rooms.Player, maxPlayers)
		copy(players, room.Players)
		room.Players = players
		room.Mode = mode
		room.TeamSize = teamSize
		room.Stocks = stocks
		if msg.Public != nil {
			room.Public = *msg.Public
		}
		room.Standings = nil
		room.ChampionSlot = -1
		room.ChampionNext = 0
		room.ChampionSize = 0
		room.Updated = time.Now()
		room.Mu().Unlock()
		s.publish(room)

	case contract.CKick, contract.CBan:
		// The host can remove or ban a player; identity always comes from the server.
		if slot != room.HostSlot || msg.TargetSlot == nil { return }
		room.Mu().Lock()
		targetSlot := *msg.TargetSlot
		if targetSlot < 0 || targetSlot >= len(room.Players) || targetSlot == slot {
			room.Mu().Unlock()
			return
		}
		target := room.Players[targetSlot]
		if target == nil || target.WS == nil {
			room.Mu().Unlock()
			return
		}
		targetWS := target.WS
		clientID := target.ClientID
		room.Mu().Unlock()
		if msg.Type == contract.CBan {
			s.Reg.Ban(clientID)
		}
		s.remove(room, target, false)
		targetWS.Close(websocket.StatusCode(4003), string(msg.Type))

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
		activeSlots := []int{}
		for i, p := range room.Players {
			if p == nil || p.WS == nil || !p.Ready || p.FighterID == "" {
				allReady = false
				break
			}
			activeSlots = append(activeSlots, i)
		}
		if !allReady {
			room.Mu().Unlock()
			failure(c, "NOT_READY", "Todos los puestos deben estar conectados y listos.")
			return
		}
		room.Standings = nil
		room.ChampionSlot = -1
		room.ChampionNext = 0
		room.ChampionSize = 0
		if room.Mode == "champion" && len(activeSlots) >= 2 {
			room.ChampionSize = len(activeSlots)
			room.ChampionSlot = activeSlots[0]
			room.ChampionNext = 1
			s.startChampionMatchLocked(room, activeSlots)
		} else {
			ids := make([]string, len(activeSlots))
			room.MatchSlots = make([]int, len(activeSlots))
			for i, si := range activeSlots {
				ids[i] = room.Players[si].FighterID
				room.MatchSlots[i] = si
			}
			stage := room.Stage
			mslots := append([]int(nil), room.MatchSlots...)
			room.Match = s.CreateMatch(ids, stage, room.Stocks, func(standings []int) {
				remapped := make([]int, len(standings))
				for i, st := range standings {
					if st >= 0 && st < len(mslots) { remapped[i] = mslots[st] } else { remapped[i] = st }
				}
				room.Standings = remapped
			})
		}
		room.Mu().Unlock()
		s.publish(room)

	case contract.CLobby:
		room.Mu().Lock()
		if room.Standings == nil || slot != room.HostSlot {
			room.Mu().Unlock()
			return
		}
		if room.Mode == "champion" {
			activeSlots := []int{}
			for i, p := range room.Players {
				if p != nil && p.WS != nil && p.FighterID != "" { activeSlots = append(activeSlots, i) }
			}
			if room.ChampionNext > 0 && room.ChampionNext < len(activeSlots) {
				room.Standings = nil
				room.Match = nil
				s.startChampionMatchLocked(room, activeSlots)
				room.Mu().Unlock()
				s.publish(room)
				return
			}
		}
		room.Match = nil
		room.ClearRollbackLocked()
		room.MatchSlots = nil
		room.Standings = nil
		room.ChampionSlot = -1
		room.ChampionNext = 0
		room.ChampionSize = 0
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

func (s *Server) startChampionMatchLocked(room *rooms.Room, activeSlots []int) {
	if room.ChampionNext >= len(activeSlots) || room.ChampionNext < 1 {
		return
	}
	champSlot := room.ChampionSlot
	challengerSlot := activeSlots[room.ChampionNext]
	matchSlots := []int{champSlot, challengerSlot}
	ids := []string{room.Players[champSlot].FighterID, room.Players[challengerSlot].FighterID}
	room.MatchSlots = append([]int(nil), matchSlots...)
	stage := room.Stage
	mslots := append([]int(nil), matchSlots...)
	nextIdx := room.ChampionNext
	total := len(activeSlots)
	room.Match = s.CreateMatch(ids, stage, room.Stocks, func(standings []int) {
		remapped := make([]int, len(standings))
		for i, st := range standings {
			if st >= 0 && st < len(mslots) { remapped[i] = mslots[st] } else { remapped[i] = st }
		}
		room.Standings = remapped
		if len(remapped) > 0 {
			room.ChampionSlot = remapped[0]
		}
		room.ChampionNext = nextIdx + 1
		if room.ChampionNext >= total {
			room.ChampionNext = total // marks finished
		}
	})
}
