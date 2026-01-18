import { useEffect, useRef } from 'react';
import { SpeakerOffIcon, CameraIcon, EnterFullScreenIcon, ExitFullScreenIcon } from '@radix-ui/react-icons';

interface VideoTileProps {
  stream: MediaStream | null;
  username: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isAdmin?: boolean;
  isFullscreen?: boolean;
  isSpeaking?: boolean;
  onClick?: () => void;
}

export function VideoTile({
  stream,
  username,
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
  isAdmin = false,
  isFullscreen = false,
  isSpeaking = false,
  onClick,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;

      // Handle autoplay restrictions on mobile browsers
      const playVideo = async () => {
        if (!videoRef.current) return;

        try {
          await videoRef.current.play();
        } catch (e) {
          // Autoplay was prevented - this is common on mobile browsers
          // The video will start playing after user interaction
          console.warn('Video autoplay prevented:', e);
        }
      };

      playVideo();
    }
  }, [stream]);

  const borderClass = isSpeaking
    ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-[hsl(var(--background))]'
    : '';

  return (
    <div
      className={`relative bg-[hsl(var(--muted))] rounded-lg overflow-hidden cursor-pointer group ${
        isFullscreen ? 'h-full' : 'aspect-video'
      } ${borderClass}`}
      onClick={onClick}
    >
      {/* Always render video element to maintain srcObject */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full ${isFullscreen ? 'object-contain' : 'object-cover'} ${
          isVideoOff ? 'hidden' : ''
        }`}
      />
      {/* Avatar when video is off */}
      {isVideoOff && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`rounded-full bg-[hsl(var(--primary))] flex items-center justify-center font-semibold text-[hsl(var(--primary-foreground))] ${
            isFullscreen ? 'w-32 h-32 text-5xl' : 'w-20 h-20 text-3xl'
          }`}>
            {username.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Fullscreen indicator */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="p-1.5 bg-black/60 rounded-full">
          {isFullscreen ? (
            <ExitFullScreenIcon className="w-4 h-4 text-white" />
          ) : (
            <EnterFullScreenIcon className="w-4 h-4 text-white" />
          )}
        </div>
      </div>

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
        <span className={`px-2 py-1 bg-black/60 rounded text-white ${isFullscreen ? 'text-sm' : 'text-xs'}`}>
          {username}
          {isLocal && ' (自分)'}
          {isAdmin && ' ★'}
        </span>
      </div>

      {/* Click to expand hint */}
      {!isFullscreen && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="px-3 py-1.5 bg-black/70 rounded-full text-white text-xs">
            クリックで拡大
          </span>
        </div>
      )}
    </div>
  );
}
