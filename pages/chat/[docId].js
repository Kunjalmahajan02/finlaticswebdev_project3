import React from "react";
import { useRouter } from "next/router";

const ChatDocPage = () => {
  const router = useRouter();
  const { docId } = router.query;

  return (
    <div>
      <h1>Chat for Document: {docId}</h1>
      <p>This is a demo chat page for a document.</p>
    </div>
  );
};

export default ChatDocPage;
