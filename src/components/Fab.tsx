"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AddQuestionModal } from "@/components/AddQuestionModal";
import { Button } from "@/components/ui/button";

export function Fab() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="icon-lg"
        className="fixed bottom-6 right-6 z-40 rounded-full shadow-lg"
        onClick={() => setModalOpen(true)}
        aria-label="Add question for AI analysis"
      >
        <Plus className="size-5" />
      </Button>
      <AddQuestionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
