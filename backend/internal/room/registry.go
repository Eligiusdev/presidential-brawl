package rooms

import (
	"crypto/rand"
	"encoding/hex"
	"sort"
	"sync"
	"time"

	"github.com/presidential-brawl/server/contract"
	"github.com/presidential-brawl/engine"
)

var Capacities = []int{2, 4, 6, 8}

var Colors = []string{"#fb5969", "#60a5fa", "#facc15", "#4ade80", "#fb923c", "#c084fc", "#22d3ee", "#f3f4f6"}

var Actions = map[string]bool{
	"left": true, "right": true, "jump": true, "down": true,
	"light": true, "heavy": true, "dash": true, "ult": true, "reload": true,
}

type PendingInput struct {
	Seq     int
	Actions []string
}

type Player struct {
	RollbackSyncAt time.Time
	RollbackCheckpointAt time.Time
	Token      string
	ClientID   string
	Name       string
	FighterID  string
	Input      []string
	Pending    []PendingInput
	AppliedSeq int
	Seq        int
	Ping       int
	Ready      bool
	InputAt    time.Time
	LeftAt     time.Time
	WS         *Client
}

type Room struct {
	rollback rollbackHistory
	Code          string
	Players       []*Player
	HostSlot      int
	Stage         int
	Mode          string
	TeamSize      int
	Stocks        int
	Public        bool
	Match         *sim.Match
	MatchSlots    []int
	Standings     []int
	ChampionSlot  int
	ChampionNext  int
	ChampionSize  int
	ClockMS       float64
	Updated       time.Time
	mu            sync.Mutex
}

func (r *Room) MaxPlayers() int { return len(r.Players) }
func (r *Room) Mu() *sync.Mutex  { return &r.mu }

func (r *Room) State() contract.RoomState {
	players := make([]*contract.RoomPlayer, len(r.Players))
	for i, p := range r.Players {
		if p == nil {
			players[i] = nil
			continue
		}
		fid := p.FighterID
		var fighterID *string
		if fid != "" {
			fighterID = &fid
		}
		players[i] = &contract.RoomPlayer{
			Slot: i, Name: p.Name, FighterID: fighterID, Color: Colors[i%len(Colors)],
			Ready: p.Ready, Connected: p.WS != nil, Ping: p.Ping,
		}
	}
	mode := r.Mode
	if mode == "" { mode = "ffa" }
	teamSize := r.TeamSize
	if teamSize <= 0 { teamSize = 1 }
	return contract.RoomState{
		Type: "room", Code: r.Code, HostSlot: r.HostSlot, Stage: r.Stage,
		MaxPlayers: r.MaxPlayers(), Mode: mode, TeamSize: teamSize, Stocks: r.Stocks, Public: r.Public,
		Playing: r.Match != nil, Standings: r.Standings,
		ChampionNext: r.ChampionNext, ChampionSize: r.ChampionSize,
		Players: players,
	}
}

// RoomSummary is the public information shown in the online rooms browser.
type RoomSummary struct {
	Code       string    `json:"code"`
	Mode       string    `json:"mode"`
	TeamSize   int       `json:"teamSize"`
	Stocks     int       `json:"stocks"`
	Stage      int       `json:"stage"`
	Players    int       `json:"players"`
	Connected  int       `json:"connected"`
	MaxPlayers int       `json:"maxPlayers"`
	Playing    bool      `json:"playing"`
	Updated    time.Time `json:"updated"`
}

type clientBind struct {
	room   *Room
	player *Player
	slot   int
}

type Registry struct {
	mu        sync.Mutex
	rooms     map[string]*Room
	clients   map[*Client]*clientBind
	listeners map[chan struct{}]struct{}
	banned    map[string]bool
}

func NewRegistry() *Registry {
	return &Registry{
		rooms: map[string]*Room{}, clients: map[*Client]*clientBind{},
		listeners: map[chan struct{}]struct{}{}, banned: map[string]bool{},
	}
}

// IsBanned reports whether a stable client identity was banned from all rooms.
func (reg *Registry) IsBanned(clientID string) bool {
	if clientID == "" { return false }
	reg.mu.Lock()
	defer reg.mu.Unlock()
	return reg.banned[clientID]
}

// Ban blocks a stable client identity from joining or resuming any room.
func (reg *Registry) Ban(clientID string) {
	if clientID == "" { return }
	reg.mu.Lock()
	reg.banned[clientID] = true
	reg.mu.Unlock()
}

// Subscribe returns a channel that is notified whenever the public room list changes.
// The returned function unsubscribes and closes the channel.
func (reg *Registry) Subscribe() (<-chan struct{}, func()) {
	ch := make(chan struct{}, 1)
	reg.mu.Lock()
	reg.listeners[ch] = struct{}{}
	reg.mu.Unlock()
	ch <- struct{}{} // send the current state immediately
	return ch, func() {
		reg.mu.Lock()
		delete(reg.listeners, ch)
		reg.mu.Unlock()
		close(ch)
	}
}

