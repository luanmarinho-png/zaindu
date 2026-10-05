// Modelo de dados da clínica, valores iniciais e migração de registros antigos.
import { recordFromTemplate, resolveRecord, TEMPLATES, type RecordConfig } from './templates';

export type PatientAddress = { cep: string; street: string; number: string; complement: string; district: string; city: string; state: string };
export type Patient = {
  id: string; name: string; phone: string; email: string; since: string; notes: string;
  socialName: string; birthDate: string; sex: string; cpf: string; occupation: string;
  address: PatientAddress;
  emergencyName: string; emergencyPhone: string;
  insuranceType: 'Particular' | 'Convênio'; insuranceName: string; insuranceNumber: string;
  referralSource: string;
};
export type Appointment = { id: string; patientId: string; date: string; time: string; type: string; status: 'Agendada' | 'Realizada' | 'Cancelada'; price: number; notes: string; duration: number };
// Anamnese e evolução seguem o modelo de prontuário da clínica, por isso os campos são abertos (chave → texto ou lista).
export type PatientProfile = Record<string, string>;
export type ClinicalNote = { id: string; patientId: string; appointmentId: string; date: string; selectedFindings: string[]; [field: string]: string | string[] };
export type MediaAttachment = { id: string; patientId: string; appointmentId: string; kind: 'patient' | 'before' | 'after' | 'trichoscopy'; caption: string; capturedAt: string; mimeType: string; sizeBytes: number; storageKey: string; createdAt: string };
export type ClinicSettings = { clinicName: string; professionalName: string; specialty: string; appointmentTypes: string[]; trichoscopyFindings: string[]; record: RecordConfig };
export type Supply = { id:string; name:string; category:string; unit:string; unitCost:number; defaultQty:number };
export type ServiceItem = { supplyId: string; qty: number };
export type Service = { id: string; name: string; knowledgeCost: number; items: ServiceItem[] };
export type Store = { services: Service[]; supplies: Supply[]; knowledgeCost:number; targetMargin:number; patients: Patient[]; appointments: Appointment[]; notes: ClinicalNote[]; profiles: Record<string, PatientProfile>; media: MediaAttachment[]; settings: ClinicSettings; monthlyCosts: Record<string, { fixedCosts: number; investments: number }> };
export const KEY = 'raiz-viva-clinica-v1';
export const IMAGE_DB = 'raiz-viva-images-v1';
export type DailyVerse = { reference:string; theme:string; reflection:string };
export const dailyVerses:DailyVerse[] = [
  {reference:'Provérbios 21:5',theme:'Planejamento e diligência',reflection:'A sabedoria deste versículo valoriza o planejamento cuidadoso e o trabalho constante na construção de prosperidade.'},
  {reference:'Provérbios 16:3',theme:'Propósito e direção',reflection:'Dedique seus projetos a Deus, planeje com responsabilidade e siga com confiança e humildade.'},
  {reference:'Provérbios 22:29',theme:'Excelência no trabalho',reflection:'A dedicação e a competência tornam o trabalho reconhecido. Continue aperfeiçoando seu serviço.'},
  {reference:'Provérbios 24:3–4',theme:'Construir com sabedoria',reflection:'Um negócio sólido se constrói com sabedoria, entendimento e conhecimento — decisões consistentes importam.'},
  {reference:'Provérbios 11:1',theme:'Honestidade nos negócios',reflection:'Integridade nos preços, nas promessas e no cuidado com cada pessoa é parte de uma gestão justa.'},
  {reference:'Eclesiastes 3:1',theme:'Respeitar cada fase',reflection:'Há tempos diferentes para cada propósito. Uma fase difícil não define toda a sua trajetória.'},
  {reference:'Gálatas 6:9',theme:'Perseverança',reflection:'Não desanime ao fazer o bem. Continue com constância; o fruto do trabalho pode levar tempo.'},
  {reference:'Tiago 1:2–4',theme:'Maturidade nas provações',reflection:'As dificuldades podem fortalecer a perseverança e a maturidade para atravessar desafios.'},
  {reference:'Provérbios 31:16–18',theme:'Iniciativa e boa administração',reflection:'A mulher descrita avalia oportunidades, trabalha com disposição e administra com atenção.'},
];
export const verseForToday = () => { const key=dayKey(new Date()); const seed=[...key].reduce((value,char)=>(value*31+char.charCodeAt(0))>>>0,7); return dailyVerses[seed%dailyVerses.length]; };
export const defaultSettings: ClinicSettings = { clinicName: 'Sua clínica', professionalName: 'Profissional de saúde', specialty: 'Especialidade', appointmentTypes: ['Consulta','Retorno','Procedimento'], trichoscopyFindings: TEMPLATES.tricologia.findings, record: recordFromTemplate('tricologia') };
export const initial: Store = {
  supplies: [
    {id:'s1',name:'Par de luvas de procedimento',category:'EPI',unit:'par',unitCost:1.2,defaultQty:1},{id:'s2',name:'Máscara descartável',category:'EPI',unit:'unidade',unitCost:0.6,defaultQty:1},{id:'s3',name:'Touca descartável',category:'EPI',unit:'unidade',unitCost:0.35,defaultQty:1},{id:'s4',name:'Campo / gaze / antisséptico',category:'Biossegurança',unit:'kit',unitCost:4,defaultQty:1},{id:'s5',name:'Kit/tubo para PRP',category:'PRP capilar',unit:'kit',unitCost:45,defaultQty:1},{id:'s6',name:'Seringa estéril',category:'PRP capilar',unit:'unidade',unitCost:1.5,defaultQty:1},{id:'s7',name:'Agulha estéril',category:'PRP capilar',unit:'unidade',unitCost:0.8,defaultQty:1},{id:'s9',name:'Ponteira/cartucho de microagulhamento',category:'MMP / microagulhamento',unit:'unidade',unitCost:18,defaultQty:1},{id:'s10',name:'Seringa para mescla',category:'MMP / mesclas',unit:'unidade',unitCost:1.5,defaultQty:1},{id:'s11',name:'Ativo/mescla capilar',category:'MMP / mesclas',unit:'dose',unitCost:25,defaultQty:1},{id:'s12',name:'LEDterapia: rateio por sessão',category:'Equipamentos',unit:'sessão',unitCost:8,defaultQty:1},{id:'s13',name:'Centrífuga: rateio/manutenção por sessão',category:'PRP capilar',unit:'sessão',unitCost:12,defaultQty:1},{id:'s14',name:'Coletor para perfurocortantes (rateio)',category:'Biossegurança',unit:'unidade',unitCost:0.5,defaultQty:1},{id:'s15',name:'Óculos de proteção / higienização (rateio)',category:'EPI',unit:'sessão',unitCost:1,defaultQty:1}], knowledgeCost:30, targetMargin:100,
  services: [], patients: [], appointments: [], notes: [], profiles: {}, media: [], settings: defaultSettings, monthlyCosts: {},
};
export const emptyProfile: PatientProfile = {};
export const brl = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);
export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const monthName = (value: Date | string) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(typeof value === 'string' ? new Date(`${value}-01T12:00:00`) : value);
export const makeId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now() + Math.random());
export function openImageDb(): Promise<IDBDatabase> { return new Promise((resolve,reject)=>{ const request=indexedDB.open(IMAGE_DB,1); request.onupgradeneeded=()=>request.result.createObjectStore('images'); request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error); }); }
export async function saveImageBlob(key:string,blob:Blob):Promise<void>{const db=await openImageDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').put(blob,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();}
export async function readImageBlob(key:string):Promise<Blob|undefined>{const db=await openImageDb();const value=await new Promise<Blob|undefined>((resolve,reject)=>{const req=db.transaction('images').objectStore('images').get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});db.close();return value;}
export async function deleteImageBlob(key:string):Promise<void>{const db=await openImageDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();}

export function cleanLocalStore(value: Partial<Store> | null | undefined): Store {
  const patients = (value?.patients || []).filter(patient => !/^(paciente demonstração|paciente teste|teste|demo patient)\b/i.test(patient.name.trim())).map(normalizePatient);
  const patientIds = new Set(patients.map(patient => patient.id));
  return {
    ...initial,
    ...(value || {}),
    patients,
    appointments: (value?.appointments || []).filter(item => patientIds.has(item.patientId)).map(item => ({ ...item, duration: item.duration || 30 })),
    notes: (value?.notes || []).filter(item => patientIds.has(item.patientId)).map(note => ({ ...note, selectedFindings: note.selectedFindings || [] })),
    profiles: Object.fromEntries(Object.entries(value?.profiles || {}).filter(([id]) => patientIds.has(id))),
    media: (value?.media || []).filter(item => patientIds.has(item.patientId)),
    supplies: value?.supplies || initial.supplies,
    services: value?.services || legacyServices(value?.supplies || initial.supplies, value?.knowledgeCost ?? initial.knowledgeCost),
    knowledgeCost: value?.knowledgeCost ?? initial.knowledgeCost,
    targetMargin: value?.targetMargin ?? initial.targetMargin,
    settings: { ...defaultSettings, ...(value?.settings || {}), record: resolveRecord(value?.settings?.record) },
    monthlyCosts: value?.monthlyCosts || {},
  };
}


export const emptyAddress: PatientAddress = { cep: '', street: '', number: '', complement: '', district: '', city: '', state: '' };

export function normalizePatient(patient: Partial<Patient> & { id: string; name: string }): Patient {
  return {
    phone: '', email: '', since: new Date().toISOString().slice(0, 10), notes: '',
    socialName: '', birthDate: '', sex: '', cpf: '', occupation: '',
    emergencyName: '', emergencyPhone: '',
    insuranceType: 'Particular', insuranceName: '', insuranceNumber: '', referralSource: '',
    ...patient,
    address: { ...emptyAddress, ...(patient.address || {}) },
  };
}

// Antes os serviços eram fixos no código e escolhiam insumos pela categoria; isto recria a mesma composição como dados editáveis.
const legacyServiceTerms: [string, string[]][] = [
  ['MMP capilar', ['MMP', 'mescla', 'EPI', 'Biossegurança']],
  ['PRP capilar', ['PRP', 'EPI', 'Biossegurança']],
  ['LEDterapia', ['Equipamentos', 'EPI']],
  ['Consulta de tricologia', ['EPI', 'Biossegurança']],
];
export function legacyServices(supplies: Supply[], knowledgeCost: number): Service[] {
  return legacyServiceTerms.map(([name, terms], index) => ({
    id: `service-${index + 1}`,
    name,
    knowledgeCost,
    items: supplies.filter(item => terms.some(term => item.category.includes(term))).map(item => ({ supplyId: item.id, qty: item.defaultQty })),
  }));
}

export function serviceCost(service: Service, supplies: Supply[]): number {
  return service.items.reduce((sum, item) => sum + (supplies.find(supply => supply.id === item.supplyId)?.unitCost || 0) * item.qty, 0) + service.knowledgeCost;
}

// Clínica nova já começa com os atendimentos-modelo montados a partir dos insumos padrão.
initial.services = legacyServices(initial.supplies, initial.knowledgeCost);
