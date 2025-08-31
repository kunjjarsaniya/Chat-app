// Store online users
const userSocketMap = {}  // {userId : socketId}

function setupSocketServer(io) {
    io.on("connection", (socket) => {
        const userId = socket.handshake.query.userId;
        console.log("User Connected", userId);

        if(userId) userSocketMap[userId] = socket.id;

        // Emit online users to all connected clients
        io.emit("getOnlineUsers", Object.keys(userSocketMap));

        socket.on("disconnect", ()=> {
            console.log("User Disconnected", userId);
            delete userSocketMap[userId];
            io.emit("getOnlineUsers", Object.keys(userSocketMap));
        })
    })
}

module.exports = { setupSocketServer, userSocketMap };