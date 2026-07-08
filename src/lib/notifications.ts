import { NotificationChannel } from "@prisma/client";
import { appBaseUrl } from "@/lib/url";
import { prisma } from "@/lib/prisma";

type NotifyInput = {
  ideaId?: string | null;
  to: string;
  subject: string;
  body: string;
  channels?: NotificationChannel[];
};

function hasGraphConfig() {
  return Boolean(
    process.env.MICROSOFT_TENANT_ID &&
      process.env.MICROSOFT_CLIENT_ID &&
      process.env.MICROSOFT_CLIENT_SECRET &&
      process.env.MICROSOFT_SENDER_EMAIL
  );
}

async function sendGraphMail(input: NotifyInput) {
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials"
      })
    }
  );

  if (!tokenResponse.ok) {
    throw new Error(`Microsoft Graph token error ${tokenResponse.status}`);
  }

  const tokenJson = (await tokenResponse.json()) as { access_token: string };
  const mailResponse = await fetch(
    `https://graph.microsoft.com/v1.0/users/${process.env.MICROSOFT_SENDER_EMAIL}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: {
          subject: input.subject,
          body: { contentType: "HTML", content: input.body.replace(/\n/g, "<br />") },
          toRecipients: input.to
            .split(/[;,]/)
            .map((address) => address.trim())
            .filter(Boolean)
            .map((address) => ({ emailAddress: { address } }))
        },
        saveToSentItems: true
      })
    }
  );

  if (!mailResponse.ok) {
    throw new Error(`Microsoft Graph sendMail error ${mailResponse.status}`);
  }
}

async function sendTeams(input: NotifyInput) {
  if (!process.env.TEAMS_WEBHOOK_URL) throw new Error("TEAMS_WEBHOOK_URL no configurado");
  const response = await fetch(process.env.TEAMS_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: `**${input.subject}**\n\n${input.body}` })
  });
  if (!response.ok) throw new Error(`Teams webhook error ${response.status}`);
}

async function recordOutbox(input: NotifyInput, channel: NotificationChannel, status: "PENDING" | "SENT" | "ERROR", error?: string) {
  await prisma.notificationOutbox.create({
    data: {
      ideaId: input.ideaId ?? null,
      channel,
      to: input.to || "LOCAL",
      subject: input.subject,
      body: input.body,
      status,
      errorMessage: error,
      sentAt: status === "SENT" ? new Date() : null
    }
  });
}

export async function notify(input: NotifyInput) {
  const channels = input.channels ?? ["EMAIL"];
  for (const channel of channels) {
    if (channel === "EMAIL") {
      if (!input.to || !hasGraphConfig()) {
        await recordOutbox(input, input.to ? "EMAIL" : "LOCAL", "PENDING");
        continue;
      }

      try {
        await sendGraphMail(input);
        await recordOutbox(input, "EMAIL", "SENT");
      } catch (error) {
        await recordOutbox(input, "EMAIL", "ERROR", error instanceof Error ? error.message : "Error desconocido");
      }
    }

    if (channel === "TEAMS") {
      if (!process.env.TEAMS_WEBHOOK_URL) {
        await recordOutbox(input, "TEAMS", "PENDING", "TEAMS_WEBHOOK_URL no configurado");
        continue;
      }

      try {
        await sendTeams(input);
        await recordOutbox(input, "TEAMS", "SENT");
      } catch (error) {
        await recordOutbox(input, "TEAMS", "ERROR", error instanceof Error ? error.message : "Error desconocido");
      }
    }

    if (channel === "LOCAL") {
      await recordOutbox(input, "LOCAL", "PENDING");
    }
  }
}

export function ideaLink(ideaId: string) {
  return `${appBaseUrl()}/ideas/${ideaId}`;
}

export function ideaMailBody(input: {
  folio: string;
  area: string;
  problem: string;
  proposal: string;
  action: string;
  ideaId: string;
}) {
  return [
    `Folio: ${input.folio}`,
    `Area: ${input.area}`,
    `Problema: ${input.problem}`,
    `Propuesta: ${input.proposal}`,
    `Accion requerida: ${input.action}`,
    `Liga directa: ${ideaLink(input.ideaId)}`
  ].join("\n");
}
