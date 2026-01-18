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
      setError('名前を入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await initializeMedia();
      const newRoomId = await createRoom(username, password || undefined);
      navigate(`/room/${newRoomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ルームの作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!username.trim()) {
      setError('名前を入力してください');
      return;
    }
    if (!roomId.trim()) {
      setError('ルームIDを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await initializeMedia();
      await joinRoom(roomId, username, password || undefined);
      navigate(`/room/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ルームへの参加に失敗しました');
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
        {/* SEO-friendly header with h1 */}
        <header className="text-center">
          <h1 className="text-4xl font-bold mb-2">OpenMeet</h1>
          <p className="text-[hsl(var(--muted-foreground))] text-lg">
            無料ビデオ会議ツール
          </p>
          <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">
            Zoom・Google Meet代替のオンライン会議
          </p>
        </header>

        {/* Main action buttons */}
        <main className="space-y-4">
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              resetDialogs();
              setShowCreateDialog(true);
            }}
          >
            新しい会議を作成
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
            会議に参加
          </Button>
        </main>

        {/* Feature highlights for SEO */}
        <section className="text-center text-sm text-[hsl(var(--muted-foreground))]">
          <p>エンドツーエンド暗号化で安全。アカウント登録不要。</p>
        </section>

        {/* Why free section */}
        <section className="text-left text-sm text-[hsl(var(--muted-foreground))] space-y-3 pt-4 border-t border-[hsl(var(--border))]">
          <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">なぜこのサービスは無料なのか？</h2>
          <div className="mb-4">
            <img
              src="/独法.png"
              alt="独法"
              className="w-full max-w-md mx-auto rounded-lg"
            />
          </div>
          <p>
            そもそもオンライン通話やビデオ通話はオンラインゲームのように、権威的なサーバーを必要としないため、本来クライアント同士で直接通信が可能です。(P2P)
          </p>
          <p>
            又WebRTCを用いればP2Pの実装もたやすく、サーバーがやることはせいぜいUDPパンチホール程度しかありません。要はそこら辺のオンラインゲームに比べてはるかに少ない計算リソースとネットワーク帯域で実現できるわけです。
          </p>
          <p>
            それなのにGoogleMeetやZoom、Skypeは非常に高い料金を未だに要求します。私はコンピューターサイエンスを学ぶあまりお金のない大学生のため、これに非常に怒りを覚えていました。そこでそこらへんに落ちていたパソコンパーツで作成したサーバーでシグナリングと、TURNを行うこのWebアプリをClaudeCodeを用いて作成しました。
          </p>
          <p>
            二重NAT下でも中継して接続できるようにするTURNは、大学で我々がやっている大変インチキなインフラ、
            <a
              href="https://ultra.coins.tsukuba.ac.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[hsl(var(--foreground))]"
            >
              Ultra-Coins
            </a>
            の上に立っています。
          </p>
          <div className="mt-4">
            <img
              src="/server.jpg"
              alt="サーバー"
              className="w-full max-w-md mx-auto rounded-lg border border-[hsl(var(--border))]"
            />
            <p className="text-xs text-center mt-2">
              実際にこのアプリのサーバー部分を担当しているPC（フロントはCloudflare Pages）。Ryzen 7 2700x、メモリ32GBとかの昔使ってたやつです。
            </p>
          </div>
        </section>

        {/* Footer with links */}
        <footer className="text-center text-xs text-[hsl(var(--muted-foreground))] space-y-1 pt-4 border-t border-[hsl(var(--border))]">
          <p>
            <a
              href="https://github.com/mizuamedesu/OpenMeet"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[hsl(var(--foreground))]"
            >
              オープンソース
            </a>
            {' '}- 自分のサーバーでホスト可能
          </p>
          <p>
            開発者:{' '}
            <a
              href="https://mizuame.works/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[hsl(var(--foreground))]"
            >
              みずあめ
            </a>
          </p>
        </footer>
      </div>

      {/* Create Room Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しい会議を作成</DialogTitle>
            <DialogDescription>
              名前を入力してください。パスワードは任意で設定できます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">名前</label>
              <Input
                placeholder="名前を入力"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                パスワード <span className="text-[hsl(var(--muted-foreground))]">(任意)</span>
              </label>
              <Input
                type="password"
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCreate} disabled={isLoading}>
              {isLoading ? '作成中...' : '会議を作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Room Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>会議に参加</DialogTitle>
            <DialogDescription>
              ルームIDと名前を入力して参加してください。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">ルームID</label>
              <Input
                placeholder="ルームIDを入力"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">名前</label>
              <Input
                placeholder="名前を入力"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                パスワード <span className="text-[hsl(var(--muted-foreground))]">(必要な場合)</span>
              </label>
              <Input
                type="password"
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleJoin} disabled={isLoading}>
              {isLoading ? '参加中...' : '会議に参加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
