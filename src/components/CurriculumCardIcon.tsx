import type { Curriculum } from "@/types/question";

interface CurriculumCardIconProps {
  curriculum: Curriculum | "olympiad";
}

export function CurriculumCardIcon({ curriculum }: CurriculumCardIconProps) {
  if (curriculum === "HSC") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 5c2-1 5-1 7 1v12c-2-2-5-2-7-1V5z" />
        <path d="M21 5c-2-1-5-1-7 1v12c2-2 5-2 7-1V5z" />
      </svg>
    );
  }
  if (curriculum === "IB") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <ellipse cx="12" cy="12" rx="3.2" ry="8" />
        <line x1="4" y1="12" x2="20" y2="12" />
      </svg>
    );
  }
  if (curriculum === "AP") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 19V5l8 4 8-4v14" />
        <path d="M12 9v10" />
      </svg>
    );
  }
  if (curriculum === "A-Level") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="12 2 15 9 22 9 16.5 13.5 18.5 21 12 17 5.5 21 7.5 13.5 2 9 9 9" />
    </svg>
  );
}
