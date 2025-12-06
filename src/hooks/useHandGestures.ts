"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  HandLandmarker,
  FilesetResolver,
  type HandLandmarkerResult
} from "@mediapipe/tasks-vision";

export type GestureMode = 'idle' | 'active';

export interface GestureState {
  isTracking: boolean;
  mode: GestureMode;
  zoom: number; // -1 to 1, where negative is zoom out, positive is zoom in
  rotationX: number; // -1 to 1, left/right rotation
  rotationY: number; // -1 to 1, up/down rotation
  confidence: number;
}

interface HandGesturesOptions {
  onGestureUpdate?: (gesture: GestureState) => void;
  enabled?: boolean;
}

// Calculate distance between two 3D points
function distance3D(
  p1: { x: number; y: number; z: number },
  p2: { x: number; y: number; z: number }
): number {
  return Math.sqrt(
    Math.pow(p2.x - p1.x, 2) +
    Math.pow(p2.y - p1.y, 2) +
    Math.pow(p2.z - p1.z, 2)
  );
}

// Gesture tuning constants
const SMOOTHING_FACTOR = 0.2;
const DEAD_ZONE = 0.02;
const ZOOM_SENSITIVITY = 3;
const ROTATION_SENSITIVITY = 2;

// Pose detection thresholds
const PINCH_THRESHOLD = 0.1; // Distance for pinch detection

// Detect if hand is pinching (active) or not (idle)
function detectHandPose(landmarks: { x: number; y: number; z: number }[]): GestureMode {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];

  if (!thumbTip || !indexTip) {
    return 'idle';
  }

  // Check for pinch (thumb and index close together)
  const pinchDistance = distance3D(thumbTip, indexTip);
  return pinchDistance < PINCH_THRESHOLD ? 'active' : 'idle';
}

export function useHandGestures({ onGestureUpdate, enabled = true }: HandGesturesOptions = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastHandPositionRef = useRef<{ x: number; y: number } | null>(null);
  const lastModeRef = useRef<GestureMode>('idle');

  // Smoothing state for EMA (exponential moving average)
  const smoothedZoomRef = useRef(0);
  const smoothedRotationXRef = useRef(0);
  const smoothedRotationYRef = useRef(0);

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gestureState, setGestureState] = useState<GestureState>({
    isTracking: false,
    mode: 'idle',
    zoom: 0,
    rotationX: 0,
    rotationY: 0,
    confidence: 0
  });

  // Initialize MediaPipe Hand Landmarker
  const initialize = useCallback(async () => {
    if (isInitialized || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load MediaPipe vision WASM
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      // Create hand landmarker
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      // Get webcam access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 }
      });

      // Create video element
      const video = document.createElement("video");
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      await video.play();

      videoRef.current = video;
      setIsInitialized(true);
    } catch (err) {
      console.error("Failed to initialize hand tracking:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize hand tracking");
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, isLoading]);

  // Process video frames
  const processFrame = useCallback(() => {
    if (!videoRef.current || !handLandmarkerRef.current || !enabled) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const video = videoRef.current;
    const startTimeMs = performance.now();

    try {
      const results: HandLandmarkerResult = handLandmarkerRef.current.detectForVideo(
        video,
        startTimeMs
      );

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        if (!landmarks) {
          animationFrameRef.current = requestAnimationFrame(processFrame);
          return;
        }

        const wrist = landmarks[0];
        if (!wrist) {
          animationFrameRef.current = requestAnimationFrame(processFrame);
          return;
        }

        // Detect current hand pose/mode
        const mode = detectHandPose(landmarks);
        const handPosition = { x: wrist.x, y: wrist.y };

        // Reset tracking when mode changes
        if (mode !== lastModeRef.current) {
          lastHandPositionRef.current = handPosition;
          lastModeRef.current = mode;
        }

        let zoom = 0;
        let rotationX = 0;
        const rotationY = 0;

        if (mode === 'active' && lastHandPositionRef.current) {
          // Active mode (pinching): X movement = rotation, Y movement = zoom
          const deltaX = handPosition.x - lastHandPositionRef.current.x;
          const deltaY = handPosition.y - lastHandPositionRef.current.y;

          // Rotation from horizontal movement
          let rawRotationX = -deltaX * ROTATION_SENSITIVITY; // Inverted for mirror
          if (Math.abs(rawRotationX) < DEAD_ZONE) rawRotationX = 0;
          smoothedRotationXRef.current = smoothedRotationXRef.current * (1 - SMOOTHING_FACTOR) + rawRotationX * SMOOTHING_FACTOR;
          rotationX = Math.max(-1, Math.min(1, smoothedRotationXRef.current));

          // Zoom from vertical movement
          let rawZoom = -deltaY * ZOOM_SENSITIVITY; // Move up = zoom in, down = zoom out
          if (Math.abs(rawZoom) < DEAD_ZONE) rawZoom = 0;
          smoothedZoomRef.current = smoothedZoomRef.current * (1 - SMOOTHING_FACTOR) + rawZoom * SMOOTHING_FACTOR;
          zoom = Math.max(-1, Math.min(1, smoothedZoomRef.current));

        } else {
          // Idle mode: decay smoothed values to zero
          smoothedZoomRef.current *= 0.8;
          smoothedRotationXRef.current *= 0.8;
          smoothedRotationYRef.current *= 0.8;
        }

        lastHandPositionRef.current = handPosition;

        const newState: GestureState = {
          isTracking: true,
          mode,
          zoom,
          rotationX,
          rotationY,
          confidence: results.handedness?.[0]?.[0]?.score ?? 0
        };

        setGestureState(newState);
        onGestureUpdate?.(newState);

      } else {
        // No hands detected - reset all tracking state
        lastHandPositionRef.current = null;
        lastModeRef.current = 'idle';

        // Reset smoothed values
        smoothedZoomRef.current = 0;
        smoothedRotationXRef.current = 0;
        smoothedRotationYRef.current = 0;

        const newState: GestureState = {
          isTracking: false,
          mode: 'idle',
          zoom: 0,
          rotationX: 0,
          rotationY: 0,
          confidence: 0
        };

        setGestureState(newState);
        onGestureUpdate?.(newState);
      }
    } catch (err) {
      console.error("Error processing frame:", err);
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [enabled, onGestureUpdate]);

  // Start/stop processing
  useEffect(() => {
    if (isInitialized && enabled) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isInitialized, enabled, processFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsInitialized(false);
  }, []);

  return {
    initialize,
    stop,
    isInitialized,
    isLoading,
    error,
    gestureState,
    videoElement: videoRef.current
  };
}
