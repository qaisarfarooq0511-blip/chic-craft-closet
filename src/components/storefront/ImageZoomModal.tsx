import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const CLOSE_ANIM_MS = 150;
const SWIPE_THRESHOLD_PX = 50;

interface ImageZoomModalProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export function ImageZoomModal({ images, initialIndex, onClose }: ImageZoomModalProps) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [closing, setClosing] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevBtnRef = useRef<HTMLButtonElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const pinchDistRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const requestClose = useCallback(() => {
    setClosing(true);
    window.setTimeout(onClose, CLOSE_ANIM_MS);
  }, [onClose]);

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % images.length) + images.length) % images.length);
      setScale(1);
    },
    [images.length],
  );

  // Body scroll lock + initial focus for the modal's lifetime.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Keyboard: Esc closes, arrows navigate, +/- zoom, Tab is trapped among
  // the modal's own buttons.
  useEffect(() => {
    const focusables = () =>
      [prevBtnRef.current, nextBtnRef.current, closeBtnRef.current].filter(
        (el): el is HTMLButtonElement => !!el,
      );

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        requestClose();
      } else if (e.key === "ArrowLeft") {
        goTo(index - 1);
      } else if (e.key === "ArrowRight") {
        goTo(index + 1);
      } else if (e.key === "+" || e.key === "=") {
        setScale((s) => Math.min(MAX_SCALE, s + 0.5));
      } else if (e.key === "-") {
        setScale((s) => Math.max(MIN_SCALE, s - 0.5));
      } else if (e.key === "Tab") {
        const items = focusables();
        if (items.length === 0) return;
        e.preventDefault();
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        const dir = e.shiftKey ? -1 : 1;
        items[(current + dir + items.length) % items.length]?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, goTo, requestClose]);

  // Wheel (desktop) + pinch (mobile) zoom. Attached natively with
  // passive: false — React's onWheel/onTouchMove JSX props can't reliably
  // preventDefault since React registers those as passive listeners.
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s - e.deltaY * 0.01)));
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || pinchDistRef.current === null) return;
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * (dist / pinchDistRef.current!))));
      pinchDistRef.current = dist;
    };

    img.addEventListener("wheel", handleWheel, { passive: false });
    img.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      img.removeEventListener("wheel", handleWheel);
      img.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      pinchDistRef.current = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    } else if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    pinchDistRef.current = null;
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || scale > 1) return; // don't swipe-navigate while zoomed in
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) {
      goTo(dx < 0 ? index + 1 : index - 1);
    }
  };

  return (
    <div
      className={`zoom-overlay${closing ? " closing" : ""}`}
      onClick={requestClose}
      role="dialog"
      aria-modal="true"
      aria-label="Zoomed product image"
    >
      <button
        ref={closeBtnRef}
        type="button"
        className="zoom-close"
        onClick={(e) => {
          e.stopPropagation();
          requestClose();
        }}
        aria-label="Close"
      >
        ×
      </button>
      {images.length > 1 && (
        <button
          ref={prevBtnRef}
          type="button"
          className="zoom-nav prev"
          onClick={(e) => {
            e.stopPropagation();
            goTo(index - 1);
          }}
          aria-label="Previous image"
        >
          ‹
        </button>
      )}
      <img
        ref={imgRef}
        src={images[index]}
        alt=""
        className="zoom-img"
        style={{ transform: `scale(${scale})` }}
        draggable={false}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />
      {images.length > 1 && (
        <button
          ref={nextBtnRef}
          type="button"
          className="zoom-nav next"
          onClick={(e) => {
            e.stopPropagation();
            goTo(index + 1);
          }}
          aria-label="Next image"
        >
          ›
        </button>
      )}
    </div>
  );
}
