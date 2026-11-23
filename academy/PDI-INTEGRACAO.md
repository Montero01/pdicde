# Integração com o PDI oficial

Destino único: https://montero01.github.io/testepdicdev2/

`pdi-integracao.js` define o destino e a referência da sessão. O botão Voltar ao PDI, Ir para o PDI, ausência de sessão, perfil indisponível e saída passam pela mesma configuração. O href estático do botão mantém esse endereço também como fallback.

O Academy e o testev2 usam `cde-pdi-conectado-session` no localStorage, sob a mesma origem `https://montero01.github.io`. O Academy deixou de consultar a chave legada `cde-auth-session`, que podia apresentar uma sessão diferente daquela usada no testev2. Sessões antigas não são copiadas automaticamente: se não houver sessão do PDI atual, a pessoa deve entrar pelo endereço oficial. Nenhuma credencial aparece na configuração ou nos testes.

O cliente temporário de criação de usuários mantém sua configuração isolada em sessionStorage, sem persistência, para não substituir a sessão de quem administra. Os dados, perfis e políticas do Supabase não foram alterados.

Ao migrar de domínio, mantenha as duas aplicações sob a mesma origem e revise este arquivo, os links estáticos e os destinos de autenticação. Teste automatizado: `node academy/tests/pdi-integracao.mjs`.
