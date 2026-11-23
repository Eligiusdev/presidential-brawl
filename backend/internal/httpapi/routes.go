package httpapi

import (
	"fmt"
	"net/http"

	"github.com/presidential-brawl/server/internal/ws"
)

func RegisterRoutes(mux *http.ServeMux, wsSrv *ws.Server) {
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		fmt.Fprintf(w, `{"status":"ok","rooms":"state-ws","roomProtocol":%d}`, 1)
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
