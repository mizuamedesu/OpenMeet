import { useState, useRef, useEffect } from 'react';
import { PaperPlaneIcon } from '@radix-ui/react-icons';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ScrollArea } from '../ui/ScrollArea';
import { useChat } from '../../hooks/useChat';

export function ChatPanel() {
  const { messages, canChat, sendMessage } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        <h3 className="font-semibold">Chat</h3>
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
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-3 border-t border-[hsl(var(--border))]">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={canChat ? 'Type a message...' : 'Chat disabled'}
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
