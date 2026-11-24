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

// Al mantener abajo sobre una plataforma, el luchador debe atravesarla.
func TestDropThroughPlatform(t *testing.T) {
	m, err := NewOnlineMatch([]string{"lincoln", "bolivar"}, 0, 1)
	if err != nil { t.Fatal(err) }
	f := m.Fighters[0]
	p := m.Plats[0]
	f.X = p.X + 20
	f.Y = p.Y - f.H
	f.Pl = &p
	f.On = true
	startY := f.Y

	m.Step([][]string{{"down"}, {}})
	if f.Pl != nil { t.Fatal("sigue enganchado a la plataforma tras pulsar abajo") }
	for i := 0; i < 12; i++ { m.Step([][]string{{"down"}, {}}) }
	if f.Y <= startY { t.Fatalf("no bajó: y=%.1f start=%.1f", f.Y, startY) }
}

// Abandonar a media partida termina el combate y publica la clasificación.
func TestLeaveEndsMatch(t *testing.T) {
	m, err := NewOnlineMatch([]string{"lincoln", "bolivar"}, 0, 1)
	if err != nil { t.Fatal(err) }
	var standings []int
	m.OnEnd = func(s []int) { standings = s }
	m.Step(nil)
	m.Leave(1)
	if m.WinnerPi == nil || *m.WinnerPi != 0 { t.Fatalf("ganador incorrecto: %v", m.WinnerPi) }
	if len(standings) != 2 || standings[0] != 0 || standings[1] != 1 { t.Fatalf("clasificación: %v", standings) }
}
