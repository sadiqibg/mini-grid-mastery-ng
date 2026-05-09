import { v4 as uuidv4 } from "uuid";
import { ADJECTIVES, NOUNS } from "./wordlist";

export type LearnerIdentity = {
  learnerId: string;
  recoveryCode: string;
  displayName: string;
  createdAt: string;
};

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Checksum is a 2-digit number derived from the two words.
// Catches typos when a learner re-enters their code.
function checksum(adj: string, noun: string): string {
  let h = 0;
  const s = `${adj}-${noun}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return String(h % 100).padStart(2, "0");
}

export function generateRecoveryCode(): string {
  const adj = pick(ADJECTIVES);
  const noun = pick(NOUNS);
  return `${adj}-${noun}-${checksum(adj, noun)}`;
}

export function isValidRecoveryCode(code: string): boolean {
  const m = code.trim().toLowerCase().match(/^([a-z]+)-([a-z]+)-(\d{2})$/);
  if (!m) return false;
  const [, adj, noun, cs] = m;
  return checksum(adj, noun) === cs;
}

const ANIMALS = ["Egret", "Heron", "Falcon", "Otter", "Lynx", "Gazelle", "Sparrow", "Stork"];
const TRAITS = ["Curious", "Bold", "Patient", "Bright", "Steady", "Keen", "Quiet", "Daring"];

export function generateDisplayName(): string {
  return `${pick(TRAITS)} ${pick(ANIMALS)}`;
}

export function newLearnerIdentity(): LearnerIdentity {
  return {
    learnerId: uuidv4(),
    recoveryCode: generateRecoveryCode(),
    displayName: generateDisplayName(),
    createdAt: new Date().toISOString(),
  };
}
