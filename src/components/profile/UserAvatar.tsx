"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  fallback: string;
  className?: string;
  textClassName?: string;
}

/** Google profile photo with initial fallback. */
export function UserAvatar({
  src,
  alt = "",
  fallback,
  className,
  textClassName,
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden bg-muted font-semibold text-muted-foreground",
        className
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- Google avatar URLs vary by size/domain
        <img
          src={src!}
          alt={alt}
          className="size-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={textClassName}>{fallback}</span>
      )}
    </span>
  );
}
