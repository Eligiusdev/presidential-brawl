package sim

func (m *OnlineMatch) Snapshot() any {
	players := make([]map[string]any, 0, len(m.Players))
	for _, f := range m.Players {
		if f == nil { continue }
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
			"shootRecoil": 0, "landT": 0, "crouch": f.Crouch, "boss": false, "hitFlash": f.HitFlash > 0,
			"squashX": f.SquashX, "squashY": f.SquashY, "atk": attackWire(f), "field": nil, "rage": 0.0,
		})
	}
	projs := make([]map[string]any, 0, len(m.projs))
	for _, p := range m.projs {
		projs = append(projs, map[string]any{"x":p.X,"y":p.Y,"w":p.W,"h":p.H,"vx":p.VX,"vy":p.VY,"owner":p.Owner,"dmg":p.Dmg,"bk":p.BK,"ks":p.KS,"ang":p.Ang,"life":p.Life,"kind":p.Kind})
	}
	camX, camY, camZ := m.camera()
	return map[string]any{
		"tick": m.Tick, "stage": m.Stage,
		"players": players, "zones": []any{}, "projectiles": projs, "cine": nil,
		"world": map[string]any{
			"T": int(m.Tick), "shake": 0, "freeze": 0, "seed": m.Seed,
			"banner": map[string]any{"t": "", "l": 0, "m": 1},
			"particles": []any{}, "crowdParticles": []any{},
			"crowd": map[string]any{"excitement": 0.12, "cheerTimer": 0, "mood": "calm", "accentColor": "#f5d76e", "accentHighlight": "#fff3a0", "seed": m.Seed},
			"hitstop": 0, "online": len(m.Players),
			"camera": map[string]any{"x": camX, "y": camY, "zoom": camZ},
			"hitboxes": []any{},
		},
	}
}

// attackWire expone la fase activa con la forma que espera el renderer (spec.ph).
func attackWire(f *Fighter) any {
	if f.Atk == nil {
		return nil
	}
	spec := f.Atk.Spec
	ph := make([]map[string]any, 0, len(spec.Ph))
	startup, activeEnd := 0, 0
	for i, p := range spec.Ph {
		phase := map[string]any{"a": []int{p.A[0], p.A[1]}, "fx": "impact", "armor": p.Armor}
		if p.HB != nil {
			phase["hb"] = map[string]any{"fx": p.HB.FX, "y": p.HB.Y, "w": p.HB.W, "h": p.HB.H}
		}
		ph = append(ph, phase)
		if i == 0 {
			startup, activeEnd = p.A[0], p.A[1]
		}
	}
	active := activeEnd - startup + 1
	if active < 1 {
		active = 1
	}
	dur := spec.Dur
	if dur < activeEnd+1 {
		dur = activeEnd + 1
	}
	kind := "h"
	if f.Atk.MoveKind == "jab" {
		kind = "l"
	}
	return map[string]any{
		"t": f.Atk.T, "armor": false,
		"spec": map[string]any{
			"k": kind, "individual": false, "downSpecial": f.Atk.MoveKind == "downSpec",
			"effect": spec.Effect, "moveKind": f.Atk.MoveKind, "dur": dur, "heavy": f.Atk.Heavy,
			"frames": map[string]any{"startup": startup, "active": active},
			"animationTiming": map[string]any{
				"from": []int{0, startup, activeEnd, dur},
				"to":   []int{0, 5, 11, 18},
			},
			"ph": ph,
		},
	}
}

func stateName(f *Fighter) string {
	if f.Dead > 0 { return "ko" }
	if f.MoveKind != "" { return f.MoveKind }
	if f.On { return "idle" }
	return "air"
}

func (m *OnlineMatch) camera() (float64, float64, float64) {
	var sx, sy, n float64
	for _, f := range m.Players {
		if f == nil || f.Stocks <= 0 { continue }
		sx += f.X + f.W/2; sy += f.Y + f.H/2; n++
	}
	if n == 0 { return 720, 405, 1.0 }
	cx, cy := sx/n, sy/n
	zoom := 1.0
	if n > 2 { zoom = 0.85 }
	return cx, cy, zoom
}
