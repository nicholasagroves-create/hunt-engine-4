import {createSaveStore} from "./state.js";

// Review sessions never read or write player storage.
export function createCompletedReviewStore(game, content, assignments) {
 const ids = kind => (content[kind] || []).map(record => record.id);
 const puzzles = new Set(ids("puzzles"));
 const characters = new Set(ids("characters"));
 const seen = new Set();
 for (const tile of assignments) {
  if (!puzzles.has(tile.puzzleId) || !characters.has(tile.characterId) || seen.has(tile.puzzleId)) throw Error("Invalid review tile assignment");
  seen.add(tile.puzzleId);
 }
 const data = new Map();
 const store = createSaveStore(game.id, {
  getItem: key => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, value)
 });
 store.transact(s => {
  s.player.access = "active";
  s.onboarding.completed = true;
  s.onboarding.tutorialCompleted = true;
  s.onboarding.completedScreens = ids("openingScreens");
  s.puzzles.discovered = ids("puzzles");
  s.puzzles.completed = ids("puzzles");
  s.story.openedChains = ids("storyChains");
  s.story.completedChains = ids("storyChains");
  s.characters.revealed = ids("characters");
  s.characters.completed = ids("characters");
  s.characters.tiles = assignments.map(t => ({...t}));
  s.journals.unlocked = ids("journals");
  s.journals.read = ids("journals");
  s.inventory.collected = ids("inventory");
  s.transmissions.active = ids("transmissions");
  s.achievements = ids("achievements");
  s.finale.completed = true;
  s.navigation.lastMeaningfulScreen = "archive";
  s.navigation.lastViewedCharacterId = game.launch?.archive?.defaultCharacterId || assignments[0]?.characterId || null;
  s.navigation.latestTileCharacterId = s.navigation.lastViewedCharacterId;
  s.navigation.archiveTab = "characters";
 });
 return store;
}
