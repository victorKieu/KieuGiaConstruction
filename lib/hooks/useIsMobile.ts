import { useEffect, useState } from "react";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Kiểm tra userAgent (chỉ chạy phía client)
    if (typeof window !== "undefined") {
      const check = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsMobile(check);
    }
  }, []);

  return isMobile;
}