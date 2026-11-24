package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port           int
	AllowedOrigins map[string]bool
	IsRender       bool
}

func Load(args []string) Config {
	port := 3000
	for _, a := range args {
		if a == "--dev" {
			port = 3001
		}
	}
	if v := os.Getenv("PORT"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			port = n
		}
	}
	origins := map[string]bool{}
	for _, o := range strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			origins[o] = true
		}
	}
	return Config{Port: port, AllowedOrigins: origins, IsRender: os.Getenv("RENDER") != ""}
}
