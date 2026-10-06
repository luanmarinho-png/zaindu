'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Copy, Download, ExternalLink, FileJson, Inbox, Link2, Palette, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/clinic/format';
import { QUESTION_TYPES, STATUS_LABEL, type FormQuestion, type FormQuestionType, type FormSection, type FormStatus } from '@/lib/forms';

type FormRow = { slug: string; title: string; client: string; status: FormStatus; color: string; url: string; legacy: boolean; responses: number; lastResponse: string | null };
type FullForm = { slug: string; title: string; client: string; eyebrow: string; greeting: string; intro: string; thanksTitle: string; thanksText: string; color: string; status: FormStatus; sections: FormSection[] };
type ExportedResponse = { id: string; enviadoEm: string; secoes: { titulo: string; perguntas: { numero: number; pergunta: string; resposta: string }[] }[]; anexos: { nome: string; tipo: string; tamanho: number; pergunta: number; download: string }[] };

const STATUS_TONE: Record<FormStatus, string> = { rascunho: 'warn', publicado: 'success', encerrado: '' };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir.');
  return result as T;
}

// Formulários de captação: um por cliente, publicados em /formulario/<identificador>.
export function FormsAdmin() {
  const [rows, setRows] = useState<FormRow[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState('');
  const [answers, setAnswers] = useState<FormRow | null>(null);

  const load = useCallback(async () => {
    try { setRows((await api<{ forms: FormRow[] }>('/api/admin/forms')).forms); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível carregar.'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const copyLink = async (row: FormRow) => {
    const link = `${location.origin}${row.url}`;
    try { await navigator.clipboard.writeText(link); setNotice('Link copiado.'); } catch { setNotice(link); }
  };

  return (
    <>
      <header className="z-pagehead">
        <div>
          <h1 className="t-display">Formulários</h1>
          <p className="t-body-lg t-muted">Um questionário por cliente para captar marca, site e rotina. As respostas viram JSON para montar o painel da clínica.</p>
        </div>
        <div className="z-pagehead-actions"><button type="button" className="z-btn brand" onClick={() => setCreating(true)}><Plus />Novo formulário</button></div>
      </header>
      {error && <p className="z-callout danger" role="alert">{error}</p>}
      {rows === null ? <span className="z-loader" aria-hidden="true" /> : rows.length ? (
        <ul className="z-clinic-list">
          {rows.map(row => (
            <li key={row.slug} className="z-card white z-clinic-card">
              <div className="z-clinic-row">
                <span className="z-clinic-logo swatch" style={{ '--clinic': row.color || '#2e2e30' } as React.CSSProperties} aria-hidden="true"><FileJson /></span>
                <div className="z-clinic-main">
                  <strong className="t-h2">{row.title}</strong>
                  <small className="t-muted">{[row.client, row.url, `${row.responses} resposta(s)`, row.lastResponse ? `última em ${formatDate(String(row.lastResponse).slice(0, 10))}` : ''].filter(Boolean).join(' · ')}</small>
                </div>
                <span className={`z-badge sm ${STATUS_TONE[row.status]}`}>{row.legacy ? 'Página fixa' : STATUS_LABEL[row.status]}</span>
                <div className="z-row-actions">
                  <button type="button" className="z-close" onClick={() => copyLink(row)} aria-label="Copiar link" title="Copiar link"><Link2 /></button>
                  <a className="z-close" href={row.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir formulário" title="Abrir"><ExternalLink /></a>
                  {!row.legacy && <button type="button" className="z-close" onClick={() => setEditing(row.slug)} aria-label={`Editar ${row.title}`} title="Editar"><Pencil /></button>}
                  <button type="button" className="z-btn secondary sm" onClick={() => setAnswers(row)}><Inbox />Respostas</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : <div className="z-empty"><span>Nenhum formulário.</span></div>}
      {creating && <CreateModal rows={rows || []} onClose={() => setCreating(false)} onCreated={slug => { setCreating(false); load(); setEditing(slug); }} />}
      {editing && <FormEditor slug={editing} onClose={() => setEditing('')} onChanged={message => { setNotice(message); load(); }} onDeleted={() => { setEditing(''); setNotice('Formulário apagado.'); load(); }} />}
      {answers && <Responses row={answers} onClose={() => setAnswers(null)} onChanged={load} />}
      {notice && <Toast tone="success" message={notice} onClose={() => setNotice('')} />}
    </>
  );
}

function CreateModal({ rows, onClose, onCreated }: { rows: FormRow[]; onClose: () => void; onCreated: (slug: string) => void }) {
  const [client, setClient] = useState('');
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState('captacao');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try { onCreated((await api<{ slug: string }>('/api/admin/forms', { method: 'POST', body: JSON.stringify({ client, title, template }) })).slug); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível criar.'); }
    finally { setBusy(false); }
  }
  return (
    <Modal title="Novo formulário" description="Nasce como rascunho. Publique quando estiver pronto para enviar o link." onClose={onClose} onSubmit={submit}
      footer={<><span className="spacer" /><button type="button" className="z-btn secondary" onClick={onClose}>Cancelar</button><button type="submit" className="z-btn brand" disabled={busy}>{busy ? 'Criando…' : 'Criar e editar'}</button></>}>
      <div className="z-form-grid">
        <Field label="Cliente" htmlFor="f-client" hint="Usado na saudação: “Olá, Dra. Ana”."><input id="f-client" className="z-input" value={client} onChange={event => setClient(event.target.value)} placeholder="Dra. Ana Souza" autoFocus /></Field>
        <Field label="Título" htmlFor="f-title" hint="Em branco: “Questionário + cliente”."><input id="f-title" className="z-input" value={title} onChange={event => setTitle(event.target.value)} /></Field>
        <Field label="Começar a partir de" full>
          <Select value={template} onChange={setTemplate} ariaLabel="Modelo" options={[
            { value: 'captacao', label: 'Captação de clínica', hint: 'As 30 perguntas do questionário da Dra. Celina, para adaptar' },
            { value: 'branco', label: 'Em branco', hint: 'Uma parte com uma pergunta' },
            ...rows.filter(row => !row.legacy).map(row => ({ value: `copia:${row.slug}`, label: `Cópia de ${row.title}`, hint: row.client })),
          ]} />
        </Field>
        {error && <p className="z-callout danger full" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

const newQuestion = (): FormQuestion => ({ type: 'single', label: 'Nova pergunta', options: ['Opção 1', 'Opção 2'] });
const move = <T,>(list: T[], index: number, delta: number) => {
  const next = [...list];
  const target = index + delta;
  if (target < 0 || target >= next.length) return list;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

function FormEditor({ slug, onClose, onChanged, onDeleted }: { slug: string; onClose: () => void; onChanged: (message: string) => void; onDeleted: () => void }) {
  const [form, setForm] = useState<FullForm | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState('');
  useEffect(() => { api<{ form: FullForm }>(`/api/admin/forms/${slug}`).then(result => setForm(result.form)).catch(err => setError(err.message)); }, [slug]);
  const set = (patch: Partial<FullForm>) => { setForm(current => current && { ...current, ...patch }); setDirty(true); };
  const setSection = (index: number, patch: Partial<FormSection>) => form && set({ sections: form.sections.map((section, i) => i === index ? { ...section, ...patch } : section) });
  const setQuestion = (s: number, q: number, patch: Partial<FormQuestion>) => form && setSection(s, { questions: form.sections[s].questions.map((question, i) => i === q ? { ...question, ...patch } : question) });

  async function save(status?: FormStatus) {
    if (!form) return;
    setBusy(true);
    setError('');
    try {
      const { slug: _slug, ...fields } = form;
      await api(`/api/admin/forms/${slug}`, { method: 'PATCH', body: JSON.stringify({ ...fields, ...(status ? { status } : {}) }) });
      if (status) setForm(current => current && { ...current, status });
      setDirty(false);
      onChanged(status === 'publicado' ? 'Formulário publicado. Já pode enviar o link.' : 'Formulário salvo.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  }
  async function remove() {
    try { await api(`/api/admin/forms/${slug}`, { method: 'DELETE', body: JSON.stringify({ confirm }) }); onDeleted(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível apagar.'); }
  }

  const total = form?.sections.reduce((sum, section) => sum + section.questions.length, 0) || 0;
  return (
    <Modal size="lg" variant="drawer" title={form ? form.title : 'Formulário'} description={form ? `/formulario/${slug} · ${STATUS_LABEL[form.status]} · ${total} perguntas` : ''} onClose={onClose}
      footer={form && <>
        <a className="z-btn ghost" href={`/formulario/${slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink />Ver como cliente</a>
        <span className="spacer" />
        {form.status !== 'publicado' ? <button type="button" className="z-btn secondary" disabled={busy} onClick={() => save('publicado')}>Salvar e publicar</button>
          : <button type="button" className="z-btn secondary" disabled={busy} onClick={() => save('encerrado')}>Encerrar</button>}
        <button type="button" className="z-btn brand" disabled={busy || !dirty} onClick={() => save()}><Save />{busy ? 'Salvando…' : dirty ? 'Salvar' : 'Salvo'}</button>
      </>}>
      {error && <p className="z-callout danger" role="alert">{error}</p>}
      {!form ? <span className="z-loader" aria-hidden="true" /> : <div className="z-form-editor">
        {form.status === 'rascunho' && <p className="z-callout warn">Rascunho: o link ainda mostra “formulário indisponível”. Publique para começar a receber respostas.</p>}
        <fieldset className="z-fieldset">
          <legend>Identificação e textos</legend>
          <div className="z-form-grid">
            <Field label="Título" htmlFor="fe-title"><input id="fe-title" className="z-input" value={form.title} onChange={event => set({ title: event.target.value })} /></Field>
            <Field label="Cliente" htmlFor="fe-client"><input id="fe-client" className="z-input" value={form.client} onChange={event => set({ client: event.target.value })} /></Field>
            <Field label="Etiqueta acima da saudação" htmlFor="fe-eyebrow"><input id="fe-eyebrow" className="z-input" value={form.eyebrow} onChange={event => set({ eyebrow: event.target.value })} placeholder="Marca e site" /></Field>
            <Field label="Saudação" htmlFor="fe-greeting"><input id="fe-greeting" className="z-input" value={form.greeting} onChange={event => set({ greeting: event.target.value })} /></Field>
            <Field label="Introdução" htmlFor="fe-intro" full><textarea id="fe-intro" className="z-textarea" rows={3} value={form.intro} onChange={event => set({ intro: event.target.value })} /></Field>
            <Field label="Título do agradecimento" htmlFor="fe-thx"><input id="fe-thx" className="z-input" value={form.thanksTitle} onChange={event => set({ thanksTitle: event.target.value })} /></Field>
            <Field label="Cor" icon={Palette} htmlFor="fe-color"><div className="z-color-row"><input id="fe-color" type="color" className="z-color" value={form.color} onChange={event => set({ color: event.target.value })} /><span className="num t-muted">{form.color.toUpperCase()}</span></div></Field>
            <Field label="Mensagem de agradecimento" htmlFor="fe-thxt" full><textarea id="fe-thxt" className="z-textarea" rows={2} value={form.thanksText} onChange={event => set({ thanksText: event.target.value })} /></Field>
          </div>
        </fieldset>

        <div className="z-qblock">
          <div className="z-qblock-head">
            <div><h3 className="t-h2">Perguntas</h3><p className="t-body t-muted">{form.sections.length} partes e {total} perguntas. O cliente responde uma parte por vez.</p></div>
            <button type="button" className="z-btn ghost sm" onClick={() => set({ sections: [...form.sections, { title: 'Nova parte', intro: '', questions: [newQuestion()] }] })}><Plus />Nova parte</button>
          </div>
          {form.sections.map((section, s) => (
            <details key={s} className="z-qgroup">
              <summary><ChevronRight className="z-chevron" aria-hidden="true" /><strong>{s + 1}. {section.title}</strong><span className="z-badge sm num">{section.questions.length}</span></summary>
              <div className="z-qgroup-body">
                <div className="z-qgroup-tools">
                  <input className="z-input" value={section.title} onChange={event => setSection(s, { title: event.target.value })} aria-label="Título da parte" />
                  <div className="z-row-actions">
                    <button type="button" className="z-close" disabled={s === 0} onClick={() => set({ sections: move(form.sections, s, -1) })} aria-label="Subir parte"><ArrowUp /></button>
                    <button type="button" className="z-close" disabled={s === form.sections.length - 1} onClick={() => set({ sections: move(form.sections, s, 1) })} aria-label="Descer parte"><ArrowDown /></button>
                    <button type="button" className="z-btn danger-ghost sm" disabled={form.sections.length === 1} onClick={() => set({ sections: form.sections.filter((_, i) => i !== s) })}><Trash2 />Remover parte</button>
                  </div>
                </div>
                <input className="z-input" value={section.intro || ''} onChange={event => setSection(s, { intro: event.target.value })} placeholder="Frase de abertura da parte (opcional)" aria-label="Introdução da parte" />
                <ol className="z-qlist">
                  {section.questions.map((question, q) => {
                    const choice = question.type === 'single' || question.type === 'multi';
                    return (
                      <li key={q}>
                        <details className="z-question">
                          <summary>
                            <span className="z-question-n num">{q + 1}</span>
                            <span className="z-question-label">{question.label}</span>
                            <span className="z-badge sm">{QUESTION_TYPES[question.type]}{question.optional ? ' · opcional' : ''}</span>
                            <span className="z-row-actions" onClick={event => event.preventDefault()}>
                              <button type="button" className="z-close" disabled={q === 0} onClick={() => setSection(s, { questions: move(section.questions, q, -1) })} aria-label="Subir"><ArrowUp /></button>
                              <button type="button" className="z-close" disabled={q === section.questions.length - 1} onClick={() => setSection(s, { questions: move(section.questions, q, 1) })} aria-label="Descer"><ArrowDown /></button>
                            </span>
                          </summary>
                          <div className="z-question-body">
                            <Field label="Pergunta" full><input className="z-input" value={question.label} onChange={event => setQuestion(s, q, { label: event.target.value })} /></Field>
                            <Field label="Tipo de resposta"><Select value={question.type} ariaLabel="Tipo" onChange={value => setQuestion(s, q, { type: value as FormQuestionType, ...(value === 'single' || value === 'multi' ? { options: question.options?.length ? question.options : ['Opção 1', 'Opção 2'] } : {}) })} options={(Object.keys(QUESTION_TYPES) as FormQuestionType[]).map(type => ({ value: type, label: QUESTION_TYPES[type] }))} /></Field>
                            <Field label="Ajuda (abaixo da pergunta)"><input className="z-input" value={question.hint || ''} onChange={event => setQuestion(s, q, { hint: event.target.value })} placeholder="Opcional" /></Field>
                            {choice && <Field label="Opções" full hint="Uma por linha."><textarea className="z-textarea" rows={Math.min(8, (question.options?.length || 2) + 1)} value={(question.options || []).join('\n')} onChange={event => setQuestion(s, q, { options: event.target.value.split('\n') })} /></Field>}
                            {(choice || question.type === 'colors') && <Field label="Campo complementar" hint="Ex.: “Outro motivo”. Em branco, não aparece."><input className="z-input" value={question.extra || ''} onChange={event => setQuestion(s, q, { extra: event.target.value })} /></Field>}
                            {(question.type === 'multi' || question.type === 'colors') && <Field label="Máximo de escolhas"><input className="z-input num" inputMode="numeric" value={question.max || ''} onChange={event => setQuestion(s, q, { max: Number(event.target.value.replace(/\D/g, '')) || undefined })} placeholder="Sem limite" /></Field>}
                            <div className="z-field full z-question-flags">
                              <label className="z-switch"><input type="checkbox" checked={Boolean(question.optional)} onChange={event => setQuestion(s, q, { optional: event.target.checked })} /><span className="track" aria-hidden="true" /><span>Opcional</span></label>
                              <label className="z-switch"><input type="checkbox" checked={Boolean(question.files)} onChange={event => setQuestion(s, q, { files: event.target.checked })} /><span className="track" aria-hidden="true" /><span>Permite anexar arquivos</span></label>
                            </div>
                            <div className="z-question-foot"><button type="button" className="z-btn danger-ghost sm" disabled={section.questions.length === 1} onClick={() => setSection(s, { questions: section.questions.filter((_, i) => i !== q) })}><Trash2 />Remover pergunta</button></div>
                          </div>
                        </details>
                      </li>
                    );
                  })}
                </ol>
                <button type="button" className="z-btn ghost sm" onClick={() => setSection(s, { questions: [...section.questions, newQuestion()] })}><Plus />Adicionar pergunta</button>
              </div>
            </details>
          ))}
        </div>

        <details className="z-danger-zone">
          <summary><Trash2 aria-hidden="true" />Apagar formulário</summary>
          <p className="t-body t-muted">Apaga o formulário, todas as respostas e os anexos. Não dá para desfazer.</p>
          <Field label={`Para confirmar, digite: ${slug}`}><input className="z-input" value={confirm} onChange={event => setConfirm(event.target.value)} autoComplete="off" /></Field>
          <button type="button" className="z-btn danger" disabled={confirm !== slug} onClick={remove}><Trash2 />Apagar para sempre</button>
        </details>
      </div>}
    </Modal>
  );
}

type ResponsesPayload = { formulario: { identificador: string; titulo: string; cliente: string }; respostas: ExportedResponse[] };

function Responses({ row, onClose, onChanged }: { row: FormRow; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<ResponsesPayload | null>(null);
  const [selected, setSelected] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const result = await api<ResponsesPayload>(`/api/admin/forms/${row.slug}/responses`);
      setData(result);
      setSelected(current => current && result.respostas.some(item => item.id === current) ? current : result.respostas[0]?.id || '');
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível carregar.'); }
  }, [row.slug]);
  useEffect(() => { load(); }, [load]);
  const current = data?.respostas.find(item => item.id === selected);
  const when = (value: string) => new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  async function remove() {
    if (!current) return;
    try { await api(`/api/admin/responses/${current.id}`, { method: 'DELETE' }); setConfirmDelete(false); await load(); onChanged(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível apagar.'); }
  }
  return (
    <Modal size="lg" variant="drawer" title={`Respostas · ${row.title}`} description={data ? `${data.respostas.length} resposta(s)` : ''} onClose={onClose}
      footer={<>
        <span className="spacer" />
        {data && data.respostas.length > 0 && <a className="z-btn secondary" href={`/api/admin/forms/${row.slug}/responses?download=1`}><Download />Exportar todas (JSON)</a>}
      </>}>
      {error && <p className="z-callout danger" role="alert">{error}</p>}
      {!data ? <span className="z-loader" aria-hidden="true" /> : data.respostas.length ? (
        <div className="z-answers">
          <nav className="z-answers-list" aria-label="Respostas recebidas">
            {data.respostas.map((item, index) => (
              <button key={item.id} type="button" aria-current={item.id === selected} onClick={() => { setSelected(item.id); setConfirmDelete(false); }}>
                <strong>Resposta {data.respostas.length - index}</strong>
                <small className="t-muted">{when(item.enviadoEm)}{item.anexos.length ? ` · ${item.anexos.length} anexo(s)` : ''}</small>
              </button>
            ))}
          </nav>
          {current && (
            <article className="z-answer">
              <header className="z-answer-head">
                <div><h3 className="t-h2">Enviada em {when(current.enviadoEm)}</h3><small className="t-muted num">{current.id}</small></div>
                <div className="z-row-actions">
                  <a className="z-btn secondary sm" href={`/api/admin/responses/${current.id}`}><FileJson />Baixar JSON</a>
                  {confirmDelete
                    ? <><button type="button" className="z-btn danger sm" onClick={remove}><Trash2 />Confirmar</button><button type="button" className="z-close" onClick={() => setConfirmDelete(false)} aria-label="Cancelar"><X /></button></>
                    : <button type="button" className="z-close" onClick={() => setConfirmDelete(true)} aria-label="Apagar resposta" title="Apagar"><Trash2 /></button>}
                </div>
              </header>
              {current.anexos.length > 0 && (
                <div className="z-answer-files">
                  {current.anexos.map(file => <a key={file.download} className="z-badge" href={file.download}><Download aria-hidden="true" />{file.nome}</a>)}
                </div>
              )}
              {current.secoes.map(section => (
                <section key={section.titulo} className="z-answer-section">
                  <h4>{section.titulo}</h4>
                  <dl>
                    {section.perguntas.map(item => (
                      <div key={item.numero}><dt><span className="num">{item.numero}.</span> {item.pergunta}</dt><dd className={item.resposta ? '' : 't-muted'}>{item.resposta || 'Sem resposta'}</dd></div>
                    ))}
                  </dl>
                </section>
              ))}
              <button type="button" className="z-btn ghost sm" onClick={() => navigator.clipboard.writeText(JSON.stringify(current, null, 2))}><Copy />Copiar JSON</button>
            </article>
          )}
        </div>
      ) : <div className="z-empty"><Inbox aria-hidden="true" /><span>Nenhuma resposta ainda. Envie o link {row.url} para o cliente.</span></div>}
    </Modal>
  );
}
