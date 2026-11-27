package contract

// Control messages are JSON text frames. Snapshots are binary protobuf frames.

const Protocol = 1
const ResumeMS = 20_000

type ClientType string

const (
	CCreate ClientType = "create"
	CJoin   ClientType = "join"
	CResume ClientType = "resume"
	CPing   ClientType = "ping"
	CInput  ClientType = "input"
	CSelect ClientType = "select"
	CReady  ClientType = "ready"
	CStage  ClientType = "stage"
	CStart  ClientType = "start"
	CLobby     ClientType = "lobby"
	CLeave     ClientType = "leave"
	CRoomConfig ClientType = "roomConfig"
	CKick       ClientType = "kick"
	CBan        ClientType = "ban"
	CName       ClientType = "name"
	CRollbackSync ClientType = "rollbackSync"
)

type ClientMessage struct {
	SyncRequest int `json:"syncRequest,omitempty"`
	MatchID int `json:"matchId,omitempty"`
	AfterFrame *int `json:"afterFrame,omitempty"`
	Type       ClientType `json:"type"`
	Protocol   int        `json:"protocol,omitempty"`
	MaxPlayers int        `json:"maxPlayers,omitempty"`
	Mode       string     `json:"mode,omitempty"`
	TeamSize   int        `json:"teamSize,omitempty"`
	Code       string     `json:"code,omitempty"`
	Token      string     `json:"token,omitempty"`
	Seq        int        `json:"seq,omitempty"`
	Actions    []string   `json:"actions,omitempty"`
	FighterID  string     `json:"fighterId,omitempty"`
	Ready      *bool      `json:"ready,omitempty"`
	Stage      *int       `json:"stage,omitempty"`
	Stocks     *int       `json:"stocks,omitempty"`
	Public     *bool      `json:"public,omitempty"`
	Name       string     `json:"name,omitempty"`
	ClientID   string     `json:"clientId,omitempty"`
	TargetSlot *int       `json:"targetSlot,omitempty"`
}

type RoomPlayer struct {
	Slot      int     `json:"slot"`
	Name      string  `json:"name"`
	FighterID *string `json:"fighterId"`
	Color     string  `json:"color"`
	Ready     bool    `json:"ready"`
	Connected bool    `json:"connected"`
	Ping      int     `json:"ping"`
}

type RoomState struct {
	Type         string        `json:"type"`
	Code         string        `json:"code"`
	HostSlot     int           `json:"hostSlot"`
	Stage        int           `json:"stage"`
	MaxPlayers   int           `json:"maxPlayers"`
	Mode         string        `json:"mode"`
	TeamSize     int           `json:"teamSize"`
	Stocks       int           `json:"stocks"`
	Public       bool          `json:"public"`
	Playing      bool          `json:"playing"`
	Standings    []int         `json:"standings"`
	ChampionNext int           `json:"championNext,omitempty"`
	ChampionSize int           `json:"championSize,omitempty"`
	Players      []*RoomPlayer `json:"players"`
}

type SeatMessage struct {
	Type  string `json:"type"`
	Code  string `json:"code"`
	Slot  int    `json:"slot"`
	Token string `json:"token"`
	Seq   int    `json:"seq"`
}

type ErrorMessage struct {
	Type    string `json:"type"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

type HelloMessage struct {
	CheckpointVersion int `json:"checkpointVersion,omitempty"`
	InputMask uint16 `json:"inputMask,omitempty"`
	BinaryInput bool `json:"binaryInput,omitempty"`
	Type     string `json:"type"`
	Protocol int    `json:"protocol"`
}

type PongMessage struct {
	Type string `json:"type"`
}
