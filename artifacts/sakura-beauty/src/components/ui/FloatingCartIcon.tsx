import { useEffect, useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useLocation } from "wouter";
import { useGetCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { useGuestCart } from "@/hooks/useGuestCart";

const STORAGE_KEY = "sakura_cart_icon_pos";

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function FloatingCartIcon() {
  const { user } = useUser();
  const [, navigate] = useLocation();
  const { data: cart } = useGetCart({
    query: { enabled: !!user, retry: false, queryKey: getGetCartQueryKey() },
  });
  const guestCart = useGuestCart();

  const serverCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const cartItemCount = user ? serverCount : guestCart.totalCount;

  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  const ICON_SIZE = 56;
  const EDGE_SNAP = 16;

  function getInitialPos() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const pos = JSON.parse(saved);
        return { x: pos.x as number, y: pos.y as number };
      }
    } catch {}
    return {
      x: window.innerWidth - ICON_SIZE - EDGE_SNAP,
      y: window.innerHeight * 0.7,
    };
  }

  const [pos, setPos] = useState(() => ({ x: window.innerWidth - ICON_SIZE - EDGE_SNAP, y: window.innerHeight * 0.7 }));
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasMoved = useRef(false);
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = getInitialPos();
    setPos(p);
  }, []);

  useEffect(() => {
    if (cartItemCount > 0) {
      setVisible(true);
      setTimeout(() => setAnimateIn(true), 10);
      return undefined;
    } else {
      setAnimateIn(false);
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [cartItemCount]);

  function snapToEdge(x: number, y: number) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isMobile = w < 768;
    const safeX = clamp(x, EDGE_SNAP, w - ICON_SIZE - EDGE_SNAP);
    const safeY = clamp(y, EDGE_SNAP + 64, h - ICON_SIZE - EDGE_SNAP);
    if (isMobile) {
      const snapLeft = safeX < w / 2 ? EDGE_SNAP : w - ICON_SIZE - EDGE_SNAP;
      return { x: snapLeft, y: safeY };
    }
    return { x: safeX, y: safeY };
  }

  function onPointerDown(e: React.PointerEvent) {
    isDragging.current = true;
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y };
    iconRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasMoved.current = true;
    const newX = dragStart.current.posX + dx;
    const newY = dragStart.current.posY + dy;
    const clamped = {
      x: clamp(newX, EDGE_SNAP, window.innerWidth - ICON_SIZE - EDGE_SNAP),
      y: clamp(newY, EDGE_SNAP + 64, window.innerHeight - ICON_SIZE - EDGE_SNAP),
    };
    setPos(clamped);
  }

  function onPointerUp(_e: React.PointerEvent) {
    isDragging.current = false;
    const snapped = snapToEdge(pos.x, pos.y);
    setPos(snapped);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapped));
    if (!hasMoved.current) {
      navigate("/cart");
    }
  }

  if (!visible) return null;

  return (
    <div
      ref={iconRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: ICON_SIZE,
        height: ICON_SIZE,
        zIndex: 9999,
        cursor: isDragging.current ? "grabbing" : "grab",
        touchAction: "none",
        userSelect: "none",
        transition: isDragging.current ? "none" : "opacity 0.3s, transform 0.3s",
        opacity: animateIn ? 1 : 0,
        transform: animateIn ? "scale(1)" : "scale(0.6)",
      }}
    >
      <div className="relative w-full h-full rounded-full bg-foreground shadow-2xl flex items-center justify-center border-2 border-background/20">
        <ShoppingBag className="h-6 w-6 text-background" />
        {cartItemCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center border-2 border-background shadow"
          >
            {cartItemCount > 99 ? "99+" : cartItemCount}
          </span>
        )}
      </div>
    </div>
  );
}
