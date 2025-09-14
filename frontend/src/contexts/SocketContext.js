import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setConnected(false);
      });

      // Listen for real-time events
      newSocket.on('new-event', (data) => {
        console.log('New event received:', data);
        // Handle new event (e.g., show notification)
        if (data.severity === 'critical') {
          toast.error(`Critical Alert: ${data.description}`, {
            duration: 6000,
          });
        } else if (data.severity === 'high') {
          toast(`High Priority: ${data.description}`, {
            icon: '⚠️',
            duration: 5000,
          });
        }
      });

      newSocket.on('focus-status', (data) => {
        console.log('Focus status update:', data);
        // Handle focus status updates
      });

      newSocket.on('suspicious-activity', (data) => {
        console.log('Suspicious activity detected:', data);
        toast.error(`Suspicious Activity: ${data.description}`, {
          duration: 6000,
        });
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
        setSocket(null);
        setConnected(false);
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [user]);

  const joinInterview = (interviewId) => {
    if (socket) {
      socket.emit('join-interview', interviewId);
    }
  };

  const leaveInterview = (interviewId) => {
    if (socket) {
      socket.emit('leave-interview', interviewId);
    }
  };

  const logEvent = (data) => {
    if (socket) {
      socket.emit('log-event', data);
    }
  };

  const updateFocusStatus = (data) => {
    if (socket) {
      socket.emit('focus-update', data);
    }
  };

  const reportObjectDetected = (data) => {
    if (socket) {
      socket.emit('object-detected', data);
    }
  };

  const value = {
    socket,
    connected,
    joinInterview,
    leaveInterview,
    logEvent,
    updateFocusStatus,
    reportObjectDetected
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
