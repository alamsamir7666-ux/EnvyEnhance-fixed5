/**
 * WishlistContext — lifts the single useGetWishlist call OUT of every ProductCard.
 *
 * Before: each ProductCard called useGetWishlist() individually. On a 24-card grid
 * React Query deduplicates the network call, but still runs the selector logic
 * 24 times and triggers 24 re-renders whenever wishlist state changes.
 *
 * After: one call here, every ProductCard reads from context — zero duplicate
 * hook instances, single re-render source.
 */
import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useGetWishlist, useAddToWishlist, useRemoveFromWishlist, getGetWishlistQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";

type WishlistContextType = {
  isWishlisted: (productId: number) => boolean;
  toggle: (productId: number) => void;
};

const WishlistContext = createContext<WishlistContextType>({
  isWishlisted: () => false,
  toggle: () => {},
});

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data: wishlist } = useGetWishlist({
    query: { enabled: !!user, retry: false, queryKey: getGetWishlistQueryKey() },
  });

  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();

  const isWishlisted = useCallback(
    (productId: number) => wishlist?.some((w) => w.productId === productId) ?? false,
    [wishlist]
  );

  const toggle = useCallback(
    (productId: number) => {
      if (!user) { setLocation("/sign-in"); return; }
      const wishlisted = wishlist?.some((w) => w.productId === productId) ?? false;
      if (wishlisted) {
        removeFromWishlist.mutate(
          { productId },
          { onSuccess: () => qc.invalidateQueries({ queryKey: getGetWishlistQueryKey() }) }
        );
      } else {
        addToWishlist.mutate(
          { productId },
          { onSuccess: () => qc.invalidateQueries({ queryKey: getGetWishlistQueryKey() }) }
        );
      }
    },
    [user, wishlist, addToWishlist, removeFromWishlist, qc, setLocation]
  );

  return (
    <WishlistContext.Provider value={{ isWishlisted, toggle }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
