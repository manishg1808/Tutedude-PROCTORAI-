import React, { useState, useRef, useEffect } from 'react';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { useObjectDetection } from '../hooks/useObjectDetection';
import { useAudioDetection } from '../hooks/useAudioDetection';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';
import {
  Play,
  Square,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  AlertTriangle,
  Eye,
  Smartphone,
  Book,
  Monitor,
  UserX,
  Zap,
  Volume2,
  VolumeX,
  Mic
} from 'lucide-react';
import toast from 'react-hot-toast';

const VideoProctor = ({ interviewId, onInterviewEnd }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [events, setEvents] = useState([]);
  const [integrityScore, setIntegrityScore] = useState(100);
  const [startTime, setStartTime] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const { 
    isRecording, 
    recordingTime, 
    startRecording, 
    stopRecording, 
    formatTime 
  } = useMediaRecorder();

  const {
    isDetecting: faceDetecting,
    faceDetected,
    multipleFaces,
    focusLost,
    drowsinessDetected,
    videoRef: faceVideoRef,
    canvasRef: faceCanvasRef,
    startDetection: startFaceDetection,
    stopDetection: stopFaceDetection
  } = useFaceDetection();

  const {
    detectedObjects,
    phoneDetected,
    bookDetected,
    deviceDetected,
    videoRef: objectVideoRef,
    canvasRef: objectCanvasRef,
    startDetection: startObjectDetection,
    stopDetection: stopObjectDetection,
    drawDetections
  } = useObjectDetection();

  const { logEvent, reportObjectDetected, updateFocusStatus } = useSocket();

  const {
    startAudioMonitoring,
    stopAudioMonitoring,
    audioLevel,
    backgroundNoise,
    multipleVoices,
    isMonitoring: audioMonitoring
  } = useAudioDetection();

  // Sync video refs
  useEffect(() => {
    if (faceVideoRef.current && objectVideoRef.current) {
      objectVideoRef.current = faceVideoRef.current;
    }
  }, [faceVideoRef, objectVideoRef]);

  const logSuspiciousEvent = async (eventType, description, severity = 'medium') => {
    const event = {
      interviewId,
      eventType,
      description,
      timestamp: new Date().toISOString(),
      confidence: 0.8,
      severity
    };

    try {
      await axios.post('/api/logs', event);
      setEvents(prev => [event, ...prev]);
      
      // Update integrity score
      let deduction = 0;
      switch (eventType) {
        case 'focus_lost':
          deduction = 2;
          break;
        case 'phone_detected':
        case 'book_detected':
        case 'device_detected':
        case 'multiple_faces':
          deduction = 5;
          break;
        case 'face_missing':
          deduction = 15;
          break;
      }
      
      setIntegrityScore(prev => Math.max(0, prev - deduction));

      // Log to socket for real-time updates
      logEvent(event);
      
      // Show toast notification
      if (severity === 'critical') {
        toast.error(`Critical: ${description}`);
      } else if (severity === 'high') {
        toast(`Alert: ${description}`, { icon: '⚠️' });
      }

    } catch (error) {
      console.error('Error logging event:', error);
    }
  };

  const startStreaming = async () => {
    try {
      const stream = await startRecording();
      setStartTime(new Date());
      setIsStreaming(true);
      
      // Start AI detection
      startFaceDetection();
      startObjectDetection();
      startAudioMonitoring();
      
      toast.success('Interview started successfully');
    } catch (error) {
      console.error('Error starting stream:', error);
      toast.error('Failed to start interview');
    }
  };

  const stopStreaming = async () => {
    stopRecording();
    stopFaceDetection();
    stopObjectDetection();
    stopAudioMonitoring();
    setIsStreaming(false);
    
    if (onInterviewEnd) {
      onInterviewEnd();
    }
    
    toast.success('Interview ended');
  };

  const toggleCamera = () => {
    if (faceVideoRef.current && faceVideoRef.current.srcObject) {
      const videoTrack = faceVideoRef.current.srcObject
        .getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleMicrophone = () => {
    if (faceVideoRef.current && faceVideoRef.current.srcObject) {
      const audioTrack = faceVideoRef.current.srcObject
        .getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicrophoneEnabled(audioTrack.enabled);
      }
    }
  };

  // Monitor detection results and log events
  useEffect(() => {
    if (!isStreaming) return;

    // Monitor focus loss
    if (focusLost) {
      logSuspiciousEvent('focus_lost', 'Candidate lost focus - looking away from screen', 'low');
    }

    // Monitor multiple faces
    if (multipleFaces) {
      logSuspiciousEvent('multiple_faces', 'Multiple faces detected - unauthorized person present', 'critical');
    }

    // Monitor drowsiness
    if (drowsinessDetected) {
      logSuspiciousEvent('drowsiness_detected', 'Drowsiness detected - candidate appears sleepy', 'medium');
    }

    // Monitor object detection
    if (phoneDetected) {
      logSuspiciousEvent('phone_detected', 'Mobile phone detected in frame', 'critical');
      reportObjectDetected({ interviewId, type: 'phone', confidence: 0.8 });
    }

    if (bookDetected) {
      logSuspiciousEvent('book_detected', 'Books or notes detected', 'high');
      reportObjectDetected({ interviewId, type: 'book', confidence: 0.8 });
    }

    if (deviceDetected) {
      logSuspiciousEvent('device_detected', 'Electronic device detected', 'high');
      reportObjectDetected({ interviewId, type: 'device', confidence: 0.8 });
    }

    // Monitor audio anomalies
    if (backgroundNoise) {
      logSuspiciousEvent('audio_anomaly', 'Background noise detected', 'medium');
    }

    if (multipleVoices) {
      logSuspiciousEvent('audio_anomaly', 'Multiple voices detected', 'high');
    }

    // Update focus status
    updateFocusStatus({
      interviewId,
      focused: !focusLost,
      timestamp: new Date().toISOString()
    });

  }, [focusLost, multipleFaces, drowsinessDetected, phoneDetected, bookDetected, deviceDetected, backgroundNoise, multipleVoices, isStreaming, interviewId]);

  // Draw detection overlays
  useEffect(() => {
    if (objectCanvasRef.current && detectedObjects.length > 0) {
      drawDetections(detectedObjects);
    }
  }, [detectedObjects, drawDetections, objectCanvasRef]);

  const getIntegrityColor = (score) => {
    if (score >= 90) return 'text-success-600 bg-success-50';
    if (score >= 70) return 'text-warning-600 bg-warning-50';
    return 'text-danger-600 bg-danger-50';
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'focus_lost':
        return <Eye className="w-4 h-4" />;
      case 'phone_detected':
        return <Smartphone className="w-4 h-4" />;
      case 'book_detected':
        return <Book className="w-4 h-4" />;
      case 'device_detected':
        return <Monitor className="w-4 h-4" />;
      case 'multiple_faces':
        return <UserX className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getEventColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'border-danger-500 bg-danger-50 text-danger-800';
      case 'high':
        return 'border-warning-500 bg-warning-50 text-warning-800';
      case 'medium':
        return 'border-primary-500 bg-primary-50 text-primary-800';
      default:
        return 'border-gray-500 bg-gray-50 text-gray-800';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Video Section */}
      <div className="lg:col-span-2 space-y-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Interview Video</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isStreaming ? 'bg-success-500 animate-pulse' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-600">
                  {isStreaming ? 'Live' : 'Offline'}
                </span>
              </div>
              {isStreaming && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Zap className="w-4 h-4" />
                  <span>{formatTime(recordingTime)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="video-container relative">
            <video
              ref={faceVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-96 object-cover rounded-lg ${!cameraEnabled ? 'grayscale' : ''}`}
            />
            <canvas
              ref={objectCanvasRef}
              className="absolute inset-0 pointer-events-none"
            />
            
            {/* Detection Status Overlay */}
            <div className="absolute top-4 left-4 space-y-2">
              <div className={`status-indicator ${faceDetected ? 'active' : 'danger'}`}>
                <Eye className="w-3 h-3" />
                {faceDetected ? 'Face Detected' : 'No Face'}
              </div>
              {multipleFaces && (
                <div className="status-indicator danger">
                  <UserX className="w-3 h-3" />
                  Multiple Faces
                </div>
              )}
              {focusLost && (
                <div className="status-indicator warning">
                  <Eye className="w-3 h-3" />
                  Focus Lost
                </div>
              )}
            </div>

            {/* Object Detection Overlay */}
            <div className="absolute top-4 right-4 space-y-2">
              {phoneDetected && (
                <div className="status-indicator danger">
                  <Smartphone className="w-3 h-3" />
                  Phone Detected
                </div>
              )}
              {bookDetected && (
                <div className="status-indicator warning">
                  <Book className="w-3 h-3" />
                  Book Detected
                </div>
              )}
              {deviceDetected && (
                <div className="status-indicator warning">
                  <Monitor className="w-3 h-3" />
                  Device Detected
                </div>
              )}
              {backgroundNoise && (
                <div className="status-indicator warning">
                  <Volume2 className="w-3 h-3" />
                  Background Noise
                </div>
              )}
              {multipleVoices && (
                <div className="status-indicator danger">
                  <VolumeX className="w-3 h-3" />
                  Multiple Voices
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleCamera}
                className={`p-2 rounded-lg transition-colors ${
                  cameraEnabled 
                    ? 'bg-success-100 text-success-600 hover:bg-success-200' 
                    : 'bg-danger-100 text-danger-600 hover:bg-danger-200'
                }`}
              >
                {cameraEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleMicrophone}
                className={`p-2 rounded-lg transition-colors ${
                  microphoneEnabled 
                    ? 'bg-success-100 text-success-600 hover:bg-success-200' 
                    : 'bg-danger-100 text-danger-600 hover:bg-danger-200'
                }`}
              >
                {microphoneEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center space-x-3">
              {!isStreaming ? (
                <button
                  onClick={startStreaming}
                  className="btn-success flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Interview</span>
                </button>
              ) : (
                <button
                  onClick={stopStreaming}
                  className="btn-danger flex items-center space-x-2"
                >
                  <Square className="w-4 h-4" />
                  <span>End Interview</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Integrity Score */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Integrity Score</h3>
          <div className={`inline-flex items-center px-4 py-2 rounded-full ${getIntegrityColor(integrityScore)}`}>
            <span className="text-2xl font-bold">{integrityScore}</span>
            <span className="text-sm ml-2">/ 100</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {integrityScore >= 90 ? 'Excellent' : 
             integrityScore >= 70 ? 'Good' : 
             integrityScore >= 50 ? 'Fair' : 'Poor'}
          </p>
        </div>

        {/* Detection Status */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Detection Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Face Detection</span>
              <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-success-500' : 'bg-danger-500'}`} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Focus Tracking</span>
              <div className={`w-2 h-2 rounded-full ${!focusLost ? 'bg-success-500' : 'bg-warning-500'}`} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Object Detection</span>
              <div className={`w-2 h-2 rounded-full ${faceDetecting ? 'bg-success-500' : 'bg-gray-400'}`} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Drowsiness</span>
              <div className={`w-2 h-2 rounded-full ${!drowsinessDetected ? 'bg-success-500' : 'bg-warning-500'}`} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Audio Monitoring</span>
              <div className={`w-2 h-2 rounded-full ${audioMonitoring ? 'bg-success-500' : 'bg-gray-400'}`} />
            </div>
            {audioLevel > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Audio Level</span>
                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(audioLevel, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Events */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Events</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No events detected</p>
            ) : (
              events.slice(0, 10).map((event, index) => (
                <div
                  key={index}
                  className={`event-log-item ${event.eventType} ${getEventColor(event.severity)}`}
                >
                  <div className="flex items-center space-x-2">
                    {getEventIcon(event.eventType)}
                    <span className="text-sm font-medium">{event.description}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoProctor;
