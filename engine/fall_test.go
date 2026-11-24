package sim

import "testing"

// Un luchador que camina fuera de una plataforma debe caer por gravedad.
func TestFighterFallsOffPlatform(t *testing.T) {
	m, err := NewOnlineMatch([]string{"lincoln", "bolivar"}, 0, 1)
	if err != nil { t.Fatal(err) }
	f := m.Fighters[0]
	p := m.Plats[0]
	f.X = p.X + 20
	f.Y = p.Y - f.H
	f.Pl = &p
	f.On = true
	startY := f.Y

	maxY := f.Y
	for i := 0; i < 90; i++ {
		m.Step([][]string{{"right"}, {}})
		if f.Y > maxY { maxY = f.Y }
	}

	if f.Pl != nil { t.Fatalf("sigue enganchado a la plataforma: pl=%+v", f.Pl) }
	if maxY <= startY { t.Fatalf("no cayó: maxY=%.1f start=%.1f", maxY, startY) }
}
