import { useEffect, useRef } from 'react';
import { SpeakerOffIcon, CameraIcon } from '@radix-ui/react-icons';

interface VideoTileProps {
  stream: MediaStream | null;
  username: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isAdmin?: boolean;
}

export function VideoTile({
  stream,
  username,
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
  isAdmin = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative aspect-video bg-[hsl(var(--muted))] rounded-lg overflow-hidden">
      {stream && !isVideoOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center text-3xl font-semibold text-[hsl(var(--primary-foreground))]">
            {username.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Status indicators */}
      <div className="absolute top-2 right-2 flex gap-1">
        {isMuted && (
          <div className="p-1.5 bg-red-500/80 rounded-full">
            <SpeakerOffIcon className="w-3 h-3 text-white" />
          </div>
        )}
        {isVideoOff && (
          <div className="p-1.5 bg-red-500/80 rounded-full">
            <CameraIcon className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Name tag */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1">
        <span className="px-2 py-1 bg-black/60 rounded text-xs text-white">
          {username}
          {isLocal && ' (You)'}
          {isAdmin && ' ★'}
        </span>
      </div>
    </div>
  );
}
