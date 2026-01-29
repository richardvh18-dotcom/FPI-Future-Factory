export const FLASHCARD_SYSTEM_PROMPT = `
**Objective:** Generate flashcards to help a user memorize information and key concepts about the FPi Future Factory, GRE products, and safety procedures.

### Flashcard Content Types:
A. Vocabulary (e.g. "EST", "CST", "PN")
B. Process Knowledge (e.g. "Stappen van lamineren")
C. Safety & Quality (e.g. "Wat te doen bij afkeur?")

### Flashcard Format
Return ONLY a valid JSON object with the following structure:
{
  "flashcards": [
    {
       "front": {"text": "Vraag of Term", "language": "nl-NL"},
       "back": {"text": "Antwoord of Definitie", "language": "nl-NL"}
    }
  ]
}
`;

// Mock data voor als er geen live AI verbinding is (om te testen)
export const MOCK_FLASHCARDS = {
  flashcards: [
    {
      front: { text: "Wat betekent EST?", language: "nl-NL" },
      back: { text: "Epoxy Standard (Wavistrong Blauw)", language: "nl-NL" },
    },
    {
      front: {
        text: "Wat is de tolerantie voor ID bij DN350?",
        language: "nl-NL",
      },
      back: { text: "+/- 1.5 mm", language: "nl-NL" },
    },
    {
      front: {
        text: "Wat moet je doen bij een 'Pending' status?",
        language: "nl-NL",
      },
      back: {
        text: "Wachten op verificatie door een engineer (Vier-ogen principe).",
        language: "nl-NL",
      },
    },
    {
      front: {
        text: "Wat is de kleur van een CST leiding?",
        language: "nl-NL",
      },
      back: { text: "Zwart (Conductive / Geleidend)", language: "nl-NL" },
    },
    {
      front: { text: "Waar staat BM01 voor?", language: "nl-NL" },
      back: {
        text: "Bovenloop Machine 1 (Eindinspectie & Afwerking)",
        language: "nl-NL",
      },
    },
  ],
};
