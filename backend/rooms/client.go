package rooms

import (
	"context"
	"encoding/json"
	"sync"

	"github.com/coder/websocket"
)

type Client struct {
	conn  *websocket.Conn
	mu    sync.Mutex
	alive bool
	slot  int
}

func NewClient(conn *websocket.Conn) *Client {
	return &Client{conn: conn, alive: true, slot: -1}
}

func (c *Client) Slot() int        { return c.slot }
func (c *Client) SetAlive(v bool)  { c.mu.Lock(); c.alive = v; c.mu.Unlock() }
func (c *Client) IsAlive() bool    { c.mu.Lock(); defer c.mu.Unlock(); return c.alive }
func (c *Client) Conn() *websocket.Conn { return c.conn }

func (c *Client) SendJSON(v any) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return c.conn.Write(context.Background(), websocket.MessageText, b)
}

func (c *Client) SendBinary(b []byte) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.conn.Write(context.Background(), websocket.MessageBinary, b)
}

func (c *Client) SendJSONRaw(b []byte) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.conn.Write(context.Background(), websocket.MessageText, b)
}

func (c *Client) Close(code websocket.StatusCode, reason string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	_ = c.conn.Close(code, reason)
}
