import './Chat.css'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from './services/api';
import { useAuth } from './context/AuthContext';


function Chat({ selectedPartner }) {
    const { currentUser } = useAuth(); // Get logged-in user info
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [nextCursor, setNextCursor] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [newMessage, setNewMessage] = useState('')

    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);

    const fetchMessages = useCallback(async (partnerId, cursor = null) => {
      if (!partnerId) return; // Don't fetch if no partner is selected
  
      // Set appropriate loading state
      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setMessages([]); // Clear old messages on new chat selection
        setNextCursor(null); // Reset cursor
      }
      setError('');
  
      try {
        const response = await api.get(`/chats/${partnerId}`, {
          params: {
            limit: 30, // Or your desired page size
            cursor: cursor,
          },
        });

        response.data.messages.reverse(); // Reverse the order of messages
  
        const { messages: fetchedMessages, nextCursor: newNextCursor } = response.data;
  
        // Prepend older messages when loading more, append initial load
        setMessages(prevMessages =>
          cursor ? [...fetchedMessages, ...prevMessages] : fetchedMessages
        );
        setNextCursor(newNextCursor);
  
      } catch (err) {
        setError(`Failed to load messages for ${selectedPartner?.username || 'user'}.`);
        console.error("Error fetching chat:", err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    }, [selectedPartner?.username]);

    useEffect(() => {
      if (selectedPartner) {
        fetchMessages(selectedPartner.id);
      } else {
        // Clear messages if no partner is selected
        setMessages([]);
        setError('');
        setNextCursor(null);
      }
      // Scroll to bottom when partner changes (after initial messages load)
      // Use a small timeout to allow messages to render
      const timer = setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100); // Adjust timeout as needed
      return () => clearTimeout(timer);
  
    }, [selectedPartner, fetchMessages]);

    const handleLoadMore = () => {
      if (nextCursor && !loadingMore && selectedPartner) {
        fetchMessages(selectedPartner.id, nextCursor);
      }
    };

    const handleSendMessage = async (event) => {
      event.preventDefault();
      if (!newMessage.trim() || !selectedPartner) return;
 
      const tempMessageId = Date.now();
      const messageToSend = {
          content: newMessage,
          receiverId: selectedPartner.id,
      };
 
      const optimisticMessage = {
          id: tempMessageId, 
          content: newMessage,
          createdAt: new Date().toISOString(), 
          sender: { id: currentUser.id, username: currentUser.username }, 
          receiver: { id: selectedPartner.id, username: selectedPartner.username },
          isOptimistic: true 
      };
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('')
      fetchMessages(selectedPartner.id); // Refresh messages to show the new one
 
      try {
          const response = await api.post('/messages', messageToSend);
          const savedMessage = response.data; 
 
          // Replace optimistic message with real one
          setMessages(prev => prev.map(msg =>
              msg.id === tempMessageId ? savedMessage : msg
          ));
 
          // Scroll to bottom after sending
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 
      } catch (err) {
          console.error("Failed to send message:", err);
          setError("Failed to send message.");
          // Revert optimistic update on error
          setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      }
   };

   if (!selectedPartner) {
    return <div className="chat placeholder">Select a chat from the list to start messaging.</div>;
  }

  if (loading) {
    return <div className="chat loading">Loading chat with {selectedPartner.username}...</div>;
  }

  return (
    <div className="chat">
      <h2 className="chat-header">Chat with {selectedPartner.username}</h2>
      {error && <p className="error-message" style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
      <div className="chat-messages-container" ref={chatContainerRef}>
        {/* Load More Button (shown if there's a cursor) */}
        {nextCursor && (
          <div style={{ textAlign: 'center', margin: '10px 0' }}>
            <button onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : 'Load Older Messages'}
            </button>
          </div>
        )}

        {/* Display Messages */}
        {messages.length === 0 && !loading && <p className="no-messages">No messages yet. Start the conversation!</p>}
        {messages.map((message) => (
          <div
            key={message.id} // Use real ID (or temp ID for optimistic)
            // Add classes to style messages from self vs other
            className={`message-bubble ${message.sender.id === currentUser.id ? 'sent' : 'received'}`}
            style={message.isOptimistic ? { opacity: 0.7 } : {}} // Style optimistic messages
          >
            <div className='message-content'>{message.content}</div>
            {/* Optional: Display timestamp */}
            {/* <div className='message-timestamp'>{new Date(message.createdAt).toLocaleTimeString()}</div> */}
          </div>
        ))}
        {/* Empty div at the end to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form className='chat-input-form' onSubmit={handleSendMessage}>
        <input
          type="text"
          className='chat-input'
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={!selectedPartner} // Disable if no chat selected
        />
        <button type="submit" className='chat-send-button' disabled={!newMessage.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

export default Chat