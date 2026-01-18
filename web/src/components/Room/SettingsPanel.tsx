import { useState, useEffect, useRef } from 'react';
import { GearIcon } from '@radix-ui/react-icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/Dialog';
import { Button } from '../ui/Button';

interface SettingsPanelProps {
  localStream: MediaStream | null;
  isScreenSharing: boolean;
  onDeviceChange: (deviceId: string, kind: 'audio' | 'video') => Promise<void>;
}

interface DeviceInfo {
  deviceId: string;
  label: string;
}

export function SettingsPanel({
  localStream,
  isScreenSharing,
  onDeviceChange,
}: SettingsPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);
  const [audioInputs, setAudioInputs] = useState<DeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<DeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<DeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [selectedVideoInput, setSelectedVideoInput] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  // Load devices
  useEffect(() => {
    async function loadDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();

        setAudioInputs(
          devices
            .filter((d) => d.kind === 'audioinput')
            .map((d) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 5)}` }))
        );

        setVideoInputs(
          devices
            .filter((d) => d.kind === 'videoinput')
            .map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 5)}` }))
        );

        setAudioOutputs(
          devices
            .filter((d) => d.kind === 'audiooutput')
            .map((d) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 5)}` }))
        );
      } catch (err) {
        console.error('Failed to enumerate devices:', err);
      }
    }

    if (open) {
      loadDevices();
    }
  }, [open]);

  // Video preview
  useEffect(() => {
    if (videoRef.current && localStream && open) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, open]);

  // Audio level meter
  useEffect(() => {
    if (!localStream || !open) return;

    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      if (!open) return;
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(Math.min(100, average * 1.5));
      requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      audioContext.close();
    };
  }, [localStream, open]);

  // Get current device IDs
  useEffect(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      const videoTrack = localStream.getVideoTracks()[0];

      if (audioTrack) {
        const settings = audioTrack.getSettings();
        setSelectedAudioInput(settings.deviceId || '');
      }

      if (videoTrack) {
        const settings = videoTrack.getSettings();
        setSelectedVideoInput(settings.deviceId || '');
      }
    }
  }, [localStream, open]);

  const handleAudioInputChange = async (deviceId: string) => {
    setSelectedAudioInput(deviceId);
    await onDeviceChange(deviceId, 'audio');
  };

  const handleVideoInputChange = async (deviceId: string) => {
    setSelectedVideoInput(deviceId);
    await onDeviceChange(deviceId, 'video');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="icon">
          <GearIcon className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Video Preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Video Preview</label>
            <div className="relative aspect-video bg-[hsl(var(--muted))] rounded-lg overflow-hidden">
              {isScreenSharing ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
                  Screen sharing active
                </div>
              ) : localStream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
                  No video
                </div>
              )}
            </div>
          </div>

          {/* Microphone */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Microphone</label>
            <select
              value={selectedAudioInput}
              onChange={(e) => handleAudioInputChange(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-[hsl(var(--input))] bg-transparent text-sm"
            >
              {audioInputs.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>

            {/* Audio Level */}
            <div className="space-y-1">
              <div className="text-xs text-[hsl(var(--muted-foreground))]">Input Level</div>
              <div className="h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-75"
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
            </div>
          </div>

          {/* Camera */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Camera</label>
            <select
              value={selectedVideoInput}
              onChange={(e) => handleVideoInputChange(e.target.value)}
              disabled={isScreenSharing}
              className="w-full h-10 px-3 rounded-md border border-[hsl(var(--input))] bg-transparent text-sm disabled:opacity-50"
            >
              {videoInputs.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
            {isScreenSharing && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Camera selection disabled while screen sharing
              </p>
            )}
          </div>

          {/* Speaker (if supported) */}
          {audioOutputs.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Speaker</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-[hsl(var(--input))] bg-transparent text-sm"
              >
                {audioOutputs.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <div className="text-sm text-[hsl(var(--muted-foreground))] space-y-1">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isScreenSharing ? 'bg-green-500' : 'bg-gray-400'}`} />
                Screen sharing: {isScreenSharing ? 'Active' : 'Off'}
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${localStream?.getVideoTracks()[0]?.enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                Camera: {localStream?.getVideoTracks()[0]?.enabled ? 'On' : 'Off'}
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${localStream?.getAudioTracks()[0]?.enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                Microphone: {localStream?.getAudioTracks()[0]?.enabled ? 'On' : 'Off'}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
