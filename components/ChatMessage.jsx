import React from "react";

const ChatMessage = ({ sender, message }) => (
  <div style={{ border: "1px solid #ccc", padding: 10, margin: 5 }}>
    <strong>{sender}:</strong> {message}
  </div>
);

export default ChatMessage;
