const User = require("../models/User");
const Message = require("../models/Message");
const cloudinary = require("cloudinary").v2;
const { userSocketMap, getIO } = require("../socket/socketServer");

// Get all users except the logged in user
const getUserForSidebar = async (req, res) => {
    try{
        const userId = req.user._id;
        const filteredUsers = await User.find({_id: {$ne: userId}}).select("-password");

        // Count number of messages not seen
        const unseenMessages = {};
        const promises = filteredUsers.map(async (user) => {
            const messages = await Message.find({senderId : user._id, receiverId: userId, seen: false});
            if(messages.length > 0){
                unseenMessages[user._id] = messages.length;
            }
        });
        await Promise.all(promises);
        res.status(200).json({ success: true, users: filteredUsers, unseenMessages });
    } catch(error){
        console.error("Error fetching users for sidebar:", error.message);
        res.status(500).json({success: false, message: error.message });
    }
}


// Get all messages for selected user
const getMessages = async (req, res) => {
    try {
        // console.log('Request params:', req.params);
        // console.log('User ID:', req.user?._id);
        
        const { id: selectedUserId } = req.params;
        const myId = req.user?._id;

        if (!selectedUserId || !myId) {
            console.error('Missing required IDs:', { selectedUserId, myId });
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required user IDs' 
            });
        }

        console.log('Fetching messages between:', myId, 'and', selectedUserId);
        
        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: selectedUserId },
                { senderId: selectedUserId, receiverId: myId }
            ]
        })
        .populate('senderId', 'fullName profilePic')
        .populate('receiverId', 'fullName profilePic')
        .sort({ createdAt: 1 })
        .lean();

        // console.log('Found messages:', messages.length);

        try {
            await Message.updateMany(
                { 
                    senderId: selectedUserId, 
                    receiverId: myId, 
                    seen: false 
                },
                { $set: { seen: true } }
            );
        } catch (updateError) {
            console.error('Error updating message status:', updateError);
            // Continue even if update fails
        }

        res.status(200).json({ 
            success: true, 
            messages: messages || [] 
        });
    } catch (error) {
        console.error("Error in getMessages:", error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch messages',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


// api to mark message as seen using message id
const markMessageAsSeen = async (req, res) => {
    try {
        const { id } = req.params;

        await Message.findByIdAndUpdate(
            id,
            { seen: true } 
        );

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error marking message as seen:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}


// Send message to selected user
const sendMessage = async (req, res) => {
    try {
        // console.log('=== SEND MESSAGE REQUEST ===');
        // console.log('Headers:', req.headers);
        // console.log('Body:', req.body);
        // console.log('Params:', req.params);
        // console.log('User:', req.user);
        
        const { text, image } = req.body || {};
        const senderId = req.user?._id;
        const receiverId = req.params?.id;
        
        // console.log('Extracted values:', { 
        //     text, 
        //     hasImage: !!image, 
        //     senderId, 
        //     receiverId 
        // });
        
        if (!senderId) {
            console.error('No sender ID in request user:', req.user);
            return res.status(400).json({
                success: false,
                message: 'User not authenticated or invalid user data'
            });
        }
        
        // Check if receiver exists
        try {
            const receiver = await User.findById(receiverId);
            if (!receiver) {
                console.error('Receiver not found with ID:', receiverId);
                return res.status(404).json({
                    success: false,
                    message: 'Recipient not found'
                });
            }
        } catch (dbError) {
            console.error('Database error when checking receiver:', dbError);
            throw dbError;
        }
        
        if (!receiverId) {
            console.error('No receiver ID in request params:', req.params);
            return res.status(400).json({
                success: false,
                message: 'No recipient specified'
            });
        }

        if (!senderId || !receiverId) {
            console.error('Missing sender or receiver ID:', { senderId, receiverId });
            return res.status(400).json({ 
                success: false, 
                message: 'Missing sender or receiver ID' 
            });
        }

        let imageUrl;
        if (image) {
            try {
                const uploadResponse = await cloudinary.uploader.upload(image, {
                    folder: "chat-app",
                    resource_type: "image"
                });
                imageUrl = uploadResponse.secure_url;
            } catch (uploadError) {
                console.error('Error uploading image to Cloudinary:', uploadError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error uploading image' 
                });
            }
        }

        // console.log('Creating message with:', { senderId, receiverId, text, imageUrl });
        
        let newMessage;
        try {
            newMessage = await Message.create({
                senderId,
                receiverId,
                text: text || '',
                image: imageUrl || undefined
            });
            // console.log('Message created:', newMessage);
        } catch (createError) {
            console.error('Error creating message:', createError);
            return res.status(500).json({ 
                success: false, 
                message: 'Error creating message',
                error: createError.message 
            });
        }

        // Populate the sender and receiver details
        try {
            newMessage = await Message.findById(newMessage._id)
                .populate('senderId', 'fullName profilePic')
                .populate('receiverId', 'fullName profilePic');
            // console.log('Populated message:', newMessage);
        } catch (populateError) {
            console.error('Error populating message:', populateError);
            // Continue with unpopulated message rather than failing
            newMessage = await Message.findById(newMessage._id);
        }

        // Emit the new message to the receiver's socket
        try {
            const io = getIO();
            const receiverSocketId = userSocketMap[receiverId];
            const senderSocketId = userSocketMap[newMessage.senderId._id || newMessage.senderId];
            
            if (receiverSocketId) {
                // console.log('Emitting newMessage to receiver socket:', receiverSocketId);
                io.to(receiverSocketId).emit("newMessage", newMessage);
            }
            
            // Also emit to sender for UI update if different from receiver
            if (senderSocketId && senderSocketId !== receiverSocketId) {
                // console.log('Emitting newMessage to sender socket:', senderSocketId);
                io.to(senderSocketId).emit("newMessage", newMessage);
            }
            
            if (!receiverSocketId && !senderSocketId) {
                // console.log('No active sockets found for message delivery:', { 
                //     receiverId,
                //     senderId: newMessage.senderId._id || newMessage.senderId
                // });
            }
        } catch (socketError) {
            console.error('Error in socket emission:', socketError);
            // Don't fail the request if socket emission fails
        }

        res.status(201).json({ 
            success: true, 
            newMessage: newMessage 
        });
    } catch (error) {
        console.error("Error sending message:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};


module.exports = { 
    getUserForSidebar, 
    getMessages, 
    sendMessage, 
    markMessageAsSeen 
};