package sim

import "encoding/json"

const (
	snapshotParticleLimit      = 16
	snapshotCrowdParticleLimit = 8
)

// RichWorld replica exactamente la forma de WorldRenderContext que consume
// PixelRenderer. El mismo JSON se usa en el servidor (online) y en WASM (local),
// de modo que ambas partidas se dibujan con idénticos datos.
type RichWorld struct {
	Rich            bool         `json:"rich,omitempty"`
	Seed            uint32       `json:"seed"`
	T               int          `json:"T"`
	Online          int          `json:"online,omitempty"`
	Camera          *Point       `json:"camera"`
	W               float64      `json:"W"`
	H               float64      `json:"H"`
	StageNightStart bool         `json:"stageNightStart"`
	Main            Rect         `json:"main"`
	Plats           []PlatformDef `json:"plats"`
	HazPhase        int          `json:"hzPhase"`
	HazMod          int          `json:"hzMod"`
	HazDur          int          `json:"hzDur"`
	LegacyHazards   bool         `json:"legacyHazards"`
	Fighters        []*RichFighter `json:"fighters"`
	Projectiles     []*Projectile `json:"projectiles"`
	Items           []*Item      `json:"items"`
	Particles       []Particle   `json:"particles"`
	Crowd           Crowd        `json:"crowd"`
	CrowdParticles  []CrowdParticle `json:"crowdParticles"`
	Ults            []*UltEffect `json:"ults"`
	Cine            *Cine        `json:"cine"`
	Telegraph       *Telegraph   `json:"telegraph"`
	Shake           float64      `json:"shake"`
	BannerMsg       FloatText    `json:"bannerMsg"`
	FloatTexts      []FloatText  `json:"floatTexts"`
	WinnerPi        *int         `json:"winnerPi"`
	Strikes         []Strike     `json:"strikes"`
	Hitboxes        []Hitbox     `json:"hitboxes"`
}

type AtkWire struct {
	T     int       `json:"t"`
	Armor bool      `json:"armor"`
	Spec  *MoveData `json:"spec"`
}

type RichFighter struct {
	ID           string `json:"id"`
	FighterID    string `json:"fighterId"`
	PI           int    `json:"pi"`
	Slot         int    `json:"slot"`
	X  float64 `json:"x"`
	Y  float64 `json:"y"`
	CX float64 `json:"cx"`
	CY float64 `json:"cy"`
	W  float64 `json:"w"`
	H  float64 `json:"h"`
	VX float64 `json:"vx"`
	VY float64 `json:"vy"`
	Face         int    `json:"face"`
	Pct          float64 `json:"pct"`
	Vote         float64 `json:"vote"`
	Stocks       int    `json:"stocks"`
	Dead         int    `json:"dead"`
	Inv          int    `json:"inv"`
	Stun         int    `json:"stun"`
	MaxStun      int    `json:"maxStun"`
	JumpTick     int    `json:"jumpTick"`
	KOVisual     *KOVis `json:"koVisual"`
	DashT        int    `json:"dashT"`
	DashCD       int    `json:"dashCD"`
	Combo        int    `json:"combo"`
	JabStep      int    `json:"jabStep"`
	Floating     bool   `json:"floating"`
	FastFall     bool   `json:"fastFall"`
	Winning      bool   `json:"winning"`
	WinT         int    `json:"winT"`
	MoveKind     string `json:"moveKind"`
	PickupT      int    `json:"pickupT"`
	Wpn          int    `json:"wpn"`
	WK           string `json:"wk"`
	Ammo         int    `json:"ammo"`
	MaxAmmo      int    `json:"maxAmmo"`
	ReloadT      int    `json:"reloadT"`
	ReloadDur    int    `json:"reloadDur"`
	ShootRecoil  int    `json:"shootRecoil"`
	LandT        int    `json:"landT"`
	Crouch       bool   `json:"crouch"`
	Boss         bool   `json:"boss"`
	HitFlash     int    `json:"hitFlash"`
	SquashX      float64 `json:"squashX"`
	SquashY      float64 `json:"squashY"`
	Atk          *AtkWire `json:"atk"`
	Field        *Field `json:"field"`
	Rage         int    `json:"rage"`
	Afterimages  []Afterimage `json:"afterimages"`
	On           bool   `json:"on"`
	Wall         int    `json:"wall"`
}

type RichSnapshot struct {
	Type      string `json:"type"`
	Tick      uint32 `json:"tick"`
	Stage     int    `json:"stage"`
	Ack       []int  `json:"ack"`
	Players   []*RichFighter `json:"players"`
	World     RichWorld `json:"world"`
	Zones     []*UltEffect `json:"zones"`
	Projectiles []*Projectile `json:"projectiles"`
	Cine      *Cine `json:"cine"`
	Telegraph *Telegraph `json:"telegraph"`
	Standings []int `json:"standings"`
	WinnerPi  *int `json:"winnerPi"`
}

