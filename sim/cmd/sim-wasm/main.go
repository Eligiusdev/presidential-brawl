//go:build js && wasm

package main

import (
	"encoding/json"
	"syscall/js"

	"github.com/presidential-brawl/server/sim"
)

var matches = map[int]*sim.OnlineMatch{}
var nextID = 1

func main() {
	js.Global().Set("pbSimCreate", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) < 3 {
			return map[string]any{"error": "args: idsJson, stage, seed"}
		}
		var ids []string
		if err := json.Unmarshal([]byte(args[0].String()), &ids); err != nil {
			return map[string]any{"error": err.Error()}
		}
		stage := args[1].Int()
		seed := uint32(args[2].Int())
		m, err := sim.NewOnlineMatch(ids, stage, seed)
		if err != nil {
			return map[string]any{"error": err.Error()}
		}
		id := nextID
		nextID++
		matches[id] = m
		return id
	}))

	js.Global().Set("pbSimStep", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) < 2 {
			return -1
		}
		id := args[0].Int()
		m := matches[id]
		if m == nil {
			return -1
		}
		var inputs [][]string
		_ = json.Unmarshal([]byte(args[1].String()), &inputs)
		return int(m.Step(inputs))
	}))

	js.Global().Set("pbSimSnapshot", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) < 1 {
			return "{}"
		}
		m := matches[args[0].Int()]
		if m == nil {
			return "{}"
		}
		b, _ := json.Marshal(m.Snapshot())
		return string(b)
	}))

	js.Global().Set("pbSimLeave", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) < 2 {
			return nil
		}
		m := matches[args[0].Int()]
		if m != nil {
			m.Leave(args[1].Int())
		}
		return nil
	}))

	js.Global().Set("pbSimFree", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) < 1 {
			return nil
		}
		delete(matches, args[0].Int())
		return nil
	}))

	select {}
}
