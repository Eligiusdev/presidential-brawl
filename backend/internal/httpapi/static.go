package httpapi

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func AttachStatic(mux *http.ServeMux) {
	dist := filepath.Clean(filepath.Join(".", "dist"))
	if _, err := os.Stat(dist); err != nil {
		// also try ../frontend/dist for new layout
		dist = filepath.Clean(filepath.Join(".", "..", "frontend", "dist"))
	}
	if _, err := os.Stat(dist); err != nil {
		return
	}

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Cache-Control", "no-store")
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}
		path := r.URL.Path
		if path == "" {
			path = "/"
		}
		clean := filepath.Clean(filepath.Join(dist, filepath.FromSlash(path)))
		if !strings.HasPrefix(clean, dist+string(filepath.Separator)) && clean != dist {
			http.NotFound(w, r)
			return
		}
		if info, err := os.Stat(clean); err == nil && !info.IsDir() {
			if strings.Contains(path, "/assets/") {
				w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			}
			http.ServeFile(w, r, clean)
			return
		}
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFile(w, r, filepath.Join(dist, "index.html"))
	})
}
