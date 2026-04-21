const rooms = {}; // ✅ store users per room

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // ✅ JOIN ROOM WITH NAME
    socket.on("join-room", ({ roomId, name }) => {
      socket.join(roomId);

      console.log(`User ${socket.id} (${name}) joined ${roomId}`);

      // create room if not exists
      if (!rooms[roomId]) {
        rooms[roomId] = {};
      }

      // store user
      rooms[roomId][socket.id] = name;

      // ✅ send all existing users to new user
      io.to(socket.id).emit("all-users", rooms[roomId]);

      // ✅ notify others with name
      socket.to(roomId).emit("user-connected", {
        userId: socket.id,
        name,
      });

      // ❌ DISCONNECT FIXED
      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);

        if (rooms[roomId]) {
          delete rooms[roomId][socket.id];

          socket.to(roomId).emit("user-disconnected", socket.id);
        }
      });
    });

    // 💬 CHAT
    socket.on("send-message", (message, roomId) => {
      socket.to(roomId).emit("receive-message", message);
    });

    // 📝 NOTES
    socket.on("send-notes", (data) => {
      socket.to(data.roomId).emit("receive-notes", data.notes);
    });

    // ✋ RAISE HAND
    socket.on("raise-hand", ({ roomId, status }) => {
      socket.to(roomId).emit("user-raised-hand", {
        userId: socket.id,
        status,
      });
    });

    // 🔥 WEBRTC SIGNALING

    socket.on("offer", (offer, targetId) => {
      io.to(targetId).emit("offer", offer, socket.id);
    });

    socket.on("answer", (answer, targetId) => {
      io.to(targetId).emit("answer", answer, socket.id);
    });

    socket.on("ice-candidate", (candidate, targetId) => {
      io.to(targetId).emit("ice-candidate", candidate, socket.id);
    });
  });
};
