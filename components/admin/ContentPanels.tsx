"use client";
import Icon from "@/components/ui/Icon";
import { displayDate, maps, type Content } from "@/lib/content";
import { longDate } from "@/lib/admin";
import { Card, Field } from "./ui";

type Props = {
  content: Content;
  update: (patch: Partial<Content>) => void;
};

export function CoverPanel({ content, update }: Props) {
  return (
    <Card icon="star" title="Identidade da capa" where="Capa">
      <Field
        label="Nome da criança"
        hint="Grande, no centro da capa, e também no encerramento."
        value={content.name}
        onChange={(name) => update({ name })}
      />
      <Field
        label="Idade"
        hint='Logo abaixo do nome. Exemplo: "1 ano".'
        value={content.age}
        onChange={(age) => update({ age })}
      />
      <Field
        label="Tema / título"
        hint="Linha dourada acima do nome."
        value={content.title}
        onChange={(title) => update({ title })}
      />
      <Field
        label="Subtítulo"
        hint="Frase curta embaixo da ilustração da capa."
        value={content.subtitle}
        onChange={(subtitle) => update({ subtitle })}
      />
    </Card>
  );
}

export function TextsPanel({ content, update }: Props) {
  return (
    <>
      <Card icon="book" title="Abertura" where="Página 1">
        <Field
          label="Título"
          value={content.intro}
          multiline
          onChange={(intro) => update({ intro })}
        />
        <Field
          label="Narrativa"
          hint="Convite em poucas linhas, logo abaixo da ilustração."
          value={content.narrative}
          multiline
          onChange={(narrative) => update({ narrative })}
        />
      </Card>
      <Card icon="book" title="Frase" where="Página 2">
        <Field
          label="Frase curta ou citação"
          value={content.quote}
          multiline
          onChange={(quote) => update({ quote })}
        />
        <Field
          label="Autoria"
          hint="Deixe vazio se for um texto da família: nada é atribuído a ninguém."
          value={content.quoteAuthor}
          onChange={(quoteAuthor) => update({ quoteAuthor })}
        />
      </Card>
      <Card icon="book" title="Encerramento" where="Página 6">
        <Field
          label="Frase final"
          value={content.closing}
          multiline
          onChange={(closing) => update({ closing })}
        />
      </Card>
      <Card icon="users" title="Confirmação de presença" where="Janela após a página 6">
        <Field
          label="Convite para confirmar"
          hint="Aparece na janela que abre quando a pessoa toca em Confirmar presença."
          value={content.rsvpText}
          multiline
          onChange={(rsvpText) => update({ rsvpText })}
        />
      </Card>
    </>
  );
}

export function EventPanel({ content, update }: Props) {
  const links = maps(content.address);
  return (
    <>
      <Card icon="calendar" title="Quando" where="Página 3">
        <div className="admin-row">
          <Field
            label="Data"
            type="date"
            value={content.date}
            onChange={(date) => update({ date })}
          />
          <Field
            label="Horário"
            type="time"
            value={content.time}
            onChange={(time) => update({ time })}
          />
        </div>
        <p className="admin-preview">
          <Icon name="calendar" size={16} />
          {content.date ? (
            <>
              {longDate(content.date)}
              {content.time ? `, às ${content.time}` : ", horário a definir"}
            </>
          ) : (
            "Escolha a data para ver como ela aparece."
          )}
        </p>
        <div className="admin-field">
          <label htmlFor="date-format">Como a data aparece no convite</label>
          <select
            id="date-format"
            value={content.dateFormat}
            onChange={(e) => update({ dateFormat: e.target.value as Content["dateFormat"] })}
          >
            <option value="long">Por extenso (12 de dezembro de 2026)</option>
            <option value="short">Dia e mês (12/12)</option>
          </select>
          <p className="admin-hint">
            No convite fica: <strong>{displayDate(content.date, content.dateFormat)}</strong>
          </p>
        </div>
        <Field
          label="Texto complementar"
          hint="Frase pequena abaixo do horário."
          value={content.dateNote}
          onChange={(dateNote) => update({ dateNote })}
        />
      </Card>
      <Card icon="pin" title="Onde" where="Página 4">
        <Field
          label="Nome do local"
          value={content.venue}
          onChange={(venue) => update({ venue })}
        />
        <Field
          label="Endereço"
          hint="Os botões Google Maps e Waze do convite são gerados a partir deste endereço."
          value={content.address}
          multiline
          onChange={(address) => update({ address })}
        />
        {content.address.trim() ? (
          <div className="admin-actions">
            <a className="admin-btn secondary small" href={links.google} target="_blank" rel="noreferrer">
              <Icon name="pin" size={15} />
              Testar no Google Maps
              <Icon name="external" size={13} />
            </a>
            <a className="admin-btn secondary small" href={links.waze} target="_blank" rel="noreferrer">
              <Icon name="route" size={15} />
              Testar no Waze
              <Icon name="external" size={13} />
            </a>
          </div>
        ) : (
          <p className="admin-hint">Sem endereço, o convite mostra “será anunciado em breve”.</p>
        )}
      </Card>
    </>
  );
}
