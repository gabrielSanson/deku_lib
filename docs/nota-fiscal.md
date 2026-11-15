# Nota fiscal (NFC-e): o que o dono precisa fazer

O sistema já sabe emitir a NFC-e (o "cupom fiscal" eletrônico) de cada pedido pago. Ele vem
**desligado**. Enquanto estiver desligado, o recibo impresso diz "Não é documento fiscal" e nada é
enviado para a Receita.

Para ligar, a loja precisa de algumas coisas que só o dono (ou o contador) consegue tirar. Este guia
diz quais são, na ordem.

## Resumo em uma frase

**Entregue este guia para o seu contador.** Ele faz os passos 1 a 4 para você em um ou dois dias,
e você faz o passo 5 junto com ele.

## Passo 1. CNPJ e inscrição estadual

- A loja precisa de um **CNPJ** com atividade de restaurante/lanchonete (CNAE 5611-2/01 ou
  5611-2/03).
- Precisa também da **inscrição estadual** (IE) na Secretaria da Fazenda do estado (SEFAZ). MEI em
  geral não emite NFC-e; se a loja for MEI, pergunte ao contador se vale mudar para Microempresa
  (Simples Nacional).
- O contador também pede à SEFAZ o **credenciamento para emitir NFC-e**.

## Passo 2. Certificado digital A1

- É um arquivo (`.pfx`) com senha que prova que a nota é da sua empresa.
- Compre o **e-CNPJ tipo A1** (vale 1 ano) em qualquer certificadora: Serasa, Certisign, Valid,
  Soluti e outras. Custa em torno de R$ 150 a R$ 250 por ano.
- **Não** compre o tipo A3 (cartão ou token): ele não funciona com o sistema.
- Guarde o arquivo e a senha em lugar seguro. Anote a data de vencimento: sem certificado válido a
  nota para de sair.

## Passo 3. CSC (o "token" da NFC-e)

- No site da SEFAZ do seu estado, o contador gera o **CSC** (Código de Segurança do Contribuinte)
  e o **ID do CSC**. É o que gera o QR Code da nota.
- Gere um para **homologação** (teste) e outro para **produção** (valendo).

## Passo 4. Conta no provedor Focus NFe

O sistema não fala direto com a SEFAZ; ele usa um provedor que faz essa parte. O escolhido é o
**Focus NFe** (focusnfe.com.br), que tem plano para uma loja só a partir de cerca de R$ 90 por mês.

1. Crie a conta e cadastre a empresa (CNPJ, IE, regime tributário).
2. Envie o **certificado A1** e a senha dentro do painel do Focus NFe.
3. Cadastre o **CSC** e o **ID do CSC** (de homologação e de produção).
4. Copie o **token da API** que o painel mostra. É ele que vai no sistema.

## Passo 5. Códigos dos produtos (com o contador)

O contador confirma três códigos. O sistema já vem com valores comuns para lanchonete no Simples
Nacional, mas **quem decide é o contador**:

| Campo no sistema | O que é                                 | Valor comum        |
| ---------------- | --------------------------------------- | ------------------ |
| NCM padrão       | Tipo do produto (8 números)             | o contador informa |
| CFOP             | Tipo da operação                        | 5102               |
| CSOSN / CST      | Situação do imposto no Simples Nacional | 102                |

Se algum produto tiver NCM diferente do padrão (por exemplo, bebidas em lata), o contador diz
qual. Ainda não há tela para isso: mande a lista e o código é gravado no produto pelo suporte.

## Passo 6. Ligar no sistema

1. Entre como administrador e abra **Configurações → Nota fiscal**.
2. Preencha CNPJ, token do Focus NFe, NCM, CFOP e CSOSN.
3. Escolha o ambiente **Homologação (teste)** e marque **Emitir NFC-e**. Salve.
4. Toque em **Emitir nota de teste** (uma nota de R$ 1,00 que não aparece nos relatórios), ou faça
   um pedido de teste e pague. A lista **Antes de ligar a nota fiscal** fica toda verde quando
   está tudo pronto. Num pedido pago, abra o pedido: a caixa "Nota fiscal" deve mostrar
   **Autorizada** e o botão **Abrir DANFE**. Nota de homologação não vale nada, pode testar à
   vontade.
5. Quando o contador aprovar, volte em Configurações, troque para **Produção** e salve. A partir daí
   cada pedido pago gera uma nota de verdade.

## Passo 7. Reforma tributária (IBS e CBS)

A partir de **1º de janeiro de 2027** as notas de empresas do Simples Nacional também precisam
mostrar o IBS e a CBS em cada item. Em 2026 isso é opcional para o Simples (obrigatório para quem
está fora dele desde agosto de 2026). O sistema já sabe calcular e enviar, mas fica **desligado**
até o contador confirmar os dados:

1. Em Configurações → Nota fiscal, seção **Reforma tributária (IBS e CBS)**, escolha o **regime
   tributário (CRT)** e preencha o **CST** e o **cClassTrib** padrão que o contador indicar.
   Produtos com códigos diferentes recebem os seus no editor do cardápio, seção **Fiscal**.
2. Confira a tabela **Alíquotas por ano**. Ela vem com as taxas de teste publicadas (2026: CBS
   0,9%, IBS estadual 0,1%, IBS municipal 0%; 2027: IBS 0,05% estadual + 0,05% municipal). **A
   CBS de 2027 ainda não tinha sido fixada em novembro de 2026**: confirme com o contador e toque
   em **Salvar alíquotas confirmadas**. A partir de 1º de dezembro de 2026 a página avisa até que
   isso seja feito.
3. Ligue **Enviar IBS e CBS nas notas**, emita uma **nota de teste** em homologação e peça ao
   contador para validar o XML no validador da SVRS:
   https://dfe-portal.svrs.rs.gov.br/Cff/ValidadorRtcNfe
4. Se faltar a linha do ano na tabela, o sistema **não emite** a nota: ela aparece em **Notas com
   erro** com o motivo, e é só cadastrar as alíquotas e tocar em **Tentar de novo**.

O que cada nota levou de IBS e CBS fica guardado junto com ela, para o contador.

## No dia a dia

- A nota é pedida sozinha quando o pedido fica pago. Pedidos do iFood ficam de fora (o iFood
  cuida deles).
- Se o provedor ou a internet cair, o sistema tenta de novo sozinho.
- A página Configurações → Nota fiscal lista o que falta antes de ligar e as **Notas com erro**
  dos últimos 30 dias. Se três ou mais notas falharem em uma hora, o dono recebe um alerta.
- Se a SEFAZ **rejeitar** a nota, o pedido mostra o motivo. Corrija o que ela pediu (quase sempre
  um código errado) e toque em **Emitir nota de novo**.
- Para **cancelar** uma nota (pedido estornado), abra o pedido e use **Cancelar nota**. A SEFAZ só
  aceita cancelamento até 30 minutos depois da emissão na maioria dos estados; depois disso, fale
  com o contador.

## Aviso

A ligação com o Focus NFe foi escrita seguindo a documentação deles e ainda **não foi testada com
uma conta real**. Por isso o passo 6 começa sempre em homologação: se algo não funcionar ali, nada
foi enviado de verdade para a Receita.
