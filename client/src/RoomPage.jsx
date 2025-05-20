import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import './RoomPage.css';

const socket = io('http://localhost:5000');

function RoomPage() {
  const { roomId } = useParams();
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [isEraser, setIsEraser] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [drawingHistory, setDrawingHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  useEffect(() => {
    socket.emit('join_room', roomId);

    socket.on('receive_message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    socket.on('receive_drawing_data', (data) => {
      // Add incoming drawing data to history and draw
      setDrawingHistory(prev => [...prev, data]);
      drawOnCanvas(data);
    });

    socket.on('undo_action', (data) => {
      if (data.room === roomId) {
        setDrawingHistory(data.history);
        setRedoStack([]); // optional: reset redo on remote undo
        redrawCanvas(data.history);
      }
    });

    socket.on('redo_action', (data) => {
      if (data.room === roomId) {
        setDrawingHistory(data.history);
        redrawCanvas(data.history);
      }
    });

    return () => {
      socket.off('receive_message');
      socket.off('receive_drawing_data');
      socket.off('undo_action');
      socket.off('redo_action');
    };
  }, [roomId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.lineJoin = 'round';
    context.lineCap = 'round';

    const startDrawing = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setIsDrawing(true);
      setCurrentPath([{ x, y }]);
      context.beginPath();
      context.moveTo(x, y);
    };

    const draw = (e) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setCurrentPath(prevPath => {
        const updatedPath = [...prevPath, { x, y }];
        context.strokeStyle = isEraser ? '#ffffff' : brushColor;
        context.lineWidth = brushSize;
        context.lineTo(x, y);
        context.stroke();
        return updatedPath;
      });
    };

    const stopDrawing = () => {
      if (!isDrawing) return;
      setIsDrawing(false);

      const drawData = {
        points: currentPath,
        color: isEraser ? '#ffffff' : brushColor,
        size: brushSize,
        room: roomId,
      };

      // Add to local history and clear redo stack
      setDrawingHistory(prev => [...prev, drawData]);
      setRedoStack([]);

      // Send drawing data to other clients
      socket.emit('draw', drawData);

      setCurrentPath([]);
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
    };
  }, [isDrawing, currentPath, roomId, brushColor, brushSize, isEraser]);

  const drawOnCanvas = (data) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!data.points || data.points.length === 0) return;

    context.strokeStyle = data.color;
    context.lineWidth = data.size;
    context.beginPath();
    context.moveTo(data.points[0].x, data.points[0].y);
    for (let i = 1; i < data.points.length; i++) {
      context.lineTo(data.points[i].x, data.points[i].y);
    }
    context.stroke();
  };

  const redrawCanvas = (history = drawingHistory) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);

    history.forEach(data => drawOnCanvas(data));
  };

  const handleUndo = () => {
    if (drawingHistory.length === 0) return;
    const newHistory = [...drawingHistory];
    const lastAction = newHistory.pop();
    setDrawingHistory(newHistory);
    setRedoStack(prev => [...prev, lastAction]);

    socket.emit('undo_action', { room: roomId, history: newHistory });
    redrawCanvas(newHistory);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const newRedoStack = [...redoStack];
    const lastUndone = newRedoStack.pop();
    setRedoStack(newRedoStack);
    const newHistory = [...drawingHistory, lastUndone];
    setDrawingHistory(newHistory);

    socket.emit('redo_action', { room: roomId, history: newHistory });
    redrawCanvas(newHistory);
  };

  const sendMessage = () => {
    if (!message.trim() || !username.trim()) return;

    const msgData = {
      user: username,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      room: roomId,
    };

    socket.emit('send_message', msgData);
    setMessage('');
  };

  return (
    <div className="container">
      <div className="whiteboard">
        <div className="controls">
          <label>Brush Color:</label>
          <input
            type="color"
            value={brushColor}
            onChange={e => setBrushColor(e.target.value)}
            disabled={isEraser}
          />
          <label>Brush Size:</label>
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={e => setBrushSize(parseInt(e.target.value))}
          />
          <span>{brushSize}px</span>

          <button onClick={() => setIsEraser(!isEraser)} style={{ marginLeft: '10px' }}>
            {isEraser ? '🖌️ Brush' : '🧼 Eraser'}
          </button>

          <button onClick={handleUndo} style={{ marginLeft: '10px' }}>↩️ Undo</button>
          <button onClick={handleRedo} style={{ marginLeft: '5px' }}>↪️ Redo</button>
        </div>
        <canvas ref={canvasRef} width={800} height={400} style={{ backgroundColor: 'white', border: '1px solid black' }} />
      </div>

      <div className="chat">
        <input
          type="text"
          className="username-input"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Your name"
        />

        <div className="messages">
          {messages.map((msg, idx) => (
            <div key={idx}>
              <strong>{msg.user}</strong> [{msg.time}]: {msg.message}
            </div>
          ))}
        </div>

        <div className="message-input">
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type a message"
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default RoomPage;
