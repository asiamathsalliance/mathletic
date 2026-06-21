import { PlayHomeClient } from "@/components/play/PlayHomeClient";
import { GameStatusBar } from "@/components/play/GameStatusBar";

export default function PlayLandingPage() {
  return (
    <>
      <GameStatusBar />
      <PlayHomeClient />
    </>
  );
}
