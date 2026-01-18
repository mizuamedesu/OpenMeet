import { useState, useEffect, useRef, useCallback } from 'react';

const SPEAKING_THRESHOLD = 0.02; // Adjust sensitivity
const SILENCE_DELAY = 300; // ms to wait before marking as not speaking

export function useAudioLevels(
  localStream: MediaStream | null,
  remoteStreams: Map<string, MediaStream>
) {
  const [speakingStates, setSpeakingStates] = useState<Map<string, boolean>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzersRef = useRef<Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode }>>(new Map());
  const silenceTimersRef = useRef<Map<string, number>>(new Map());
  const animationFrameRef = useRef<number | null>(null);

  const cleanupAnalyzer = useCallback((peerId: string) => {
    const analyzer = analyzersRef.current.get(peerId);
    if (analyzer) {
      analyzer.source.disconnect();
      analyzersRef.current.delete(peerId);
    }
    const timer = silenceTimersRef.current.get(peerId);
    if (timer) {
      window.clearTimeout(timer);
      silenceTimersRef.current.delete(peerId);
    }
  }, []);

  const createAnalyzer = useCallback((peerId: string, stream: MediaStream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    // Clean up existing analyzer for this peer
    cleanupAnalyzer(peerId);

    try {
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      analyzersRef.current.set(peerId, { analyser, source });
    } catch (error) {
      console.error('Failed to create audio analyzer:', error);
    }
  }, [cleanupAnalyzer]);

  // Setup analyzers for all streams
  useEffect(() => {
    // Local stream
    if (localStream) {
      createAnalyzer('local', localStream);
    }

    // Remote streams
    for (const [peerId, stream] of remoteStreams) {
      if (!analyzersRef.current.has(peerId)) {
        createAnalyzer(peerId, stream);
      }
    }

    // Cleanup removed streams
    for (const peerId of analyzersRef.current.keys()) {
      if (peerId !== 'local' && !remoteStreams.has(peerId)) {
        cleanupAnalyzer(peerId);
      }
    }
  }, [localStream, remoteStreams, createAnalyzer, cleanupAnalyzer]);

  // Analyze audio levels
  useEffect(() => {
    const dataArray = new Uint8Array(128);

    const checkLevels = () => {
      const newStates = new Map<string, boolean>();

      for (const [peerId, { analyser }] of analyzersRef.current) {
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length / 255;

        const isSpeaking = average > SPEAKING_THRESHOLD;

        if (isSpeaking) {
          // Clear any pending silence timer
          const timer = silenceTimersRef.current.get(peerId);
          if (timer) {
            window.clearTimeout(timer);
            silenceTimersRef.current.delete(peerId);
          }
          newStates.set(peerId, true);
        } else {
          // Check if we should keep speaking state for a bit
          const currentSpeaking = speakingStates.get(peerId);
          if (currentSpeaking && !silenceTimersRef.current.has(peerId)) {
            // Start silence timer
            const timer = window.setTimeout(() => {
              setSpeakingStates((prev) => {
                const next = new Map(prev);
                next.set(peerId, false);
                return next;
              });
              silenceTimersRef.current.delete(peerId);
            }, SILENCE_DELAY);
            silenceTimersRef.current.set(peerId, timer);
          }
          newStates.set(peerId, currentSpeaking || false);
        }
      }

      // Only update if changed
      setSpeakingStates((prev) => {
        let changed = false;
        for (const [peerId, speaking] of newStates) {
          if (prev.get(peerId) !== speaking) {
            changed = true;
            break;
          }
        }
        return changed ? newStates : prev;
      });

      animationFrameRef.current = requestAnimationFrame(checkLevels);
    };

    animationFrameRef.current = requestAnimationFrame(checkLevels);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [speakingStates]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const peerId of analyzersRef.current.keys()) {
        cleanupAnalyzer(peerId);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [cleanupAnalyzer]);

  return speakingStates;
}
