# ZAINDU · Gestão clínica

Plataforma inicial de gestão clínica, pensada para ser personalizada por especialidade e por profissional. ZAINDU toma como inspiração o verbo basco *zaindu*: cuidar, proteger e guardar. Cada clínica configura seu nome, responsável, especialidade, preferências de comunicação, tipos de atendimento e formulários pertinentes.

## Rodar localmente

Requer Node.js 20.19 ou superior. Neste workspace, Node.js 22 e pnpm 10 foram instalados localmente no projeto. Para usar:

```bash
export PATH="$PWD/.tools/pnpm/node_modules/.bin:$PWD/.tools/bin:$PATH"
pnpm install
pnpm dev
```

Abra http://localhost:3000. O script já fixa a porta 3000. Como a instalação local está ignorada pelo Git, em outra máquina instale Node.js e pnpm antes de executar esses comandos.

## O que está pronto

- Agenda por mês, com cadastro e remoção de consultas e atualização de status.
- Cadastro e busca de pacientes.
- Prontuário por paciente, com anamnese clínica/capilar e evolução por atendimento.
- Registro descritivo de tricoscopia por região, aparelho/aumento, métricas e referência fotográfica.
- Visão mensal de consultas, pacientes e receita realizada.
- Campos editáveis de custos fixos e parcelas/investimentos.
- Persistência da ficha, agenda e evoluções no MongoDB; imagens privadas no GridFS.
- Preferência individual de comunicação, identidade e especialidade configuráveis por clínica.
- Fundação visual do Design System SC, com tipografia e componentes universais para diferentes especialidades.
- Acabamento do hero com textura marmorizada marrom sutil, sem imagem externa.

O Design System está em `src/app/design-system.css`, importado antes dos estilos do produto em `src/app/layout.tsx`. A marca usa um símbolo vetorial próprio em `public/zaindu-mark.svg` e uma paleta premium neutra.

## Próximos passos sugeridos

1. Configure `MONGODB_URI`, `MONGODB_DB`, `CLINIC_ACCESS_USERNAME` e `CLINIC_ACCESS_PASSWORD` nos ambientes local e Vercel. Use segredos fortes e nunca os envie ao GitHub.
2. MongoDB guarda os dados da clínica; GridFS guarda fotos privadas, fora dos documentos clínicos. A sessão é protegida por senha e cookie HttpOnly.
3. Antes de uso real, configure backups, retenção, perfis de acesso e demais controles de privacidade aplicáveis à operação médica.

O banco começa sem pacientes nem consultas de demonstração. A primeira abertura, após configurar o acesso e o MongoDB, migra eventuais registros locais existentes, removendo exemplos de demonstração e preservando os cadastros reais.
