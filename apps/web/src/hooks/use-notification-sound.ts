/**
 * Audio notification hook for new orders
 * Manages sound loading, playing, and user preferences
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface NotificationSoundOptions {
  soundUrl?: string;
  volume?: number;
  enabled?: boolean;
  fallbackToBeep?: boolean;
}

export interface NotificationSoundReturn {
  playSound: () => Promise<void>;
  isLoaded: boolean;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
  testSound: () => Promise<void>;
}

/**
 * Hook for managing notification sounds
 */
export const useNotificationSound = (options: NotificationSoundOptions = {}): NotificationSoundReturn => {
  const {
    soundUrl = '/sounds/notification-bell.mp3',
    volume: initialVolume = 0.7,
    enabled: initialEnabled = true,
    fallbackToBeep = true
  } = options;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [volume, setVolume] = useState(initialVolume);

  // Initialize audio (with fallback priority)
  useEffect(() => {
    // Skip audio file loading, directly use beep fallback
    if (fallbackToBeep) {
      setIsLoaded(false); // Keep false so playSound uses fallback
      return;
    }

    const audio = new Audio(soundUrl);
    audio.volume = volume;
    audio.preload = 'auto';

    // Handle load success
    const handleCanPlayThrough = () => {
      setIsLoaded(true);
    };

    // Handle load error  
    const handleError = () => {
      setIsLoaded(false);
    };

    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('error', handleError);
    
    audioRef.current = audio;

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('error', handleError);
      audio.src = '';
      audioRef.current = null;
    };
  }, [soundUrl, volume, fallbackToBeep]);

  // Update volume when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Create Web Audio API beep fallback
  const createBeepSound = useCallback(async (): Promise<void> => {
    try {
      if (!audioContextRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const context = audioContextRef.current;
      
      // Resume audio context if suspended
      if (context.state === 'suspended') {
        await context.resume();
      }
      
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      // Connect oscillator -> gain -> destination
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      // Configure beep sound (pleasant bell-like tone)
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, context.currentTime); // 800Hz bell tone
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume * 0.5, context.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.8);

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.8);
    } catch {
      // Silent fail - don't spam console
    }
  }, [volume]);

  // Play notification sound
  const playSound = useCallback(async (): Promise<void> => {
    if (!isEnabled) {
      console.debug('🔇 Notification sound disabled');
      return;
    }

    try {
      // Try to play loaded audio file
      if (audioRef.current && isLoaded) {
        // Reset audio to beginning
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        return;
      }

      // Always fallback to beep if audio file not loaded
      if (fallbackToBeep) {
        await createBeepSound();
        return;
      }
    } catch {
      // Try beep fallback on play error
      if (fallbackToBeep) {
        try {
          await createBeepSound();
        } catch {
          // Silent fail
        }
      }
    }
  }, [isEnabled, isLoaded, fallbackToBeep, createBeepSound]);

  // Test sound function
  const testSound = useCallback(async (): Promise<void> => {
    const originalEnabled = isEnabled;
    setIsEnabled(true);
    await playSound();
    setIsEnabled(originalEnabled);
  }, [isEnabled, playSound]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    playSound,
    isLoaded,
    isEnabled,
    setEnabled: setIsEnabled,
    volume,
    setVolume,
    testSound
  };
};