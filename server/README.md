# Server (Go)

Real-time authoritative server for Presidential Brawl.

- `cmd/server`: HTTP + WebSocket server
- `cmd/sim-wasm`: game simulation compiled to WebAssembly for the frontend
- `contract/`: protocol definitions (protobuf + JSON control messages)
- `sim/`: deterministic game simulation
- `rooms/`: room lifecycle, reconnection, host migration
- `net/`: transport, health, static serving (local/dev mode)

## Run

```bash
go run ./cmd/server --dev
```

Environment:
- `PORT`
- `ALLOWED_ORIGINS`
- `RENDER`
