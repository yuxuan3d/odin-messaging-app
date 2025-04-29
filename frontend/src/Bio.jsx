import './Bio.css'
import { useAuth } from './context/AuthContext';
import { useEffect, useState } from 'react';
import api from './services/api';

function Bio() {
  const [bioDescription, setBioDescription] = useState('');
  const [toggleEditBio, setToggleEditBio] = useState(false);
  const [currentBio, setCurrentBio] = useState('');
  const {currentUser,logout} = useAuth();

  const username = currentUser ? currentUser.username : 'Loading...'

  useEffect(() => {
    setCurrentBio(currentUser?.bio || 'No bio yet');
  },[currentBio?.bio, currentUser?.bio]);

  const handleLogoutClick = async () => {
    await logout();
  }

  const handleEditBio = async (e) => {
    if (!toggleEditBio) {
      setToggleEditBio(true);
      return;
    }
    e.preventDefault();
    try {
      await api.put('/bio', { bio: bioDescription });
      setCurrentBio(bioDescription); // Update the displayed bio
      setBioDescription(''); // Clear the textarea after successful update
      setToggleEditBio(false); // Close the textarea after saving
    } catch (error) {
      console.error("Error updating bio:", error);
    }
  }

  return (
    <div className="bio">
      <div className='bio-title'>Bio</div>
      <div className='bio-name'>{username}</div>
      <div className='bio-description'>{currentBio}</div>
      <textarea placeholder="Bio" onChange={(e) => setBioDescription(e.target.value)} value={bioDescription} style={{ display: toggleEditBio ? 'block' : 'none' }}></textarea>
      <div className='bio-button-wrapper'>
        <button onClick={handleEditBio}>{toggleEditBio ? 'Save' : 'Edit Bio'}</button>
        <button onClick={handleLogoutClick}>Logout</button>
      </div>
    </div>
  )
}

export default Bio