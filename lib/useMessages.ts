import { useState } from "react";

interface Message {
  id: string;
  time: string;
  text: string;
}

const MESSAGES_TO_KEEP = 30;

const useMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = (text: string) => {
    setMessages((prevMessages) => {
      const newMessage = {
        id: `${Date.now().toString()}-${Math.random()}`,
        time: new Date().toLocaleTimeString(),
        text,
      };

      // if last message in log is the same, only update time:
      const lastMessage = prevMessages[0];
      if (lastMessage && lastMessage.text === text) {
        return [newMessage, ...prevMessages.slice(1)];
      }

      // If no existing message, simply add new message
      return [newMessage, ...prevMessages].slice(0, MESSAGES_TO_KEEP);
    });
  };

  const clearMessages = () => setMessages([]);

  return { messages, addMessage, clearMessages };
};

export { Message, useMessages };
