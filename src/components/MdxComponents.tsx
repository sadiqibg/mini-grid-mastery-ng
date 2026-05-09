// Server-safe MDX component map. No "use client" here — this module is consumed by an RSC
// (the lesson page). Each interactive child has its own "use client" directive.

import Link from "next/link";
import PracticeTask from "./pacer/PracticeTask";
import FlashcardPrompt from "./pacer/FlashcardPrompt";
import EvidenceQuote from "./pacer/EvidenceQuote";
import CritiquePrompt from "./pacer/CritiquePrompt";
import ConceptMapPrompt from "./pacer/ConceptMapPrompt";
import { Callout, RegulationAlert, NigerianExample } from "./MdxStatic";

export const mdxComponents = {
  PracticeTask,
  FlashcardPrompt,
  EvidenceQuote,
  CritiquePrompt,
  ConceptMapPrompt,
  Callout,
  RegulationAlert,
  NigerianExample,
  a: (props: any) => <Link {...props} />,
};
