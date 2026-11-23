package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	netpkg "github.com/presidential-brawl/server/net"
	"github.com/presidential-brawl/server/rooms"
	"github.com/presidential-brawl/engine"
)

func main() {
	port := 3000
	for _, a := range os.Args[1:] {
		if a == "--dev" {
			port = 3001
		}
	}
	if v := os.Getenv("PORT"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			port = n
		}
	}

	allowed := os.Getenv("ALLOWED_ORIGINS")
	origins := map[string]bool{}
	for _, o := range strings.Split(allowed, ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			origins[o] = true
		}
	}

	fighterIDs := map[string]bool{}
	for _, id := range sim.FighterIDs() {
		fighterIDs[id] = true
	}

	reg := rooms.NewRegistry()
	srv := &netpkg.Server{
		Reg:        reg,
		Origins:    origins,
		FighterIDs: fighterIDs,
		StageCount: sim.StageCount(),
		CreateMatch: func(ids []string, stage int, onEnd func([]int)) sim.Match {
			m, err := sim.NewOnlineMatch(ids, stage, sim.RandomSeed())
			if err != nil {
				log.Println("match create:", err)
				return nil
			}
			m.OnEnd = func(standings []int) {
				// always called while room.Mu() is held
				onEnd(standings)
			}
			return m
		},
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		fmt.Fprintf(w, `{"status":"ok","rooms":"state-ws","roomProtocol":%d}`, 1)
	})
	mux.HandleFunc("/api/rooms/ws", srv.ServeWS)
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"error":"Usa el WebSocket de salas."}`))
	})
	netpkg.AttachStatic(mux)

	httpServer := &http.Server{Addr: fmt.Sprintf("0.0.0.0:%d", port), Handler: mux}

	stop := netpkg.StartTicker(reg)
	defer stop()

	go func() {
		fmt.Printf("Presidential Brawl: http://localhost:%d\n", port)
		if os.Getenv("RENDER") == "" {
			printLAN(port)
		}
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	stop()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = httpServer.Shutdown(ctx)
}

func printLAN(port int) {
	ifaces, err := net.Interfaces()
	if err != nil {
		return
	}
	for _, iface := range ifaces {
		addrs, _ := iface.Addrs()
		for _, a := range addrs {
			ipn, ok := a.(*net.IPNet)
			if !ok || ipn.IP.IsLoopback() || ipn.IP.To4() == nil {
				continue
			}
			fmt.Printf("Red local: http://%s:%d\n", ipn.IP.String(), port)
		}
	}
}
