package sim

import (
	"fmt"
	"math"
)

const (
	TagHealth         = 1000
	TagAssistCooldown = 240
	TagRoundTicks     = 180 * 60
)

type TagMemberState struct {
	FighterID     string
	Health        uint16
	BlueHealth    uint16
	AssistCDTicks uint16
}

type TagTeamState struct {
	Members          [3]TagMemberState
	Active           uint8
	AssistMember     uint8
	AssistTicks      uint8
	AssistX, AssistY float64
	AssistFacing     int
	Held             [2]uint8
}

type TagMatchState struct {
	Teams [2]TagTeamState
}

func NewTagMatch(teams [2][3]string, stage int, seed uint32, cfg Config) (*Match, error) {
	tag := &TagMatchState{}
	for seat, roster := range teams {
		for i, id := range roster {
			if president(id) == nil {
				return nil, fmt.Errorf("luchador inválido: %s", id)
			}
			for _, previous := range roster[:i] {
				if previous == id {
					return nil, fmt.Errorf("luchador repetido en equipo %d: %s", seat+1, id)
				}
			}
			tag.Teams[seat].Members[i] = TagMemberState{FighterID: id, Health: TagHealth}
		}
	}
	cfg.Stocks = 3
	m, err := NewOnlineMatchWithConfig([]string{teams[0][0], teams[1][0]}, stage, seed, cfg)
	if err != nil {
		return nil, err
	}
	m.Tag = tag
	return m, nil
}

func (m *Match) validTagState() bool {
	if m.Tag == nil {
		return true
	}
	if m.Capacity != 2 {
		return false
	}
	for slot, team := range m.Tag.Teams {
		if team.Active >= 3 || team.AssistMember >= 3 || team.AssistTicks > 24 ||
			m.Fighters[slot].ID != team.Members[team.Active].FighterID {
			return false
		}
		for i, member := range team.Members {
			if president(member.FighterID) == nil || int(member.Health)+int(member.BlueHealth) > TagHealth ||
				member.AssistCDTicks > TagAssistCooldown {
				return false
			}
			for _, previous := range team.Members[:i] {
				if previous.FighterID == member.FighterID {
					return false
				}
			}
		}
	}
	return true
}

func (m *Match) applyTagDamage(f *Fighter, damage float64) {
	if m.Tag == nil || damage <= 0 {
		return
	}
	team := &m.Tag.Teams[f.Slot]
	member := &team.Members[team.Active]
	points := min(int(member.Health), max(1, int(math.Round(damage*10))))
	member.Health -= uint16(points)
	member.BlueHealth += uint16(points / 3)
}

func (m *Match) updateTagTeam(f *Fighter, input Input) {
	team := &m.Tag.Teams[f.Slot]
	for i := range team.Members {
		member := &team.Members[i]
		if member.AssistCDTicks > 0 {
			member.AssistCDTicks--
		}
		if i != int(team.Active) && member.Health > 0 && member.BlueHealth > 0 && m.Tick%3 == 0 {
			member.Health++
			member.BlueHealth--
		}
	}
	if team.AssistTicks > 0 {
		team.AssistTicks--
		if team.AssistTicks == 16 && f.Dead == 0 {
			member := president(team.Members[team.AssistMember].FighterID)
			m.addProjectile(&Projectile{
				X: team.AssistX, Y: team.AssistY, W: 24, H: 20, VX: float64(team.AssistFacing) * 10,
				Dir: team.AssistFacing, Life: 35, Kind: "pulse", Owner: f.Slot,
				OwnerColor: member.Palette.Base, OwnerHighlight: member.Palette.Highlight,
				Dmg: 5 * member.Stats.Power, BK: 3.4, KS: .1, Ang: -20,
			})
		}
	}
	if f.Dead > 0 || f.Stocks == 0 || m.WinnerPi != nil {
		team.Held = [2]uint8{}
		return
	}
	active := team.Active
	for button, pressed := range [2]bool{input.Assist1, input.Assist2} {
		target := uint8(button)
		if target >= active {
			target++
		}
		member := &team.Members[target]
		held := team.Held[button]
		if pressed {
			if held < 18 {
				team.Held[button]++
			}
		} else {
			team.Held[button] = 0
		}
		if member.Health == 0 || f.Stun > 0 || f.DashT > 0 || f.ReflectTicks > 0 {
			continue
		}
		rival := m.Fighters[1-f.Slot]
		forward := (input.Right && !input.Left && rival.CX() > f.CX()) ||
			(input.Left && !input.Right && rival.CX() < f.CX())
		if pressed && ((held == 0 && forward) || held == 17) && f.Atk == nil && team.AssistTicks == 0 {
			m.swapTagFighter(f, team, target, false)
			return
		}
		if !pressed && held > 0 && held < 18 && team.AssistTicks == 0 && member.AssistCDTicks == 0 {
			member.AssistCDTicks = TagAssistCooldown
			team.AssistMember, team.AssistTicks = target, 24
			team.AssistFacing = f.Face
			team.AssistX, team.AssistY = f.CX(), f.CY()-10
		}
	}
}

func (m *Match) swapTagFighter(f *Fighter, team *TagTeamState, target uint8, respawn bool) {
	seat, stocks := f.Slot, f.Stocks
	member := &team.Members[target]
	definition := *president(member.FighterID)
	x, y, face, platform, on := f.X, f.Y, f.Face, f.Pl, f.On
	if respawn {
		spawn := m.Spawns[seat]
		x, y, platform, on = spawn.X-f.W/2, spawn.Y-f.H, m.platAt(spawn.X, spawn.Y), true
	}
	*f = Fighter{Slot: seat, ID: member.FighterID, D: &definition, W: 38, H: 92,
		Balance: true, Difficulty: m.Cfg.AIDifficulty, MaxStocks: 3}
	f.Reset(x, y, true, stocks)
	f.Face, f.Pl, f.On = face, platform, on
	f.Inv = 12
	if respawn {
		f.Inv = 60
	}
	f.Pct = float64(TagHealth-member.Health) / 10
	team.Active = target
	team.Held = [2]uint8{18, 18}
}

func (m *Match) finishTagStep() {
	for slot, f := range m.Fighters {
		team := &m.Tag.Teams[slot]
		if f.Stocks > 0 && f.Dead == 0 && team.Members[team.Active].Health == 0 {
			m.triggerKO(f, f.LastAttacker)
		}
	}
	if m.Tick < TagRoundTicks || m.WinnerPi != nil ||
		m.Fighters[0].Stocks == 0 || m.Fighters[1].Stocks == 0 {
		return
	}
	total := [2]int{}
	for slot, team := range m.Tag.Teams {
		for _, member := range team.Members {
			total[slot] += int(member.Health)
		}
	}
	// An equal score goes to sudden death until the health totals differ.
	if total[0] == total[1] {
		return
	}
	loser := 0
	if total[0] > total[1] {
		loser = 1
	}
	m.Fighters[loser].Stocks = 0
}
