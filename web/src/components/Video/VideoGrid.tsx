import { useState } from 'react';
import { VideoTile } from './VideoTile';
import { useAudioLevels } from '../../hooks/useAudioLevels';
import type { User } from '../../lib/types';

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  users: User[];
  localUser: {
    username: string;
    isAdmin: boolean;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
  };
}

export function VideoGrid({
  localStream,
  remoteStreams,
  users,
  localUser,
}: VideoGridProps) {
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);
  const speakingStates = useAudioLevels(localStream, remoteStreams);

  const totalParticipants = users.length;

  const getGridClass = () => {
    if (fullscreenId) return 'grid-cols-1';
    if (totalParticipants <= 1) return 'grid-cols-1';
    if (totalParticipants <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalParticipants <= 4) return 'grid-cols-2';
    if (totalParticipants <= 6) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  };

  const handleTileClick = (id: string) => {
    setFullscreenId(fullscreenId === id ? null : id);
  };

  // If fullscreen mode, only show the selected tile
  if (fullscreenId) {
    const isLocalFullscreen = fullscreenId === 'local';

    if (isLocalFullscreen) {
      return (
        <div className="relative h-full p-4">
          <VideoTile
            stream={localStream}
            username={localUser.username}
            isLocal
            isMuted={!localUser.isAudioEnabled}
            isVideoOff={!localUser.isVideoEnabled}
            isAdmin={localUser.isAdmin}
            isFullscreen
            isSpeaking={speakingStates.get('local') || false}
            onClick={() => handleTileClick('local')}
          />
        </div>
      );
    }

    const fullscreenUser = users.find(u => u.id === fullscreenId);
    if (fullscreenUser) {
      return (
        <div className="relative h-full p-4">
          <VideoTile
            stream={remoteStreams.get(fullscreenUser.id) || null}
            username={fullscreenUser.username}
            isMuted={fullscreenUser.isMuted}
            isVideoOff={fullscreenUser.isVideoOff}
            isAdmin={fullscreenUser.isAdmin}
            isFullscreen
            isSpeaking={speakingStates.get(fullscreenUser.id) || false}
            onClick={() => handleTileClick(fullscreenUser.id)}
          />
        </div>
      );
    }
  }

  return (
    <div className={`grid ${getGridClass()} gap-2 p-4 h-full auto-rows-fr`}>
      {/* Local video */}
      <VideoTile
        stream={localStream}
        username={localUser.username}
        isLocal
        isMuted={!localUser.isAudioEnabled}
        isVideoOff={!localUser.isVideoEnabled}
        isAdmin={localUser.isAdmin}
        isSpeaking={speakingStates.get('local') || false}
        onClick={() => handleTileClick('local')}
      />

      {/* Remote videos */}
      {users
        .filter((user) => user.username !== localUser.username)
        .map((user) => (
          <VideoTile
            key={user.id}
            stream={remoteStreams.get(user.id) || null}
            username={user.username}
            isMuted={user.isMuted}
            isVideoOff={user.isVideoOff}
            isAdmin={user.isAdmin}
            isSpeaking={speakingStates.get(user.id) || false}
            onClick={() => handleTileClick(user.id)}
          />
        ))}
    </div>
  );
}
