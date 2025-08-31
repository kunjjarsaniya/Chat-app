import React, { useContext, useEffect, useState, useCallback } from 'react'
import { createContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const ChatContext = createContext();    

const ChatProvider = ({children}) => {

    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [unseenMessages, setUnseenMessages] = useState({});

    const {socket, axios, authUser} = useContext(AuthContext);


    // function to get all users for sidebar
    const getAllUsers = async () => {
        try {
            const {data} = await axios.get("/api/messages/users");
            if(data.success){
                setUsers(data.users);
                setUnseenMessages(data.unseenMessages);
            }
        } catch (error) {
            toast.error(error.message);
        }
    }


    // function to get messages for selected user
    const getMessages = async (userId) => {
        if (!userId) {
            setMessages([]);
            return;
        }
        try {
            const { data } = await axios.get(`/api/messages/${userId}`);
            if (data?.success) {
                setMessages(data.messages || []);
            } else {
                toast.error(data?.message || 'Failed to load messages');
                setMessages([]);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            toast.error(error.response?.data?.message || error.message || 'Error loading messages');
            setMessages([]);
        }
    }


    // function to send message to selected user
    const sendMessage = async (messageData) => {
        if (!selectedUser?._id) {
            console.error('No selected user when trying to send message');
            toast.error('No recipient selected');
            return;
        }

        console.log('Sending message:', {
            to: selectedUser._id,
            data: messageData
        });

        try {
            const response = await axios.post(
                `/api/messages/send/${selectedUser._id}`, 
                messageData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'token': localStorage.getItem('token')
                    }
                }
            );
            
            console.log('Message sent successfully:', response.data);
            
            if (response.data?.success) {
                // The message will be added to the list via the socket event
                // This ensures real-time updates work consistently
                return response.data.newMessage;
            } else {
                throw new Error(response.data?.message || 'Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', {
                error,
                response: error.response?.data,
                status: error.response?.status
            });
            
            const errorMessage = error.response?.data?.message || 
                               error.message || 
                               'Error sending message';
            
            toast.error(errorMessage);
            throw error; // Re-throw to allow handling in the component if needed
        }
    }


    // function to subscribe to messages for selected user
    const subscribeToMessages = useCallback(() => {
        if(!socket || !authUser) return () => {};
        
        const handleNewMessage = (newMessage) => {
            console.log('New message received:', newMessage);
            
            // Ensure we're working with string IDs for comparison
            const currentUserId = authUser._id.toString();
            const messageSenderId = newMessage.senderId?._id?.toString() || newMessage.senderId?.toString();
            const messageReceiverId = newMessage.receiverId?._id?.toString() || newMessage.receiverId?.toString();
            const selectedUserId = selectedUser?._id?.toString();
            
            console.log('Message details:', {
                currentUserId,
                messageSenderId,
                messageReceiverId,
                selectedUserId
            });
            
            // Update messages list if the message is relevant to the current chat
            const isMessageForCurrentChat = 
                (messageSenderId === selectedUserId) || 
                (messageReceiverId === selectedUserId) ||
                (messageSenderId === currentUserId && messageReceiverId === selectedUserId) ||
                (messageReceiverId === currentUserId && messageSenderId === selectedUserId);
                
            if (isMessageForCurrentChat) {
                setMessages(prevMessages => {
                    // Check if message already exists to avoid duplicates
                    if (!prevMessages.some(msg => msg._id === newMessage._id)) {
                        return [...prevMessages, newMessage];
                    }
                    return prevMessages;
                });
                
                // Mark as seen if current user is the receiver
                if (messageReceiverId === currentUserId) {
                    console.log('Marking message as seen:', newMessage._id);
                    axios.put(`/api/messages/mark-seen/${newMessage._id}`)
                        .then(() => console.log('Message marked as seen'))
                        .catch(err => console.error('Error marking message as seen:', err));
                }
            } 
            
            // Update unseen messages count if not from the current user
            if (messageSenderId !== currentUserId) {
                console.log('Updating unseen messages count for user:', messageSenderId);
                setUnseenMessages(prevUnseenMessages => ({
                    ...prevUnseenMessages,
                    [messageSenderId]: (prevUnseenMessages[messageSenderId] || 0) + 1
                }));
            }
        };

        // Remove any existing listeners to prevent duplicates
        socket.off("newMessage");
        // Add the new listener
        socket.on("newMessage", handleNewMessage);

        // Cleanup function
        return () => {
            if (socket) {
                socket.off("newMessage", handleNewMessage);
            }
        };
    }, [socket, selectedUser?._id, authUser?._id, axios]);

    // function to unsubscribe from messages
    const unsubscribeFromMessages = useCallback(() => {
        if (socket) {
            socket.off("newMessage");
        }
    }, [socket]);

    useEffect(() => {
        if (!socket || !authUser) return;
        
        console.log('Subscribing to messages for user:', authUser._id);
        if (selectedUser) {
            console.log('Selected user:', selectedUser._id);
        }
        
        // Subscribe to messages
        const cleanup = subscribeToMessages();
        
        // Cleanup function
        return () => {
            console.log('Cleaning up message subscription');
            if (typeof cleanup === 'function') {
                cleanup();
            } else if (socket) {
                // Fallback cleanup
                socket.off("newMessage");
            }
        };
    }, [socket, authUser, selectedUser?._id, subscribeToMessages])


    const value = {
        messages,
        setMessages,
        users,
        selectedUser,
        getAllUsers,
        getMessages,
        sendMessage,
        setSelectedUser,
        unseenMessages,
        setUnseenMessages,
    }
    
    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    )
}

export { ChatContext, ChatProvider }
