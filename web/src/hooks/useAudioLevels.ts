import { useState, useEffect, useRef, useCallback } from 'react';

const SPEAKING_THRESHOLD = 0.02;
const SILENCE_DELAY = 300;

export function useAudioLevels(
  localStream: MediaStream | null,
  remoteStreams: Map<string, MediaStream>
) {
  const [speakingStates, setSpeakingStates] = useState<Map<string, boolean>>(
    new Map()
  );
  const contextRef = useRef<AudioContext | null>(null);
  const analyzersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const rafRef = useRef<number>(0);
  const enabledRef = useRef(true);
  const initializedRef = useRef(false);
  const silenceTimersRef = useRef<Map<string, number>>(new Map());

  // Lazy initialization of AudioContext - only when we have streams
  const getOrCreateContext = useCallback((): AudioContext | null => {
    if (!enabledRef.current) return null;

    try {
      if (contextRef.current) {
        return contextRef.current;
      }

      // Check if AudioContext is available
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        enabledRef.current = false;
        return null;
      }

      const ctx = new AudioContextClass();
      contextRef.current = ctx;
      return ctx;
    } catch {
      enabledRef.current = false;
      return null;
    }
  }, []);

  // Setup analyzer for a stream
  const setupAnalyzer = useCallback((ctx: AudioContext, id: string, stream: MediaStream) => {
    if (!enabledRef.current) return;
    if (analyzersRef.current.has(id)) return;

    try {
      const tracks = stream.getAudioTracks();
      if (tracks.length === 0) return;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyzersRef.current.set(id, analyser);
    } catch {
      // Silently ignore - just won't have speaking indicator for this stream
    }
  }, []);

  useEffect(() => {
    // Skip if disabled or no streams available
    if (!enabledRef.current) return;
    if (!localStream && remoteStreams.size === 0) return;

    // Get or create AudioContext
    const ctx = getOrCreateContext();
    if (!ctx) return;

    // Try to resume if suspended (needed after user interaction)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        // Ignore - will work after user interaction
      });
    }

    // Setup analyzers for all streams
    if (localStream) {
      setupAnalyzer(ctx, 'local', localStream);
    }
    for (const [id, stream] of remoteStreams) {
      setupAnalyzer(ctx, id, stream);
    }

    // If no analyzers were set up, don't start the loop
    if (analyzersRef.current.size === 0) return;

    // Mark as initialized
    initializedRef.current = true;

    // Shared data array for analysis
    const dataArray = new Uint8Array(128);

    const analyze = () => {
      if (!enabledRef.current) return;

      try {
        const newStates = new Map<string, boolean>();

        for (const [id, analyser] of analyzersRef.current) {
          try {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length / 255;
            const speaking = avg > SPEAKING_THRESHOLD;

            if (speaking) {
              const timer = silenceTimersRef.current.get(id);
              if (timer) {
                window.clearTimeout(timer);
                silenceTimersRef.current.delete(id);
              }
              newStates.set(id, true);
            } else {
              newStates.set(id, false);
            }
          } catch {
            newStates.set(id, false);
          }
        }

        setSpeakingStates((prev) => {
          // Check if anything actually changed
          let changed = false;
          for (const [id, val] of newStates) {
            if (prev.get(id) !== val) {
              // Handle silence delay for turning off
              if (!val && prev.get(id)) {
                if (!silenceTimersRef.current.has(id)) {
                  const timer = window.setTimeout(() => {
                    setSpeakingStates((p) => {
                      const next = new Map(p);
                      next.set(id, false);
                      return next;
                    });
                    silenceTimersRef.current.delete(id);
                  }, SILENCE_DELAY);
                  silenceTimersRef.current.set(id, timer);
                }
                newStates.set(id, true); // Keep showing as speaking during delay
              } else {
                changed = true;
              }
            }
          }
          return changed ? newStates : prev;
        });
      } catch {
        // Silently ignore any errors during analysis
      }

      rafRef.current = requestAnimationFrame(analyze);
    };

    rafRef.current = requestAnimationFrame(analyze);

    return () => {
      cancelAnimationFrame(rafRef.current);
      for (const timer of silenceTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      silenceTimersRef.current.clear();
    };
  }, [localStream, remoteStreams, getOrCreateContext, setupAnalyzer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (contextRef.current) {
        try {
          contextRef.current.close();
        } catch {
          // Ignore
        }
        contextRef.current = null;
      }
      analyzersRef.current.clear();
    };
  }, []);

  return speakingStates;
}
