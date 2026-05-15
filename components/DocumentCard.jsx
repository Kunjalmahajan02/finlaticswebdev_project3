import React from "react";

const DocumentCard = ({ title, description }) => (
  <div style={{ border: "1px solid #0070f3", borderRadius: 8, padding: 16, margin: 8 }}>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
);

export default DocumentCard;
