"use client";
import Icon from "@/components/ui/Icon";
import type { Content } from "@/lib/content";
import { supabase } from "@/lib/supabase";
import { Card } from "./ui";

export default function MusicPanel({
  content,
  update,
  busy,
  upload,
  remove,
}: {
  content: Content;
  update: (patch: Partial<Content>) => void;
  busy: boolean;
  upload: (file: File | undefined) => void;
  remove: () => void;
}) {
  const url = content.audioPath
    ? supabase?.storage.from("soundtracks").getPublicUrl(content.audioPath).data.publicUrl
    : undefined;
  return (
    <>
      <Card icon="music" title="1. Arquivo da música" where="Toca ao abrir o livro">
        <div className="admin-file">
          <div className="admin-file-name">
            <Icon name="music" size={18} />
            <span>{content.audioName || "Nenhum arquivo enviado"}</span>
          </div>
          <input
            id="audio-file"
            className="admin-file-input"
            type="file"
            accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav"
            disabled={busy}
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <label htmlFor="audio-file" className={`admin-btn secondary ${busy ? "disabled" : ""}`}>
            <Icon name="upload" size={16} />
            {busy ? "Enviando…" : content.audioPath ? "Trocar música" : "Escolher arquivo"}
          </label>
        </div>
        <p className="admin-hint">
          MP3, M4A, OGG ou WAV, até 20 MB. Use uma música com direito de uso. O envio já ativa a
          música no convite.
        </p>
      </Card>
      {url && (
        <Card icon="music" title="2. Prévia" where="Só para você">
          <audio className="admin-audio" controls src={url} />
          <div className="admin-actions">
            <button
              type="button"
              className="admin-btn danger small"
              disabled={busy}
              onClick={remove}
            >
              <Icon name="trash" size={15} />
              Remover música
            </button>
          </div>
        </Card>
      )}
      <Card icon="music" title={url ? "3. Ajustes" : "2. Ajustes"} where="Salvar alterações">
        <div className="admin-field">
          <label htmlFor="audio-start">
            Começar em <strong>{content.audioStartAt.toFixed(2)} s</strong>
          </label>
          <input
            id="audio-start"
            type="number"
            min="0"
            max="60"
            step="0.05"
            value={content.audioStartAt}
            disabled={busy || !content.audioPath}
            onChange={(e) =>
              update({ audioStartAt: Math.min(60, Math.max(0, Number(e.target.value) || 0)) })
            }
          />
          <p className="admin-hint">
            Pula o silêncio do começo da faixa, também quando ela recomeça em ciclo.
          </p>
        </div>
        <div className="admin-field">
          <label htmlFor="audio-volume">
            Volume padrão <strong>{Math.round(content.volume * 100)}%</strong>
          </label>
          <input
            id="audio-volume"
            type="range"
            min="0"
            max="1"
            step=".05"
            value={content.volume}
            onChange={(e) => update({ volume: Number(e.target.value) })}
          />
          <p className="admin-hint">No iPhone o volume é o do aparelho; este ajuste vale para os outros navegadores.</p>
        </div>
      </Card>
    </>
  );
}
