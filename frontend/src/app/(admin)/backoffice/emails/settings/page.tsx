import { EmailBackofficePageShell } from "../EmailBackofficeSubNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FRONTEND_URLS } from "@/config/ports.config";
import {
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import axios from "axios";
import { useState, useEffect } from "react";

const API_URL = FRONTEND_URLS.api;

type SmtpStatusData = {
  host?: string;
  port?: string | number;
  from?: string;
  secure?: string | boolean;
  user?: string;
  replyTo?: string;
  provider?: string;
};

export default function EmailSettingsPage() {
  const [smtpStatus, setSmtpStatus] = useState<{
    success: boolean;
    message: string;
    data?: SmtpStatusData;
  } | null>(null);
  const [checking, setChecking] = useState(false);

  const checkSMTPStatus = async () => {
    setChecking(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/v1/emails/test-smtp`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSmtpStatus(response.data);
    } catch (error: any) {
      const status = error.response?.status;
      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      setSmtpStatus({
        success: false,
        message:
          status === 503
            ? "Service SMTP indisponible (non configuré ou erreur)."
            : msg || "Erreur lors de la vérification SMTP",
        data: error.response?.data?.details || error.response?.data?.data,
      });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkSMTPStatus();
  }, []);

  const smtpData = smtpStatus?.data;
  const description = smtpData?.provider
    ? `Provider actif : ${smtpData.provider}`
    : "Valeurs lues depuis l'environnement du serveur (auth-service).";

  return (
    <EmailBackofficePageShell
      title={
        <span className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-600" />
          Configuration SMTP
        </span>
      }
      description={description}
      actions={
        <Button
          onClick={checkSMTPStatus}
          disabled={checking}
          variant="outline"
          size="sm"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${checking ? "animate-spin" : ""}`}
          />
          Vérifier
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Configuration actuelle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {smtpStatus ? (
            <>
              <div
                className={`flex items-center gap-2 ${smtpStatus.success ? "text-green-600" : "text-red-600"}`}
              >
                {smtpStatus.success ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <span className="font-medium">{smtpStatus.message}</span>
              </div>
              {smtpData ? (
                <div className="grid grid-cols-1 gap-4 text-sm mt-4 sm:grid-cols-2">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Host</p>
                    <p className="font-medium break-all">
                      {smtpData.host || "Non configuré"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Port</p>
                    <p className="font-medium">
                      {smtpData.port || "Non configuré"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">From</p>
                    <p className="font-medium break-all">
                      {smtpData.from || "Non configuré"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Reply-To</p>
                    <p className="font-medium break-all">
                      {smtpData.replyTo || "Non configuré"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Secure</p>
                    <p className="font-medium">
                      {typeof smtpData.secure === "string"
                        ? smtpData.secure
                        : smtpData.secure
                          ? "Oui (SSL/TLS)"
                          : "Non"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Utilisateur SMTP
                    </p>
                    <p className="font-medium break-all">
                      {smtpData.user || "Non configuré"}
                    </p>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex items-center gap-2 text-gray-500">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Statut non vérifié</span>
            </div>
          )}
        </CardContent>
      </Card>
    </EmailBackofficePageShell>
  );
}
