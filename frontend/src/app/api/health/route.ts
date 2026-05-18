import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: "Frontend opérationnel",
      service: "frontend",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Erreur interne du serveur",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
