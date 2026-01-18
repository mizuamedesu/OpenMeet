import type { IceServer } from './types';

export class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private iceServers: IceServer[] = [];
  private onTrack: ((peerId: string, stream: MediaStream) => void) | null = null;
  private onIceCandidate: ((peerId: string, candidate: RTCIceCandidateInit) => void) | null = null;
  private onConnectionStateChange: ((peerId: string, state: RTCPeerConnectionState) => void) | null = null;

  setIceServers(servers: IceServer[]): void {
    this.iceServers = servers;
  }

  setCallbacks(callbacks: {
    onTrack?: (peerId: string, stream: MediaStream) => void;
    onIceCandidate?: (peerId: string, candidate: RTCIceCandidateInit) => void;
    onConnectionStateChange?: (peerId: string, state: RTCPeerConnectionState) => void;
  }): void {
    this.onTrack = callbacks.onTrack || null;
    this.onIceCandidate = callbacks.onIceCandidate || null;
    this.onConnectionStateChange = callbacks.onConnectionStateChange || null;
  }

  async getLocalStream(video: boolean = true, audio: boolean = true): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
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
      // Force encryption
      // @ts-expect-error - encodedInsertableStreams is not in the type definition
      encodedInsertableStreams: true,
    };

    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(peerId, event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      if (this.onTrack && event.streams[0]) {
        this.onTrack(peerId, event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(peerId, pc.connectionState);
      }
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

  getPeerConnection(peerId: string): RTCPeerConnection | undefined {
    return this.peerConnections.get(peerId);
  }

  async createOffer(peerId: string): Promise<RTCSessionDescriptionInit> {
    let pc = this.peerConnections.get(peerId);
    if (!pc) {
      pc = this.createPeerConnection(peerId);
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
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
  }

  closeAllConnections(): void {
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
