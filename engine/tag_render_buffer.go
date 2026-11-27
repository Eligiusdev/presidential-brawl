package sim

const TagHUDStride = 20

type TagHUDBuffer [RenderSlots * TagHUDStride]uint32

var tagRenderID = func() map[string]uint32 {
	ids := make(map[string]uint32, len(fighterIDs))
	for i, id := range fighterIDs {
		ids[id] = uint32(i + 1)
	}
	return ids
}()

func (t *RollbackTimeline) WriteTagHUD(out *TagHUDBuffer) {
	t.match.WriteTagHUD(out)
}

// Roster IDs are one-based indices in FighterIDs. IDs and inactive slots of
// zero are reserved. Offsets 2–4 are reserved for Ki and Sparking.
func (m *Match) WriteTagHUD(out *TagHUDBuffer) {
	clear(out[:])
	if m.Tag == nil {
		return
	}
	for seat, team := range m.Tag.Teams {
		base := seat * TagHUDStride
		out[base] = uint32(len(team.Members))
		out[base+1] = uint32(team.Active)
		for i, member := range team.Members {
			at := base + 5 + 5*i
			out[at] = tagRenderID[member.FighterID]
			out[at+1] = uint32(member.Health)
			out[at+2] = TagHealth
			out[at+3] = uint32(member.BlueHealth)
			out[at+4] = uint32(member.AssistCDTicks)
		}
	}
}
