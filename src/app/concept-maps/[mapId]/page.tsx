import { notFound } from "next/navigation";
import { readConceptMap } from "@/lib/content";
import ConceptMapClient from "./ConceptMapClient";

export default function ConceptMapPage({ params }: { params: { mapId: string } }) {
  const map = readConceptMap(params.mapId);
  if (!map) notFound();
  return <ConceptMapClient map={map} />;
}
