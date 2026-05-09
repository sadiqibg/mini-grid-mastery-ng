import { notFound } from "next/navigation";
import { readDeck } from "@/lib/content";
import DeckClient from "./DeckClient";

export default function DeckPage({ params }: { params: { deck: string } }) {
  const deck = readDeck(params.deck);
  if (!deck) notFound();
  return <DeckClient deck={deck} />;
}
