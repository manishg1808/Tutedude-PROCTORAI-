import { useState, useRef, useCallback } from 'react';

export const useAudioDetection = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [backgroundNoise, setBackgroundNoise] = useState(false);
  const [multipleVoices, setMultipleVoices] = useState(false);
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationRef = useRef(null);
  const monitoringInterval = useRef(null);

  const startAudioMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      microphoneRef.current.connect(analyserRef.current);
      
      setIsMonitoring(true);
      
      // Start monitoring for background noise and multiple voices
      monitoringInterval.current = setInterval(() => {
        checkForAnomalies();
      }, 1000);
      
      // Start audio level monitoring
      const monitorAudioLevel = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        
        // Calculate average audio level
        const average = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length;
        setAudioLevel(average);
        
        if (isMonitoring) {
          animationRef.current = requestAnimationFrame(monitorAudioLevel);
        }
      };
      
      monitorAudioLevel();
      
    } catch (error) {
      console.error('Error starting audio monitoring:', error);
    }
  }, [isMonitoring]);

  const stopAudioMonitoring = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (monitoringInterval.current) {
      clearInterval(monitoringInterval.current);
      monitoringInterval.current = null;
    }
    
    setIsMonitoring(false);
    setAudioLevel(0);
    setBackgroundNoise(false);
    setMultipleVoices(false);
  }, []);

  const checkForAnomalies = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // Analyze frequency spectrum for anomalies
    const frequencies = Array.from(dataArrayRef.current);
    
    // Check for background noise (high levels in certain frequency ranges)
    const lowFreq = frequencies.slice(0, 10).reduce((sum, val) => sum + val, 0) / 10;
    const midFreq = frequencies.slice(10, 50).reduce((sum, val) => sum + val, 0) / 40;
    const highFreq = frequencies.slice(50, 128).reduce((sum, val) => sum + val, 0) / 78;
    
    // Detect background noise
    if (lowFreq > 50 && midFreq > 30) {
      setBackgroundNoise(true);
    } else {
      setBackgroundNoise(false);
    }
    
    // Detect multiple voices (simplified - look for complex frequency patterns)
    const frequencyVariance = calculateVariance(frequencies);
    if (frequencyVariance > 1000) {
      setMultipleVoices(true);
    } else {
      setMultipleVoices(false);
    }
  }, []);

  const calculateVariance = (array) => {
    const mean = array.reduce((sum, val) => sum + val, 0) / array.length;
    const variance = array.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / array.length;
    return variance;
  };

  const getAudioStatus = useCallback(() => {
    return {
      isMonitoring,
      audioLevel,
      backgroundNoise,
      multipleVoices,
      hasAnomalies: backgroundNoise || multipleVoices
    };
  }, [isMonitoring, audioLevel, backgroundNoise, multipleVoices]);

  return {
    startAudioMonitoring,
    stopAudioMonitoring,
    getAudioStatus,
    audioLevel,
    backgroundNoise,
    multipleVoices,
    isMonitoring
  };
};
