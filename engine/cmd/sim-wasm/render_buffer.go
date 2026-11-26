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

func registerOnlineRenderBuffer() {
	js.Global().Set("pbOnlineRenderBuffer", js.FuncOf(func(_ js.Value, args []js.Value) any {
		if len(args) != 1 {
			return -1
		}
		timeline := onlineTimelines[args[0].Int()]
		if timeline == nil {
			return -1
		}
		timeline.WriteRenderBuffer(&onlineRenderBuffer)
		return float64(uintptr(unsafe.Pointer(&onlineRenderBuffer[0])))
	}))
}
