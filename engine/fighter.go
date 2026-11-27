package sim

import "math"

type Input struct {
	Assist1 bool `json:",omitempty"`
	Assist2 bool `json:",omitempty"`
	Medium bool `json:",omitempty"`
	Special bool `json:",omitempty"`
	Left, Right, Jump, Down, Light, Heavy, Dash, Ult, Reload bool
}

func parseInput(actions []string) Input {
	var in Input
	for _, a := range actions {
		switch a {
		case "left": in.Left = true
		case "right": in.Right = true
		case "jump": in.Jump = true
		case "down": in.Down = true
		case "assist1": in.Assist1 = true
		case "assist2": in.Assist2 = true
		case "medium": in.Medium = true
		case "special": in.Special = true
		case "light": in.Light = true
		case "heavy": in.Heavy = true
		case "dash": in.Dash = true
		case "ult": in.Ult = true
		case "reload": in.Reload = true
		}
	}
	return in
}

type InputEdge struct {
	Medium bool `json:",omitempty"`
	Special bool `json:",omitempty"`
	Left, Right, Jump, Down, Light, Heavy, Dash, Ult, Reload bool
}

func edge(now, prev Input) InputEdge {
	return InputEdge{
		Left: now.Left && !prev.Left, Right: now.Right && !prev.Right,
		Jump: now.Jump && !prev.Jump, Down: now.Down && !prev.Down,
		Light: now.Light && !prev.Light, Heavy: now.Heavy && !prev.Heavy,
		Dash: now.Dash && !prev.Dash, Ult: now.Ult && !prev.Ult,
		Reload: now.Reload && !prev.Reload,
		Medium: now.Medium && !prev.Medium, Special: now.Special && !prev.Special,
	}
}

type ActiveAtk struct {
	Spec   *MoveData
	T      int
	Hits   map[string]bool
	Armor  bool
	AR     bool
	Whiff  bool
	Baseline int
}

type Afterimage struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Face int `json:"face"`
	Alpha float64 `json:"alpha"`
}

type Field struct {
	Kind string `json:"kind"`
	Rect
	Life int `json:"life"`
	FloorY float64 `json:"floorY,omitempty"`
}

type KOVis struct {
	X float64 `json:"x"`
	Tick int `json:"tick"`
}

type Fighter struct {
	ReflectTicks int `json:",omitempty"`
	ReflectFace int `json:",omitempty"`
	ChainMove uint8 `json:",omitempty"`
	ChainTicks uint8 `json:",omitempty"`
	Slot int
	ID string
	D *PresidentData
	W, H float64
	X, Y, VX, VY float64
	Face int
	On bool
	Wall int
	Dead int
	Stocks, MaxStocks int
	Pct, Vote float64
	Inv, Stun, MaxStun int
	JumpTick int
	KOVisual *KOVis
	DashT, DashCD, DashDanceT int
	Combo, MaxCombo, CT, CTMax int
	LastAttacker int
	DamageDealt float64
	KOsDelivered int
	PerfectDodges int
	JabStep int
	Floating, FastFall bool
	FloatT, FloatMax int
	AirJ int
	UpSpecUsed bool
	PickupT, Wpn int
	WeaponKind string
	Ammo, MaxAmmo, ReloadT, ReloadDur int
	GunCD, ShootRecoil, LandT, DropT int
	Crouch, Boss bool
	HitFlash, Rage, SpeedTime int
	SquashX, SquashY float64
	Winning bool
	WinT int
	Afterimages []Afterimage
	Atk *ActiveAtk
	Field *Field
	RageHeel bool
	UltimateRecovery int
	HealedThisStock bool
	ProjectileCD int
	TrainingDummy bool
	Difficulty int
	Balance bool
	Prev, Cur Input
	Just InputEdge
	Pl *PlatformDef
	MoveKind string
}

func (f *Fighter) CX() float64 { return f.X + f.W/2 }
func (f *Fighter) CY() float64 { return f.Y + f.H/2 }
func (f *Fighter) Rect() Rect { return Rect{f.X, f.Y, f.W, f.H} }

func (f *Fighter) IsFloatZoner() bool {
	return f.D.SignatureType == "pulse" || f.D.WeaponType == "staff"
}
func (f *Fighter) IsAgile() bool {
	return f.D.SignatureType == "fencing" || f.D.SignatureType == "uppercut" || f.D.WeaponType == "saber"
}

func (f *Fighter) Speed() float64 { return f.D.Stats.Speed * f.D.Balance.Speed }
func (f *Fighter) JumpForce() float64 { return f.D.Stats.JumpForce }
func (f *Fighter) Power() float64 { return f.D.Stats.Power }
func (f *Fighter) Weight() float64 { return f.D.Stats.Weight * f.D.Balance.Weight }

func (f *Fighter) Move(slot string) *MoveData {
	if f.D.Moves == nil { return nil }
	switch slot {
	case "jab": return f.D.Moves.Jab
	case "neutral": return f.D.Moves.Neutral
	case "up": return f.D.Moves.Up
	case "down": return f.D.Moves.Down
	}
	return nil
}

func (f *Fighter) Reset(x, y float64, first bool, stocks int) {
	f.X, f.Y = x, y
	f.VX, f.VY = 0, 0
	f.Face = 1
	f.On = true
	f.Dead = 0
	f.Stocks = stocks
	f.Pct = 0
	f.Inv = 0
	if !first { f.Inv = 120 }
	f.Stun, f.MaxStun = 0, 0
	f.JumpTick = 0
	f.KOVisual = nil
	f.DashT, f.DashCD, f.DashDanceT = 0, 0, 0
	f.Combo, f.MaxCombo, f.CT = 0, 0, 0
	f.LastAttacker = -1
	f.DamageDealt, f.KOsDelivered, f.PerfectDodges = 0, 0, 0
	f.JabStep = 0
	f.ReflectTicks, f.ReflectFace, f.ChainMove, f.ChainTicks = 0, 0, 0, 0
	f.Floating, f.FastFall = false, false
	f.FloatT, f.FloatMax = 115, 115
	f.AirJ = 2
	f.UpSpecUsed = false
	f.PickupT, f.Wpn = 0, 0
	f.WeaponKind = ""
	f.Ammo, f.MaxAmmo, f.ReloadT, f.ReloadDur = 0, 0, 0, 0
	f.GunCD, f.ShootRecoil, f.LandT, f.DropT = 0, 0, 0, 0
	f.Crouch = false
	f.HitFlash, f.Rage, f.SpeedTime = 0, 0, 0
	f.SquashX, f.SquashY = 1, 1
	f.Winning, f.WinT = false, 0
	f.Afterimages = nil
	f.Atk = nil
	f.Field = nil
	f.UltimateRecovery = 0
	f.HealedThisStock = false
	f.ProjectileCD = 0
	f.Balance = true
	f.Prev, f.Cur, f.Just = Input{}, Input{}, InputEdge{}
	f.Pl = nil
	f.MoveKind = ""
}

func clamp(v, a, b float64) float64 {
	if v < a { return a }
	if v > b { return b }
	return v
}

func overlaps(a, b Rect) bool {
	return a.X < b.X+b.W && a.X+a.W > b.X && a.Y < b.Y+b.H && a.Y+a.H > b.Y
}

func hypot(dx, dy float64) float64 { return math.Sqrt(dx*dx + dy*dy) }

func sign(v float64) float64 {
	if v > 0 { return 1 }
	if v < 0 { return -1 }
	return 0
}
