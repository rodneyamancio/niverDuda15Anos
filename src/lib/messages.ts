import {
  type AppSettings,
  formatEventDate,
  formatEventTime,
  inviteUrl,
} from "@/lib/settings";

export function whatsappText(guestName: string, token: string, s: AppSettings): string {
  return [
    `Olá, ${guestName}! 💜`,
    ``,
    `📅 *Save the Date!*`,
    ``,
    `Você é um convidado muito especial para uma festa inesquecível!`,
    ``,
    `🎉 *${s.eventName}*`,
    `🗓️ ${formatEventDate(s.eventDate)}, às ${formatEventTime(s.eventDate)}`,
    `📍 ${s.eventVenue}${s.eventCity ? ` — ${s.eventCity}` : ""}`,
    ``,
    `Reserve essa data! Toque no link abaixo e diga se pretende ir:`,
    inviteUrl(s, token),
  ].join("\n");
}

export function emailSubject(s: AppSettings): string {
  return `💜 Save the Date — ${s.eventName}!`;
}

export function emailHtml(guestName: string, token: string, s: AppSettings): string {
  const url = inviteUrl(s, token);
  const c1 = s.primaryColor;
  const c2 = s.secondaryColor;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f6f2fb;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f2fb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12);">
        <tr>
          <td style="background:linear-gradient(135deg,${c1},${c2});padding:40px 32px;text-align:center;">
            <p style="margin:0;color:#ffffffcc;font-size:13px;letter-spacing:4px;text-transform:uppercase;">Save the Date</p>
            <h1 style="margin:12px 0 0;color:#ffffff;font-size:32px;font-weight:normal;">${s.eventName}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;text-align:center;color:#3d2a52;">
            <p style="font-size:18px;margin:0 0 8px;">Olá, <strong>${guestName}</strong>! 💜</p>
            <p style="font-size:15px;line-height:1.6;color:#6b5a80;margin:0 0 24px;">
              Queremos muito você nessa festa. Reserve a data no seu calendário!
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f2fb;border-radius:12px;">
              <tr><td style="padding:20px;text-align:center;">
                <p style="margin:0 0 4px;font-size:16px;color:${c1};"><strong>🗓️ ${formatEventDate(s.eventDate)}</strong></p>
                <p style="margin:0 0 4px;font-size:15px;color:${c1};">⏰ ${formatEventTime(s.eventDate)}</p>
                <p style="margin:0;font-size:14px;color:#6b5a80;">📍 ${s.eventVenue}${s.eventCity ? ` — ${s.eventCity}` : ""}</p>
              </td></tr>
            </table>
            <p style="font-size:15px;color:#6b5a80;margin:28px 0 20px;">Você pretende ir? Conta pra gente:</p>
            <a href="${url}" style="display:inline-block;background:${c1};color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:999px;font-size:16px;">Responder agora</a>
            <p style="font-size:12px;color:#a394b8;margin:28px 0 0;">Se o botão não funcionar, copie e cole este link no navegador:<br>
              <a href="${url}" style="color:${c2};word-break:break-all;">${url}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#faf7ff;padding:20px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#a394b8;">Com carinho 💜</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
