// Command server はHTTP APIのエントリポイント（Cloud Run / ローカル共通）。
package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"marketplace/api-go/internal/app"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := app.LoadConfig()
	if err != nil {
		slog.Error("config load failed", slog.String("error", err.Error()))
		os.Exit(1)
	}

	server, err := app.NewServer(ctx, cfg)
	if err != nil {
		slog.Error("server init failed", slog.String("error", err.Error()))
		os.Exit(1)
	}

	if err := server.Run(ctx); err != nil {
		slog.Error("server exited with error", slog.String("error", err.Error()))
		os.Exit(1)
	}
}
