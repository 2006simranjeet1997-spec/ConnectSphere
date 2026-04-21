const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const socketHandler = require("./socket/socket");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

socketHandler(io);

app.get("/", (req, res) => {
    res.send("Backend running");
});

server.listen(5001, () => {
    console.log("Server running on port 5001");
});