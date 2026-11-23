package rooms

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"

	"github.com/presidential-brawl/server/contract"
	"github.com/presidential-brawl/server/sim"
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
	Token      string
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
	Code      string
	Players   []*Player
	HostSlot  int
	Stage     int
	Match     sim.Match
	Standings []int
	ClockMS   float64
	Updated   time.Time
	mu        sync.Mutex
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
			Slot: i, FighterID: fighterID, Color: Colors[i%len(Colors)],
			Ready: p.Ready, Connected: p.WS != nil, Ping: p.Ping,
		}
	}
	return contract.RoomState{
		Type: "room", Code: r.Code, HostSlot: r.HostSlot, Stage: r.Stage,
		MaxPlayers: r.MaxPlayers(), Playing: r.Match != nil, Standings: r.Standings,
		Players: players,
	}
}

type clientBind struct {
	room   *Room
	player *Player
	slot   int
}

type Registry struct {
	mu      sync.Mutex
	rooms   map[string]*Room
	clients map[*Client]*clientBind
}

func NewRegistry() *Registry {
	return &Registry{rooms: map[string]*Room{}, clients: map[*Client]*clientBind{}}
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

func (reg *Registry) Create(maxPlayers int) *Room {
	reg.mu.Lock()
	defer reg.mu.Unlock()
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
			Stage: 0, Updated: time.Now(),
		}
		reg.rooms[code] = r
		return r
	}
}

func (reg *Registry) Delete(code string) {
	reg.mu.Lock()
	defer reg.mu.Unlock()
	delete(reg.rooms, code)
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
