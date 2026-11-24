package sim

import "testing"

func TestRichSnapshotLimitsVisualParticles(t *testing.T) {
	match := &Match{Stage: 0, Capacity: 2}
	for i := 0; i < snapshotParticleLimit+5; i++ {
		match.Particles = append(match.Particles, Particle{X: float64(i)})
	}
	for i := 0; i < snapshotCrowdParticleLimit+3; i++ {
		match.CrowdParticles = append(match.CrowdParticles, CrowdParticle{X: float64(i)})
	}

	snapshot := match.richSnapshot()
	if got := len(snapshot.World.Particles); got != snapshotParticleLimit {
		t.Fatalf("snapshot particles = %d, want %d", got, snapshotParticleLimit)
	}
	if got, want := snapshot.World.Particles[0].X, float64(5); got != want {
		t.Errorf("first snapshot particle X = %v, want latest retained X %v", got, want)
	}
	if got := len(snapshot.World.CrowdParticles); got != snapshotCrowdParticleLimit {
		t.Fatalf("snapshot crowd particles = %d, want %d", got, snapshotCrowdParticleLimit)
	}
	if got, want := snapshot.World.CrowdParticles[0].X, float64(3); got != want {
		t.Errorf("first snapshot crowd particle X = %v, want latest retained X %v", got, want)
	}
}
