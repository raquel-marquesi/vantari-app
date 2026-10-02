# Correção manual de cadastros da retomada da Nina (02/10/2026)

Aplicado direto no banco (DO block), depois de testar com rollback. Contatos
que responderam à retomada antes da correção `reconcile_lid_person` (16:06):

- **Jamile** (44998007519): cadastro com LID 9bc88c4b juntado no dbc3f29d. 18 msgs, 1 negócio.
- **Marido da Cleidinea** (22992856891): LID f02c9eb7 juntado no d0586625. 47 msgs.
  - Negócio b1d5540a removido: processo 0000976-13.2023.8.16.0185 é da Justiça
    estadual (a Nina rejeitou como não trabalhista). A trava de rejeição não
    reconheceu a frase dela.
  - Negócio faea5541 (0101508-36.2025.5.01.0009) passou para a titular,
    Cleidinea da Silva (CPF 150.255.857-24, cadastro novo), com o processo
    junto. A nota no negócio registra que quem conversou foi o marido.
- **Marcos Paulo** (47984933570): o advogado do reclamante (53992054848, outro
  aparelho) tinha sido juntado no cadastro dele às 16:13, porque a mensagem
  chegou com o CPF do Marcos. Separado num cadastro próprio, com as 11
  mensagens a partir das 16:01:46 e os eventos `whatsapp_in` da mesma janela.
  O telefone principal do Marcos foi restaurado. O negócio duplicado
  690e64fd foi removido. Os outros 2 negócios do mesmo processo foram
  mantidos (decisão da Catarina).
- **Cristiano**: já estava certo (juntado pelo CPF).
