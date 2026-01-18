import { VideoTile } from './VideoTile';
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
  const totalParticipants = users.length;

  const getGridClass = () => {
    if (totalParticipants <= 1) return 'grid-cols-1';
    if (totalParticipants <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalParticipants <= 4) return 'grid-cols-2';
    if (totalParticipants <= 6) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  };

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
          />
        ))}
    </div>
  );
}
