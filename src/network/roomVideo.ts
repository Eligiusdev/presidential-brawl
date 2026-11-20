import { roomRequest, type RoomSession, type RoomVideoSignal } from './roomClient';

interface VideoPeer {
  connection: RTCPeerConnection;
  id: string;
  deadline: number;
  announced: boolean;
  localCandidates: RTCIceCandidateInit[];
  remoteCandidates: RTCIceCandidateInit[];
}

export function createRoomVideo(session: RoomSession, onStream: (stream: MediaStream | null) => void) {
  let peer: VideoPeer | undefined;
  let capture: MediaStream | undefined;
  let attemptedAt = -Infinity;
  let incoming = Promise.resolve();

  function reset() {
    const previous = peer;
    peer = undefined;
    previous?.connection.close();
    capture?.getTracks().forEach(track => track.stop());
    capture = undefined;
    onStream(null);
  }

  function send(body: RoomVideoSignal) {
    return roomRequest(`/${session.code}/video`, session, body);
  }

  function sendCandidate(state: VideoPeer, candidate: RTCIceCandidateInit) {
    void send({ type: 'ice', negotiation: state.id, candidate }).catch(() => {});
  }

  function attach(id: string) {
    const connection = new RTCPeerConnection({ iceServers: [] });
    const state: VideoPeer = {
      connection, id, deadline: performance.now() + 6500, announced: false,
      localCandidates: [], remoteCandidates: [],
    };
    peer = state;
    connection.onconnectionstatechange = () => {
      if (state !== peer) return;
      if (['failed', 'disconnected', 'closed'].includes(connection.connectionState)) reset();
    };
    connection.onicecandidate = event => {
      if (state !== peer || !event.candidate) return;
      const candidate = event.candidate.toJSON();
      if (state.announced) sendCandidate(state, candidate);
      else state.localCandidates.push(candidate);
    };
    connection.ontrack = event => {
      if (state !== peer) return;
      const receiver = event.receiver as RTCRtpReceiver & { jitterBufferTarget?: number };
      if ('jitterBufferTarget' in receiver) {
        try { receiver.jitterBufferTarget = 25; } catch { /* Browser default. */ }
      }
      onStream(event.streams[0] ?? new MediaStream([event.track]));
    };
    return state;
  }

  async function describe(state: VideoPeer, type: 'offer' | 'answer', description: RTCSessionDescriptionInit) {
    await state.connection.setLocalDescription(description);
    const sdp = state.connection.localDescription?.sdp;
    if (peer !== state || !sdp) return;
    await send({type, negotiation: state.id, sdp});
    if (peer !== state) return;
    state.announced = true;
    for (const candidate of state.localCandidates.splice(0)) sendCandidate(state, candidate);
  }

  return {
    get connected() { return peer?.connection.connectionState === 'connected'; },
    reset,
    tick(canvas: HTMLCanvasElement | null) {
      if (session.role !== 'host' || !canvas?.captureStream || !globalThis.RTCPeerConnection) return;
      const now = performance.now();
      if (peer && peer.connection.connectionState !== 'connected' && now >= peer.deadline) reset();
      if (peer || now - attemptedAt < 10000) return;
      attemptedAt = now;
      const id = now.toString(36).replace('.', '-') + '-' + Date.now().toString(36);
      let state: VideoPeer | undefined;
      void (async () => {
        try {
          state = attach(id);
          capture = canvas.captureStream(60);
          const track = capture.getVideoTracks()[0];
          if (!track) { reset(); return; }
          track.contentHint = 'motion';
          const sender = state.connection.addTrack(track, capture);
          const parameters = sender.getParameters();
          parameters.degradationPreference = 'maintain-framerate';
          void sender.setParameters(parameters).catch(() => {});
          await describe(state, 'offer', await state.connection.createOffer());
        } catch {
          if (state === peer) reset();
        }
      })();
    },
    signal(signal: RoomVideoSignal) {
      if (!globalThis.RTCPeerConnection) return;
      incoming = incoming.then(async () => {
        if (signal.type === 'offer' && session.role === 'guest') {
          reset();
          const state = attach(signal.negotiation);
          try {
            await state.connection.setRemoteDescription(signal);
            await describe(state, 'answer', await state.connection.createAnswer());
          } catch {
            if (peer === state) reset();
          }
          return;
        }
        const state = peer;
        if (!state || state.id !== signal.negotiation) return;
        if (signal.type === 'ice') {
          if (!state.connection.remoteDescription) state.remoteCandidates.push(signal.candidate);
          else await state.connection.addIceCandidate(signal.candidate).catch(() => {});
        } else if (signal.type === 'answer' && session.role === 'host') {
          try {
            await state.connection.setRemoteDescription(signal);
            for (const candidate of state.remoteCandidates.splice(0)) {
              await state.connection.addIceCandidate(candidate).catch(() => {});
            }
          } catch {
            if (peer === state) reset();
          }
        }
      }).catch(() => {});
    },
  };
}
