package realtime

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/coder/websocket"
	rooms "github.com/presidential-brawl/server/internal/room"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	sim "github.com/presidential-brawl/engine"
	pb "github.com/presidential-brawl/server/gen/go"
	"google.golang.org/protobuf/proto"
)

func collisionMatch(t testing.TB, n int) *sim.Match {
	t.Helper()
	fighters := make([]string, n)
	for i := range fighters {
		fighters[i] = "bolivar"
	}
	m, err := sim.NewOnlineMatch(fighters, 0, 123)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 120; i++ {
		m.Particles = append(m.Particles, sim.Particle{X: float64(i)})
	}
	return m
}

func TestSnapshotDuringHitstop(t *testing.T) {
	for _, n := range []int{2, 4, 6, 8} {
		t.Run(fmt.Sprint(n), func(t *testing.T) {
			m := collisionMatch(t, n)
			m.Freeze = 6
			tick := m.Tick
			for i := 1; i <= 6; i++ {
				m.Step(make([][]string, n))
				if i%2 != 0 {
					continue
				}
				payload, err := m.NetworkSnapshotJSON(make([]int, n), nil)
				if err != nil {
					t.Fatal(err)
				}
				var snap sim.RichSnapshot
				if err = json.Unmarshal(payload, &snap); err != nil {
					t.Fatal(err)
				}
				if snap.Tick != uint32(i) || snap.World.T != int(tick) || len(snap.Players) != n {
					t.Fatalf("frame %d combat %d players %d", snap.Tick, snap.World.T, len(snap.Players))
				}
			}
		})
	}
}

func BenchmarkSnapshot(b *testing.B) {
	for _, n := range []int{2, 4, 6, 8} {
		m := collisionMatch(b, n)
		ack := make([]int, n)
		b.Run(fmt.Sprintf("%d/old", n), func(b *testing.B) {
			b.ReportAllocs()
			for b.Loop() {
				_, ok := encodeSnapshotBinary(m.Snapshot(), ack)
				if !ok {
					b.Fatal("encode")
				}
			}
		})
		b.Run(fmt.Sprintf("%d/new", n), func(b *testing.B) {
			b.ReportAllocs()
			for b.Loop() {
				data, err := m.NetworkSnapshotJSON(ack, nil)
				if err != nil {
					b.Fatal(err)
				}
				_, err = proto.Marshal(&pb.Snapshot{Tick: uint32(m.Frame), Ack: toI32(ack), SnapshotJson: data})
				if err != nil {
					b.Fatal(err)
				}
			}
		})
	}
}

func TestWebSocketFramesDuringHitstop(t *testing.T) {
	for _, n := range []int{2, 4, 6, 8} {
		t.Run(fmt.Sprint(n), func(t *testing.T) {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			peers := make(chan *rooms.Client, n)
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				conn, err := websocket.Accept(w, r, nil)
				if err != nil {
					return
				}
				peers <- rooms.NewClient(conn)
			}))
			defer srv.Close()
			var readers []*websocket.Conn
			var writers []*rooms.Client
			for i := 0; i < n; i++ {
				conn, _, err := websocket.Dial(ctx, "ws"+strings.TrimPrefix(srv.URL, "http"), nil)
				if err != nil {
					t.Fatal(err)
				}
				conn.SetReadLimit(1 << 20)
				defer conn.CloseNow()
				readers = append(readers, conn)
				peer := <-peers
				defer peer.Stop()
				defer peer.Conn().CloseNow()
				writers = append(writers, peer)
			}
			reg := rooms.NewRegistry()
			room := reg.Create(n, "ffa", 1, false)
			room.Match = collisionMatch(t, n)
			room.Match.Freeze = 6
			for i, c := range writers {
				room.Players[i] = &rooms.Player{WS: c, AppliedSeq: i}
			}
			for frame := 2; frame <= 6; frame += 2 {
				tickRooms(reg, 2*stepMS+0.001)
				for _, conn := range readers {
					kind, data, err := conn.Read(ctx)
					if err != nil {
						t.Fatal(err)
					}
					var msg pb.Snapshot
					if kind != websocket.MessageBinary || proto.Unmarshal(data, &msg) != nil || int(msg.Tick) != frame || len(msg.Ack) != n {
						t.Fatalf("frame %d, got %d", frame, msg.Tick)
					}
				}
			}
		})
	}
}
