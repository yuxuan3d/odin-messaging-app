import './List.css'
import { useAuth } from './context/AuthContext';
import api from './services/api';
import { useEffect, useState } from 'react';

function List({ onSelectChat, selectedPartnerId }) {
  const { currentUser } = useAuth();
  const [recentMessages, setRecentMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Add username state
  const [usernameToAdd, setUsernameToAdd] = useState('');
  const [addloading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

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

  const handleNewChat = async (e) => {
    e.preventDefault();
    const trimmedUsername = usernameToAdd.trim();
    if (!trimmedUsername) return;

    if (trimmedUsername === currentUser.username) {
      setAddError("You cannot add yourself.");
      return;
    }

    setAddLoading(true);
    setAddError('');
    try {
      const response = await api.get(`/users/search`, {
        params: { username: trimmedUsername }
      });

      const foundUser = response.data;

      onSelectChat({ id: foundUser.id, username: foundUser.username });
      setUsernameToAdd('');
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to find user.';
      console.error("Error adding user:", errorMsg);
      // Handle specific "Not Found" error from backend
      if (error.response?.status === 404) {
        setAddError(`User "${trimmedUsername}" not found.`);
      } else {
        setAddError(errorMsg);
      }
    } finally {
      setAddLoading(false);
    }
  }

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
      
      <div className='input-container'>
        <input type="text" className='user-finder-input' placeholder=" Add a user..." value={usernameToAdd} onChange={(e) => setUsernameToAdd(e.target.value)} />
        <button onClick={handleNewChat}>Add User</button>
      </div>
      {addError && <p className="add-error" style={{ color: 'red', padding: '0 10px', fontSize: '0.9em', marginTop: '5px' }}>{addError}</p>}
    </div>
  )
}

export default List