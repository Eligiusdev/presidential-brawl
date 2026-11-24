package rng

type RNG struct {
	state uint32
}

func NewRNG(seed uint32) *RNG { return &RNG{state: seed} }

func (r *RNG) Uint32() uint32 {
	r.state = r.state + 0x6d2b79f5
	t := uint32(int32(r.state^r.state>>15) * int32(r.state|1))
	t ^= t + uint32(int32(t^t>>7)*int32(t|61))
	return (t ^ (t >> 14))
}

func (r *RNG) Float() float64 {
	return float64(r.Uint32()) / 4294967296.0
}

func (r *RNG) Int(n int) int {
	if n <= 0 {
		return 0
	}
	return int(r.Uint32() % uint32(n))
}
