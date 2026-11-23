# Backend (Go)

Real-time authoritative backend for Presidential Brawl.

- `cmd/server`: HTTP + WebSocket server
- `net/`: transport, health, static serving (local/dev mode)
- `rooms/`: room lifecycle, reconnection, host migration
- `contract/`: protocol definitions (protobuf + JSON control messages)
- `gen/`: generated protobuf code

La lógica de simulación vive en `../../sim/` (módulo Go separado) para mantener el backend desacoplado del motor.

## Run

```bash
cd backend/server && go run ./cmd/server --dev
```

Environment:
- `PORT`
- `ALLOWED_ORIGINS`
- `RENDER`
