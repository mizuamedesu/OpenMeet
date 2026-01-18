import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VideoGrid } from '../components/Video/VideoGrid';
import { ChatPanel } from '../components/Chat/ChatPanel';
import { ControlBar } from '../components/Room/ControlBar';
import { ParticipantsList } from '../components/Room/ParticipantsList';
import { useRoom } from '../hooks/useRoom';
import { useMedia } from '../hooks/useMedia';
import { useRoomStore } from '../stores/roomStore';

export function RoomPage() {
  const { roomId: urlRoomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const {
    roomId,
    userId,
    username,
    isAdmin,
    users,
    leaveRoom,
    kickUser,
    muteUser,
    setUserVideoOff,
    setUserChatPermission,
  } = useRoom();

  const {
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isMutedByAdmin,
    isVideoOffByAdmin,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    cleanup,
  } = useMedia();

  const isConnected = useRoomStore((state) => state.isConnected);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);

  useEffect(() => {
    // If not connected and no room, redirect to home
    if (!roomId && !isConnected) {
      navigate('/');
    }
  }, [roomId, isConnected, navigate]);

  const handleLeave = () => {
    cleanup();
    leaveRoom();
    navigate('/');
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  };

  if (!roomId && !isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Connecting...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[hsl(var(--background))]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold">OpenMeet</h1>
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            Room: {urlRoomId || roomId}
          </span>
        </div>
        {isAdmin && (
          <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded">
            Host
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 overflow-hidden">
          <VideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            users={users}
            localUser={{
              username,
              isAdmin,
              isAudioEnabled,
              isVideoEnabled,
            }}
          />
        </div>

        {/* Side panels */}
        {isParticipantsOpen && (
          <div className="w-72">
            <ParticipantsList
              users={users}
              currentUserId={userId}
              isAdmin={isAdmin}
              onKick={kickUser}
              onMute={muteUser}
              onVideoOff={setUserVideoOff}
              onChatPermission={setUserChatPermission}
            />
          </div>
        )}

        {isChatOpen && (
          <div className="w-80">
            <ChatPanel />
          </div>
        )}
      </div>

      {/* Control bar */}
      <ControlBar
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        isMutedByAdmin={isMutedByAdmin}
        isVideoOffByAdmin={isVideoOffByAdmin}
        isChatOpen={isChatOpen}
        isParticipantsOpen={isParticipantsOpen}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onToggleParticipants={() => setIsParticipantsOpen(!isParticipantsOpen)}
        onLeave={handleLeave}
      />
    </div>
  );
}
