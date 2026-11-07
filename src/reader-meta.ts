// Page counts for the local reader samples. Texts load only on the reader route.
const counts: Record<string, number> = {
  "white-nights": 4,
  "lady-dog": 4,
  "blizzard": 4,
  "queen-spades": 4,
  "garnet": 4,
  "asya": 4,
  "scarlet-sails": 4,
  "olesya": 4,
  "first-love": 4,
  "gambler": 4,
  "dikanka": 4,
  "ivan-ilyich": 4,
  "captain-daughter": 4,
  "fathers-sons": 4,
  "dubrovsky": 4,
  "hero-time": 4,
  "childhood": 4,
  "wave-runner": 3,
  "crime": 4,
  "oblomov": 4,
  "dead-souls": 4,
  "anna": 3,
  "karamazov": 4,
  "ordinary-story": 4
};
export const readerPageCount = (id: string) => counts[id] || 0;
