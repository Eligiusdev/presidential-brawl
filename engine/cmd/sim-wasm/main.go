//go:build js && wasm

package main

import (
	"encoding/json"
	"syscall/js"

	"github.com/presidential-brawl/engine"
)

var matches = map[int]*sim.Match{}
var nextID = 1
var checkpoints = map[int]map[int]sim.Checkpoint{}
var nextCheckpointID = 1
var onlineTimelines = map[int]*sim.RollbackTimeline{}

const maxCheckpointsPerMatch = 120

type createOpts struct {
	Mode          string `json:"mode"`
	Stocks        int    `json:"stocks"`
	Knockback     float64 `json:"knockback"`
	Gravity       float64 `json:"gravity"`
	Hazard        string `json:"hazard"`
	Items         string `json:"items"`
	VoteGain      float64 `json:"voteGain"`
	StartFullVote bool   `json:"startFullVote"`
	AIDifficulty  int    `json:"aiDifficulty"`
	Hitstop       bool   `json:"hitstop"`
	CampaignRound int    `json:"campaignRound"`
}

func main() {
	registerOnlineRenderBuffer()
	js.Global().Set("pbSimCreate", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) < 3 {
			return map[string]any{"error": "args: idsJson, stage, seed[, configJson]"}
		}
		var ids []string
		if err := json.Unmarshal([]byte(args[0].String()), &ids); err != nil {
			return map[string]any{"error": err.Error()}
		}
		stage := args[1].Int()
		seed := uint32(args[2].Int())
		cfg := sim.DefaultConfig()
		if len(args) > 3 && args[3].String() != "" {
			var o createOpts
			if err := json.Unmarshal([]byte(args[3].String()), &o); err == nil {
				if o.Stocks > 0 { cfg.Stocks = o.Stocks }
				if o.Knockback > 0 { cfg.Knockback = o.Knockback }
				if o.Gravity > 0 { cfg.Gravity = o.Gravity }
				if o.Hazard != "" { cfg.Hazard = o.Hazard }
				if o.Items != "" { cfg.Items = o.Items }
				if o.VoteGain > 0 { cfg.VoteGain = o.VoteGain }
				cfg.StartFullVote = o.StartFullVote
				if o.AIDifficulty > 0 { cfg.AIDifficulty = o.AIDifficulty }
				cfg.Hitstop = o.Hitstop
				cfg.CampaignRound = o.CampaignRound
				cfg.Training = o.Mode == "training"
			}
		}
		mode := "versus"
		if len(args) > 4 && args[4].String() != "" { mode = args[4].String() }
		m, err := sim.NewLocalMatch(ids, stage, seed, cfg, mode)
		if err != nil { return map[string]any{"error": err.Error()} }
		id := nextID
		nextID++
		matches[id] = m
		return id
	}))

	js.Global().Set("pbSimStep", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) < 2 { return -1 }
		m := matches[args[0].Int()]
		if m == nil { return -1 }
		var inputs [][]string
		_ = json.Unmarshal([]byte(args[1].String()), &inputs)
		return int(m.Step(inputs))
	}))

	js.Global().Set("pbSimSnapshot", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) < 1 { return "{}" }
		m := matches[args[0].Int()]
		if m == nil { return "{}" }
		return string(m.SnapshotJSON())
	}))

	js.Global().Set("pbSimSave", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) < 1 {
			return -1
		}
		id := args[0].Int()
		match := matches[id]
		if match == nil || len(checkpoints[id]) >= maxCheckpointsPerMatch {
			return -1
		}
		if checkpoints[id] == nil {
			checkpoints[id] = make(map[int]sim.Checkpoint)
		}
		handle := nextCheckpointID
		nextCheckpointID++
		checkpoints[id][handle] = match.Save()
		return handle
	}))

	js.Global().Set("pbSimRestore", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) < 2 {
			return false
		}
		id := args[0].Int()
		match := matches[id]
		return match != nil && match.Restore(checkpoints[id][args[1].Int()])
	}))

	js.Global().Set("pbSimRestoreNetwork", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) < 2 {
			return false
		}
		id := args[0].Int()
		match := matches[id]
		if match == nil {
			return false
		}
		checkpoint, err := sim.DecodeCheckpoint([]byte(args[1].String()))
		if err != nil || !match.Restore(checkpoint) {
			return false
		}
		delete(checkpoints, id)
		return true
	}))

	js.Global().Set("pbSimDropCheckpoint", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) >= 2 {
			delete(checkpoints[args[0].Int()], args[1].Int())
		}
		return nil
	}))

	js.Global().Set("pbSimStateHash", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) < 1 {
			return nil
		}
		match := matches[args[0].Int()]
		if match == nil {
			return nil
		}
		hash, err := match.StateHash()
		if err != nil {
			return nil
		}
		return hash
	}))

	js.Global().Set("pbOnlineCreate", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) != 3 { return -1 }
		checkpoint, err := sim.DecodeCheckpoint([]byte(args[0].String()))
		if err != nil { return -1 }
		timeline := sim.NewRollbackTimeline(checkpoint, args[1].Int())
		var held [][]string
		if timeline == nil || json.Unmarshal([]byte(args[2].String()), &held) != nil || !timeline.Reset(checkpoint, held) { return -1 }
		id := nextID
		nextID++
		onlineTimelines[id] = timeline
		return id
	}))
	js.Global().Set("pbOnlineAdvance", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) != 2 { return -1 }
		timeline := onlineTimelines[args[0].Int()]
		var held []string
		if timeline == nil || json.Unmarshal([]byte(args[1].String()), &held) != nil { return -1 }
		return timeline.Advance(held)
	}))
	js.Global().Set("pbOnlineConfirm", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) != 3 { return -1 }
		timeline := onlineTimelines[args[0].Int()]
		var held [][][]string
		if timeline == nil || json.Unmarshal([]byte(args[2].String()), &held) != nil { return -1 }
		return int(timeline.ConfirmBatch(args[1].Int(), held))
	}))
	js.Global().Set("pbOnlineSnapshot", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) != 1 { return nil }
		timeline := onlineTimelines[args[0].Int()]
		if timeline == nil { return nil }
		return string(timeline.SnapshotJSON())
	}))
	js.Global().Set("pbOnlineFree", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) == 1 { delete(onlineTimelines, args[0].Int()) }
		return nil
	}))

	js.Global().Set("pbSimLeave", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) < 2 { return nil }
		if m := matches[args[0].Int()]; m != nil { m.Leave(args[1].Int()) }
		return nil
	}))

	js.Global().Set("pbSimFree", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) < 1 { return nil }
		delete(checkpoints, args[0].Int())
		delete(matches, args[0].Int())
		return nil
	}))

	select {}
}
