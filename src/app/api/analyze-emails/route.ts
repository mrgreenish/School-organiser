import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface EmailInput {
  id: string;
  subject: string;
  date: string;
  snippet: string;
}

interface RequestBody {
  emails: EmailInput[];
  childName: string;
  childClass: string;
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { emails, childName, childClass } = body;

  if (!emails?.length) {
    return NextResponse.json({ results: [] });
  }

  const childContext = [
    childName ? `Kind: ${childName}` : "",
    childClass ? `Klas: ${childClass}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const emailList = emails
    .map(
      (e, i) =>
        `${i + 1}. ID: ${e.id}\n   Datum: ${e.date}\n   Onderwerp: ${e.subject}\n   Snippet: ${e.snippet}`
    )
    .join("\n\n");

  const systemPrompt = `Je bent een assistent die Nederlandse schoolberichten van Social Schools classificeert voor een ouder.
${childContext ? `Context: ${childContext}` : ""}

Classificeer elk bericht in één van deze categorieën:
- action: Ouder moet iets doen (toestemming geven, iets meesturen, aanmelden, betaalverzoek, formulier invullen)
- payment: Betalingsverzoek of factuur
- event: Activiteit, uitje, feest, sportdag, ouderavond, of ander evenement op school
- news: Nieuws, nieuwsbrief, algemene schoolinfo, geen actie nodig
- child: Bericht specifiek over het kind (absentie, rapport, gesprek, gedrag)
- ignore: Automatisch bericht, spam, niet relevant

Geef een beknopte Nederlandse samenvatting (max 60 tekens) die de kern weergeeft.
Geef altijd een JSON-object terug met een "results" array.`;

  const userPrompt = `Classificeer deze ${emails.length} schoolberichten:\n\n${emailList}\n\nGeef terug als JSON: {"results": [{"id": "...", "category": "...", "summary": "...", "actionRequired": true/false, "date": "datum als aanwezig of null", "relevantToChild": true/false, "relevantToClass": "klasnummer of 'all'"}]}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    const results = Array.isArray(parsed.results) ? parsed.results : [];
    return NextResponse.json({ results });
  } catch (err) {
    console.error("OpenAI API error:", err);
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }
}
