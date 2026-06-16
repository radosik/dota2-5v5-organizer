import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/util";
import { t } from "../strings";
import { Modal } from "./Modal";

type Side = "A" | "B";

export function CoinFlipModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [flipId, setFlipId] = useState(0);
  const [result, setResult] = useState<Side | null>(null);
  const [spinning, setSpinning] = useState(false);

  function flip() {
    setResult(Math.random() < 0.5 ? "A" : "B");
    setSpinning(true);
    setFlipId((n) => n + 1);
  }

  // Auto-flip on open; reset on close.
  useEffect(() => {
    if (open) {
      flip();
    } else {
      setResult(null);
      setSpinning(false);
    }
  }, [open]);

  // 5 full spins, landing on the back face (B) when needed.
  const target = 360 * 5 + (result === "B" ? 180 : 0);

  return (
    <Modal open={open} onClose={onClose} title={t.coin.title} widthClass="max-w-sm">
      <div className="flex flex-col items-center gap-5 py-2">
        <p className="text-xs text-faint">{t.coin.hint}</p>

        <div style={{ perspective: 1000 }} className="py-3">
          <motion.div
            key={flipId}
            className="relative h-32 w-32"
            style={{ transformStyle: "preserve-3d" }}
            initial={{ rotateY: 0 }}
            animate={{ rotateY: target }}
            transition={{ duration: 1.5, ease: [0.2, 0.9, 0.25, 1] }}
            onAnimationComplete={() => setSpinning(false)}
          >
            <CoinFace label="A" side="A" />
            <CoinFace label="B" side="B" back />
          </motion.div>
        </div>

        <div className="flex h-12 items-center text-center">
          {spinning ? (
            <span className="font-display text-lg uppercase tracking-wide text-faint">
              {t.coin.flipping}
            </span>
          ) : result ? (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-faint">
                {t.coin.resultPrefix}
              </div>
              <div
                className={cn(
                  "font-display text-2xl font-bold uppercase",
                  result === "A" ? "text-radiant" : "text-dire",
                )}
              >
                {result === "A" ? t.coin.teamA : t.coin.teamB}
              </div>
            </div>
          ) : null}
        </div>

        <button
          onClick={flip}
          disabled={spinning}
          className="btn-gold rounded-lg px-6 py-2 text-sm disabled:opacity-50"
        >
          {t.coin.again}
        </button>
      </div>
    </Modal>
  );
}

function CoinFace({ label, side, back }: { label: string; side: Side; back?: boolean }) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center rounded-full border-4 font-display text-5xl font-bold",
        side === "A" ? "border-radiant/70 text-radiant" : "border-dire/70 text-dire",
      )}
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: back ? "rotateY(180deg)" : undefined,
        background:
          "radial-gradient(circle at 50% 32%, var(--color-surface-3), var(--color-surface-1))",
        boxShadow: "inset 0 2px 12px rgba(0,0,0,0.5), 0 14px 34px -12px rgba(0,0,0,0.75)",
      }}
    >
      {label}
    </div>
  );
}
