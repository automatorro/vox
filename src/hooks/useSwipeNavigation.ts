import { useState, useRef, useCallback } from 'react';

interface SwipeState {
  isSwiping: boolean;
  startX: number;
  currentX: number;
  direction: 'left' | 'right' | null;
}

interface UseSwipeNavigationOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // minimum distance to trigger swipe
  enabled?: boolean;
}

export const useSwipeNavigation = (options: UseSwipeNavigationOptions = {}) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    threshold = 50,
    enabled = true,
  } = options;

  const [state, setState] = useState<SwipeState>({
    isSwiping: false,
    startX: 0,
    currentX: 0,
    direction: null,
  });

  const startYRef = useRef(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    isHorizontalSwipeRef.current = null;
    
    setState({
      isSwiping: true,
      startX: touch.clientX,
      currentX: touch.clientX,
      direction: null,
    });
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !state.isSwiping) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - startYRef.current;
    
    // Determine if this is a horizontal swipe (only once per gesture)
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isHorizontalSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }
    
    // Only handle horizontal swipes
    if (!isHorizontalSwipeRef.current) return;
    
    // Prevent vertical scroll when swiping horizontally
    e.preventDefault();
    
    setState(prev => ({
      ...prev,
      currentX: touch.clientX,
      direction: deltaX > 0 ? 'right' : 'left',
    }));
  }, [enabled, state.isSwiping, state.startX]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !state.isSwiping) return;
    
    const deltaX = state.currentX - state.startX;
    
    if (isHorizontalSwipeRef.current && Math.abs(deltaX) >= threshold) {
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    }
    
    setState({
      isSwiping: false,
      startX: 0,
      currentX: 0,
      direction: null,
    });
    isHorizontalSwipeRef.current = null;
  }, [enabled, state.isSwiping, state.currentX, state.startX, threshold, onSwipeLeft, onSwipeRight]);

  const handleTouchCancel = useCallback(() => {
    setState({
      isSwiping: false,
      startX: 0,
      currentX: 0,
      direction: null,
    });
    isHorizontalSwipeRef.current = null;
  }, []);

  // Calculate offset for visual feedback during swipe
  const swipeOffset = state.isSwiping && isHorizontalSwipeRef.current 
    ? Math.max(-100, Math.min(100, state.currentX - state.startX)) 
    : 0;

  return {
    ...state,
    swipeOffset,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
  };
};
