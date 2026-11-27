//go:build js && wasm

package main

import (
	"syscall/js"
	"unsafe"

	"github.com/presidential-brawl/engine"
)

// The global array has a stable address for the lifetime of this Wasm instance.
// JavaScript reads the borrowed view synchronously before another refresh.
var onlineRenderBuffer sim.RenderBuffer
var tagHUD sim.TagHUDBuffer

func registerOnlineRenderBuffer() {
	js.Global().Set("pbTagHUD", js.FuncOf(func(_ js.Value, args []js.Value) any {
		if len(args) != 1 {
			return -1
		}
		id := args[0].Int()
		if timeline := onlineTimelines[id]; timeline != nil {
			timeline.WriteTagHUD(&tagHUD)
		} else if match := matches[id]; match != nil {
			match.WriteTagHUD(&tagHUD)
		} else {
			return -1
		}
		return float64(uintptr(unsafe.Pointer(&tagHUD[0])))
	}))
	js.Global().Set("pbOnlineRenderBuffer", js.FuncOf(func(_ js.Value, args []js.Value) any {
		if len(args) != 1 {
			return -1
		}
		timeline := onlineTimelines[args[0].Int()]
		if timeline != nil {
			timeline.WriteRenderBuffer(&onlineRenderBuffer)
		} else if match := matches[args[0].Int()]; match != nil {
			match.WriteMatchRenderBuffer(&onlineRenderBuffer)
		} else {
			return -1
		}
		return float64(uintptr(unsafe.Pointer(&onlineRenderBuffer[0])))
	}))
}
