"use client";
import Icon from "@/components/ui/Icon";
import type { Content, Gift } from "@/lib/content";
import { Card, Field, Switch } from "./ui";

export default function GiftsPanel({
  content,
  update,
}: {
  content: Content;
  update: (patch: Partial<Content>) => void;
}) {
  const gifts = content.gifts;
  const patch = (id: string, change: Partial<Gift>) =>
    update({ gifts: gifts.map((g) => (g.id === id ? { ...g, ...change } : g)) });
  function move(index: number, by: -1 | 1) {
    const next = [...gifts];
    [next[index + by], next[index]] = [next[index], next[index + by]];
    update({ gifts: next });
  }
  return (
    <Card icon="gift" title="Sugestões de presente" where="Página 5">
      {gifts.length === 0 && (
        <p className="admin-empty">
          Nenhuma sugestão ainda. Sem sugestões, a página mostra só a mensagem de carinho.
        </p>
      )}
      <ul className="admin-gifts">
        {gifts.map((g, i) => (
          <li className={`admin-gift ${g.active ? "" : "off"}`} key={g.id}>
            <div className="admin-gift-fields">
              <Field label="Sugestão" value={g.name} onChange={(name) => patch(g.id, { name })} />
              <Field
                label="Descrição"
                value={g.detail}
                multiline
                onChange={(detail) => patch(g.id, { detail })}
              />
            </div>
            <div className="admin-gift-bar">
              <Switch checked={g.active} onChange={(active) => patch(g.id, { active })}>
                {g.active ? "Visível no convite" : "Escondida"}
              </Switch>
              <div className="admin-actions">
                <button
                  type="button"
                  className="admin-btn ghost icon-only"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label={`Subir "${g.name}"`}
                >
                  <Icon name="arrowUp" size={18} />
                </button>
                <button
                  type="button"
                  className="admin-btn ghost icon-only"
                  disabled={i === gifts.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={`Descer "${g.name}"`}
                >
                  <Icon name="arrowDown" size={18} />
                </button>
                <button
                  type="button"
                  className="admin-btn danger icon-only"
                  onClick={() => update({ gifts: gifts.filter((x) => x.id !== g.id) })}
                  aria-label={`Excluir "${g.name}"`}
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="admin-btn secondary"
        onClick={() =>
          update({
            gifts: [
              ...gifts,
              { id: crypto.randomUUID(), name: "Nova sugestão", detail: "", active: true },
            ],
          })
        }
      >
        <Icon name="plus" size={16} />
        Adicionar sugestão
      </button>
    </Card>
  );
}
