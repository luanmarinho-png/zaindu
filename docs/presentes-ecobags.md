# Presentes ZAINDU — ecobags

Campanha `ecobags-2026-10`: 18 cartões, 17 descontos de 20% e 1 acesso integral grátis. Ambos os benefícios duram 12 meses a partir da ativação. Os prêmios foram distribuídos uma vez, com aleatoriedade criptográfica; não existe novo sorteio ao escanear ou atualizar a página.

## Operação

1. Distribuir um cartão por participante. Os cartões têm aparência idêntica e identificador de 01 a 18. Embaralhar antes de colocar nas ecobags.
2. A participante acessa `https://lp.zaindu.app/presente/<token>`, preenche nome, WhatsApp brasileiro e e-mail, e confirma o uso desses dados para entrega e contato. Só o POST confirma o resgate; leitura ou prévia do QR não consome cartão.
3. O administrador da plataforma acompanha `/admin#premios`, filtra os cartões, exporta os contatos em CSV e abre o WhatsApp manualmente. Não há envio automático.
4. Após disponibilizar o acesso e aplicar o benefício na contratação, clicar em **Registrar ativação** e confirmar. Essa ação registra início/fim e o administrador responsável; não cria conta, libera módulos nem altera cobrança. O prazo é de 12 meses corridos, incluindo o tratamento de 29 de fevereiro. Uma segunda ativação é recusada.

## Segurança e persistência

- Os tokens têm 192 bits aleatórios. Apenas os hashes e os prêmios ficam na variável privada `ZAINDU_PRIZE_CATALOG` da Vercel (JSON, validado por `src/lib/prizes/catalog.ts`). O repositório público não contém a associação entre cartão e prêmio. Não copiar o manifesto, PDFs ou tokens para `public/` ou Git. Não compartilhar o PDF publicamente: quem tem um QR ainda disponível pode resgatá-lo.
- Persistência na coleção `prize_campaigns` do MongoDB existente, em um documento por campanha. Uma única atualização atômica protege simultaneamente cartão, e-mail normalizado e telefone normalizado. Não são gravados pacientes, clínicas nem assinaturas.
- O navegador guarda apenas um segredo de recuperação aleatório, sem nome, e-mail ou telefone. No servidor, guarda-se seu hash. Repetir o envio com esse segredo devolve o mesmo resultado. Outro navegador vê somente “já resgatado”, sem prêmio ou dados pessoais. Se o armazenamento do navegador for apagado/bloqueado, a equipe consulta pelo cadastro no painel.
- Nenhum resultado revela o prêmio antes do cadastro. O painel também não mostra o prêmio de cartões ainda não resgatados. As APIs administrativas exigem `requireAdmin()`. Gestoras e membros não têm permissão. Não há atalhos ou contas de teste no código de produção.
- Mutações verificam a origem e o tipo do conteúdo e limitam o corpo a 4 KB. Nome, telefone, e-mail, consentimento e segredo de recuperação são validados. Dados são autodeclarados: não há verificação por SMS/e-mail. A restrição por contato não equivale à verificação de identidade civil.
- O histórico de contato e ativação fica junto ao cadastro, com data e administrador. CSV escapa campos e neutraliza prefixos de fórmulas. APIs públicas usam `no-store`, `noindex` e `no-referrer`.

## Impressão e publicação

Os arquivos de produção ficam fora do repositório em `~/Documents/ZAINDU/ecobags-2026-10/`:

- `manifesto-privado.json`: fonte privada dos 18 tokens. Guardar para reimpressão; não regenerar a campanha.
- `impressao/ZAINDU-18-cartoes-ecobags-A4.pdf`: três folhas A4, seis cartões de 85 × 85 mm por folha, com marcas de corte. Imprimir a 100%, sem ajustar à página.
- `impressao/ZAINDU-18-cartoes-individuais-85mm.pdf`: 18 páginas individuais para gráfica; sem sangria. A arte deve ser preservada em tamanho real.

QR de 35 mm, área de silêncio de quatro módulos, correção de erro alta e símbolo ZAINDU central. Os arquivos incluem tokens reais vinculados ao catálogo. **Antes de imprimir/distribuir, publicar estas rotas e conferir os 18 códigos com GET em produção, sem fazer resgates de teste.** O domínio da impressão é `lp.zaindu.app`; mudar de domínio após imprimir quebra os códigos se não houver redirecionamento.

O arquivo privado `catalogo-servidor.json`, ao lado do manifesto, fornece o conteúdo de `ZAINDU_PRIZE_CATALOG` para o ambiente production da Vercel (marcar como Sensitive). Não usar prefixo NEXT_PUBLIC. O gerador `scripts/generate-prize-campaign.mjs` recusa sobrescrever o catálogo ou manifesto. Para reimprimir, usar `scripts/render-prize-cards.py MANIFESTO FONTE_TENOR_TTF DIRETORIO`, com ReportLab. A fonte Tenor Sans está disponível sob SIL OFL no repositório Google Fonts.

## Validação

`scripts/test-prizes.ts` exige MongoDB local descartável em `PRIZE_TEST_MONGODB_URI`; recusa URI remota e usa banco temporário. Rodar via `tsx`. Cobre 18/17/1, concorrência, reenvio, unicidade por contato, privacidade, validação, ativação, datas e histórico.

Os testes de navegador usam MongoDB descartável e Supabase desativado. A API pública é real; a interface do painel é testada com respostas controladas, e o bloqueio sem autenticação é verificado na API real. O acesso com credenciais administrativas reais e a persistência de produção precisam ser conferidos após publicação.
