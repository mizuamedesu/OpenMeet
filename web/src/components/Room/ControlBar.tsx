import {
  VideoIcon,
  CameraIcon,
  SpeakerLoudIcon,
  SpeakerOffIcon,
  Share1Icon,
  ExitIcon,
  ChatBubbleIcon,
  PersonIcon,
} from '@radix-ui/react-icons';
import { Button } from '../ui/Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/Tooltip';

interface ControlBarProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isMutedByAdmin: boolean;
  isVideoOffByAdmin: boolean;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onLeave: () => void;
}

export function ControlBar({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  isMutedByAdmin,
  isVideoOffByAdmin,
  isChatOpen,
  isParticipantsOpen,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onLeave,
}: ControlBarProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center justify-center gap-2 p-4 bg-[hsl(var(--card))] border-t border-[hsl(var(--border))]">
        {/* Audio toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isAudioEnabled ? 'secondary' : 'destructive'}
              size="icon"
              onClick={onToggleAudio}
              disabled={isMutedByAdmin}
            >
              {isAudioEnabled ? (
                <SpeakerLoudIcon className="w-5 h-5" />
              ) : (
                <SpeakerOffIcon className="w-5 h-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isMutedByAdmin
              ? 'ホストによりミュートされています'
              : isAudioEnabled
              ? 'ミュート'
              : 'ミュート解除'}
          </TooltipContent>
        </Tooltip>

        {/* Video toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isVideoEnabled ? 'secondary' : 'destructive'}
              size="icon"
              onClick={onToggleVideo}
              disabled={isVideoOffByAdmin}
            >
              {isVideoEnabled ? (
                <VideoIcon className="w-5 h-5" />
              ) : (
                <CameraIcon className="w-5 h-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isVideoOffByAdmin
              ? 'ホストによりビデオが無効にされています'
              : isVideoEnabled
              ? 'ビデオを停止'
              : 'ビデオを開始'}
          </TooltipContent>
        </Tooltip>

        {/* Screen share */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isScreenSharing ? 'primary' : 'secondary'}
              size="icon"
              onClick={onToggleScreenShare}
            >
              <Share1Icon className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isScreenSharing ? '共有を停止' : '画面共有'}
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-8 bg-[hsl(var(--border))] mx-2" />

        {/* Chat toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isChatOpen ? 'primary' : 'secondary'}
              size="icon"
              onClick={onToggleChat}
            >
              <ChatBubbleIcon className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>チャット</TooltipContent>
        </Tooltip>

        {/* Participants toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isParticipantsOpen ? 'primary' : 'secondary'}
              size="icon"
              onClick={onToggleParticipants}
            >
              <PersonIcon className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>参加者</TooltipContent>
        </Tooltip>

        <div className="w-px h-8 bg-[hsl(var(--border))] mx-2" />

        {/* Leave */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="destructive" size="icon" onClick={onLeave}>
              <ExitIcon className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>退出</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
