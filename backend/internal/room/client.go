package rooms

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/coder/websocket"
)

const snapshotWriteTimeout = time.Second

type snapshotFrame struct {
	kind    websocket.MessageType
	data    []byte
	expires time.Time
}

type Client struct {
	conn          *websocket.Conn
	mu            sync.Mutex
	alive         bool
	slot          int
	snapshots     chan snapshotFrame
	confirmations chan snapshotFrame
	stopped       chan struct{}
	stopOnce      sync.Once
}

func NewClient(conn *websocket.Conn) *Client {
	c := &Client{
		conn: conn, alive: true, slot: -1,
		snapshots:     make(chan snapshotFrame, 1),
		confirmations: make(chan snapshotFrame, 1),
		stopped:       make(chan struct{}),
	}
	go c.writeSnapshots()
	return c
}

func (c *Client) Slot() int             { return c.slot }
func (c *Client) SetAlive(v bool)       { c.mu.Lock(); c.alive = v; c.mu.Unlock() }
func (c *Client) IsAlive() bool         { c.mu.Lock(); defer c.mu.Unlock(); return c.alive }
func (c *Client) Conn() *websocket.Conn { return c.conn }

func (c *Client) QueueSnapshot(kind websocket.MessageType, data []byte) {
	c.queueLatest(c.snapshots, snapshotFrame{kind: kind, data: data})
}

func (c *Client) queueLatest(queue chan snapshotFrame, frame snapshotFrame) {
	select {
	case <-c.stopped:
		return
	default:
	}
	select {
	case queue <- frame:
		return
	default:
	}
	select {
	case <-queue:
	default:
	}
	select {
	case queue <- frame:
	default:
	}
}

func (c *Client) Stop() {
	c.stopOnce.Do(func() { close(c.stopped) })
}

func (c *Client) writeSnapshots() {
	for {
		var frame snapshotFrame
		// Prefer short-lived confirmations over intermediate visual states.
		select {
		case <-c.stopped:
			return
		case frame = <-c.confirmations:
		default:
			select {
			case <-c.stopped:
				return
			case frame = <-c.confirmations:
			case frame = <-c.snapshots:
			}
		}
		c.mu.Lock()
		select {
		case <-c.stopped:
			c.mu.Unlock()
			return
		default:
		}
		if !frame.expires.IsZero() && time.Now().After(frame.expires) {
			c.mu.Unlock()
			continue
		}
		ctx, cancel := context.WithTimeout(context.Background(), snapshotWriteTimeout)
		err := c.conn.Write(ctx, frame.kind, frame.data)
		cancel()
		c.mu.Unlock()
		if err != nil {
			log.Printf("websocket snapshot write failed: %v", err)
			c.Close(websocket.StatusGoingAway, "snapshot write failed")
			return
		}
	}
}

func (c *Client) SendJSON(v any) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return c.conn.Write(context.Background(), websocket.MessageText, b)
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

// Confirmed inputs use a bounded, expiring queue. Large checkpoints remain
// opportunistic and never enter that queue.
func (c *Client) TrySendRollback(reply RollbackSync) error {
	if len(reply.Checkpoint) == 0 {
		data, err := json.Marshal(reply)
		if err != nil {
			return err
		}
		c.queueLatest(c.confirmations, snapshotFrame{kind: websocket.MessageText, data: data, expires: time.Now().Add(45 * time.Millisecond)})
		return nil
	}
	if len(reply.Checkpoint) > 0 && len(c.snapshots) != 0 {
		return nil
	}
	if !c.mu.TryLock() {
		return nil
	}
	defer c.mu.Unlock()
	data, err := json.Marshal(reply)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), snapshotWriteTimeout)
	defer cancel()
	return c.conn.Write(ctx, websocket.MessageText, data)
}
