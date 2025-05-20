import { BrowserRouter, Routes, Route } from 'react-router-dom';
import JoinRoom from './JoinRoom';
import RoomPage from './RoomPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JoinRoom />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
