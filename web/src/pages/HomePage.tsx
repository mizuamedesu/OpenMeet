import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/Dialog';
import { useRoom } from '../hooks/useRoom';
import { useMedia } from '../hooks/useMedia';

export function HomePage() {
  const navigate = useNavigate();
  const { createRoom, joinRoom } = useRoom();
  const { initializeMedia } = useMedia();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await initializeMedia();
      const newRoomId = await createRoom(username, password || undefined);
      navigate(`/room/${newRoomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await initializeMedia();
      await joinRoom(roomId, username, password || undefined);
      navigate(`/room/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  const resetDialogs = () => {
    setUsername('');
    setRoomId('');
    setPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">OpenMeet</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Secure, peer-to-peer video conferencing
          </p>
        </div>

        <div className="space-y-4">
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              resetDialogs();
              setShowCreateDialog(true);
            }}
          >
            Create a new meeting
          </Button>

          <Button
            className="w-full"
            size="lg"
            variant="outline"
            onClick={() => {
              resetDialogs();
              setShowJoinDialog(true);
            }}
          >
            Join a meeting
          </Button>
        </div>

        <div className="text-center text-sm text-[hsl(var(--muted-foreground))]">
          <p>End-to-end encrypted. No account required.</p>
        </div>

        <div className="text-center text-xs text-[hsl(var(--muted-foreground))] space-y-1 pt-4 border-t border-[hsl(var(--border))]">
          <p>
            TURN/Signaling powered by{' '}
            <a
              href="https://ultra.coins.tsukuba.ac.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[hsl(var(--foreground))]"
            >
              Ultra COINS
            </a>
          </p>
          <p>
            <a
              href="https://github.com/mizuamedesu/OpenMeet"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[hsl(var(--foreground))]"
            >
              Open source
            </a>
            {' '}- Self-host your own instance
          </p>
        </div>
      </div>

      {/* Create Room Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new meeting</DialogTitle>
            <DialogDescription>
              Enter your name and optionally set a password for the room.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your name</label>
              <Input
                placeholder="Enter your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Password <span className="text-[hsl(var(--muted-foreground))]">(optional)</span>
              </label>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create meeting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Room Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a meeting</DialogTitle>
            <DialogDescription>
              Enter the room ID and your name to join.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Room ID</label>
              <Input
                placeholder="Enter room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your name</label>
              <Input
                placeholder="Enter your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Password <span className="text-[hsl(var(--muted-foreground))]">(optional)</span>
              </label>
              <Input
                type="password"
                placeholder="Enter password if required"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleJoin} disabled={isLoading}>
              {isLoading ? 'Joining...' : 'Join meeting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
