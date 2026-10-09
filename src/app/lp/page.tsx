import type { Metadata } from "next";
import { Nunito_Sans, Tenor_Sans } from "next/font/google";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ClipboardList,
  FileText,
  ImageIcon,
  LayoutDashboard,
  Menu,
  MessageCircle,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wallet,
} from "lucide-react";
import styles from "./landing.module.css";

const contact =
  "https://wa.me/5511925506340?text=" +
  encodeURIComponent(
    "Olá! Quero conhecer o ZAINDU e saber como usar na minha clínica.",
  );

const tenor = Tenor_Sans({
  weight: "400",
  subsets: ["latin"],
  variable: "--lp-title",
  display: "swap",
});
const nunito = Nunito_Sans({
  weight: ["300", "400", "600"],
  subsets: ["latin"],
  variable: "--lp-body",
  display: "swap",
});

function Seam({
  from,
  to,
  arc = false,
}: {
  from: "root" | "paper" | "veil";
  to: "root" | "paper" | "veil";
  arc?: boolean;
}) {
  return (
    <div
      className={`${styles.seam} ${styles[`surface_${to}`]}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 96"
        preserveAspectRatio="none"
        className={styles[`fill_${from}`]}
      >
        <path
          d={
            arc
              ? "M0 0H1440V24C1080 24 990 88 720 88C450 88 360 24 0 24Z"
              : "M0 0H1440V35Q1260 65 1080 35T720 35T360 35T0 35Z"
          }
        />
      </svg>
    </div>
  );
}

export const metadata: Metadata = {
  title: "ZAINDU | Agenda, prontuário e gestão da sua clínica",
  description:
    "Organize o atendimento e acompanhe o resultado da sua clínica com o ZAINDU. Agenda integrada ao prontuário, controle de custos e acessos da equipe.",
  alternates: { canonical: "https://lp.zaindu.app" },
  openGraph: {
    title: "ZAINDU | Sua clínica organizada",
    description:
      "Organize a rotina da equipe, acompanhe cada paciente e decida com os números da sua clínica.",
    url: "https://lp.zaindu.app",
    siteName: "ZAINDU",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "https://lp.zaindu.app/zaindu-preview-v1.png",
        width: 512,
        height: 512,
        type: "image/png",
        alt: "Símbolo do ZAINDU",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "ZAINDU | Sua clínica organizada",
    description: "Conheça a plataforma de gestão clínica do ZAINDU.",
    images: ["https://lp.zaindu.app/zaindu-preview-v1.png"],
  },
};

function Contact({
  light = false,
  compact = false,
}: {
  light?: boolean;
  compact?: boolean;
}) {
  return (
    <a
      className={`${styles.contact} ${light ? styles.contactLight : ""} ${compact ? styles.contactCompact : ""}`}
      href={contact}
      target="_blank"
      rel="noopener noreferrer"
    >
      <MessageCircle size={19} aria-hidden="true" />
      Falar com o comercial
      <ArrowUpRight size={18} aria-hidden="true" />
    </a>
  );
}

function Brand() {
  return (
    <a className={styles.brand} href="#inicio" aria-label="ZAINDU, início">
      <img src="/zaindu-mark.svg" width="38" height="38" alt="" />
      ZAINDU
    </a>
  );
}

function Points({ items }: { items: string[] }) {
  return (
    <ul className={styles.points}>
      {items.map((item) => (
        <li key={item}>
          <Check size={18} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const benefits = [
  {
    icon: CalendarDays,
    title: "Uma agenda para toda a equipe",
    text: "Recepção e profissionais consultam os mesmos horários. Cada atendimento tem paciente, duração e responsável definidos.",
  },
  {
    icon: ClipboardList,
    title: "Continuidade no atendimento",
    text: "Histórico, anamnese e evoluções ficam junto do paciente. No retorno, você consulta o que foi registrado nas visitas anteriores.",
  },
  {
    icon: ImageIcon,
    title: "Acompanhamento com imagens",
    text: "As fotos ficam ligadas à consulta. Compare antes e depois para avaliar e explicar a evolução ao paciente.",
  },
  {
    icon: Wallet,
    title: "Decisões com os números da clínica",
    text: "Receitas e despesas mostram o resultado do mês. O custo por serviço ajuda a avaliar seus preços e sua margem.",
  },
  {
    icon: ShieldCheck,
    title: "Responsabilidades definidas",
    text: "Cada integrante tem acesso às áreas da sua função. A gestão acompanha o histórico de alterações.",
  },
  {
    icon: SlidersHorizontal,
    title: "Um sistema adaptado ao atendimento",
    text: "Você define as perguntas do prontuário, os tipos de consulta e os modelos. Os documentos levam a identidade da clínica.",
  },
];

export default function LandingPage() {
  return (
    <div className={`${styles.page} ${tenor.variable} ${nunito.variable}`}>
      <a className={styles.skip} href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Brand />
          <nav className={styles.nav} aria-label="Navegação principal">
            <a href="#funcionalidades">Como funciona</a>
            <a href="#gestao">Gestão</a>
            <a href="#duvidas">Dúvidas</a>
          </nav>
          <div className={styles.headerContact}>
            <Contact compact />
          </div>
          <details className={styles.mobileMenu}>
            <summary aria-label="Abrir menu">
              <Menu size={25} />
            </summary>
            <nav aria-label="Navegação no celular">
              <a href="#funcionalidades">Como funciona</a>
              <a href="#gestao">Gestão</a>
              <a href="#duvidas">Dúvidas</a>
              <a href={contact} target="_blank" rel="noopener noreferrer">
                Falar com o comercial
              </a>
            </nav>
          </details>
        </div>
      </header>
      <main id="conteudo">
        <div className={styles.surface_root}>
          <section id="inicio" className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.intro}>
                <span />
                Gestão para clínicas e consultórios
              </p>
              <h1>
                Organize o atendimento e acompanhe o resultado da sua clínica.
              </h1>
              <p className={styles.lead}>
                Recepção, profissionais e gestão trabalham com a mesma agenda e
                o mesmo histórico. Você acompanha os pacientes, entende os
                custos e define o acesso de cada pessoa.
              </p>
              <Contact />
              <p className={styles.contactNote}>
                Veja com o comercial como aplicar o ZAINDU na sua rotina.
              </p>
              <div className={styles.heroBenefits}>
                <span>
                  <Check size={16} />
                  Acesso pelo navegador
                </span>
                <span>
                  <Check size={16} />
                  Computador e celular
                </span>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.demo}>
                <div className={styles.demoSidebar}>
                  <img src="/zaindu-mark.svg" alt="" width="32" height="32" />
                  <LayoutDashboard />
                  <CalendarDays />
                  <Users />
                  <ClipboardList />
                  <Wallet />
                  <div className={styles.sidebarBottom}>
                    <SlidersHorizontal />
                  </div>
                </div>
                <div className={styles.demoMain}>
                  <div className={styles.demoTop}>
                    <span>Minha clínica</span>
                    <span className={styles.avatar}>C</span>
                  </div>
                  <div className={styles.demoHeading}>
                    <div>
                      <small>Visão geral</small>
                      <h2>Seu dia, organizado.</h2>
                    </div>
                    <CalendarDays size={23} />
                  </div>
                  <div className={styles.demoStats}>
                    <div>
                      <span>Consultas hoje</span>
                      <strong>08</strong>
                    </div>
                    <div>
                      <span>Realizadas</span>
                      <strong>03</strong>
                    </div>
                    <div>
                      <span>Agendadas</span>
                      <strong>05</strong>
                    </div>
                  </div>
                  <div className={styles.demoSchedule}>
                    <div className={styles.demoSectionTitle}>
                      <strong>Próximos atendimentos</strong>
                      <span>Agenda do dia</span>
                    </div>
                    {[
                      {
                        time: "09:00",
                        name: "Paciente 01",
                        type: "Consulta",
                        initial: "01",
                      },
                      {
                        time: "10:00",
                        name: "Paciente 02",
                        type: "Retorno",
                        initial: "02",
                      },
                      {
                        time: "11:00",
                        name: "Paciente 03",
                        type: "Procedimento",
                        initial: "03",
                      },
                    ].map((item) => (
                      <div className={styles.demoRow} key={item.time}>
                        <span className={styles.demoTime}>{item.time}</span>
                        <span className={styles.patientAvatar}>
                          {item.initial}
                        </span>
                        <div>
                          <strong>{item.name}</strong>
                          <span>{item.type}</span>
                        </div>
                        <span className={styles.status}>Agendada</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.demoFooter}>
                    <ShieldCheck size={16} />
                    <span>Agenda, pacientes e prontuário conectados</span>
                  </div>
                </div>
              </div>
              <div className={styles.visualBadge}>
                <ClipboardList size={24} />
                <div>
                  <strong>Histórico em um só lugar</strong>
                  <span>Da anamnese à evolução.</span>
                </div>
                <Check size={19} />
              </div>
              <p className={styles.demoCaption}>
                Ilustração da plataforma com dados fictícios.
              </p>
            </div>
          </section>
        </div>
        <Seam from="root" to="paper" />

        <section id="funcionalidades" className={styles.modules}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>A rotina com o ZAINDU</p>
              <h2>O que muda na rotina da sua clínica.</h2>
            </div>
            <p>
              Quando agenda, prontuário e financeiro ficam separados, a equipe
              precisa procurar e repetir informações. O ZAINDU reúne essas
              etapas para o atendimento e a gestão usarem a mesma base.
            </p>
          </div>
          <div className={styles.moduleGrid}>
            {benefits.map(({ icon: Icon, title, text }) => (
              <article className={styles.module} key={title}>
                <Icon size={25} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <div className={styles.sectionCta}>
            <p>Conheça o fluxo da sua clínica dentro do ZAINDU.</p>
            <Contact />
          </div>
        </section>

        <Seam from="paper" to="veil" arc />
        <div className={styles.surface_veil}>
          <section
            id="agenda"
            className={`${styles.feature} ${styles.agendaSection}`}
          >
            <div className={styles.featureCopy}>
              <p className={styles.kicker}>Agenda e pacientes</p>
              <h2>
                A recepção organiza o dia. O profissional encontra o histórico.
              </h2>
              <p>
                A consulta começa antes de o paciente entrar na sala. Com
                horários, cadastro e histórico conectados, a recepção localiza o
                atendimento e o profissional acessa as informações necessárias
                para atender.
              </p>
              <Points
                items={[
                  "Organize os horários de cada profissional com a duração prevista para cada serviço.",
                  "Veja o que está agendado, o que foi realizado e o que foi cancelado.",
                  "Encontre contatos, convênio e informações de cadastro sem refazer o registro.",
                  "Abra o prontuário a partir do atendimento para consultar o histórico do paciente.",
                ]}
              />
              <div className={styles.impact}>
                <strong>Na prática</strong>
                <p>
                  Ao agendar um retorno, a equipe usa o cadastro que já existe.
                  Na consulta, o profissional acessa o histórico desse paciente.
                </p>
              </div>
              <Contact />
            </div>
            <div className={styles.agendaVisual}>
              <div className={styles.calendarHeading}>
                <CalendarDays size={24} />
                <strong>Da agenda ao atendimento</strong>
              </div>
              <div className={styles.workflow}>
                {[
                  {
                    icon: CalendarDays,
                    title: "Consulta agendada",
                    text: "Paciente, horário e profissional definidos.",
                  },
                  {
                    icon: Users,
                    title: "Cadastro do paciente",
                    text: "Contatos e informações para o atendimento.",
                  },
                  {
                    icon: ClipboardList,
                    title: "Registro da consulta",
                    text: "Histórico e evolução acessíveis no prontuário.",
                  },
                ].map(({ icon: Icon, title, text }, i) => (
                  <div className={styles.workflowStep} key={title}>
                    <span className={styles.stepNumber}>{i + 1}</span>
                    <div>
                      <Icon size={21} />
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
        <Seam from="veil" to="paper" />

        <section
          id="prontuario"
          className={`${styles.feature} ${styles.recordSection}`}
        >
          <div className={styles.recordVisual}>
            <div className={styles.recordHead}>
              <span className={styles.recordAvatar}>
                <Users size={27} />
              </span>
              <div>
                <strong>Prontuário do paciente</strong>
                <span>Informações organizadas por seção</span>
              </div>
            </div>
            <div className={styles.recordTabs}>
              <span>Resumo</span>
              <span className={styles.activeTab}>Anamnese</span>
              <span>Consultas</span>
              <span>Fotos</span>
              <span>Documentos</span>
            </div>
            <div className={styles.recordFields}>
              <span>Histórico de saúde</span>
              <div>
                <span>Alergias</span>
                <span>Medicamentos</span>
                <span>Antecedentes</span>
              </div>
              <span>Evolução do atendimento</span>
              <div className={styles.recordLines}>
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className={styles.photoCompare}>
              <div>
                <ImageIcon size={28} />
                <span>Antes</span>
              </div>
              <div>
                <ImageIcon size={28} />
                <span>Depois</span>
              </div>
            </div>
            <p>Exemplo de organização do prontuário.</p>
          </div>
          <div className={styles.featureCopy}>
            <p className={styles.kicker}>Prontuário, fotos e documentos</p>
            <h2>
              A próxima consulta começa com o que você já sabe do paciente.
            </h2>
            <p>
              No retorno, você precisa saber o que mudou. A anamnese, as
              evoluções e as fotos ficam no mesmo histórico para comparar os
              atendimentos e dar continuidade ao acompanhamento.
            </p>
            <Points
              items={[
                "Consulte informações de saúde e registros anteriores antes de iniciar a consulta.",
                "Registre a anamnese e a evolução com perguntas que fazem sentido para sua especialidade.",
                "Compare fotos de diferentes consultas para acompanhar e explicar a evolução.",
                "Mantenha receitas, atestados, declarações e pedidos de exames no histórico do paciente.",
                "Prepare os documentos para impressão com o timbre e os dados da clínica.",
              ]}
            />
            <div className={styles.impact}>
              <strong>Na prática</strong>
              <p>
                No retorno, compare os registros e as fotos das consultas
                anteriores antes de registrar a nova evolução.
              </p>
            </div>
            <Contact />
          </div>
        </section>

        <Seam from="paper" to="veil" arc />
        <div className={styles.surface_veil}>
          <section
            id="personalizacao"
            className={`${styles.feature} ${styles.identitySection}`}
          >
            <div className={styles.featureCopy}>
              <p className={styles.kicker}>Personalização da clínica</p>
              <h2>Sua identidade no sistema e nos receituários.</h2>
              <p>
                O nome, o logo e as cores da sua clínica acompanham o trabalho
                da equipe. Nos documentos entregues ao paciente, o papel
                timbrado mantém a mesma identidade, com os dados da clínica e do
                profissional responsável.
              </p>
              <Points
                items={[
                  "Use o logo e as cores da clínica no sistema e nos documentos.",
                  "Escolha o modelo de papel timbrado e defina se deseja usar a marca d’água.",
                  "Prepare receituários, atestados e pedidos de exames com os dados da clínica e a identificação do profissional.",
                  "Adapte as perguntas do prontuário e os tipos de atendimento à sua especialidade.",
                ]}
              />
              <div className={styles.impact}>
                <strong>Na prática</strong>
                <p>
                  A equipe prepara o receituário com o timbre já configurado,
                  sem montar o cabeçalho a cada consulta. O documento fica no
                  histórico do paciente e pode ser impresso com a identidade da
                  clínica.
                </p>
              </div>
              <Contact />
            </div>
            <div className={styles.letterPreview}>
              <div
                className={styles.letterPaper}
                role="img"
                aria-label="Exemplo de receituário timbrado com logo, identificação do profissional e contatos da clínica"
              >
                <div className={styles.letterBrand}>
                  <span className={styles.clinicMonogram}>C</span>
                  <div>
                    <strong>Sua clínica</strong>
                    <span>Sua especialidade</span>
                  </div>
                </div>
                <div className={styles.letterPatient}>
                  <span>Paciente</span>
                  <i />
                </div>
                <h3>Receituário</h3>
                <p className={styles.letterGuide}>
                  Orientações registradas no atendimento
                </p>
                <div className={styles.letterLines} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <span className={styles.letterWatermark} aria-hidden="true">
                  C
                </span>
                <div className={styles.letterProfessional}>
                  <span>Profissional responsável</span>
                  <small>Nome e registro profissional</small>
                </div>
                <div className={styles.letterFooter}>
                  <strong>Sua clínica</strong>
                  <span>Endereço e contatos da clínica</span>
                </div>
              </div>
              <p>
                Exemplo ilustrativo. O modelo usa o logo e as cores da sua
                clínica.
              </p>
            </div>
          </section>
        </div>
        <Seam from="veil" to="root" arc />
        <section id="gestao" className={styles.financeSection}>
          <div className={styles.financeInner}>
            <div className={styles.featureCopy}>
              <p className={styles.kicker}>Financeiro e custos</p>
              <h2>Entenda o resultado do mês e o custo de cada atendimento.</h2>
              <p>
                Uma agenda cheia não explica, sozinha, o resultado da clínica. O
                ZAINDU reúne os valores dos atendimentos realizados e as
                despesas do mês para você avaliar o que sobra e quais custos
                pesam na operação.
              </p>
              <Points
                items={[
                  "Avalie receita, resultado, margem e ticket médio em conjunto.",
                  "Compare os meses e identifique a receita por serviço e por profissional.",
                  "Inclua custos fixos, parcelas, investimentos e extras na análise do mês.",
                  "Considere os insumos e o custo profissional na composição de cada serviço.",
                  "Avalie o preço de venda a partir do custo e da margem desejada.",
                ]}
              />
              <div className={styles.impact}>
                <strong>Na prática</strong>
                <p>
                  Antes de alterar o preço de um procedimento, confira o custo
                  dos insumos e simule a margem desejada.
                </p>
              </div>
              <Contact light />
            </div>
            <div className={styles.financeVisual}>
              <div className={styles.financeVisualHeading}>
                <Wallet size={25} />
                <span>Gestão financeira</span>
              </div>
              <h3>Receitas e despesas do mês.</h3>
              <div className={styles.financeEquation}>
                <span>Receita dos atendimentos</span>
                <span>Menos os custos do mês</span>
                <strong>Resultado da clínica</strong>
              </div>
              <div className={styles.financeDetails}>
                <span>
                  <Check size={17} />
                  Custos recorrentes
                </span>
                <span>
                  <Check size={17} />
                  Insumos por serviço
                </span>
                <span>
                  <Check size={17} />
                  Margem de venda
                </span>
              </div>
            </div>
          </div>
        </section>

        <Seam from="root" to="veil" arc />
        <div className={styles.surface_veil}>
          <section id="equipe" className={styles.teamSection}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.kicker}>Equipe e personalização</p>
                <h2>Cada pessoa trabalha com as informações da sua função.</h2>
              </div>
              <p>
                A recepção precisa organizar os atendimentos. O profissional
                precisa acompanhar o paciente. A gestão precisa enxergar a
                operação. Os perfis de acesso permitem separar essas
                responsabilidades dentro do mesmo sistema.
              </p>
            </div>
            <div className={styles.teamGrid}>
              <article>
                <ShieldCheck size={28} />
                <h3>Acesso conforme a função</h3>
                <p>
                  Defina as áreas que cada integrante pode consultar e
                  atualizar. A equipe trabalha com o acesso necessário para sua
                  rotina.
                </p>
              </article>
              <article>
                <Users size={28} />
                <h3>Visão por profissional</h3>
                <p>
                  Consulte a agenda e a receita de cada profissional. Se você
                  administra mais de uma clínica, mantenha cada operação em seu
                  próprio ambiente.
                </p>
              </article>
              <article>
                <SlidersHorizontal size={28} />
                <h3>O padrão da sua clínica</h3>
                <p>
                  Defina os modelos de atendimento e prontuário para a equipe
                  usar. Nome, logo, cor e timbre acompanham a identidade da
                  clínica.
                </p>
              </article>
              <article>
                <LayoutDashboard size={28} />
                <h3>Acompanhamento da operação</h3>
                <p>
                  Confira o histórico de alterações e os indicadores da tela
                  inicial para acompanhar o trabalho da equipe e o andamento da
                  clínica.
                </p>
              </article>
            </div>
            <div className={styles.sectionCta}>
              <p>Veja como organizar os acessos e os modelos da sua equipe.</p>
              <Contact />
            </div>
          </section>
        </div>
        <Seam from="veil" to="paper" />
        <section id="duvidas" className={styles.faqSection}>
          <div className={styles.faqIntro}>
            <p className={styles.kicker}>Dúvidas</p>
            <h2>Dúvidas sobre o sistema.</h2>
            <p>
              Converse sobre sua rotina, veja como o sistema funciona e consulte
              as condições de contratação.
            </p>
            <Contact />
          </div>
          <div className={styles.faqList}>
            {[
              [
                "O ZAINDU funciona no celular?",
                "Sim. O sistema é acessado pelo navegador e tem interface adaptada para computador e celular.",
              ],
              [
                "Posso adaptar o prontuário à minha clínica?",
                "Sim. Você pode configurar perguntas de anamnese, etapas de evolução e tipos de atendimento, além do nome, logo, cor e timbre da clínica.",
              ],
              [
                "Como funciona o acesso da equipe?",
                "Cada integrante tem um acesso. Os responsáveis pela gestão definem os perfis e as permissões para as áreas do sistema.",
              ],
              [
                "Qual é o valor e como contratar?",
                "Fale com o comercial pelo WhatsApp (11) 92550-6340 para conhecer a plataforma, consultar os valores e definir a configuração para sua clínica.",
              ],
            ].map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <Seam from="paper" to="root" arc />
        <section id="contato" className={styles.finalSection}>
          <img src="/zaindu-mark.svg" width="56" height="56" alt="" />
          <h2>
            Conheça o ZAINDU
            <br />
            para a sua clínica.
          </h2>
          <p>
            Conte como sua clínica funciona hoje. O comercial apresenta o ZAINDU
            a partir da sua rotina e explica as condições de contratação.
          </p>
          <Contact />
          <a
            className={styles.phone}
            href={contact}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp: (11) 92550-6340
          </a>
        </section>
      </main>
      <footer className={styles.footer}>
        <Brand />
        <span>Gestão para clínicas e consultórios.</span>
        <a
          href="https://www.zaindu.app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Acessar o sistema
          <ArrowUpRight size={16} />
        </a>
      </footer>
      <a
        className={styles.floatingContact}
        href={contact}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com o comercial pelo WhatsApp"
      >
        <MessageCircle size={24} />
        <span>Falar com o comercial</span>
      </a>
    </div>
  );
}
