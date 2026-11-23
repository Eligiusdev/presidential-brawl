module github.com/presidential-brawl/server

go 1.26.8

require (
	github.com/coder/websocket v1.8.15
	github.com/presidential-brawl/server/sim v0.0.0
	google.golang.org/protobuf v1.36.12
)

replace github.com/presidential-brawl/server/sim => ../sim
