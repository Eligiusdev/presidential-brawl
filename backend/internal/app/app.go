package app

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/presidential-brawl/engine"
	"github.com/presidential-brawl/server/internal/config"
	"github.com/presidential-brawl/server/internal/httpapi"
	"github.com/presidential-brawl/server/internal/realtime"
	rooms "github.com/presidential-brawl/server/internal/room"
	"github.com/presidential-brawl/server/internal/ws"
)

func Run(cfg config.Config) error {
	fighterIDs := map[string]bool{}
	for _, id := range sim.FighterIDs() { fighterIDs[id] = true }

	reg := rooms.NewRegistry()
	wsSrv := &ws.Server{
		Reg: reg, Origins: cfg.AllowedOrigins, FighterIDs: fighterIDs, StageCount: sim.StageCount(),
		CreateMatch: func(ids []string, stage int, onEnd func([]int)) *sim.Match {
			m, err := sim.NewOnlineMatch(ids, stage, sim.RandomSeed())
			if err != nil { log.Println("match create:", err); return nil }
			m.OnEnd = onEnd
			return m
		},
	}

	mux := http.NewServeMux()
	httpapi.RegisterRoutes(mux, wsSrv)

	httpServer := &http.Server{Addr: fmt.Sprintf("0.0.0.0:%d", cfg.Port), Handler: mux}
	stopTicker := realtime.StartTicker(reg)
	defer stopTicker()

	go func() {
		fmt.Printf("Presidential Brawl: http://localhost:%d\n", cfg.Port)
		if !cfg.IsRender { printLAN(cfg.Port) }
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	stopTicker()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return httpServer.Shutdown(ctx)
}

func printLAN(port int) {
	ifaces, err := net.Interfaces()
	if err != nil { return }
	for _, iface := range ifaces {
		addrs, _ := iface.Addrs()
		for _, a := range addrs {
			ipn, ok := a.(*net.IPNet)
			if !ok || ipn.IP.IsLoopback() || ipn.IP.To4() == nil { continue }
			fmt.Printf("Red local: http://%s:%d\n", ipn.IP.String(), port)
		}
	}
}
