import {
  SpeakerOffIcon,
  CameraIcon,
  ChatBubbleIcon,
  Cross2Icon,
  DotsVerticalIcon,
  PersonIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@radix-ui/react-icons';
import { Button } from '../ui/Button';
import { ScrollArea } from '../ui/ScrollArea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';
import type { User } from '../../lib/types';

interface ParticipantsListProps {
  users: User[];
  currentUserId: string | null;
  isAdmin: boolean;
  onKick: (userId: string) => void;
  onMute: (userId: string, muted: boolean) => void;
  onVideoOff: (userId: string, videoOff: boolean) => void;
  onChatPermission: (userId: string, canChat: boolean) => void;
  onTransferAdmin: (userId: string) => void;
  onSetPriority: (userId: string, priority: number) => void;
}

export function ParticipantsList({
  users,
  currentUserId,
  isAdmin,
  onKick,
  onMute,
  onVideoOff,
  onChatPermission,
  onTransferAdmin,
  onSetPriority,
}: ParticipantsListProps) {
  // Sort by priority for display
  const sortedUsers = [...users].sort((a, b) => a.adminPriority - b.adminPriority);
  return (
    <div className="flex flex-col h-full bg-[hsl(var(--card))] border-l border-[hsl(var(--border))]">
      <div className="p-3 border-b border-[hsl(var(--border))]">
        <h3 className="font-semibold">Participants ({users.length})</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sortedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-2 rounded-md hover:bg-[hsl(var(--accent))]"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center text-sm font-medium text-[hsl(var(--primary-foreground))]">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium flex items-center gap-1">
                    {user.username}
                    {user.id === currentUserId && (
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">(You)</span>
                    )}
                    {user.isAdmin && (
                      <span className="text-xs text-yellow-500">★ Host</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Status icons */}
                {user.isMuted && (
                  <SpeakerOffIcon className="w-4 h-4 text-red-500" />
                )}
                {user.isVideoOff && (
                  <CameraIcon className="w-4 h-4 text-red-500" />
                )}
                {!user.canChat && (
                  <ChatBubbleIcon className="w-4 h-4 text-red-500" />
                )}

                {/* Admin controls */}
                {isAdmin && user.id !== currentUserId && !user.isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <DotsVerticalIcon className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onMute(user.id, !user.isMuted)}>
                        <SpeakerOffIcon className="w-4 h-4 mr-2" />
                        {user.isMuted ? 'Unmute' : 'Mute'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onVideoOff(user.id, !user.isVideoOff)}>
                        <CameraIcon className="w-4 h-4 mr-2" />
                        {user.isVideoOff ? 'Enable video' : 'Disable video'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChatPermission(user.id, !user.canChat)}>
                        <ChatBubbleIcon className="w-4 h-4 mr-2" />
                        {user.canChat ? 'Disable chat' : 'Enable chat'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onTransferAdmin(user.id)}>
                        <PersonIcon className="w-4 h-4 mr-2" />
                        Make host
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSetPriority(user.id, Math.max(0, user.adminPriority - 1))}>
                        <ChevronUpIcon className="w-4 h-4 mr-2" />
                        Priority up ({user.adminPriority})
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSetPriority(user.id, user.adminPriority + 1)}>
                        <ChevronDownIcon className="w-4 h-4 mr-2" />
                        Priority down
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onKick(user.id)}
                        className="text-red-500 focus:text-red-500"
                      >
                        <Cross2Icon className="w-4 h-4 mr-2" />
                        Kick
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
