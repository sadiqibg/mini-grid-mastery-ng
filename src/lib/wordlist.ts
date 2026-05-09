// Curated wordlist for human-friendly recovery codes.
// Two pools: adjectives + nouns. Avoids ambiguous words, profanity, and look-alikes.
// 3-word code format: <adjective>-<noun>-<2-digit checksum>
// Combinatorics: ~120 adj * ~140 noun * 100 = ~1.68M codes (good enough; learners get a unique code or we retry on collision).

export const ADJECTIVES = [
  "amber","azure","bold","bright","brisk","calm","clear","clever","copper","cosmic",
  "crisp","crystal","curious","daring","deep","dewy","eager","early","earnest","eastern",
  "electric","emerald","equal","even","fair","faithful","fancy","fearless","fertile","fierce",
  "fluent","forest","fresh","gallant","gentle","glowing","golden","grand","graceful","green",
  "happy","hardy","harvest","hidden","high","honest","humble","ivory","jade","joyful",
  "keen","kind","lasting","lavender","level","lively","loyal","lucid","lucky","luminous",
  "marble","mellow","mighty","misty","modern","modest","morning","mossy","native","noble",
  "northern","novel","olive","open","orange","patient","peaceful","plum","prime","quiet",
  "radiant","rapid","ready","resolute","river","rolling","rooted","rosy","royal","rugged",
  "rustic","saffron","sage","sandy","scarlet","shining","silver","simple","sincere","sky",
  "smart","solar","solid","southern","spark","steady","stellar","stone","sturdy","sunny",
  "swift","tender","thoughtful","tidal","timber","tranquil","true","twin","valiant","verdant",
  "vivid","warm","western","whisper","wide","wild","willow","wise","witty","young",
] as const;

export const NOUNS = [
  "acacia","albatross","almond","antelope","apple","arrow","baobab","beacon","beetle","birch",
  "bison","blossom","brook","buffalo","cactus","camel","canyon","capybara","caravan","cardinal",
  "cedar","cheetah","cherry","chestnut","cicada","clover","comet","compass","coral","cougar",
  "crane","crocus","crow","cypress","daisy","delta","desert","dolphin","dove","dragon",
  "eagle","echo","ember","fable","falcon","fern","field","finch","firefly","forest",
  "fox","frost","galaxy","garden","gazelle","gecko","ginkgo","glacier","glade","grove",
  "harbor","harvest","hawk","heron","hibiscus","horizon","hummingbird","iris","ivory","jaguar",
  "jasmine","kestrel","kingfisher","koala","lagoon","lantern","lark","laurel","lemur","leopard",
  "lily","lion","lotus","lynx","magnolia","mango","maple","marigold","meadow","mesa",
  "millet","mockingbird","moose","mountain","myrtle","nebula","oak","ocean","okapi","olive",
  "orchid","osprey","otter","owl","palm","panda","panther","papyrus","peach","pearl",
  "pelican","penguin","petal","pine","plover","plum","pollen","poppy","prairie","quail",
  "quartz","raven","redwood","reef","reindeer","river","robin","rosemary","rye","saffron",
  "sage","salmon","sapling","savanna","seal","sequoia","shimmer","shore","silver","sparrow",
  "spruce","starfish","stork","sunbird","swallow","tamarind","teak","thistle","thrush","tiger",
  "tulip","turtle","valley","violet","walnut","willow","wisteria","wolf","yarrow","zebra",
] as const;

export type Adjective = typeof ADJECTIVES[number];
export type Noun = typeof NOUNS[number];
