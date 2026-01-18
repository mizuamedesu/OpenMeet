import { useState, useCallback, useEffect } from 'react';
import { webrtcManager } from '../lib/webrtc';
import { useRoomStore } from '../stores/roomStore';

export function useMedia() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const {
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isMutedByAdmin,
    isVideoOffByAdmin,
    setAudioEnabled,
    setVideoEnabled,
    setScreenSharing,
    remoteStreams,
  } = useRoomStore();

  useEffect(() => {
    // Get available devices
    navigator.mediaDevices.enumerateDevices().then(setDevices);

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', () => {
      navigator.mediaDevices.enumerateDevices().then(setDevices);
    });
  }, []);

  const initializeMedia = useCallback(async (video: boolean = true, audio: boolean = true) => {
    try {
      const stream = await webrtcManager.getLocalStream(video, audio);
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Failed to get media:', error);
      throw error;
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (isMutedByAdmin) return;

    const newState = !isAudioEnabled;
    setAudioEnabled(newState);
    webrtcManager.toggleAudio(newState);
  }, [isAudioEnabled, isMutedByAdmin, setAudioEnabled]);

  const toggleVideo = useCallback(() => {
    if (isVideoOffByAdmin) return;

    const newState = !isVideoEnabled;
    setVideoEnabled(newState);
    webrtcManager.toggleVideo(newState);
  }, [isVideoEnabled, isVideoOffByAdmin, setVideoEnabled]);

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await webrtcManager.startScreenShare();
      setScreenSharing(true);

      // Listen for screen share end
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare();
      });

      return screenStream;
    } catch (error) {
      console.error('Failed to start screen share:', error);
      throw error;
    }
  }, [setScreenSharing]);

  const stopScreenShare = useCallback(async () => {
    try {
      // Get camera stream and replace
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      });
      await webrtcManager.replaceVideoTrack(cameraStream);
      setScreenSharing(false);
    } catch (error) {
      console.error('Failed to stop screen share:', error);
    }
  }, [setScreenSharing]);

  const changeDevice = useCallback(async (deviceId: string, kind: 'audio' | 'video') => {
    try {
      const constraints: MediaStreamConstraints = {};

      if (kind === 'audio') {
        constraints.audio = { deviceId: { exact: deviceId } };
        constraints.video = false;
      } else {
        constraints.video = { deviceId: { exact: deviceId } };
        constraints.audio = false;
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (kind === 'video') {
        await webrtcManager.replaceVideoTrack(newStream);
      }
      // For audio, we would need a similar replaceAudioTrack method

      setLocalStream(webrtcManager.getLocalStreamSync());
    } catch (error) {
      console.error('Failed to change device:', error);
      throw error;
    }
  }, []);

  const cleanup = useCallback(() => {
    webrtcManager.cleanup();
    setLocalStream(null);
  }, []);

  return {
    localStream,
    remoteStreams,
    devices,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isMutedByAdmin,
    isVideoOffByAdmin,
    initializeMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    changeDevice,
    cleanup,
  };
}
