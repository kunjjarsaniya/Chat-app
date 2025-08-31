// Store online users
const userSocketMap = {};  // {userId : socketId}
let ioInstance = null;

function setupSocketServer(io) {
    ioInstance = io;
    
    io.on("connection", (socket) => {
        const userId = socket.handshake.query.userId;
        console.log("User Connected", userId);

        if (userId) {
            userSocketMap[userId] = socket.id;
            // Emit updated online users list
            io.emit("getOnlineUsers", Object.keys(userSocketMap));
        }

        socket.on("disconnect", () => {
            console.log("User Disconnected", userId);
            if (userId) {
                delete userSocketMap[userId];
                io.emit("getOnlineUsers", Object.keys(userSocketMap));
            }
        });
    });
}

function getIO() {
    if (!ioInstance) {
        throw new Error("Socket.io not initialized!");
    }
    return ioInstance;
}

module.exports = { 
    setupSocketServer, 
    userSocketMap, 
    getIO 
};