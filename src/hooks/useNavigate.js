"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

export function useNavigate() {
  const router = useRouter();
  return useCallback((href, options = {}) => {
    if (options.replace) router.replace(href);
    else router.push(href);
  }, [router]);
}
