"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserProfile } from "@/types/profile";

interface ProfileState {
  loading: boolean;
  signedIn: boolean;
  profile: UserProfile | null;
  userId: string | null;
  email: string | null;
  memberSince: string | null;
  refresh: () => void;
  save: (patch: Partial<UserProfile> & { onboardingComplete?: boolean }) => Promise<UserProfile | null>;
}

export function useProfile(): ProfileState {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setSignedIn(Boolean(data.signedIn));
        setProfile(data.profile ?? null);
        setUserId(data.userId ?? null);
        setEmail(data.email ?? null);
        setMemberSince(data.memberSince ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const save = useCallback(
    async (patch: Partial<UserProfile> & { onboardingComplete?: boolean }) => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) return null;
      const data = await res.json();
      setProfile(data.profile);
      return data.profile as UserProfile;
    },
    []
  );

  return { loading, signedIn, profile, userId, email, memberSince, refresh, save };
}

export async function checkUsername(username: string): Promise<boolean> {
  const res = await fetch("/api/profile?action=check-username", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  const data = await res.json();
  return Boolean(data.available);
}
