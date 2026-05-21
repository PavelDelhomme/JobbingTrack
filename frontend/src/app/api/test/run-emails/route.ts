import { NextRequest, NextResponse } from "next/server";

// Côté serveur (conteneur frontend), utiliser l’URL interne Docker pour joindre l’API gateway
const API_URL =
  process.env.API_GATEWAY_URL ||
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5002";

/** Lance un test email minimal (vérification du service). Pas de rapport généré. */
export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization");
    const res = await fetch(`${API_URL}/api/v1/emails/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify({
        to: "test@example.com",
        subject: "🧪 Test JobbingTrack (hub)",
        content: "<p>Test lancé depuis le hub Tests.</p>",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data.error || data.message || res.statusText;
      const detail =
        data.details || data.code
          ? ` (${[data.details, data.code].filter(Boolean).join(" — ")})`
          : "";
      return NextResponse.json(
        {
          success: false,
          error: message
            ? `${message}${detail}`
            : "Erreur lors de l'envoi de l'email de test. Vérifiez la configuration SMTP (auth-service).",
        },
        { status: res.status },
      );
    }
    return NextResponse.json({
      success: true,
      message:
        "Test email lancé (consultez Emails > Configuration ou Déliverabilité pour plus d’options).",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      {
        success: false,
        error:
          msg.includes("fetch") || msg.includes("network")
            ? `${msg}. Vérifiez que l'auth-service est joignable (API_GATEWAY_URL).`
            : msg,
      },
      { status: 500 },
    );
  }
}
