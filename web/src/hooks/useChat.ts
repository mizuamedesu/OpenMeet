import { useCallback } from 'react';
import { useRoomStore } from '../stores/roomStore';
import { useRoom } from './useRoom';

export function useChat() {
  const { messages, canChat } = useRoomStore();
  const { sendMessage: send } = useRoom();

  const sendMessage = useCallback(
    (message: string) => {
      if (!canChat) {
        console.warn('Chat is disabled for this user');
        return;
      }
      if (message.trim()) {
        send(message.trim());
      }
    },
    [canChat, send]
  );

  return {
    messages,
    canChat,
    sendMessage,
  };
}
