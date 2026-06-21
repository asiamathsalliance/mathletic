"use client";

import { useState } from "react";
import { AddQuestionModal } from "@/components/AddQuestionModal";

export function Fab() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="app-fab"
        aria-label="Add question for AI analysis"
      >
        +
      </button>
      <AddQuestionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
