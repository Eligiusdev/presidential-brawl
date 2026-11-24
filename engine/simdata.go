package sim

import (
	"embed"
	"encoding/json"
	"sync"
)

//go:embed data/simdata.json
var dataFS embed.FS

type SimData struct {
	Version    int                          `json:"version"`
	World      WorldData                    `json:"world"`
	Limits     LimitsData                   `json:"limits"`
	Budgets    map[string]BudgetData        `json:"budgets"`
	ArenaScale map[string]ScaleData         `json:"arenaScale"`
	Presidents map[string]*PresidentData    `json:"presidents"`
	Stages     []*StageData                 `json:"stages"`
}

type WorldData struct {
	W     float64 `json:"W"`
	H     float64 `json:"H"`
	Blast Blast   `json:"blast"`
}

type LimitsData struct {
	ProjectileCooldown        int `json:"projectileCooldown"`
	FieldLifetime             int `json:"fieldLifetime"`
	ActivationHitstop         int `json:"activationHitstop"`
	MaxUltimateInvulnerability int `json:"maxUltimateInvulnerability"`
	TankArmorDamage           int `json:"tankArmorDamage"`
}

type BudgetData struct {
	Startup   int     `json:"startup"`
	MinDamage int     `json:"minDamage"`
	MaxDamage int     `json:"maxDamage"`
	MinRange  int     `json:"minRange"`
	MaxRange  int     `json:"maxRange"`
	Knockback int     `json:"knockback"`
	Whiff     int     `json:"whiff"`
}

type ScaleData struct {
	Width   float64 `json:"width"`
	Height  float64 `json:"height"`
	MinZoom float64 `json:"minZoom"`
	Levels  int     `json:"levels"`
}

type PresidentData struct {
	ID             string       `json:"id"`
	Name           string       `json:"name"`
	Stats          StatsData    `json:"stats"`
	SignatureType  string       `json:"signatureType"`
	WeaponType     string       `json:"weaponType"`
	UltimateID     string       `json:"ultimateId"`
	PowerSourceID  string       `json:"powerSourceId"`
	Palette        PaletteData  `json:"palette"`
	Balance        BalanceData  `json:"balance"`
	Category       string       `json:"category"`
	Moves          *MovesData   `json:"moves"`
	Ultimate       *UltimateDef `json:"ultimate"`
}

type StatsData struct {
	Speed     float64 `json:"speed"`
	Weight    float64 `json:"weight"`
	JumpForce float64 `json:"jumpForce"`
	Power     float64 `json:"power"`
}

type PaletteData struct {
	Base      string `json:"base"`
	Highlight string `json:"highlight"`
	Trim      string `json:"trim"`
}

type BalanceData struct {
	Weight    float64 `json:"weight"`
	Speed     float64 `json:"speed"`
	Vote      float64 `json:"vote"`
	Archetype string  `json:"archetype"`
}

type MovesData struct {
	Jab      *MoveData `json:"jab"`
	Neutral  *MoveData `json:"neutral"`
	Up       *MoveData `json:"up"`
	Down     *MoveData `json:"down"`
}

type FramesData struct {
	Startup  int `json:"startup"`
	Active   int `json:"active"`
	Recovery int `json:"recovery"`
	Damage   int `json:"damage"`
}

type TimingData struct {
	From []float64 `json:"from"`
	To   []float64 `json:"to"`
}

type LaunchData struct {
	VX float64 `json:"vx"`
	VY float64 `json:"vy"`
}

type HopData struct {
	T  int     `json:"t"`
	VY float64 `json:"vy"`
}

type MoveData struct {
	Name            string       `json:"name"`
	MoveKind        string       `json:"moveKind,omitempty"`
	K               string       `json:"k"`
	Dur             int          `json:"dur"`
	Effect          string       `json:"effect"`
	Launch          *LaunchData  `json:"launch"`
	Hop             *HopData     `json:"hop"`
	Balanced        bool         `json:"balanced"`
	Renewed         bool         `json:"renewed"`
	Tank            bool         `json:"tank"`
	Individual      bool         `json:"individual"`
	DownSpecial     bool         `json:"downSpecial"`
	Heavy           bool         `json:"heavy"`
	Frames          *FramesData  `json:"frames"`
	AnimationTiming *TimingData  `json:"animationTiming"`
	Ph              []PhaseData  `json:"ph"`
	Sp              []ShotDef    `json:"sp"`
}

