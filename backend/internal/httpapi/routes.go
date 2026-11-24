package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	rooms "github.com/presidential-brawl/server/internal/room"
	"github.com/presidential-brawl/server/internal/ws"
)

func RegisterRoutes(mux *http.ServeMux, wsSrv *ws.Server) {
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		fmt.Fprintf(w, `{"status":"ok","rooms":"state-ws","roomProtocol":%d}`, 1)
	})
	mux.HandleFunc("/api/rooms", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
			return
		}
		origin := r.Header.Get("Origin")
		if origin != "" {
			sameHost := r.Host != "" && strings.Contains(origin, "://"+r.Host)
			if sameHost || wsSrv.Origins[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
			}
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_ = json.NewEncoder(w).Encode(struct {
			Rooms []rooms.RoomSummary `json:"rooms"`
		}{Rooms: wsSrv.Reg.Summaries()})
	})
	mux.HandleFunc("/api/rooms/events", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
			return
		}
		origin := r.Header.Get("Origin")
		if origin != "" {
			sameHost := r.Host != "" && strings.Contains(origin, "://"+r.Host)
			if sameHost || wsSrv.Origins[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
			}
		}
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "Streaming no soportado", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		changes, unsubscribe := wsSrv.Reg.Subscribe()
		defer unsubscribe()
		writeRooms := func() {
			data, err := json.Marshal(struct {
				Rooms []rooms.RoomSummary `json:"rooms"`
			}{Rooms: wsSrv.Reg.Summaries()})
			if err != nil {
				return
			}
			fmt.Fprintf(w, "event: rooms\ndata: %s\n\n", data)
			flusher.Flush()
		}
		writeRooms()
		for {
			select {
			case <-r.Context().Done():
				return
			case <-changes:
				writeRooms()
			}
		}
	})
	mux.HandleFunc("/api/rooms/ws", wsSrv.ServeWS)
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"error":"Usa el WebSocket de salas."}`))
	})
	AttachStatic(mux)
}
