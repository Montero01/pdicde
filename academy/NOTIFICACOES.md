# Notificações — lançamento de 23/11/2026

A abertura da janela de notificações registra a primeira leitura dos avisos exibidos. Cada aviso sai da caixa daquele usuário 24 horas depois dessa primeira abertura. Reabrir não reinicia o prazo. Avisos ainda não lidos permanecem disponíveis, independentemente da data de criação.

As notificações são comunicados compartilhados. Não se apaga o comunicado de todos porque uma pessoa o leu: a função de caixa exclui da resposta as leituras vencidas do próprio usuário. Os comprovantes de leitura são preservados para evitar que um aviso removido reapareça como não lido. O comunicado original permanece disponível aos demais destinatários.

O Supabase calcula a validade por `read_at + interval '24 hours'` com relógio do servidor. O frontend atualiza a caixa e o contador, agenda a retirada da lista e revalida ao voltar à aba. Não usa tarefa Cron nem depende de manter o navegador aberto para aplicar a validade em uma nova consulta. Em aba aberta, a retirada do cache também funciona durante falha de rede. O sistema operacional pode suspender temporizadores em segundo plano; a caixa é revalidada ao retornar.

As funções `academy_notification_inbox` e `academy_notifications_mark_opened` usam SECURITY INVOKER, a sessão autenticada e RLS existente. Não aceitam ID de destinatário fornecido pelo cliente. EXECUTE foi removido de PUBLIC/anon. Não houve ampliação de acesso às tabelas. A cópia SQL em `sql/notificacoes-24h.sql` documenta a migração já aplicada; não é necessário executá-la de novo.

Foram verificados no banco, em transação revertida: menos de 24h, limite exato de 24h, mais de 24h, primeira leitura, reabertura e isolamento entre dois usuários. Nenhum aviso fictício foi deixado no banco. Teste de interface: `node academy/tests/notificacoes.mjs`, a partir da raiz do repositório. Ele cobre erros de rede/leitura, contador, retirada da caixa aberta, conteúdo escapado e troca de sessão.
