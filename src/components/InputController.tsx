import React, { useContext, useEffect, useRef } from 'react';
import { TreeContext, TreeContextType } from '../types';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const InputController: React.FC = () => {
  const {
    setPointer,
    setHoverProgress,
    setClickTrigger,
    setPanOffset,
    setRotationBoost,
    setZoomOffset,
    setState,
  } = useContext(TreeContext) as TreeContextType;

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastCentroid = useRef<{ x: number; y: number } | null>(null);
  const lastDistance = useRef<number | null>(null);
  const lastPrimary = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const normalize = (x: number, y: number) => ({ x: x / window.innerWidth, y: y / window.innerHeight });

    const handlePointerDown = (event: PointerEvent) => {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      lastPrimary.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      setPointer(normalize(event.clientX, event.clientY));
      if (pointers.current.size === 2) {
        const pts = Array.from(pointers.current.values());
        lastCentroid.current = {
          x: (pts[0].x + pts[1].x) / 2,
          y: (pts[0].y + pts[1].y) / 2,
        };
        lastDistance.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointers.current.has(event.pointerId)) return;

      const currentPoint = { x: event.clientX, y: event.clientY };
      pointers.current.set(event.pointerId, currentPoint);
      setPointer(normalize(event.clientX, event.clientY));

      const isDragging = event.buttons !== 0 || event.pointerType === 'touch';

      if (pointers.current.size === 1 && isDragging) {
        const prev = lastPrimary.current;
        const dx = prev ? event.clientX - prev.x : event.movementX;
        lastPrimary.current = { id: event.pointerId, x: event.clientX, y: event.clientY };

        setRotationBoost((prevBoost) => clamp(prevBoost - dx * 0.01, -3, 3));
      } else if (pointers.current.size >= 2) {
        const pts = Array.from(pointers.current.values());
        const centroid = {
          x: pts.reduce((sum, p) => sum + p.x, 0) / pts.length,
          y: pts.reduce((sum, p) => sum + p.y, 0) / pts.length,
        };

        if (lastCentroid.current) {
          const deltaX = centroid.x - lastCentroid.current.x;
          const deltaY = centroid.y - lastCentroid.current.y;
          setPanOffset((prev) => ({
            x: clamp(prev.x + deltaX * 0.02, -15, 15),
            y: clamp(prev.y - deltaY * 0.02, -10, 10),
          }));
        }
        lastCentroid.current = centroid;

        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (lastDistance.current !== null) {
          const delta = dist - lastDistance.current;
          setZoomOffset((prev) => clamp(prev - delta * 0.01, -20, 40));
        }
        lastDistance.current = dist;
      } else {
        lastCentroid.current = null;
        lastDistance.current = null;
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      pointers.current.delete(event.pointerId);
      if (pointers.current.size === 0) {
        setPointer(null);
        lastCentroid.current = null;
        lastDistance.current = null;
        lastPrimary.current = null;
      } else {
        const [firstId, firstPoint] = Array.from(pointers.current.entries())[0];
        setPointer(normalize(firstPoint.x, firstPoint.y));
        lastPrimary.current = { id: firstId, x: firstPoint.x, y: firstPoint.y };
      }
    };

    const handleWheel = (event: WheelEvent) => {
      setPointer(normalize(event.clientX, event.clientY));
      setZoomOffset((prev) => clamp(prev - event.deltaY * 0.002, -20, 40));
    };

    const handleClick = (event: MouseEvent) => {
      setPointer(normalize(event.clientX, event.clientY));
      setClickTrigger(Date.now());
      setHoverProgress(0);
    };

    const handleDoubleClick = () => {
      setState((prev) => (prev === 'CHAOS' ? 'FORMED' : 'CHAOS'));
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('click', handleClick);
    window.addEventListener('dblclick', handleDoubleClick);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [setPointer, setHoverProgress, setClickTrigger, setPanOffset, setRotationBoost, setZoomOffset, setState]);

  useEffect(() => {
    const decay = setInterval(() => {
      setRotationBoost((prev) => {
        if (Math.abs(prev) < 0.001) return 0;
        return prev * 0.94;
      });
    }, 16);
    return () => clearInterval(decay);
  }, [setRotationBoost]);

  return null;
};

export default InputController;
