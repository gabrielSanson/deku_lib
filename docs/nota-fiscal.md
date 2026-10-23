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
4. Faça um pedido de teste e pague. Abra o pedido: a caixa "Nota fiscal" deve mostrar
   **Autorizada** e o botão **Abrir DANFE**. Nota de homologação não vale nada, pode testar à
   vontade.
5. Quando o contador aprovar, volte em Configurações, troque para **Produção** e salve. A partir daí
   cada pedido pago gera uma nota de verdade.

## No dia a dia

- A nota é pedida sozinha quando o pedido fica pago. Pedidos do iFood ficam de fora (o iFood
  cuida deles).
- Se o provedor ou a internet cair, o sistema tenta de novo sozinho.
- Se a SEFAZ **rejeitar** a nota, o pedido mostra o motivo. Corrija o que ela pediu (quase sempre
  um código errado) e toque em **Emitir nota de novo**.
- Para **cancelar** uma nota (pedido estornado), abra o pedido e use **Cancelar nota**. A SEFAZ só
  aceita cancelamento até 30 minutos depois da emissão na maioria dos estados; depois disso, fale
  com o contador.

## Aviso

A ligação com o Focus NFe foi escrita seguindo a documentação deles e ainda **não foi testada com
uma conta real**. Por isso o passo 6 começa sempre em homologação: se algo não funcionar ali, nada
foi enviado de verdade para a Receita.
