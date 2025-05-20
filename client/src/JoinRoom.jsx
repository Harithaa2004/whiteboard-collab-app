import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function JoinRoom() {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleJoin = () => {
    if (roomId.trim()) {
      navigate(`/room/${roomId}`);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Join a Room</h2>
      <input
        type="text"
        placeholder="Enter Room ID"
        value={roomId}
        onChange={e => setRoomId(e.target.value)}
      />
      <button onClick={handleJoin}>Join</button>
    </div>
  );
}

export default JoinRoom;
