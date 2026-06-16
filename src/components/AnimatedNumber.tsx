import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

/** A number that smoothly counts up/down to its target value. */
export function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString("en-US"));

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.45, ease: "easeOut" });
    return controls.stop;
  }, [mv, value]);

  return <motion.span>{text}</motion.span>;
}
