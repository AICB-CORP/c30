"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RetroEditor from "@/components/editor/RetroEditor";

export default function NewPostButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="retro-btn fixed bottom-4 right-4 z-50 text-lg shadow-[0_0_20px_rgba(255,20,147,0.8)]"
        onClick={() => setOpen(true)}
      >
        ✏️ Écrire un post
      </button>
      {open ? (
        <RetroEditor
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
          onCancel={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