func (m *Match) richFighter(f *Fighter) *RichFighter {
	var atk *AtkWire
	if f.Atk != nil {
		cp := *f.Atk.Spec
		atk = &AtkWire{T: f.Atk.T, Armor: f.Atk.Armor, Spec: &cp}
	}
	return &RichFighter{
		ID: f.ID, FighterID: f.ID, PI: f.Slot, Slot: f.Slot,
		X: f.X, Y: f.Y, CX: f.CX(), CY: f.CY(), W: f.W, H: f.H,
		VX: f.VX, VY: f.VY, Face: f.Face, Pct: f.Pct, Vote: f.Vote, Stocks: f.Stocks,
		Dead: f.Dead, Inv: f.Inv, Stun: f.Stun, MaxStun: f.MaxStun,
		JumpTick: f.JumpTick, KOVisual: f.KOVisual, DashT: f.DashT, DashCD: f.DashCD,
		Combo: f.Combo, JabStep: f.JabStep, Floating: f.Floating, FastFall: f.FastFall,
		Winning: f.Winning, WinT: f.WinT, MoveKind: f.MoveKind,
		PickupT: f.PickupT, Wpn: f.Wpn, WK: f.WeaponKind, Ammo: f.Ammo, MaxAmmo: f.MaxAmmo,
		ReloadT: f.ReloadT, ReloadDur: f.ReloadDur, ShootRecoil: f.ShootRecoil,
		LandT: f.LandT, Crouch: f.Crouch, Boss: f.Boss, HitFlash: f.HitFlash,
		SquashX: f.SquashX, SquashY: f.SquashY, Atk: atk, Field: f.Field, Rage: f.Rage,
		Afterimages: f.Afterimages, On: f.On, Wall: f.Wall,
	}
}

func (m *Match) richSnapshot() *RichSnapshot {
	cx, cy, cz := m.Camera()
	cam := &Point{X: cx, Y: cy, Zoom: cz}
	particles := m.Particles
	if len(particles) > snapshotParticleLimit {
		particles = particles[len(particles)-snapshotParticleLimit:]
	}
	crowdParticles := m.CrowdParticles
	if len(crowdParticles) > snapshotCrowdParticleLimit {
		crowdParticles = crowdParticles[len(crowdParticles)-snapshotCrowdParticleLimit:]
	}
	world := RichWorld{
		Rich: true, Seed: m.Seed, T: int(m.Tick), Online: m.Capacity, Camera: cam,
		W: Data().World.W, H: Data().World.H,
		StageNightStart: (m.Seed%3 == 0),
		Main: m.Main, Plats: m.Plats,
		HazPhase: m.HZPhase, HazMod: m.HZMod, HazDur: stageData(m.Stage).HazardDur,
		Fighters: make([]*RichFighter, 0, len(m.Fighters)),
		Projectiles: m.Projectiles, Items: m.Items,
		Particles: particles, Crowd: m.Crowd, CrowdParticles: crowdParticles,
		Ults: m.UltEffects, Cine: m.Cine, Telegraph: m.Telegraph,
		Shake: m.Shake, BannerMsg: m.BannerMsg, FloatTexts: m.FloatTexts,
		WinnerPi: m.WinnerPi, Strikes: m.Strikes, Hitboxes: m.Hitboxes,
	}
	for _, f := range m.Fighters { world.Fighters = append(world.Fighters, m.richFighter(f)) }
	snap := &RichSnapshot{
		Type: "snapshot", Tick: m.Tick, Stage: m.Stage, Ack: make([]int, m.Capacity),
		Players: world.Fighters, World: world,
		Zones: m.UltEffects, Projectiles: m.Projectiles,
		Cine: m.Cine, Telegraph: m.Telegraph,
		Standings: m.StandingsList, WinnerPi: m.WinnerPi,
	}
	for i := range snap.Ack { snap.Ack[i] = -1 }
	return snap
}

// Snapshot mantiene la interfaz del servidor; devuelve un mapa rico que el
// backend puede codificar como JSON o como payload protobuf opaco.
func (m *Match) Snapshot() any {
	snap := m.richSnapshot()
	b, _ := json.Marshal(snap)
	var out map[string]any
	_ = json.Unmarshal(b, &out)
	return out
}

// NetworkSnapshot retains simulation indices (PI) and exposes the room seat in Slot.
func (m *Match) NetworkSnapshot(ack, matchSlots []int) *RichSnapshot {
	snap := m.richSnapshot()
	snap.Ack = ack
	for _, fighter := range snap.Players {
		if fighter.PI >= 0 && fighter.PI < len(matchSlots) {
			fighter.Slot = matchSlots[fighter.PI]
		}
	}
	if len(matchSlots) > 0 && snap.Standings != nil {
		snap.Standings = append([]int(nil), snap.Standings...)
		for i, slot := range snap.Standings {
			if slot >= 0 && slot < len(matchSlots) {
				snap.Standings[i] = matchSlots[slot]
			}
		}
	}

	// The top-level snapshot already carries these values for the renderer.
	snap.World.Fighters = nil
	snap.World.Projectiles = nil
	snap.World.Ults = nil
	snap.World.Cine = nil
	snap.World.Telegraph = nil
	return snap
}

func (m *Match) SnapshotJSON() []byte {
	b, _ := json.Marshal(m.richSnapshot())
	return b
}
