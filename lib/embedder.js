// Demo embedder module
function embed(text) {
  // Returns a fake embedding (array of numbers)
  return Array.from({ length: 5 }, (_, i) => text.length + i);
}

module.exports = { embed };
