import type { Appointment, Patient } from './store';

const TIME_ZONE = 'America/Sao_Paulo';

export function calendarGuestEmail(value: string): string | null {
  const email = value.trim();
  return email.length <= 254 && /^[^\s@,;<>]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(email) ? email : null;
}

// O link só abre o formulário do Google; o usuário escolhe a conta e salva o evento.
// Nome e e-mail identificam o paciente e o convite; informações clínicas ficam no sistema.
export function googleCalendarUrl(appointment: Pick<Appointment, 'date' | 'time' | 'duration' | 'status'>, guestEmail = '', patient?: Pick<Patient, 'name' | 'email'>): string | null {
  const { date, time, duration, status } = appointment;
  const guest = calendarGuestEmail(guestEmail);
  if (guestEmail.trim() && !guest) return null;
  if (status === 'Cancelada' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    || !Number.isSafeInteger(duration) || duration <= 0) return null;

  // UTC serve apenas para somar minutos sem depender do fuso do dispositivo.
  // Sem o sufixo Z, o Google interpreta as datas no fuso informado abaixo.
  const start = new Date(`${date}T${time}:00Z`);
  if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 16) !== `${date}T${time}`) return null;
  const end = new Date(start.getTime() + duration * 60_000);
  if (!Number.isFinite(end.getTime()) || end.getUTCFullYear() > 9999) return null;
  const stamp = (value: Date) => value.toISOString().slice(0, 19).replace(/[-:]/g, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: patient?.name.trim() ? `Atendimento · ${patient.name.trim()} · ZAINDU` : 'Atendimento · ZAINDU',
    dates: `${stamp(start)}/${stamp(end)}`,
    stz: TIME_ZONE,
    etz: TIME_ZONE,
    ctz: TIME_ZONE,
    details: 'Atendimento agendado na ZAINDU. Remarcações e cancelamentos precisam ser atualizados manualmente no Google Agenda.',
  });
  const patientGuest = patient && calendarGuestEmail(patient.email);
  const guests = [...new Map([patientGuest, guest].filter((email): email is string => Boolean(email)).map(email => [email.toLowerCase(), email])).values()];
  if (guests.length) params.set('add', guests.join(','));
  return `https://calendar.google.com/calendar/r/eventedit?${params}`;
}
