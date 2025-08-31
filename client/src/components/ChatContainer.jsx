import React, { useEffect, useRef, useContext, useState } from 'react'
import assets from '../assets/assets'
import { formatMessageTime } from '../lib/utils';
import { ChatContext } from '../../context/ChatContext.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import { toast } from 'react-hot-toast';

const ChatContainer = () => {

    const {messages, selectedUser, setSelectedUser, sendMessage, getMessages, setMessages} = useContext(ChatContext);

    const {authUser, onlineUsers} = useContext(AuthContext);

    const scrollEnd = useRef();

    const [input, setInput] = useState('');

    // Handle sending a message
    const handleSendMessage = async(e) => {
        e.preventDefault();
        if(input.trim() === "") return;
        await sendMessage({text: input.trim()});
        setInput('');
    }

    // Handle sending an image
    const handleSendImage = async(e) => {
        const file = e.target.files[0];
        if(!file || !file.type.startsWith("image/")) {
            toast.error("Please select a valid image file");
            return;
        };
        const render = new FileReader();
        render.onloadend = async() => {
            await sendMessage({image: render.result});
            e.target.value = "";
        };
        render.readAsDataURL(file);
    }

    useEffect(() => {
        if(selectedUser?._id) {
            getMessages(selectedUser._id);
        } else {
            setMessages([]); // Clear messages when no user is selected
        }
    }, [selectedUser?._id]); // Only re-run if selectedUser._id changes

    useEffect(() => {
        if(scrollEnd.current && messages) {
            scrollEnd.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    return selectedUser ? (
        <div className='h-full overflow-scroll relative backdrop-blur-lg'>
            {/* Header */}
            <div className='flex items-center gap-3 py-3 mx-4 border-b border-stone-500'>
                <img src={selectedUser.profilePic || assets.avatar_icon} alt="" className='w-8 rounded-full' />
                <p className='flex-1 text-lg text-white flex items-center gap-2'>
                    {selectedUser.fullName}
                    {onlineUsers.includes(selectedUser._id) && <span className='w-2 h-2 rounded-full bg-green-500'></span>}
                </p>
                <img onClick={() => setSelectedUser(null)} src={assets.arrow_icon} alt="" className='md:hidden max-w-7' />
                <img src={assets.help_icon} alt="" className='max-md:hidden max-w-5' />
            </div> 
            
            {/* Chat Area */}
            <div className='flex flex-col h-[calc(100%-120px)] overflow-y-auto p-4 space-y-2'>
                {messages.map((message, index) => {
                    console.log('Message data:', message);
                    console.log('Auth user:', authUser);
                    console.log('Selected user:', selectedUser);
                    const isCurrentUser = message.senderId?._id === authUser?._id || message.senderId === authUser?._id;
                    
                    return (
                        <div 
                            key={index} 
                            className={`flex items-start gap-2 my-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                            {/* Avatar */}
                            {/* Avatar - Always show for both sent and received messages */}
                            <div className={`flex-shrink-0 ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                                <img 
                                    src={
                                        isCurrentUser 
                                            ? (authUser?.profilePic || assets.avatar_icon)
                                            : (
                                                // Handle both populated and unpopulated message data
                                                (message.senderId?.profilePic || // For populated message data
                                                selectedUser?.profilePic) ||     // Fallback to selectedUser's profile pic
                                                assets.avatar_icon               // Default avatar
                                            )
                                    } 
                                    alt="" 
                                    className='w-8 h-8 rounded-full object-cover' 
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = assets.avatar_icon;
                                    }}
                                />
                            </div>
                            
                            {/* Message Content */}
                            <div className={`max-w-[70%] ${isCurrentUser ? 'order-1' : 'order-2'}`}>
                                <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                    {message.image ? (
                                        <div className='mb-1'>
                                            <img 
                                                src={message.image} 
                                                alt="" 
                                                className='max-w-[230px] border border-gray-700 rounded-lg overflow-hidden mb-8' 
                                            />
                                        </div>
                                    ) : (
                                        <div 
                                            className={`px-4 py-2 rounded-2xl ${
                                                isCurrentUser 
                                                    ? 'bg-violet-500/30 text-white rounded-tr-none' 
                                                    : 'bg-violet-500/30 text-white rounded-tl-none'
                                            }`}
                                        >
                                            <p className='break-words'>{message.text}</p>
                                        </div>
                                    )}
                                </div>
                                <p className={`text-xs mt-1 ${isCurrentUser ? 'text-right' : 'text-left'} ${isCurrentUser ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {formatMessageTime(message.createdAt)}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollEnd}></div>
            </div>
            
            {/* Input Area */}
            <div className='absolute bottom-0 left-0 right-0 flex items-center gap-3 p-3'>
                <div className='flex-1 flex items-center bg-gray-100/12 px-3 rounded-full'>
                    <input
                        onChange={(e) => setInput(e.target.value)}
                        value={input}
                        onKeyDown={(e) => e.key === 'Enter' ? handleSendMessage(e) : null}
                        type="text" 
                        placeholder='Type your message' 
                        className='flex-1 text-sm p-3 border-none rounded-lg outline-none text-white placeholder-gray-400'
                    />
                    <input onChange={handleSendImage} type="file" id="image" accept="image/*" hidden />
                    <label htmlFor="image" className='max-w-5 cursor-pointer'>
                        <img src={assets.gallery_icon} alt="" className='w-5 mr-2 cursor-pointer' />
                    </label>
                </div>
                <img onClick={handleSendMessage} src={assets.send_button} alt="" className='w-7 cursor-pointer' />
            </div>
        </div>
    ) : (
        <div className='flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden'>
            <img src={assets.logo_icon} alt="" className='max-w-16' />
            <p className='text-lg font-medium text-white'>Chat anytime, anywhere</p>
        </div>
    )
}

export default ChatContainer