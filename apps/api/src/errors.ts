import type { ApiErrorCode } from "@nexora/shared";

/** docs/API.md "Error HTTP mapping". */
export const ERROR_STATUS: Record<ApiErrorCode, number> = {
  validation_error: 400,
  unauthorized: 401,
  forbidden: 403,
  consent_missing: 403,
  no_data: 404,
  upstream_unavailable: 503,
};

/** Turkish, safe to show to a 13–18 year old. No diagnosis, no stack traces. */
export const ERROR_MESSAGE_TR: Record<ApiErrorCode, string> = {
  validation_error: "Gönderilen veri geçersiz.",
  unauthorized: "Oturum bulunamadı. Lütfen tekrar giriş yap.",
  forbidden: "Bu işlem için yetkin yok.",
  consent_missing: "Veli onayı olmadan bu işlem yapılamaz.",
  no_data: "Henüz kategori özeti yok.",
  upstream_unavailable: "Servise şu anda ulaşılamıyor. Lütfen tekrar dene.",
};

/** Throw from anywhere; the global onError turns it into the API.md error body. */
export class ApiProblem extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message = ERROR_MESSAGE_TR[code],
  ) {
    super(message);
    this.name = "ApiProblem";
  }
}

export const apiErrorResponse = (code: ApiErrorCode, message = ERROR_MESSAGE_TR[code]) =>
  new Response(JSON.stringify({ error: { code, message } }), {
    status: ERROR_STATUS[code],
    headers: { "content-type": "application/json" },
  });
