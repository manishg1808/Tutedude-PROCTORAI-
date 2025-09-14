import { useState, useRef, useCallback, useEffect } from 'react';

export const useFaceDetection = () => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [multipleFaces, setMultipleFaces] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [focusLost, setFocusLost] = useState(false);
  const [drowsinessDetected, setDrowsinessDetected] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionInterval = useRef(null);
  const focusLostTimer = useRef(null);
  const noFaceTimer = useRef(null);
  
  // Detection state tracking
  const lastFaceDetection = useRef(Date.now());
  const consecutiveNoFaceCount = useRef(0);
  const eyeClosureCount = useRef(0);

  const detectFaces = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Simple face detection simulation (replace with actual MediaPipe implementation)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const faces = await simulateFaceDetection(imageData);

    // Update face detection state
    const currentTime = Date.now();
    const hasFace = faces.length > 0;
    
    if (hasFace) {
      setFaceDetected(true);
      setFaceCount(faces.length);
      setMultipleFaces(faces.length > 1);
      lastFaceDetection.current = currentTime;
      consecutiveNoFaceCount.current = 0;

      // Clear no-face timer
      if (noFaceTimer.current) {
        clearTimeout(noFaceTimer.current);
        noFaceTimer.current = null;
      }
    } else {
      setFaceDetected(false);
      setFaceCount(0);
      setMultipleFaces(false);
      consecutiveNoFaceCount.current++;

      // Start no-face timer if not already started
      if (!noFaceTimer.current && consecutiveNoFaceCount.current > 30) { // 1 second at 30fps
        noFaceTimer.current = setTimeout(() => {
          setFaceDetected(false);
        }, 10000); // 10 seconds
      }
    }

    // Detect drowsiness (simplified)
    if (hasFace) {
      const isDrowsy = await detectDrowsiness(faces[0]);
      setDrowsinessDetected(isDrowsy);
      
      if (isDrowsy) {
        eyeClosureCount.current++;
      } else {
        eyeClosureCount.current = Math.max(0, eyeClosureCount.current - 1);
      }
    }

    // Detect focus loss (simplified gaze direction detection)
    if (hasFace) {
      const isFocused = await detectFocus(faces[0]);
      
      if (isFocused) {
        setFocusLost(false);
        if (focusLostTimer.current) {
          clearTimeout(focusLostTimer.current);
          focusLostTimer.current = null;
        }
      } else {
        if (!focusLostTimer.current) {
          focusLostTimer.current = setTimeout(() => {
            setFocusLost(true);
          }, 5000); // 5 seconds
        }
      }
    }

    return {
      faces,
      faceDetected: hasFace,
      faceCount: faces.length,
      multipleFaces: faces.length > 1,
      drowsinessDetected,
      focusLost
    };
  }, []);

  // Simulate face detection (replace with actual MediaPipe)
  const simulateFaceDetection = async (imageData) => {
    // This is a placeholder - in real implementation, use MediaPipe Face Detection
    // For now, return a random result for demonstration
    const hasFace = Math.random() > 0.1; // 90% chance of detecting face
    const faceCount = hasFace ? (Math.random() > 0.95 ? 2 : 1) : 0;
    
    return Array(faceCount).fill().map((_, i) => ({
      x: 100 + i * 200,
      y: 100,
      width: 150,
      height: 150,
      confidence: 0.9
    }));
  };

  // Simulate drowsiness detection
  const detectDrowsiness = async (face) => {
    // Placeholder - in real implementation, analyze eye landmarks
    return Math.random() > 0.9; // 10% chance of drowsiness
  };

  // Simulate focus detection
  const detectFocus = async (face) => {
    // Placeholder - in real implementation, analyze gaze direction
    return Math.random() > 0.2; // 80% chance of being focused
  };

  const startDetection = useCallback(() => {
    if (detectionInterval.current) return;
    
    setIsDetecting(true);
    detectionInterval.current = setInterval(detectFaces, 100); // 10 FPS
  }, [detectFaces]);

  const stopDetection = useCallback(() => {
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = null;
    }
    
    if (focusLostTimer.current) {
      clearTimeout(focusLostTimer.current);
      focusLostTimer.current = null;
    }
    
    if (noFaceTimer.current) {
      clearTimeout(noFaceTimer.current);
      noFaceTimer.current = null;
    }
    
    setIsDetecting(false);
    setFaceDetected(false);
    setMultipleFaces(false);
    setFocusLost(false);
    setDrowsinessDetected(false);
  }, []);

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    isDetecting,
    faceDetected,
    multipleFaces,
    faceCount,
    focusLost,
    drowsinessDetected,
    videoRef,
    canvasRef,
    startDetection,
    stopDetection,
    detectFaces
  };
};
