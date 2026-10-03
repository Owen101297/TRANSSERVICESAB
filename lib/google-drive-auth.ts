export type GoogleOAuthErrorCode =
  | "invalid_client"
  | "invalid_grant"
  | "temporarily_unavailable"
  | "unauthorized_client";

export function normalizeGoogleOAuthCredential(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) return null;

  const first = normalized.at(0);
  const last = normalized.at(-1);
  if (normalized.length >= 2 && first === last && (first === '"' || first === "'")) {
    return normalized.slice(1, -1).trim() || null;
  }
  return normalized;
}

export function googleDriveAuthenticationMessage(errorCode: string | undefined) {
  const code = errorCode as GoogleOAuthErrorCode | undefined;
  if (code === "invalid_grant") {
    return "La autorización de Google Drive venció o fue revocada. El administrador debe volver a conectar la cuenta documental.";
  }
  if (code === "invalid_client" || code === "unauthorized_client") {
    return "El cliente OAuth configurado para Google Drive no coincide con sus credenciales. Revisa el cliente y vuelve a conectar la cuenta documental.";
  }
  if (code === "temporarily_unavailable") {
    return "Google Drive no está disponible temporalmente. Intenta nuevamente en unos minutos.";
  }
  return "No fue posible autenticar la cuenta documental de Google Drive.";
}
