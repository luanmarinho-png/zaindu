'use client';

import { useState } from 'react';
import { BadgeInfo, CalendarDays, Contact, HeartHandshake, House, IdCard, Loader2, Mail, Megaphone, NotebookPen, Phone, ShieldCheck, Trash2, User } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { ageFrom, digits, maskCep, maskCpf, maskPhone } from '@/lib/clinic/format';
import { makeId, normalizePatient, type Patient } from '@/lib/clinic/store';

const SEXES = ['Feminino', 'Masculino', 'Intersexo', 'Prefere não informar'];
const SOURCES = ['Indicação de paciente', 'Indicação médica', 'Instagram', 'Google', 'Convênio', 'Site', 'Outro'];

type Props = {
  patient?: Patient;
  onSave: (patient: Patient) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
};

export function PatientModal({ patient, onSave, onDelete, onClose }: Props) {
  const [form, setForm] = useState<Patient>(() => patient || normalizePatient({ id: makeId(), name: '' }));
  const [submitted, setSubmitted] = useState(false);
  const [cepState, setCepState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof Patient>(key: K, value: Patient[K]) => setForm(current => ({ ...current, [key]: value }));
  const setAddress = (key: keyof Patient['address'], value: string) => setForm(current => ({ ...current, address: { ...current.address, [key]: value } }));
  const age = ageFrom(form.birthDate);
  const emailInvalid = Boolean(form.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const cpfInvalid = Boolean(form.cpf) && digits(form.cpf).length !== 11;

  async function lookupCep(value: string) {
    const cep = digits(value);
    if (cep.length !== 8) return;
    setCepState('loading');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const result = await response.json();
      if (!response.ok || result.erro) throw new Error('CEP não encontrado');
      setForm(current => ({ ...current, address: { ...current.address, street: result.logradouro || current.address.street, district: result.bairro || current.address.district, city: result.localidade || current.address.city, state: result.uf || current.address.state } }));
      setCepState('idle');
    } catch {
      setCepState('error');
    }
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (!form.name.trim() || emailInvalid || cpfInvalid) return;
    onSave({ ...form, name: form.name.trim(), socialName: form.socialName.trim(), email: form.email.trim() });
  };

  return (
    <Modal
      size="lg"
      title={patient ? 'Editar paciente' : 'Cadastrar paciente'}
      description="Só o nome é obrigatório. O resto pode ser completado depois."
      onClose={onClose}
      onSubmit={submit}
      footer={<>
        {patient && onDelete && (confirmDelete
          ? <button type="button" className="z-btn danger" onClick={() => onDelete(patient.id)}><Trash2 />Confirmar exclusão</button>
          : <button type="button" className="z-btn danger-ghost" onClick={() => setConfirmDelete(true)}><Trash2 />Excluir</button>)}
        <span className="spacer" />
        <button type="button" className="z-btn secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="z-btn brand">{patient ? 'Salvar alterações' : 'Salvar paciente'}</button>
      </>}
    >
      <fieldset className="z-fieldset">
        <legend><User aria-hidden="true" />Dados pessoais</legend>
        <div className="z-form-grid">
          <Field label="Nome completo" required full htmlFor="p-name" error={submitted && !form.name.trim() ? 'Informe o nome.' : undefined}>
            <input id="p-name" className="z-input" autoFocus autoComplete="off" value={form.name} onChange={event => set('name', event.target.value)} aria-invalid={submitted && !form.name.trim()} />
          </Field>
          <Field label="Nome social" htmlFor="p-social" hint="Como prefere ser chamado(a)">
            <input id="p-social" className="z-input" value={form.socialName} onChange={event => set('socialName', event.target.value)} />
          </Field>
          <Field label="Data de nascimento" icon={CalendarDays} htmlFor="p-birth" hint={age !== null ? `${age} anos` : undefined}>
            <input id="p-birth" className="z-input" type="date" max={new Date().toISOString().slice(0, 10)} value={form.birthDate} onChange={event => set('birthDate', event.target.value)} />
          </Field>
          <Field label="Sexo" htmlFor="p-sex">
            <select id="p-sex" className="z-select" value={form.sex} onChange={event => set('sex', event.target.value)}>
              <option value="">Não informado</option>
              {SEXES.map(item => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="CPF" icon={IdCard} htmlFor="p-cpf" error={submitted && cpfInvalid ? 'CPF precisa ter 11 dígitos.' : undefined}>
            <input id="p-cpf" className="z-input num" inputMode="numeric" placeholder="000.000.000-00" value={form.cpf} onChange={event => set('cpf', maskCpf(event.target.value))} aria-invalid={submitted && cpfInvalid} />
          </Field>
          <Field label="Profissão" htmlFor="p-job" full>
            <input id="p-job" className="z-input" value={form.occupation} onChange={event => set('occupation', event.target.value)} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="z-fieldset">
        <legend><Contact aria-hidden="true" />Contato</legend>
        <div className="z-form-grid">
          <Field label="Celular / WhatsApp" icon={Phone} htmlFor="p-phone">
            <input id="p-phone" className="z-input num" type="tel" inputMode="tel" placeholder="(00) 00000-0000" value={form.phone} onChange={event => set('phone', maskPhone(event.target.value))} />
          </Field>
          <Field label="E-mail" icon={Mail} htmlFor="p-email" error={submitted && emailInvalid ? 'E-mail inválido.' : undefined}>
            <input id="p-email" className="z-input" type="email" inputMode="email" placeholder="email@exemplo.com" value={form.email} onChange={event => set('email', event.target.value)} aria-invalid={submitted && emailInvalid} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="z-fieldset">
        <legend><House aria-hidden="true" />Endereço</legend>
        <div className="z-form-grid three">
          <Field label="CEP" htmlFor="p-cep" error={cepState === 'error' ? 'CEP não encontrado. Preencha à mão.' : undefined}>
            <div className="z-inputwrap">
              <input id="p-cep" className="num" inputMode="numeric" placeholder="00000-000" value={form.address.cep} onChange={event => { const value = maskCep(event.target.value); setAddress('cep', value); if (digits(value).length === 8) lookupCep(value); }} />
              {cepState === 'loading' && <Loader2 className="z-spin" aria-label="Buscando CEP" />}
            </div>
          </Field>
          <Field label="Rua" htmlFor="p-street" full>
            <input id="p-street" className="z-input" value={form.address.street} onChange={event => setAddress('street', event.target.value)} />
          </Field>
          <Field label="Número" htmlFor="p-number">
            <input id="p-number" className="z-input" value={form.address.number} onChange={event => setAddress('number', event.target.value)} />
          </Field>
          <Field label="Complemento" htmlFor="p-compl">
            <input id="p-compl" className="z-input" value={form.address.complement} onChange={event => setAddress('complement', event.target.value)} />
          </Field>
          <Field label="Bairro" htmlFor="p-district">
            <input id="p-district" className="z-input" value={form.address.district} onChange={event => setAddress('district', event.target.value)} />
          </Field>
          <Field label="Cidade" htmlFor="p-city">
            <input id="p-city" className="z-input" value={form.address.city} onChange={event => setAddress('city', event.target.value)} />
          </Field>
          <Field label="UF" htmlFor="p-state">
            <input id="p-state" className="z-input" maxLength={2} value={form.address.state} onChange={event => setAddress('state', event.target.value.toUpperCase())} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="z-fieldset">
        <legend><HeartHandshake aria-hidden="true" />Contato de emergência</legend>
        <div className="z-form-grid">
          <Field label="Nome" htmlFor="p-em-name">
            <input id="p-em-name" className="z-input" value={form.emergencyName} onChange={event => set('emergencyName', event.target.value)} />
          </Field>
          <Field label="Telefone" icon={Phone} htmlFor="p-em-phone">
            <input id="p-em-phone" className="z-input num" type="tel" inputMode="tel" placeholder="(00) 00000-0000" value={form.emergencyPhone} onChange={event => set('emergencyPhone', maskPhone(event.target.value))} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="z-fieldset">
        <legend><ShieldCheck aria-hidden="true" />Atendimento</legend>
        <div className="z-form-grid">
          <Field label="Forma de atendimento" full>
            <div className="z-segment" role="group" aria-label="Forma de atendimento">
              {(['Particular', 'Convênio'] as const).map(item => <button key={item} type="button" aria-pressed={form.insuranceType === item} onClick={() => set('insuranceType', item)}>{item}</button>)}
            </div>
          </Field>
          {form.insuranceType === 'Convênio' && <>
            <Field label="Convênio" htmlFor="p-ins">
              <input id="p-ins" className="z-input" value={form.insuranceName} onChange={event => set('insuranceName', event.target.value)} />
            </Field>
            <Field label="Número da carteirinha" icon={BadgeInfo} htmlFor="p-ins-n">
              <input id="p-ins-n" className="z-input num" value={form.insuranceNumber} onChange={event => set('insuranceNumber', event.target.value)} />
            </Field>
          </>}
          <Field label="Como conheceu a clínica" icon={Megaphone} htmlFor="p-src">
            <select id="p-src" className="z-select" value={form.referralSource} onChange={event => set('referralSource', event.target.value)}>
              <option value="">Não informado</option>
              {SOURCES.map(item => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Paciente desde" icon={CalendarDays} htmlFor="p-since">
            <input id="p-since" className="z-input" type="date" value={form.since} onChange={event => set('since', event.target.value)} />
          </Field>
          <Field label="Observações" icon={NotebookPen} full htmlFor="p-notes">
            <textarea id="p-notes" className="z-textarea" rows={3} placeholder="Informações administrativas" value={form.notes} onChange={event => set('notes', event.target.value)} />
          </Field>
        </div>
      </fieldset>
    </Modal>
  );
}
