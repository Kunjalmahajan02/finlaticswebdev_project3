// Demo Claude RAG module
function getAnswer(query, context) {
  return `Answer to '${query}' with context: ${context}`;
}

module.exports = { getAnswer };
