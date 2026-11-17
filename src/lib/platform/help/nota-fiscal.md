# Nota fiscal (NFC-e)

A emissão de NFC-e é feita por meio de um emissor parceiro, configurado em **Configurações → Nota fiscal**. Você vai precisar de:

- CNPJ, inscrição estadual e regime tributário da loja;
- o **certificado digital A1** (arquivo .pfx) e a senha;
- o **CSC** (código de segurança do contribuinte), pedido à Secretaria da Fazenda do seu estado;
- o NCM e a tributação de cada produto (peça ao seu contador).

Comece em **homologação** (testes, sem valor fiscal). Quando as notas de teste saírem certas, mude para produção.

## Quando a Sefaz cai

Se a Secretaria da Fazenda estiver fora do ar, a nota sai em **contingência**: o cupom impresso avisa isso e o sistema reenvia sozinho quando a Sefaz voltar.

## Contador

Cadastre o e-mail do contador na mesma tela. Todo dia 1º ele recebe o link com os XML e a planilha do mês anterior. Você também pode baixar quando quiser em Nota fiscal → Exportar.

Dúvidas sobre impostos (como IBS e CBS a partir de 2027) são com o seu contador.
