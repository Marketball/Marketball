import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { fmt } from "../../lib/helpers.js";

export default function AnimatedCounter({ value, color, fontSize = 13 }) {
  const ref = useRef(null);
  const prev = useRef(value);

  useEffect(() => {
    if (!ref.current || prev.current === value) { prev.current = value; return; }
    const obj = { val: prev.current };
    gsap.to(obj, {
      val: value, duration: 0.7, ease: "power2.out",
      onUpdate: () => { if (ref.current) ref.current.textContent = fmt(Math.round(obj.val)); }
    });
    prev.current = value;
  }, [value]);

  return <span ref={ref} style={{ fontFamily:"'Bebas Neue',sans-serif", color, fontSize, letterSpacing:1 }}>{fmt(value)}</span>;
}
