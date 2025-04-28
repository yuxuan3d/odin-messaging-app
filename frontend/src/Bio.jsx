import './Bio.css'
import { useAuth } from './context/AuthContext';

function Bio() {
  const {currentUser,logout} = useAuth();

  const username = currentUser ? currentUser.username : 'Loading...'

  const bioDescription = currentUser?.bio || 'No bio yet';

  const handleLogoutClick = async () => {
    await logout();
  }

  return (
    <div className="bio">
      <div className='bio-title'>Bio</div>
      <div className='bio-name'>{username}</div>
      <div className='bio-description'>{bioDescription}</div>
      <button onClick={handleLogoutClick}>Logout</button>
    </div>
  )
}

export default Bio