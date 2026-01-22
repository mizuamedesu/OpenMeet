import { useState, useRef, useEffect } from 'react';
import { PaperPlaneIcon, FileIcon, DownloadIcon } from '@radix-ui/react-icons';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ScrollArea } from '../ui/ScrollArea';
import { useChat } from '../../hooks/useChat';
import { useRoom } from '../../hooks/useRoom';
import { useRoomStore } from '../../stores/roomStore';

export function ChatPanel() {
  const { messages, canChat, sendMessage } = useChat();
  const { sendFile } = useRoom();
  const fileTransfers = useRoomStore((state) => state.fileTransfers);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, fileTransfers]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await sendFile(file);
      e.target.value = '';
    }
  };

  const downloadFile = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && canChat) {
      sendMessage(input);
      setInput('');
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--card))] border-l border-[hsl(var(--border))]">
      <div className="p-3 border-b border-[hsl(var(--border))]">
        <h3 className="font-semibold">チャット</h3>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-sm">{msg.username}</span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <p className="text-sm break-words">{msg.message}</p>
            </div>
          ))}
          {fileTransfers.map((transfer) => (
            <div
              key={transfer.id}
              className="p-2 rounded-lg bg-[hsl(var(--muted))] space-y-1"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-sm">{transfer.fromUsername}</span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {formatTime(transfer.timestamp)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FileIcon className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{transfer.fileName}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {formatFileSize(transfer.fileSize)}
                  </p>
                </div>
                {transfer.status === 'completed' && transfer.blob && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => downloadFile(transfer.blob!, transfer.fileName)}
                    title="ダウンロード"
                  >
                    <DownloadIcon className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {transfer.status === 'transferring' && (
                <div className="w-full bg-[hsl(var(--border))] rounded-full h-1.5">
                  <div
                    className="bg-[hsl(var(--primary))] h-1.5 rounded-full transition-all"
                    style={{ width: `${transfer.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-3 border-t border-[hsl(var(--border))]">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            title="ファイルを送信"
          >
            <FileIcon className="w-4 h-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={canChat ? 'メッセージを入力...' : 'チャットが無効です'}
            disabled={!canChat}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!canChat || !input.trim()}>
            <PaperPlaneIcon className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
