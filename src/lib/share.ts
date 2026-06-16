import { toPng } from "html-to-image";
import type { Player } from "../types";

/** Rasterize a DOM node to a base64 PNG (no data-URL prefix). */
export async function captureToBase64(node: HTMLElement): Promise<string> {
  // Make sure web fonts are loaded so text renders correctly.
  await (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#0a0b0e",
  });
  return dataUrl.split(",")[1] ?? "";
}

/** Build the copyable Discord message text + the list of user IDs to ping. */
export function buildDiscordContent(opts: {
  roomName: string;
  region: string;
  password: string;
  players: Player[];
}): { content: string; userIds: string[] } {
  // `value` wrapped in inline code renders as a tap/click-to-copy token in Discord.
  const code = (v: string) => "`" + v.replace(/`/g, "") + "`";

  const lines: string[] = [];
  if (opts.region.trim()) lines.push(`Регион: ${opts.region.trim()}`);
  if (opts.roomName.trim()) lines.push(`Название Румы: ${code(opts.roomName.trim())}`);
  if (opts.password.trim()) lines.push(`Пароль: ${code(opts.password.trim())}`);

  const ids = opts.players
    .map((p) => p.discordId)
    .filter((id): id is string => !!id && /^\d{5,}$/.test(id));
  const userIds = [...new Set(ids)];

  if (userIds.length > 0) {
    lines.push("");
    lines.push(userIds.map((id) => `<@${id}>`).join(" "));
  }

  return { content: lines.join("\n"), userIds };
}
