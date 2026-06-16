import { useLobby } from "../store/lobby";
import { t } from "../strings";
import { Modal } from "./Modal";

export function DiscordSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const webhook = useLobby((s) => s.discordWebhook);
  const update = useLobby((s) => s.update);

  return (
    <Modal open={open} onClose={onClose} title={t.discord.settingsTitle} widthClass="max-w-lg">
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-faint">
            {t.discord.webhook}
          </label>
          <input
            value={webhook}
            onChange={(e) => update({ discordWebhook: e.target.value })}
            placeholder={t.discord.webhookPlaceholder}
            className="field w-full px-3 py-2 text-sm"
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-faint">{t.discord.webhookHint}</p>
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="btn-gold rounded-lg px-6 py-2 text-sm">
            {t.discord.save}
          </button>
        </div>
      </div>
    </Modal>
  );
}