type PhaseData struct {
	A      []int    `json:"a"`
	HB     *BoxDef  `json:"hb"`
	Dmg    float64  `json:"dmg"`
	BK     float64  `json:"bk"`
	KS     float64  `json:"ks"`
	Ang    float64  `json:"ang"`
	MV     *float64 `json:"mv"`
	Rear   bool     `json:"rear"`
	Every  int      `json:"every"`
	Armor  bool     `json:"armor"`
	Fx     string   `json:"fx"`
	Pierce bool     `json:"pierce"`
}

type BoxDef struct {
	FX float64 `json:"fx"`
	Y  float64 `json:"y"`
	W  float64 `json:"w"`
	H  float64 `json:"h"`
}

type ShotDef struct {
	T int        `json:"t"`
	P ShotParams `json:"p"`
}

type ShotParams struct {
	FX      float64 `json:"fx"`
	Y       float64 `json:"y"`
	W       float64 `json:"w"`
	H       float64 `json:"h"`
	VX      float64 `json:"vx"`
	VY      float64 `json:"vy"`
	Bounces int     `json:"bounces"`
	Life    int     `json:"life"`
	Kind    string  `json:"kind"`
	Dmg     float64 `json:"dmg"`
	BK      float64 `json:"bk"`
	KS      float64 `json:"ks"`
	Ang     float64 `json:"ang"`
	Hold    int     `json:"hold"`
	Back    bool    `json:"back"`
}

type UltimateDef struct {
	Spec    UltSpec     `json:"spec"`
	Profile UltProfile  `json:"profile"`
	Duration int        `json:"duration"`
}

type UltSpec struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Primitive   string   `json:"primitive"`
	Damage      float64  `json:"damage"`
	Knockback   float64  `json:"knockback"`
	RangePx     float64  `json:"rangePx"`
	DurationMs  float64  `json:"durationMs"`
	Hits        int      `json:"hits"`
	Colors      []string `json:"colors"`
	VfxKey      string   `json:"vfxKey"`
	Pattern     string   `json:"pattern"`
}

type UltProfile struct {
	Anchor      string      `json:"anchor"`
	Travel      string      `json:"travel"`
	Shape       string      `json:"shape"`
	Route       [][]float64 `json:"route"`
	Flags       []string    `json:"flags"`
	Description string      `json:"description"`
	Tempo       *TempoData  `json:"tempo"`
}

type TempoData struct {
	Distance float64   `json:"distance"`
	Steps    []float64 `json:"steps"`
	Speed    float64   `json:"speed"`
	Startup  int       `json:"startup"`
	Fixed    bool      `json:"fixed"`
}

type StageData struct {
	ID        string           `json:"id"`
	Name      string           `json:"name"`
	Main      Rect             `json:"main"`
	Plats     []PlatformDef    `json:"plats"`
	Hazard    string           `json:"hazard"`
	HazardDur int              `json:"hazardDur"`
	Palette   map[string]string `json:"palette"`
}

type PlatformDef struct {
	X  float64 `json:"x"`
	Y  float64 `json:"y"`
	W  float64 `json:"w"`
	Amp float64 `json:"amp"`
	Ph  float64 `json:"ph"`
	BaseY float64 `json:"-"`
}

type Rect struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	W float64 `json:"w"`
	H float64 `json:"h"`
}

type Blast struct {
	L float64 `json:"l"`
	R float64 `json:"r"`
	T float64 `json:"t"`
	B float64 `json:"b"`
}

var (
	dataOnce sync.Once
	simData  *SimData
)

func Data() *SimData {
	dataOnce.Do(func() {
		b, err := dataFS.ReadFile("data/simdata.json")
		if err != nil {
			panic("simdata: " + err.Error())
		}
		simData = &SimData{}
		if err := json.Unmarshal(b, simData); err != nil {
			panic("simdata: " + err.Error())
		}
	})
	return simData
}

func stageData(idx int) *StageData {
	d := Data()
	if idx < 0 || idx >= len(d.Stages) {
		return d.Stages[0]
	}
	return d.Stages[idx]
}

func president(id string) *PresidentData {
	if p := Data().Presidents[id]; p != nil {
		return p
	}
	return Data().Presidents["washington"]
}
