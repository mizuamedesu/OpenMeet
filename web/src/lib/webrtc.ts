import type { IceServer, DataChannelMessage } from './types';

export class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private localStream: MediaStream | null = null;
  // Default STUN servers for NAT traversal
  private iceServers: IceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  private onTrack: ((peerId: string, stream: MediaStream) => void) | null = null;
  private onIceCandidate: ((peerId: string, candidate: RTCIceCandidateInit) => void) | null = null;
  private onConnectionStateChange: ((peerId: string, state: RTCPeerConnectionState) => void) | null = null;
  private onDataChannelMessage: ((peerId: string, message: DataChannelMessage) => void) | null = null;
  private onDataChannelOpen: ((peerId: string) => void) | null = null;

  setIceServers(servers: IceServer[]): void {
    this.iceServers = servers;
  }

  setCallbacks(callbacks: {
    onTrack?: (peerId: string, stream: MediaStream) => void;
    onIceCandidate?: (peerId: string, candidate: RTCIceCandidateInit) => void;
    onConnectionStateChange?: (peerId: string, state: RTCPeerConnectionState) => void;
    onDataChannelMessage?: (peerId: string, message: DataChannelMessage) => void;
    onDataChannelOpen?: (peerId: string) => void;
  }): void {
    this.onTrack = callbacks.onTrack || null;
    this.onIceCandidate = callbacks.onIceCandidate || null;
    this.onConnectionStateChange = callbacks.onConnectionStateChange || null;
    this.onDataChannelMessage = callbacks.onDataChannelMessage || null;
    this.onDataChannelOpen = callbacks.onDataChannelOpen || null;
  }

  async getLocalStream(video: boolean = true, audio: boolean = true): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }

    if (!navigator.mediaDevices) {
      throw new Error('MediaDevices API not available. Use HTTPS or localhost.');
    }

    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: video ? { width: 1280, height: 720 } : false,
      audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
    });

    return this.localStream;
  }

  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
  }

  getLocalStreamSync(): MediaStream | null {
    return this.localStream;
  }

  createPeerConnection(peerId: string): RTCPeerConnection {
    const config: RTCConfiguration = {
      iceServers: this.iceServers,
    };

    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(peerId, event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      if (this.onTrack) {
        // Use existing stream or create a new one with the track
        const stream = event.streams[0] || new MediaStream([event.track]);
        this.onTrack(peerId, stream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(peerId, pc.connectionState);
      }
    };

    // Handle incoming data channel from remote peer
    pc.ondatachannel = (event) => {
      this.setupDataChannel(peerId, event.channel);
    };

    // Add local tracks
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  private setupDataChannel(peerId: string, channel: RTCDataChannel): void {
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      this.dataChannels.set(peerId, channel);
      if (this.onDataChannelOpen) {
        this.onDataChannelOpen(peerId);
      }
    };

    channel.onmessage = (event) => {
      if (this.onDataChannelMessage) {
        try {
          const message = JSON.parse(event.data) as DataChannelMessage;
          this.onDataChannelMessage(peerId, message);
        } catch {
          console.warn('Failed to parse data channel message');
        }
      }
    };

    channel.onclose = () => {
      this.dataChannels.delete(peerId);
    };

    channel.onerror = (error) => {
      console.error('Data channel error:', error);
    };
  }

  createDataChannel(peerId: string): RTCDataChannel | null {
    const pc = this.peerConnections.get(peerId);
    if (!pc) return null;

    const channel = pc.createDataChannel('file-transfer', {
      ordered: true,
    });
    this.setupDataChannel(peerId, channel);
    return channel;
  }

  getDataChannel(peerId: string): RTCDataChannel | undefined {
    return this.dataChannels.get(peerId);
  }

  sendDataChannelMessage(peerId: string, message: DataChannelMessage): boolean {
    const channel = this.dataChannels.get(peerId);
    if (!channel || channel.readyState !== 'open') {
      return false;
    }
    channel.send(JSON.stringify(message));
    return true;
  }

  broadcastDataChannelMessage(message: DataChannelMessage): void {
    for (const [peerId] of this.dataChannels) {
      this.sendDataChannelMessage(peerId, message);
    }
  }

  getPeerConnection(peerId: string): RTCPeerConnection | undefined {
    return this.peerConnections.get(peerId);
  }

  async createOffer(peerId: string): Promise<RTCSessionDescriptionInit> {
    let pc = this.peerConnections.get(peerId);
    if (!pc) {
      pc = this.createPeerConnection(peerId);
    }

    // Create data channel before creating offer (only offerer creates it)
    if (!this.dataChannels.has(peerId)) {
      this.createDataChannel(peerId);
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(
    peerId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    let pc = this.peerConnections.get(peerId);
    if (!pc) {
      pc = this.createPeerConnection(peerId);
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) return;

    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  closePeerConnection(peerId: string): void {
    const channel = this.dataChannels.get(peerId);
    if (channel) {
      channel.close();
      this.dataChannels.delete(peerId);
    }

    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
  }

  closeAllConnections(): void {
    for (const [, channel] of this.dataChannels) {
      channel.close();
    }
    this.dataChannels.clear();

    for (const [, pc] of this.peerConnections) {
      pc.close();
    }
    this.peerConnections.clear();
  }

  stopLocalStream(): void {
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }
  }

  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = enabled;
      }
    }
  }

  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      for (const track of this.localStream.getVideoTracks()) {
        track.enabled = enabled;
      }
    }
  }

  async replaceVideoTrack(newStream: MediaStream): Promise<void> {
    const videoTrack = newStream.getVideoTracks()[0];
    if (!videoTrack) return;

    // Update local stream
    if (this.localStream) {
      const oldTrack = this.localStream.getVideoTracks()[0];
      if (oldTrack) {
        this.localStream.removeTrack(oldTrack);
        oldTrack.stop();
      }
      this.localStream.addTrack(videoTrack);
    }

    // Replace track in all peer connections
    for (const pc of this.peerConnections.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(videoTrack);
      }
    }
  }

  async startScreenShare(): Promise<MediaStream> {
    if (!navigator.mediaDevices) {
      throw new Error('MediaDevices API not available. Use HTTPS or localhost.');
    }

    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    await this.replaceVideoTrack(screenStream);
    return screenStream;
  }

  cleanup(): void {
    this.closeAllConnections();
    this.stopLocalStream();
  }
}

export const webrtcManager = new WebRTCManager();
