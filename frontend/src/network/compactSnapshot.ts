export function isCompactSnapshot(frame: ArrayBuffer): boolean {
  const signature = new Uint8Array(frame, 0, Math.min(frame.byteLength, 2));
  return signature[0] === 0x1f && signature[1] === 0x8b;
}

export async function unpackSnapshot(frame: ArrayBuffer): Promise<ArrayBuffer> {
  const stream = new Blob([frame]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}
