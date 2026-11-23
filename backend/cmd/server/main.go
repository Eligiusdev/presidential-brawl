package main

import (
	"log"
	"os"

	"github.com/presidential-brawl/server/internal/app"
	"github.com/presidential-brawl/server/internal/config"
)

func main() {
	cfg := config.Load(os.Args[1:])
	if err := app.Run(cfg); err != nil {
		log.Fatal(err)
	}
}
