/** Directions of the twelve sparks that fly out of a correct answer. */
const SPARKS = Array.from({ length: 12 }, (_, i) => i * 30);

/**
 * A one-shot burst of sparks around a correct answer (mission.css `.burst`): mount it inside
 * a positioned element the moment the answer is right. Decorative, hidden under reduced
 * motion.
 */
export function Burst() {
  return (
    <span class="burst" aria-hidden="true">
      {SPARKS.map((a) => (
        <i key={a} style={{ '--a': `${a}deg` }} />
      ))}
    </span>
  );
}
