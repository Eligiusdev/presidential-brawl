package sim

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"maps"
	"slices"

	"github.com/presidential-brawl/engine/internal/rng"
)

// Checkpoint is an in-memory copy of a match at a Step boundary. It contains no
// callbacks or external resources. Save and Restore require exclusive access
// to the match, just like Step.
type Checkpoint struct {
	state *Match
}

func (m *Match) Save() Checkpoint {
	return Checkpoint{state: cloneMatch(m, true)}
}

// Restore copies the checkpoint again so it can be replayed more than once.
// Restore into a match without an OnEnd callback for speculative simulation.
func (m *Match) Restore(checkpoint Checkpoint) bool {
	if checkpoint.state == nil {
		return false
	}
	state := cloneMatch(checkpoint.state, true)
	state.OnEnd = m.OnEnd
	*m = *state
	return true
}

func copyValue[T any](value *T) *T {
	if value == nil {
		return nil
	}
	copy := *value
	return &copy
}

func clonePointers[T any](values []*T, clone func(*T) *T) []*T {
	out := slices.Clone(values)
	for i, value := range values {
		if value != nil {
			out[i] = clone(value)
		}
	}
	return out
}

func cloneMatch(m *Match, copyDefinitions bool) *Match {
	out := *m
	out.OnEnd = nil
	out.RNG = copyValue(m.RNG)
	out.VisRNG = copyValue(m.VisRNG)
	out.Plats = slices.Clone(m.Plats)
	out.Spawns = slices.Clone(m.Spawns)
	out.Fighters = clonePointers(m.Fighters, func(f *Fighter) *Fighter {
		next := *f
		if copyDefinitions && f.D != nil {
			next.D = copyValue(f.D)
			next.D.Ultimate = cloneUltimate(f.D.Ultimate)
			next.D.Moves = copyValue(f.D.Moves)
			if moves := next.D.Moves; moves != nil {
				moves.Jab, moves.Neutral = cloneMove(moves.Jab), cloneMove(moves.Neutral)
				moves.Up, moves.Down = cloneMove(moves.Up), cloneMove(moves.Down)
			}
		}
		next.KOVisual = copyValue(f.KOVisual)
		next.Field = copyValue(f.Field)
		next.Afterimages = slices.Clone(f.Afterimages)
		next.Atk = copyValue(f.Atk)
		if next.Atk != nil {
			next.Atk.Hits = maps.Clone(f.Atk.Hits)
			if copyDefinitions {
				next.Atk.Spec = cloneMove(f.Atk.Spec)
			}
		}
		if index := platformIndex(m, f.Pl); index >= 0 {
			next.Pl = &out.Plats[index]
		} else {
			next.Pl = copyValue(f.Pl)
		}
		return &next
	})
	out.Projectiles = clonePointers(m.Projectiles, func(p *Projectile) *Projectile {
		next := *p
		next.Done = maps.Clone(p.Done)
		return &next
	})
	out.Items = clonePointers(m.Items, copyValue[Item])
	out.Particles = slices.Clone(m.Particles)
	out.CrowdParticles = slices.Clone(m.CrowdParticles)
	out.UltEffects = clonePointers(m.UltEffects, func(u *UltEffect) *UltEffect {
		next := *u
		if copyDefinitions {
			next.Spec.Colors = slices.Clone(u.Spec.Colors)
		}
		next.Tr = slices.Clone(u.Tr)
		next.Bx = slices.Clone(u.Bx)
		next.M = slices.Clone(u.M)
		next.HH = slices.Clone(u.HH)
		next.Specialized = copyValue(u.Specialized)
		if next.Specialized != nil {
			next.Specialized.Origin = copyValue(u.Specialized.Origin)
			if copyDefinitions {
				next.Specialized.Ultimate = cloneUltimate(u.Specialized.Ultimate)
			}
		}
		return &next
	})
	out.Cine = copyValue(m.Cine)
	out.Telegraph = copyValue(m.Telegraph)
	if out.Telegraph != nil {
		out.Telegraph.Zones = slices.Clone(m.Telegraph.Zones)
		out.Telegraph.Origin = copyValue(m.Telegraph.Origin)
	}
	out.FloatTexts = slices.Clone(m.FloatTexts)
	out.Strikes = slices.Clone(m.Strikes)
	out.Hitboxes = slices.Clone(m.Hitboxes)
	out.WinnerPi = copyValue(m.WinnerPi)
	out.Eliminated = slices.Clone(m.Eliminated)
	out.StandingsList = slices.Clone(m.StandingsList)
	out.SoundEvents = slices.Clone(m.SoundEvents)
	out.ReplayKeys = slices.Clone(m.ReplayKeys)
	for i := range out.ReplayKeys {
		out.ReplayKeys[i].P1 = slices.Clone(m.ReplayKeys[i].P1)
		out.ReplayKeys[i].P2 = slices.Clone(m.ReplayKeys[i].P2)
	}
	return &out
}

func platformIndex(m *Match, platform *PlatformDef) int {
	for i := range m.Plats {
		if platform == &m.Plats[i] {
			return i
		}
	}
	return -1
}

