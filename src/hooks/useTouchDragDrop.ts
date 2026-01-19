import { useState, useRef, useCallback, useEffect } from 'react';

interface TouchDragState {
  isDragging: boolean;
  draggedId: string | null;
  draggedElement: HTMLElement | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface UseTouchDragDropOptions {
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string, dropTarget: Element | null) => void;
  onDragMove?: (x: number, y: number) => void;
  dragDataAttribute?: string;
  dropTargetSelector?: string;
}

export const useTouchDragDrop = (options: UseTouchDragDropOptions = {}) => {
  const {
    onDragStart,
    onDragEnd,
    onDragMove,
    dragDataAttribute = 'data-drag-id',
    dropTargetSelector = '[data-drop-target]'
  } = options;

  const [state, setState] = useState<TouchDragState>({
    isDragging: false,
    draggedId: null,
    draggedElement: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const ghostRef = useRef<HTMLElement | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const createGhost = useCallback((element: HTMLElement, x: number, y: number) => {
    const ghost = element.cloneNode(true) as HTMLElement;
    ghost.style.position = 'fixed';
    ghost.style.left = `${x - element.offsetWidth / 2}px`;
    ghost.style.top = `${y - element.offsetHeight / 2}px`;
    ghost.style.width = `${element.offsetWidth}px`;
    ghost.style.opacity = '0.8';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    ghost.style.transform = 'scale(1.05)';
    ghost.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
    ghost.style.borderRadius = '8px';
    ghost.style.transition = 'transform 0.1s ease';
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
  }, []);

  const updateGhostPosition = useCallback((x: number, y: number) => {
    if (ghostRef.current) {
      ghostRef.current.style.left = `${x - ghostRef.current.offsetWidth / 2}px`;
      ghostRef.current.style.top = `${y - ghostRef.current.offsetHeight / 2}px`;
    }
  }, []);

  const removeGhost = useCallback(() => {
    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }
  }, []);

  const findDropTarget = useCallback((x: number, y: number): Element | null => {
    // Temporarily hide ghost to find element under it
    if (ghostRef.current) {
      ghostRef.current.style.display = 'none';
    }
    
    const elementsAtPoint = document.elementsFromPoint(x, y);
    
    if (ghostRef.current) {
      ghostRef.current.style.display = '';
    }
    
    for (const el of elementsAtPoint) {
      const target = el.closest(dropTargetSelector);
      if (target) {
        return target;
      }
    }
    return null;
  }, [dropTargetSelector]);

  const handleTouchStart = useCallback((e: React.TouchEvent, id: string) => {
    const touch = e.touches[0];
    const rawTarget = e.currentTarget as HTMLElement;
    const element = (rawTarget.closest('[data-touch-drag-root]') as HTMLElement | null) ?? rawTarget;
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    
    // Long press to initiate drag
    longPressTimerRef.current = setTimeout(() => {
      // Check if element is still in DOM
      if (!element || !document.body.contains(element)) {
        return;
      }
      
      // Vibrate for feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      setState({
        isDragging: true,
        draggedId: id,
        draggedElement: element,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
      });
      
      createGhost(element, touch.clientX, touch.clientY);
      element.style.opacity = '0.3';
      onDragStart?.(id);
    }, 200); // 200ms long press
  }, [createGhost, onDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    
    // Cancel long press if moved too much before drag started
    if (!state.isDragging && touchStartPosRef.current) {
      const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
      if (deltaX > 10 || deltaY > 10) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        return;
      }
    }
    
    if (!state.isDragging) return;
    
    e.preventDefault();
    
    updateGhostPosition(touch.clientX, touch.clientY);
    
    setState(prev => ({
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY,
    }));
    
    // Highlight drop target
    const dropTarget = findDropTarget(touch.clientX, touch.clientY);
    document.querySelectorAll('[data-drop-target]').forEach(el => {
      el.classList.remove('touch-drag-over');
    });
    if (dropTarget) {
      dropTarget.classList.add('touch-drag-over');
    }
    
    onDragMove?.(touch.clientX, touch.clientY);
  }, [state.isDragging, updateGhostPosition, findDropTarget, onDragMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    if (!state.isDragging || !state.draggedId) {
      touchStartPosRef.current = null;
      return;
    }
    
    const touch = e.changedTouches[0];
    const dropTarget = findDropTarget(touch.clientX, touch.clientY);
    
    // Remove highlight from all targets
    document.querySelectorAll('[data-drop-target]').forEach(el => {
      el.classList.remove('touch-drag-over');
    });
    
    // Restore original element opacity
    if (state.draggedElement) {
      state.draggedElement.style.opacity = '';
    }
    
    removeGhost();
    onDragEnd?.(state.draggedId, dropTarget);
    
    setState({
      isDragging: false,
      draggedId: null,
      draggedElement: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
    
    touchStartPosRef.current = null;
  }, [state.isDragging, state.draggedId, state.draggedElement, findDropTarget, removeGhost, onDragEnd]);

  const handleTouchCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    if (state.draggedElement) {
      state.draggedElement.style.opacity = '';
    }
    
    removeGhost();
    
    document.querySelectorAll('[data-drop-target]').forEach(el => {
      el.classList.remove('touch-drag-over');
    });
    
    setState({
      isDragging: false,
      draggedId: null,
      draggedElement: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
    
    touchStartPosRef.current = null;
  }, [state.draggedElement, removeGhost]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      removeGhost();
    };
  }, [removeGhost]);

  return {
    ...state,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  };
};
