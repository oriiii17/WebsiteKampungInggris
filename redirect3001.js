const http = require("http");

const server = http.createServer((req, res) => {
  const targetUrl = `http://localhost:3000${req.url || ""}`;
  res.writeHead(302, {
    Location: targetUrl,
    "Content-Type": "text/plain",
  });
  res.end(`Redirecting to ${targetUrl}`);
});

server.listen(3001, () => {
  console.log("Redirect server active on http://localhost:3001 -> http://localhost:3000");
});