func cloneMove(move *MoveData) *MoveData {
	out := copyValue(move)
	if out == nil {
		return nil
	}
	out.Launch = copyValue(move.Launch)
	out.Hop = copyValue(move.Hop)
	out.Frames = copyValue(move.Frames)
	out.AnimationTiming = copyValue(move.AnimationTiming)
	if out.AnimationTiming != nil {
		out.AnimationTiming.From = slices.Clone(move.AnimationTiming.From)
		out.AnimationTiming.To = slices.Clone(move.AnimationTiming.To)
	}
	out.Ph = slices.Clone(move.Ph)
	for i, phase := range move.Ph {
		out.Ph[i].A = slices.Clone(phase.A)
		out.Ph[i].HB = copyValue(phase.HB)
		out.Ph[i].MV = copyValue(phase.MV)
	}
	out.Sp = slices.Clone(move.Sp)
	return out
}

func cloneUltimate(ultimate *UltimateDef) *UltimateDef {
	out := copyValue(ultimate)
	if out == nil {
		return nil
	}
	out.Spec.Colors = slices.Clone(ultimate.Spec.Colors)
	out.Profile.Flags = slices.Clone(ultimate.Profile.Flags)
	out.Profile.Route = slices.Clone(ultimate.Profile.Route)
	for i, point := range ultimate.Profile.Route {
		out.Profile.Route[i] = slices.Clone(point)
	}
	out.Profile.Tempo = copyValue(ultimate.Profile.Tempo)
	if out.Profile.Tempo != nil {
		out.Profile.Tempo.Steps = slices.Clone(ultimate.Profile.Tempo.Steps)
	}
	return out
}

// StateHash covers simulation state and transient effects, including values
// hidden by the renderer's JSON format. It deliberately excludes callbacks.
func (m *Match) StateHash() (string, error) {
	encoded, err := json.Marshal(m.checkpointState())
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%x", sha256.Sum256(encoded)), nil
}

type checkpointState struct {
	*Match
	RNG        *uint32
	VisRNG     *uint32
	Platforms  []float64
	Contacts   []platformContact
	AlreadyHit []map[int]bool
}

func (m *Match) checkpointState() checkpointState {
	state := checkpointState{Match: m, RNG: rngState(m.RNG), VisRNG: rngState(m.VisRNG)}
	for _, platform := range m.Plats {
		state.Platforms = append(state.Platforms, platform.BaseY)
	}
	for _, fighter := range m.Fighters {
		contact := platformContact{Index: -1}
		if fighter != nil && fighter.Pl != nil {
			contact.Index = platformIndex(m, fighter.Pl)
			contact.BaseY = fighter.Pl.BaseY
		}
		state.Contacts = append(state.Contacts, contact)
	}
	for _, projectile := range m.Projectiles {
		var hit map[int]bool
		if projectile != nil {
			hit = projectile.Done
		}
		state.AlreadyHit = append(state.AlreadyHit, hit)
	}
	return state
}

const CheckpointVersion = 1

type wireCheckpoint struct {
	Version int             `json:"version"`
	State   checkpointState `json:"state"`
}

func (m *Match) MarshalCheckpoint() ([]byte, error) {
	return json.Marshal(wireCheckpoint{Version: CheckpointVersion, State: m.checkpointState()})
}

// DecodeCheckpoint accepts state from the authoritative server.
func DecodeCheckpoint(data []byte) (Checkpoint, error) {
	if len(data) > 2<<20 {
		return Checkpoint{}, fmt.Errorf("checkpoint exceeds maximum size")
	}
	var wire wireCheckpoint
	if err := json.Unmarshal(data, &wire); err != nil {
		return Checkpoint{}, err
	}
	s := wire.State
	m := s.Match
	if wire.Version != CheckpointVersion || m == nil || m.Frame < 0 || len(m.Fighters) < 2 ||
		len(m.Fighters) > 8 || m.Capacity != len(m.Fighters) || m.Stage < 0 || m.Stage >= len(Data().Stages) ||
		len(m.Plats) != len(s.Platforms) || len(m.Fighters) != len(s.Contacts) ||
		len(m.Projectiles) != len(s.AlreadyHit) || s.RNG == nil || s.VisRNG == nil {
		return Checkpoint{}, fmt.Errorf("incompatible checkpoint")
	}
	m.RNG, m.VisRNG = rng.NewRNG(*s.RNG), rng.NewRNG(*s.VisRNG)
	for i := range m.Plats {
		m.Plats[i].BaseY = s.Platforms[i]
	}
	for i, f := range m.Fighters {
		contact := s.Contacts[i]
		if f == nil || f.D == nil || f.Slot != i || contact.Index < -1 || contact.Index >= len(m.Plats) {
			return Checkpoint{}, fmt.Errorf("invalid fighter checkpoint")
		}
		if contact.Index >= 0 {
			f.Pl = &m.Plats[contact.Index]
		} else if f.Pl != nil {
			f.Pl.BaseY = contact.BaseY
		}
	}
	for i, p := range m.Projectiles {
		if p == nil {
			return Checkpoint{}, fmt.Errorf("invalid projectile checkpoint")
		}
		p.Done = s.AlreadyHit[i]
	}
	return Checkpoint{state: m}, nil
}

type platformContact struct {
	Index int
	BaseY float64
}

func rngState(source *rng.RNG) *uint32 {
	if source == nil {
		return nil
	}
	state := source.State()
	return &state
}
