# Raiz Viva · Gestão da clínica

Front-end em Next.js/React para organização mensal da clínica de tricologia. O planejamento anexado serviu de referência para a paleta visual e o resumo financeiro (receitas, custo fixo e parcelas); o painel anterior era limitado a novembro de 2026, então esta versão permite navegar por mês, cadastrar pacientes e registrar consultas.

## Rodar localmente

Requer Node.js 20.9 ou superior. Neste workspace, Node.js 22 e pnpm 10 foram instalados localmente no projeto. Para usar:

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
- Persistência local via `localStorage` para prototipagem.
- Base TypeScript e variáveis de ambiente de exemplo para futura conexão com MongoDB.
- Fundação visual do Design System SC, com tokens e componentes CSS adaptados à identidade Raiz Viva (oliva, marfim e grafite).
- Acabamento do hero com textura marmorizada marrom sutil, sem imagem externa.

O Design System está em `src/app/design-system.css`, importado antes dos estilos do produto em `src/app/layout.tsx`. Os tokens originais vermelhos/cinza do pacote SocialCof foram mapeados para a paleta da clínica; as primitivas `.sc-*` podem ser reutilizadas em novos componentes.

## Próximos passos sugeridos

1. Definir autenticação e perfis de acesso antes de guardar dados reais de pacientes.
2. Migrar pacientes, consultas e lançamentos financeiros para coleções MongoDB com validação no servidor.
3. Incluir histórico clínico, lembretes de retorno, confirmação de consulta, pagamentos/pendências e relatórios por procedimento.
4. Configurar `MONGODB_URI` na Vercel, revisão de privacidade/LGPD e política de backup.
5. Criar o repositório GitHub e conectar a Vercel após a revisão do front.

Os registros iniciais são exemplos para demonstração. Esta versão não sincroniza entre dispositivos nem deve ser usada para armazenar informações clínicas reais.
