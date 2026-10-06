import type { FormResponseDoc } from '@/lib/forms';

// Resposta organizada por seção, com links de download dos anexos: base para montar o painel da clínica.
export function exportResponse(item: FormResponseDoc, origin: string) {
  const sections: { titulo: string; perguntas: { numero: number; pergunta: string; resposta: string }[] }[] = [];
  for (const answer of item.respostas || []) {
    let section = sections.find(entry => entry.titulo === answer.secao);
    if (!section) { section = { titulo: answer.secao, perguntas: [] }; sections.push(section); }
    section.perguntas.push({ numero: answer.numero, pergunta: answer.pergunta, resposta: answer.resposta });
  }
  return {
    id: item._id,
    enviadoEm: item.enviadoEm,
    secoes: sections,
    anexos: (item.anexos || []).map(file => ({ nome: file.nome, tipo: file.tipo, tamanho: file.tamanho, pergunta: file.pergunta, download: `${origin}/api/forms/files/${file.id}` })),
  };
}
