package realtime

import (
	"encoding/json"

	pb "github.com/presidential-brawl/server/gen/go"
	"google.golang.org/protobuf/proto"
)

func encodeSnapshotBinary(snap any, ack []int) ([]byte, bool) {
	m, ok := snap.(map[string]any)
	if !ok {
		return nil, false
	}
	s := &pb.Snapshot{
		Tick:  u32(m["tick"]),
		Ack:   toI32(ack),
		Stage: i32(m["stage"]),
	}
	if players, ok := m["players"].([]map[string]any); ok {
		for _, p := range players {
			s.Players = append(s.Players, mapFighter(p))
		}
	}
	if world, ok := m["world"].(map[string]any); ok {
		s.World = mapWorld(world)
	}
	// El renderer necesita estos arrays para dibujar disparos, zonas y cinemáticas.
	// El id se deriva del índice para que la interpolación cliente pueda emparejarlos entre frames.
	if zones, ok := m["zones"].([]map[string]any); ok {
		for _, z := range zones {
			s.Zones = append(s.Zones, &pb.WireUltimate{
				F: i32(z["f"]), O: i32(z["o"]), Id: sval(z["id"]),
				T: i32(z["t"]), D: f32(z["d"]),
			})
		}
	}
	if projectiles, ok := m["projectiles"].([]map[string]any); ok {
		for i, p := range projectiles {
			dir := int32(1)
			if f32(p["vx"]) < 0 { dir = -1 }
			s.Projectiles = append(s.Projectiles, &pb.WireProjectile{
				Id: int32(i + 1), X: f32(p["x"]), Y: f32(p["y"]),
				W: i32(p["w"]), H: i32(p["h"]), Vx: f32(p["vx"]), Vy: f32(p["vy"]),
				Kind: sval(p["kind"]), Dir: dir, Life: i32(p["life"]),
			})
		}
	}
	if cine, ok := m["cine"].(map[string]any); ok {
		s.Cine = &pb.WireCine{F: i32(cine["f"]), Phase: i32(cine["phase"]), T: i32(cine["t"])}
	}
	b, err := proto.Marshal(s)
	if err != nil {
		return nil, false
	}
	return b, true
}

func u32(v any) uint32 { switch n := v.(type) { case uint32: return n; case int: return uint32(n); case int64: return uint32(n); case float64: return uint32(n) }; return 0 }
func i32(v any) int32 { switch n := v.(type) { case int: return int32(n); case int32: return n; case int64: return int32(n); case float64: return int32(n) }; return 0 }
func f32(v any) float32 { switch n := v.(type) { case float64: return float32(n); case float32: return n; case int: return float32(n) }; return 0 }
func bval(v any) bool { b, _ := v.(bool); return b }
func sval(v any) string { s, _ := v.(string); return s }
func toI32(in []int) []int32 { out := make([]int32, len(in)); for i, v := range in { out[i] = int32(v) }; return out }

func mapFighter(p map[string]any) *pb.WireFighter {
	f := &pb.WireFighter{
		Id: i32(p["id"]), Slot: i32(p["slot"]), FighterId: sval(p["fighterId"]), Facing: i32(p["facing"]),
		State: sval(p["state"]), Frame: i32(p["frame"]), Damage: f32(p["damage"]), Stocks: i32(p["stocks"]),
		UltCharge: f32(p["ultCharge"]), Hitstop: i32(p["hitstop"]), X: f32(p["x"]), Y: f32(p["y"]), W: i32(p["w"]), H: i32(p["h"]),
		Vx: f32(p["vx"]), Vy: f32(p["vy"]), On: bval(p["on"]), Wall: bval(p["wall"]), Dead: i32(p["dead"]), Inv: i32(p["inv"]),
		Stun: i32(p["stun"]), MaxStun: i32(p["maxStun"]), JumpTick: i32(p["jumpTick"]), KoVisual: i32(p["koVisual"]),
		DashT: i32(p["dashT"]), DashCd: i32(p["dashCD"]), Combo: i32(p["combo"]), JabStep: i32(p["jabStep"]),
		Floating: bval(p["floating"]), FastFall: bval(p["fastFall"]), Winning: bval(p["winning"]), WinT: i32(p["winT"]),
		MoveKind: sval(p["moveKind"]), PickupT: i32(p["pickupT"]), Wpn: sval(p["wpn"]), Wk: bval(p["wk"]),
		Ammo: i32(p["ammo"]), MaxAmmo: i32(p["maxAmmo"]), ReloadT: i32(p["reloadT"]), ReloadDur: i32(p["reloadDur"]),
		ShootRecoil: i32(p["shootRecoil"]), LandT: i32(p["landT"]), Crouch: bval(p["crouch"]), Boss: bval(p["boss"]),
		HitFlash: bval(p["hitFlash"]), SquashX: f32(p["squashX"]), SquashY: f32(p["squashY"]), Rage: f32(p["rage"]),
	}
	if p["field"] != nil { if b, err := json.Marshal(p["field"]); err == nil { f.FieldJson = b } }
	if p["atk"] != nil { if b, err := json.Marshal(p["atk"]); err == nil { f.AtkJson = b } }
	return f
}

func mapWorld(w map[string]any) *pb.WorldState {
	crowd, _ := w["crowd"].(map[string]any)
	banner, _ := w["banner"].(map[string]any)
	cam, _ := w["camera"].(map[string]any)
	ws := &pb.WorldState{
		T: i32(w["T"]), Shake: f32(w["shake"]), Freeze: i32(w["freeze"]),
		Hitstop: i32(w["hitstop"]), OnlineCapacity: i32(w["online"]), Seed: u32(w["seed"]),
		CrowdExcitement: f32(crowd["excitement"]), CrowdCheerTimer: i32(crowd["cheerTimer"]),
		CrowdMood: sval(crowd["mood"]), CrowdAccentColor: sval(crowd["accentColor"]), CrowdAccentHighlight: sval(crowd["accentHighlight"]),
		BannerT: sval(banner["t"]), BannerL: i32(banner["l"]), BannerM: i32(banner["m"]),
		CameraX: f32(cam["x"]), CameraY: f32(cam["y"]), CameraZoom: f32(cam["zoom"]),
	}
	return ws
}
