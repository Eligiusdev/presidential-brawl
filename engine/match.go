package sim

// Match is the authoritative simulation interface used by the room server.
type Match interface {
	Step(inputs [][]string) uint32
	Leave(slot int)
	Snapshot() any
	Standings() []int
}
