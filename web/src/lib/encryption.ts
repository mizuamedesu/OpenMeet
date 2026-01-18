// E2EE using Insertable Streams API
// This provides end-to-end encryption for media streams

const encoder = new TextEncoder();

// Generate a random encryption key
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Export key for sharing
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Import key from shared string
export async function importKey(keyString: string): Promise<CryptoKey> {
  const keyData = Uint8Array.from(atob(keyString), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Encrypt frame data
async function encryptFrame(
  key: CryptoKey,
  frame: RTCEncodedVideoFrame | RTCEncodedAudioFrame
): Promise<void> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(frame.data);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Prepend IV to encrypted data
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encrypted), iv.length);

  frame.data = result.buffer;
}

// Decrypt frame data
async function decryptFrame(
  key: CryptoKey,
  frame: RTCEncodedVideoFrame | RTCEncodedAudioFrame
): Promise<void> {
  const data = new Uint8Array(frame.data);

  if (data.length < 12) return;

  const iv = data.slice(0, 12);
  const encrypted = data.slice(12);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    frame.data = decrypted;
  } catch {
    // Decryption failed, likely unencrypted frame or wrong key
    console.warn('Frame decryption failed');
  }
}

// Setup E2EE for a peer connection
export function setupE2EE(
  pc: RTCPeerConnection,
  key: CryptoKey,
  isSender: boolean
): void {
  if (!('RTCRtpScriptTransform' in window)) {
    console.warn('RTCRtpScriptTransform not supported, E2EE disabled');
    return;
  }

  const senders = pc.getSenders();
  const receivers = pc.getReceivers();

  if (isSender) {
    for (const sender of senders) {
      if (sender.track) {
        setupSenderTransform(sender, key);
      }
    }
  }

  for (const receiver of receivers) {
    setupReceiverTransform(receiver, key);
  }
}

function setupSenderTransform(sender: RTCRtpSender, key: CryptoKey): void {
  const senderAny = sender as unknown as { transform?: unknown; createEncodedStreams?: () => { readable: ReadableStream; writable: WritableStream } };
  if (senderAny.transform) return;

  const streams = senderAny.createEncodedStreams?.();
  if (!streams) return;

  const { readable, writable } = streams;

  const transformStream = new TransformStream({
    async transform(frame, controller) {
      await encryptFrame(key, frame);
      controller.enqueue(frame);
    },
  });

  readable.pipeThrough(transformStream).pipeTo(writable);
}

function setupReceiverTransform(receiver: RTCRtpReceiver, key: CryptoKey): void {
  const receiverAny = receiver as unknown as { transform?: unknown; createEncodedStreams?: () => { readable: ReadableStream; writable: WritableStream } };
  if (receiverAny.transform) return;

  const streams = receiverAny.createEncodedStreams?.();
  if (!streams) return;

  const { readable, writable } = streams;

  const transformStream = new TransformStream({
    async transform(frame, controller) {
      await decryptFrame(key, frame);
      controller.enqueue(frame);
    },
  });

  readable.pipeThrough(transformStream).pipeTo(writable);
}

// Derive a room key from password
export async function deriveKeyFromPassword(
  password: string,
  salt: string
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}
