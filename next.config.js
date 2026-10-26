/** @type {import('next').NextConfig} */
module.exports = {
  // gzip buffers responses, which would hold back streamed (SSE) chat answers
  compress: false,
};
