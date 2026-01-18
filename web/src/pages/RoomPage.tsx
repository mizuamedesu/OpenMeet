import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Link2Icon, CheckIcon } from '@radix-ui/react-icons';
import { VideoGrid } from '../components/Video/VideoGrid';
import { ChatPanel } from '../components/Chat/ChatPanel';
import { ControlBar } from '../components/Room/ControlBar';
import { ParticipantsList } from '../components/Room/ParticipantsList';
import { SettingsPanel } from '../components/Room/SettingsPanel';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
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
    joinRoom,
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
    initializeMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    changeDevice,
    cleanup,
  } = useMedia();

  const isConnected = useRoomStore((state) => state.isConnected);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Join form state
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinUsername, setJoinUsername] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const copyRoomLink = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  useEffect(() => {
    // If accessing via link and not connected, show join form
    if (urlRoomId && !roomId && !isConnected) {
      setShowJoinForm(true);
    }
  }, [urlRoomId, roomId, isConnected]);

  const handleJoinFromLink = async () => {
    if (!joinUsername.trim()) {
      setJoinError('Please enter your name');
      return;
    }

    setIsJoining(true);
    setJoinError('');

    try {
      await initializeMedia();
      await joinRoom(urlRoomId!, joinUsername, joinPassword || undefined);
      setShowJoinForm(false);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

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

  // Show join form when accessing via link
  if (showJoinForm && urlRoomId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[hsl(var(--background))]">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Join Meeting</h1>
            <p className="text-[hsl(var(--muted-foreground))]">
              Room: {urlRoomId}
            </p>
          </div>

          <div className="space-y-4 bg-[hsl(var(--card))] p-6 rounded-lg border border-[hsl(var(--border))]">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your name</label>
              <Input
                placeholder="Enter your name"
                value={joinUsername}
                onChange={(e) => setJoinUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinFromLink()}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Password <span className="text-[hsl(var(--muted-foreground))]">(if required)</span>
              </label>
              <Input
                type="password"
                placeholder="Enter password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinFromLink()}
              />
            </div>

            {joinError && <p className="text-sm text-red-500">{joinError}</p>}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/')}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleJoinFromLink}
                disabled={isJoining}
              >
                {isJoining ? 'Joining...' : 'Join Meeting'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!roomId && !isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <p className="text-[hsl(var(--foreground))]">Connecting...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[hsl(var(--background))]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-[hsl(var(--foreground))]">OpenMeet</h1>
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            Room: {urlRoomId || roomId}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyRoomLink}
            className="gap-1.5"
          >
            {isCopied ? (
              <>
                <CheckIcon className="w-4 h-4 text-green-500" />
                <span className="text-green-500">Copied!</span>
              </>
            ) : (
              <>
                <Link2Icon className="w-4 h-4" />
                <span>Share</span>
              </>
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded">
              Host
            </span>
          )}
          <SettingsPanel
            localStream={localStream}
            isScreenSharing={isScreenSharing}
            onDeviceChange={changeDevice}
          />
        </div>
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
