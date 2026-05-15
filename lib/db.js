// Demo DB module
const db = {
  documents: [],
  addDocument(doc) {
    this.documents.push(doc);
  },
  getDocuments() {
    return this.documents;
  }
};

module.exports = db;
