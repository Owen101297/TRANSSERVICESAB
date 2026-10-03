import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const RESULT_FILE = resolve(process.cwd(), ".google-drive-oauth-result.json");
const ACCOUNT_HINT = "transserviceshseq.ab@gmail.com";

type OAuthClientFile = {
  installed?: { client_id?: string; client_secret?: string };
};

function base64Url(input: Buffer) {
  return input.toString("base64url");
}

function openBrowser(url: string) {
  const command = process.platform === "win32"
    ? ["rundll32.exe", ["url.dll,FileProtocolHandler", url]] as const
    : process.platform === "darwin"
      ? ["open", [url]] as const
      : ["xdg-open", [url]] as const;
  const child = spawn(command[0], [...command[1]], { detached: true, stdio: "ignore" });
  child.unref();
}

function html(title: string, message: string) {
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><body style="font-family:system-ui;background:#f1f5f9;color:#0f172a;padding:32px"><main style="max-width:560px;margin:auto;background:white;border:1px solid #cbd5e1;border-radius:24px;padding:28px"><h1>${title}</h1><p style="line-height:1.6">${message}</p></main></body></html>`;
}

async function main() {
  const clientPath = resolve(process.cwd(), process.argv[2] || "google-oauth-client.json");
  const raw = await readFile(clientPath, "utf8").catch(() => {
    throw new Error(`No se encontró el cliente OAuth en ${clientPath}`);
  });
  const parsed = JSON.parse(raw) as OAuthClientFile;
  const client = parsed.installed;
  if (!client?.client_id || !client.client_secret) {
    throw new Error("El JSON debe corresponder a un cliente OAuth de tipo Aplicación de escritorio.");
  }

  const state = randomBytes(24).toString("base64url");
  const codeVerifier = base64Url(randomBytes(64));
  const codeChallenge = base64Url(createHash("sha256").update(codeVerifier).digest());
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolveListen());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No fue posible iniciar el retorno local de OAuth.");
  const redirectUri = `http://127.0.0.1:${address.port}/oauth2/callback`;
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.search = new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DRIVE_FILE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    login_hint: ACCOUNT_HINT,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  }).toString();

  const completion = new Promise<void>((resolveCompletion, rejectCompletion) => {
    const timeout = setTimeout(() => {
      server.close();
      rejectCompletion(new Error("La autorización venció después de 10 minutos. Ejecuta el proceso nuevamente."));
    }, 10 * 60 * 1000);

    server.on("request", async (request, response) => {
      const requestUrl = new URL(request.url || "/", redirectUri);
      if (requestUrl.pathname !== "/oauth2/callback") {
        response.writeHead(404).end();
        return;
      }
      try {
        if (requestUrl.searchParams.get("state") !== state) throw new Error("Google devolvió un estado de seguridad inválido.");
        const oauthError = requestUrl.searchParams.get("error");
        if (oauthError) throw new Error(`Google no autorizó la conexión: ${oauthError}`);
        const code = requestUrl.searchParams.get("code");
        if (!code) throw new Error("Google no devolvió el código de autorización.");
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: client.client_id as string,
            client_secret: client.client_secret as string,
            code,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
            code_verifier: codeVerifier,
          }),
        });
        const tokenBody = await tokenResponse.json() as { refresh_token?: string; error_description?: string };
        if (!tokenResponse.ok || !tokenBody.refresh_token) {
          throw new Error(tokenBody.error_description || "Google no devolvió un refresh token. Revoca el acceso anterior e inténtalo nuevamente.");
        }
        await writeFile(RESULT_FILE, JSON.stringify({
          account: ACCOUNT_HINT,
          clientId: client.client_id,
          clientSecret: client.client_secret,
          refreshToken: tokenBody.refresh_token,
          scope: DRIVE_FILE_SCOPE,
          createdAt: new Date().toISOString(),
        }), { encoding: "utf8", mode: 0o600 });
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(html("Google Drive conectado", "La autorización fue recibida. Puedes cerrar esta ventana y regresar al ERP."));
        clearTimeout(timeout);
        server.close(() => resolveCompletion());
      } catch (error) {
        response.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        response.end(html("No se pudo conectar", error instanceof Error ? error.message : "Error desconocido."));
        clearTimeout(timeout);
        server.close(() => rejectCompletion(error));
      }
    });
  });

  console.log(`Abriendo autorización de Google para ${ACCOUNT_HINT}...`);
  console.log("El proceso solicita únicamente el alcance drive.file.");
  openBrowser(authorizationUrl.toString());
  await completion;
  console.log(`Autorización guardada de forma temporal en ${RESULT_FILE}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
