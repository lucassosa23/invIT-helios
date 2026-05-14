"use client";

const KEY = "invit:profile:v1";

export type Profile = {
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  team: string;
  initials: string;
  signature: string;
  bio: string;
  twoFactorEnabled: boolean;
  emailNotifications: boolean;
};

export const DEFAULT_PROFILE: Profile = {
  name: "Lucas Sosa",
  email: "sistemas@heliossalud.com.ar",
  phone: "+54 11 5555 1234",
  jobTitle: "Responsable de Sistemas",
  team: "Sistemas",
  initials: "LS",
  signature: "Lucas Sosa · Responsable de Sistemas\nHelios Salud",
  bio: "Owner del workspace · responsable de operaciones de IT en Helios Salud.",
  twoFactorEnabled: true,
  emailNotifications: true,
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadProfile(): Profile {
  if (!isBrowser()) return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(p: Profile) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new Event("invit:profile-changed"));
  } catch {
    /* ignore */
  }
}

export function subscribeProfile(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener("invit:profile-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("invit:profile-changed", cb);
    window.removeEventListener("storage", cb);
  };
}
