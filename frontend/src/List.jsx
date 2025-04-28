import './List.css'
import { useAuth } from './context/AuthContext';
import api from './services/api';
import { useEffect, useState } from 'react';

function List({ onSelectChat, selectedPartnerId }) {
  const { currentUser } = useAuth();
  const [recentMessages, setRecentMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {

    const fetchRecentMessages = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await api.get(`/recent`);
        setRecentMessages(response.data);
      } catch (error) {
        console.error("Error fetching messages");
        setError(error.message || 'Error fetching messages');
      } finally {
        setLoading(false);
      }
    };

    fetchRecentMessages();
  }, [currentUser]);

  if (loading) return <div>Loading messages...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="list">
      <div className='message-title'>Recent Messages</div>
      {recentMessages.length === 0 && !loading && <div className="no-messages">No recent chats.</div>}
      {recentMessages.map((message) => {
        let partner = null
        if (message.sender.id === currentUser.id) {
          partner = message.receiver;
        } else {
          partner = message.sender;
        }
        const isSelected = partner.id === selectedPartnerId;

        return (
          <div
            key={message.id} 
            className={`message-card ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelectChat({ id: partner.id, username: partner.username })}
            style={{ cursor: 'pointer' }} 
          >
            <div className='message-sender'>{partner.username}</div>
            <div className='message-text'>{message.content}</div>
          </div>
        );
      })}
    </div>
  )
}

export default List