// Notify wakes every room-list subscriber. Never blocks on a slow listener.
func (reg *Registry) Notify() {
	reg.mu.Lock()
	defer reg.mu.Unlock()
	for ch := range reg.listeners {
		select {
		case ch <- struct{}{}:
		default:
		}
	}
}

func (reg *Registry) AddClient(c *Client) {
	reg.mu.Lock()
	reg.clients[c] = &clientBind{}
	reg.mu.Unlock()
}

func (reg *Registry) RemoveClient(c *Client) {
	reg.mu.Lock()
	delete(reg.clients, c)
	reg.mu.Unlock()
	c.Stop()
}

func (reg *Registry) BindClient(c *Client, room *Room, player *Player, slot int) {
	reg.mu.Lock()
	reg.clients[c] = &clientBind{room: room, player: player, slot: slot}
	c.slot = slot
	reg.mu.Unlock()
}

func (reg *Registry) ClearClient(c *Client) {
	reg.mu.Lock()
	if b, ok := reg.clients[c]; ok {
		b.room = nil
		b.player = nil
		b.slot = -1
	}
	reg.mu.Unlock()
}

func (reg *Registry) ClientRoom(c *Client) (*Room, *Player) {
	reg.mu.Lock()
	b := reg.clients[c]
	reg.mu.Unlock()
	if b == nil {
		return nil, nil
	}
	return b.room, b.player
}

func (reg *Registry) AllClients() []*Client {
	reg.mu.Lock()
	out := make([]*Client, 0, len(reg.clients))
	for c := range reg.clients {
		out = append(out, c)
	}
	reg.mu.Unlock()
	return out
}

func (reg *Registry) Get(code string) *Room {
	reg.mu.Lock()
	defer reg.mu.Unlock()
	return reg.rooms[code]
}

func (reg *Registry) Count() int {
	reg.mu.Lock()
	defer reg.mu.Unlock()
	return len(reg.rooms)
}

func (reg *Registry) Create(maxPlayers int, mode string, teamSize int, public bool) *Room {
	if mode != "champion" && mode != "tournament" { mode = "ffa" }
	if teamSize <= 0 { teamSize = 1 }
	reg.mu.Lock()
	var created *Room
	for {
		b := make([]byte, 3)
		_, _ = rand.Read(b)
		code := hex.EncodeToString(b)[:5]
		for i := range code {
			if code[i] >= 'a' && code[i] <= 'f' {
				code = code[:i] + string(code[i]-32) + code[i+1:]
			}
		}
		// uppercase
		bb := []byte(code)
		for i, c := range bb {
			if c >= 'a' && c <= 'z' {
				bb[i] = c - 32
			}
		}
		code = string(bb)
		if _, exists := reg.rooms[code]; exists {
			continue
		}
		r := &Room{
			Code: code, Players: make([]*Player, maxPlayers), HostSlot: 0,
			Stage: 0, Mode: mode, TeamSize: teamSize, Stocks: 3, Public: public, Updated: time.Now(),
		}
		reg.rooms[code] = r
		created = r
		break
	}
	reg.mu.Unlock()
	reg.Notify()
	return created
}

func (reg *Registry) Delete(code string) {
	reg.mu.Lock()
	delete(reg.rooms, code)
	reg.mu.Unlock()
	reg.Notify()
}

func (reg *Registry) All() []*Room {
	reg.mu.Lock()
	defer reg.mu.Unlock()
	out := make([]*Room, 0, len(reg.rooms))
	for _, r := range reg.rooms {
		out = append(out, r)
	}
	return out
}

// Summaries returns a snapshot of the rooms that can be shown in the lobby browser.
func (reg *Registry) Summaries() []RoomSummary {
	all := reg.All()
	out := make([]RoomSummary, 0, len(all))
	for _, r := range all {
		r.Mu().Lock()
		if !r.Public {
			r.Mu().Unlock()
			continue // private rooms are only joinable by code
		}
		players, connected := 0, 0
		for _, p := range r.Players {
			if p == nil {
				continue
			}
			players++
			if p.WS != nil && p.LeftAt.IsZero() {
				connected++
			}
		}
		mode := r.Mode
		if mode == "" {
			mode = "ffa"
		}
		teamSize := r.TeamSize
		if teamSize <= 0 {
			teamSize = 1
		}
		out = append(out, RoomSummary{
			Code: r.Code, Mode: mode, TeamSize: teamSize, Stocks: r.Stocks, Stage: r.Stage,
			Players: players, Connected: connected, MaxPlayers: r.MaxPlayers(),
			Playing: r.Match != nil, Updated: r.Updated,
		})
		r.Mu().Unlock()
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Playing != out[j].Playing {
			return !out[i].Playing
		}
		if out[i].Connected != out[j].Connected {
			return out[i].Connected > out[j].Connected
		}
		return out[i].Code < out[j].Code
	})
	return out
}

func NewToken() string {
	b := make([]byte, 24)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func ValidCapacity(n int) bool {
	for _, c := range Capacities {
		if c == n {
			return true
		}
	}
	return false
}
