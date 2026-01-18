import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Link2Icon, CheckIcon, CameraIcon, SpeakerOffIcon } from '@radix-ui/react-icons';
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
import { webrtcManager } from '../lib/webrtc';

// iOS detection
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

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
    transferAdmin,
    setUserPriority,
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

  // Media preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [previewVideoEnabled, setPreviewVideoEnabled] = useState(true);
  const [previewAudioEnabled, setPreviewAudioEnabled] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [selectedVideoInput, setSelectedVideoInput] = useState('');
  const previewVideoRef = useRef<HTMLVideoElement>(null);

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
      setJoinError('名前を入力してください');
      return;
    }

    setJoinError('');
    setPreviewError(null);

    // Start preview
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      setPreviewStream(stream);
      setShowPreview(true);

      // Load devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputs(devices.filter(d => d.kind === 'audioinput'));
      setVideoInputs(devices.filter(d => d.kind === 'videoinput'));

      // Set current device IDs
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];
      if (audioTrack) setSelectedAudioInput(audioTrack.getSettings().deviceId || '');
      if (videoTrack) setSelectedVideoInput(videoTrack.getSettings().deviceId || '');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get media';
      if (isIOS() && (
        errorMessage.includes('not allowed') ||
        errorMessage.includes('Permission denied') ||
        errorMessage.includes('NotAllowedError')
      )) {
        setJoinError(
          'カメラ・マイクへのアクセスが許可されていません。\n' +
          'iOSの「設定」→「Chrome」→「カメラ」と「マイク」をオンにしてください。'
        );
      } else {
        setJoinError(errorMessage);
      }
    }
  };

  // Preview video effect
  useEffect(() => {
    if (previewVideoRef.current && previewStream && showPreview) {
      previewVideoRef.current.srcObject = previewStream;
      previewVideoRef.current.play().catch(console.warn);
    }
  }, [previewStream, showPreview, previewVideoEnabled]);

  // Audio level meter for preview
  useEffect(() => {
    if (!previewStream || !showPreview || !previewAudioEnabled) {
      setAudioLevel(0);
      return;
    }

    const audioTrack = previewStream.getAudioTracks()[0];
    if (!audioTrack) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationId: number;

    const updateLevel = () => {
      if (!showPreview) return;
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(Math.min(100, average * 1.5));
      animationId = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      cancelAnimationFrame(animationId);
      audioContext.close();
    };
  }, [previewStream, showPreview, previewAudioEnabled]);

  const togglePreviewVideo = () => {
    if (previewStream) {
      const videoTrack = previewStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !previewVideoEnabled;
        setPreviewVideoEnabled(!previewVideoEnabled);
      }
    }
  };

  const togglePreviewAudio = () => {
    if (previewStream) {
      const audioTrack = previewStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !previewAudioEnabled;
        setPreviewAudioEnabled(!previewAudioEnabled);
      }
    }
  };

  const handleDeviceChange = async (deviceId: string, kind: 'audio' | 'video') => {
    if (!previewStream) return;

    try {
      const constraints: MediaStreamConstraints = kind === 'audio'
        ? { audio: { deviceId: { exact: deviceId } }, video: false }
        : { video: { deviceId: { exact: deviceId }, width: 1280, height: 720 }, audio: false };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newTrack = kind === 'audio' ? newStream.getAudioTracks()[0] : newStream.getVideoTracks()[0];
      const oldTrack = kind === 'audio' ? previewStream.getAudioTracks()[0] : previewStream.getVideoTracks()[0];

      if (oldTrack) {
        previewStream.removeTrack(oldTrack);
        oldTrack.stop();
      }
      if (newTrack) {
        previewStream.addTrack(newTrack);
        newTrack.enabled = kind === 'audio' ? previewAudioEnabled : previewVideoEnabled;
      }

      if (kind === 'audio') setSelectedAudioInput(deviceId);
      else setSelectedVideoInput(deviceId);

      setPreviewStream(previewStream);

      // Force video element update
      if (kind === 'video' && previewVideoRef.current) {
        previewVideoRef.current.srcObject = null;
        previewVideoRef.current.srcObject = previewStream;
        previewVideoRef.current.play().catch(console.warn);
      }
    } catch (err) {
      console.error('Failed to change device:', err);
    }
  };

  const handleJoinWithPreview = async () => {
    setIsJoining(true);
    setPreviewError(null);

    try {
      // Apply preview settings to webrtcManager
      if (previewStream) {
        webrtcManager.setLocalStream(previewStream);
      }

      // Set initial audio/video state
      useRoomStore.getState().setAudioEnabled(previewAudioEnabled);
      useRoomStore.getState().setVideoEnabled(previewVideoEnabled);

      await initializeMedia(previewVideoEnabled, previewAudioEnabled);
      await joinRoom(urlRoomId!, joinUsername, joinPassword || undefined);

      setShowPreview(false);
      setShowJoinForm(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join room';
      setPreviewError(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  const handleCancelPreview = () => {
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
      setPreviewStream(null);
    }
    setShowPreview(false);
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
    // Show preview screen
    if (showPreview && previewStream) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[hsl(var(--background))]">
          <div className="max-w-2xl w-full space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">カメラ・マイクの確認</h1>
              <p className="text-[hsl(var(--muted-foreground))]">
                入室前に映像と音声を確認してください
              </p>
            </div>

            <div className="bg-[hsl(var(--card))] p-6 rounded-lg border border-[hsl(var(--border))] space-y-6">
              {/* Video Preview */}
              <div className="relative aspect-video bg-[hsl(var(--muted))] rounded-lg overflow-hidden">
                {previewVideoEnabled ? (
                  <video
                    ref={previewVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center text-4xl font-semibold text-[hsl(var(--primary-foreground))]">
                      {joinUsername.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}

                {/* Toggle buttons overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  <Button
                    variant={previewAudioEnabled ? 'secondary' : 'destructive'}
                    size="icon"
                    className="rounded-full w-12 h-12"
                    onClick={togglePreviewAudio}
                  >
                    <SpeakerOffIcon className="w-5 h-5" />
                  </Button>
                  <Button
                    variant={previewVideoEnabled ? 'secondary' : 'destructive'}
                    size="icon"
                    className="rounded-full w-12 h-12"
                    onClick={togglePreviewVideo}
                  >
                    <CameraIcon className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Audio Level */}
              <div className="space-y-2">
                <label className="text-sm font-medium">マイク入力レベル</label>
                <div className="h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-75"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
                {!previewAudioEnabled && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">マイクがオフです</p>
                )}
              </div>

              {/* Device Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">マイク</label>
                  <select
                    value={selectedAudioInput}
                    onChange={(e) => handleDeviceChange(e.target.value, 'audio')}
                    className="w-full h-10 px-3 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm"
                  >
                    {audioInputs.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">カメラ</label>
                  <select
                    value={selectedVideoInput}
                    onChange={(e) => handleDeviceChange(e.target.value, 'video')}
                    className="w-full h-10 px-3 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm"
                  >
                    {videoInputs.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {previewError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                  <p className="text-sm text-red-500">{previewError}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancelPreview}
                  disabled={isJoining}
                >
                  戻る
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleJoinWithPreview}
                  disabled={isJoining}
                >
                  {isJoining ? '接続中...' : '会議に参加'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Show name/password form
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[hsl(var(--background))]">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">会議に参加</h1>
            <p className="text-[hsl(var(--muted-foreground))]">
              ルーム: {urlRoomId}
            </p>
          </div>

          <div className="space-y-4 bg-[hsl(var(--card))] p-6 rounded-lg border border-[hsl(var(--border))]">
            <div className="space-y-2">
              <label className="text-sm font-medium">名前</label>
              <Input
                placeholder="名前を入力"
                value={joinUsername}
                onChange={(e) => setJoinUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinFromLink()}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                パスワード <span className="text-[hsl(var(--muted-foreground))]">(必要な場合)</span>
              </label>
              <Input
                type="password"
                placeholder="パスワードを入力"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinFromLink()}
              />
            </div>

            {joinError && <p className="text-sm text-red-500 whitespace-pre-line">{joinError}</p>}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/')}
              >
                キャンセル
              </Button>
              <Button
                className="flex-1"
                onClick={handleJoinFromLink}
                disabled={isJoining}
              >
                次へ
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
        <p className="text-[hsl(var(--foreground))]">接続中...</p>
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
            ルーム: {urlRoomId || roomId}
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
                <span className="text-green-500">コピーしました</span>
              </>
            ) : (
              <>
                <Link2Icon className="w-4 h-4" />
                <span>共有</span>
              </>
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded">
              ホスト
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
              onTransferAdmin={transferAdmin}
              onSetPriority={setUserPriority}
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
