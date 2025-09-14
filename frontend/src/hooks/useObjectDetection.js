import { useState, useRef, useCallback } from 'react';

export const useObjectDetection = () => {
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [phoneDetected, setPhoneDetected] = useState(false);
  const [bookDetected, setBookDetected] = useState(false);
  const [deviceDetected, setDeviceDetected] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionInterval = useRef(null);

  // Object classes we're interested in detecting
  const targetClasses = {
    'cell phone': 'phone',
    'book': 'book',
    'laptop': 'device',
    'mouse': 'device',
    'keyboard': 'device',
    'remote': 'device'
  };

  const detectObjects = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Simulate object detection (replace with actual TensorFlow.js/YOLO implementation)
    const objects = await simulateObjectDetection(video);

    // Filter for our target objects
    const relevantObjects = objects.filter(obj => 
      Object.keys(targetClasses).includes(obj.class)
    );

    setDetectedObjects(relevantObjects);

    // Update specific detection states
    const hasPhone = relevantObjects.some(obj => obj.class === 'cell phone');
    const hasBook = relevantObjects.some(obj => obj.class === 'book');
    const hasDevice = relevantObjects.some(obj => 
      ['laptop', 'mouse', 'keyboard', 'remote'].includes(obj.class)
    );

    setPhoneDetected(hasPhone);
    setBookDetected(hasBook);
    setDeviceDetected(hasDevice);

    return {
      objects: relevantObjects,
      phoneDetected: hasPhone,
      bookDetected: hasBook,
      deviceDetected: hasDevice
    };
  }, []);

  // Simulate object detection (replace with actual TensorFlow.js implementation)
  const simulateObjectDetection = async (video) => {
    // This is a placeholder - in real implementation, use TensorFlow.js or YOLO
    // For demonstration, randomly detect objects
    const objects = [];
    
    // 5% chance of detecting a phone
    if (Math.random() > 0.95) {
      objects.push({
        class: 'cell phone',
        confidence: 0.85,
        bbox: {
          x: 50,
          y: 100,
          width: 80,
          height: 120
        }
      });
    }

    // 3% chance of detecting a book
    if (Math.random() > 0.97) {
      objects.push({
        class: 'book',
        confidence: 0.78,
        bbox: {
          x: 200,
          y: 150,
          width: 100,
          height: 80
        }
      });
    }

    // 2% chance of detecting a device
    if (Math.random() > 0.98) {
      const devices = ['laptop', 'mouse', 'keyboard'];
      const randomDevice = devices[Math.floor(Math.random() * devices.length)];
      
      objects.push({
        class: randomDevice,
        confidence: 0.82,
        bbox: {
          x: 300,
          y: 80,
          width: 120,
          height: 90
        }
      });
    }

    return objects;
  };

  const startDetection = useCallback(() => {
    if (detectionInterval.current) return;
    
    detectionInterval.current = setInterval(detectObjects, 500); // 2 FPS for object detection
  }, [detectObjects]);

  const stopDetection = useCallback(() => {
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = null;
    }
    
    setDetectedObjects([]);
    setPhoneDetected(false);
    setBookDetected(false);
    setDeviceDetected(false);
  }, []);

  const drawDetections = useCallback((objects) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    objects.forEach(obj => {
      const { x, y, width, height } = obj.bbox;
      
      // Set color based on object type
      let color = '#3b82f6'; // default blue
      if (obj.class === 'cell phone') color = '#ef4444'; // red
      else if (obj.class === 'book') color = '#f59e0b'; // orange
      else if (['laptop', 'mouse', 'keyboard', 'remote'].includes(obj.class)) color = '#8b5cf6'; // purple

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Draw label background
      const labelText = `${obj.class} (${Math.round(obj.confidence * 100)}%)`;
      const textMetrics = ctx.measureText(labelText);
      const labelHeight = 20;
      
      ctx.fillStyle = color;
      ctx.fillRect(x, y - labelHeight, textMetrics.width + 8, labelHeight);

      // Draw label text
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.fillText(labelText, x + 4, y - 6);
    });
  }, []);

  return {
    detectedObjects,
    phoneDetected,
    bookDetected,
    deviceDetected,
    videoRef,
    canvasRef,
    startDetection,
    stopDetection,
    detectObjects,
    drawDetections
  };
};
