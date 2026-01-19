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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white" style={{ fontFamily: '"Meiryo UI", Meiryo, sans-serif' }}>
      <div className="max-w-md w-full space-y-6">
        {/* SEO-friendly header with h1 */}
        <header className="text-center">
          <h1 className="text-5xl font-bold mb-2 text-[#0000FF]">
            OpenMeet
          </h1>
          <p className="text-[#FF0000] text-xl font-bold bg-[#FFFF00] inline px-1">
            無料ビデオ会議ツール
          </p>
          <p className="text-[#0000FF] text-sm mt-2 font-bold underline decoration-[#FF0000]">
            Zoom・Google Meet代替のオンライン会議
          </p>
        </header>

        {/* Main action buttons */}
        <main className="space-y-3">
          <Button
            className="w-full bg-[#FFFF00] hover:bg-[#EEEE00] text-[#0000FF] font-bold text-lg"
            size="lg"
            onClick={() => {
              resetDialogs();
              setShowCreateDialog(true);
            }}
          >
            新しい会議を作成
          </Button>

          <Button
            className="w-full bg-[#FFFF00] hover:bg-[#EEEE00] text-[#0000FF] font-bold text-lg"
            size="lg"
            onClick={() => {
              resetDialogs();
              setShowJoinDialog(true);
            }}
          >
            会議に参加
          </Button>
        </main>

        {/* Feature highlights for SEO */}
        <section className="text-center">
          <p className="text-[#FF0000] bg-[#90EE90] inline font-bold px-1">エンドツーエンド暗号化で安全。アカウント登録不要。</p>
        </section>

        {/* Why free section */}
        <section className="text-left text-sm text-black space-y-2 pt-3">
          <h2 className="text-lg font-bold text-[#0000FF] bg-[#FFFF00] inline px-1 underline decoration-[#FF0000]">なぜこのサービスは無料なのか？</h2>
          <div className="my-3">
            <img
              src="/独法.png"
              alt="独法"
              className="w-full max-w-md mx-auto"
            />
          </div>
          <p>
            そもそもオンライン通話やビデオ通話はオンラインゲームのように、権威的なサーバーを必要としないため、本来クライアント同士で直接通信が可能です。<span className="text-[#FF0000] font-bold bg-[#FFFF00]">(P2P)</span>
          </p>
          <p>
            又<span className="text-[#0000FF] font-bold">WebRTC</span>を用いればP2Pの実装もたやすく、サーバーがやることはせいぜいUDPパンチホール程度しかありません。要はそこら辺のオンラインゲームに比べて<span className="text-[#FF0000] font-bold underline bg-[#FFFF00]">はるかに少ない計算リソースとネットワーク帯域</span>で実現できるわけです。
          </p>
          <p>
            それなのに<span className="text-[#0000FF] font-bold">GoogleMeet</span>や<span className="text-[#0000FF] font-bold">Zoom</span>、<span className="text-[#0000FF] font-bold">Skype</span>は<span className="bg-[#FFFF00] text-[#FF0000] font-bold">非常に高い料金</span>を未だに要求します。私はコンピューターサイエンスを学ぶあまりお金のない大学生のため、これに<span className="text-[#FF0000] font-bold text-base bg-[#FFFF00]">非常に怒り</span>を覚えていました。そこでそこらへんに落ちていたパソコンパーツで作成したサーバーでシグナリングと、TURNを行うこのWebアプリを<span className="text-[#0000FF] font-bold">ClaudeCode</span>を用いて作成しました。
          </p>
          <p>
            二重NAT下でも中継して接続できるようにするTURNは、大学で我々がやっている<span className="text-[#FF0000] font-bold bg-[#FFFF00]">大変インチキなインフラ</span>、
            <a
              href="https://ultra.coins.tsukuba.ac.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0000FF] font-bold underline"
            >
              Ultra-Coins
            </a>
            の上に立っています。
          </p>
          <div className="mt-3">
            <img
              src="/server.jpg"
              alt="サーバー"
              className="w-full max-w-md mx-auto"
            />
            <p className="text-xs text-center mt-1 text-[#FF0000] font-bold">
              実際にこのアプリのサーバー部分を担当しているPC（フロントはCloudflare Pages）。<span className="text-[#0000FF]">Ryzen 7 2700x</span>、<span className="text-[#0000FF]">メモリ32GB</span>とかの昔使ってたやつです。
            </p>
          </div>
        </section>

        {/* Footer with links */}
        <footer className="text-center text-xs space-y-1 pt-3">
          <p className="text-[#0000FF] font-bold">
            <a
              href="https://github.com/mizuamedesu/OpenMeet"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FF0000] underline"
            >
              オープンソース
            </a>
            {' '}- <span className="bg-[#90EE90]">自分のサーバーでホスト可能</span>
          </p>
          <p className="text-[#0000FF] font-bold">
            開発者:{' '}
            <a
              href="https://mizuame.works/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FF0000] underline"
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
