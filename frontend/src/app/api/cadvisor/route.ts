import { NextResponse } from "next/server";

export async function GET() {
  // cAdvisor n'est pas accessible depuis les conteneurs
  return NextResponse.json(
    { containers: {} }, // Retourner un objet vide au lieu d'une erreur
    { status: 200 },
  );
}

export async function POST() {
  // cAdvisor n'est pas accessible depuis les conteneurs
  return NextResponse.json({ containers: {} }, { status: 200 });
}
