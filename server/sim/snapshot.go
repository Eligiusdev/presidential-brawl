package sim

func (m *OnlineMatch) Snapshot() any {
	players := make([]map[string]any, 0, len(m.Players))
	for _, f := range m.Players {
		if f == nil {
			continue
		}
		players = append(players, map[string]any{
			"id": f.Slot, "slot": f.Slot, "fighterId": f.FighterID, "facing": f.Facing,
			"state": stateName(f), "frame": int(m.Tick), "damage": f.Damage, "stocks": f.Stocks,
			"ultCharge": f.UltCharge, "hitstop": 0,
			"x": f.X, "y": f.Y, "w": f.W, "h": f.H, "vx": f.VX, "vy": f.VY,
			"on": f.On, "wall": false, "dead": f.Dead, "inv": f.Inv, "stun": f.Stun, "maxStun": f.MaxStun,
			"jumpTick": f.JumpTick, "koVisual": 0, "dashT": f.DashT, "dashCD": f.DashCD,
			"combo": f.Combo, "jabStep": 0, "floating": false, "fastFall": f.FastFall,
			"winning": f.Winning, "winT": f.WinT, "moveKind": f.MoveKind, "pickupT": 0,
			"wpn": "", "wk": false, "ammo": f.Ammo, "maxAmmo": f.MaxAmmo, "reloadT": f.ReloadT, "reloadDur": f.ReloadDur,
			"shootRecoil": 0, "landT": 0, "crouch": f.Crouch, "boss": false, "hitFlash": f.HitFlash,
			"squashX": 1.0, "squashY": 1.0, "atk": nil, "field": nil, "rage": 0.0,
		})
	}
	camX, camY, camZ := m.camera()
	return map[string]any{
		"tick": m.Tick, "stage": m.Stage,
		"players": players, "zones": []any{}, "projectiles": []any{}, "cine": nil,
		"world": map[string]any{
			"T": int(m.Tick), "shake": 0, "freeze": 0,
			"banner": map[string]any{"t": "", "l": 0, "m": 1},
			"particles": []any{}, "crowdParticles": []any{},
			"crowd": map[string]any{"excitement": 0.12, "cheerTimer": 0, "mood": "calm", "accentColor": "#f5d76e", "accentHighlight": "#fff3a0", "seed": m.Seed},
			"hitstop": 0, "online": len(m.Players),
			"camera": map[string]any{"x": camX, "y": camY, "zoom": camZ},
			"hitboxes": []any{},
		},
	}
}

func stateName(f *Fighter) string {
	if f.Dead > 0 {
		return "ko"
	}
	if f.MoveKind != "" {
		return f.MoveKind
	}
	if f.On {
		return "idle"
	}
	return "air"
}

func (m *OnlineMatch) camera() (float64, float64, float64) {
	// simple camera: center on alive fighters
	var sx, sy, n float64
	for _, f := range m.Players {
		if f == nil || f.Stocks <= 0 {
			continue
		}
		sx += f.X + f.W/2
		sy += f.Y + f.H/2
		n++
	}
	if n == 0 {
		return 720, 405, 1.0
	}
	cx, cy := sx/n, sy/n
	// clamp and zoom - keep it simple
	zoom := 1.0
	if n > 2 {
		zoom = 0.85
	}
	return cx, cy, zoom
}
