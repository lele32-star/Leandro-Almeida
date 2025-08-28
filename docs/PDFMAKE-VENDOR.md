# Vendorização do pdfMake

Este projeto agora inclui o pdfMake vendorizado localmente para garantir funcionamento offline e em ambientes CI/CD.

## Arquivos Incluídos

- `libs/pdfmake.min.js` - Biblioteca principal do pdfMake (v0.2.7)
- `libs/vfs_fonts.js` - Sistema de arquivos virtual com fontes

## Arquivos Atualizados

Os seguintes arquivos HTML foram atualizados para usar os arquivos locais:

- `index.html` (arquivo principal)
- `test-ui.html`
- `test-premium-pdf.html`
- `verificar-premium.html`
- `debug-pdf.html`

## Benefícios

1. **Funcionamento Offline**: Não depende mais de CDN externo
2. **Ambientes CI/CD**: Funciona em ambientes sem acesso à internet
3. **Versão Fixa**: Garante consistência com a versão 0.2.7
4. **Performance**: Elimina latência de rede para carregar bibliotecas

## Como Testar

1. Inicie um servidor HTTP local:
   ```bash
   python3 -m http.server 8000
   ```

2. Acesse `http://localhost:8000/index.html`

3. Teste a geração de PDF preenchendo o formulário e clicando em "Gerar PDF"

## Atualização

Para atualizar o pdfMake para uma versão mais recente:

```bash
cd libs
curl -L -o pdfmake.min.js https://cdnjs.cloudflare.com/ajax/libs/pdfmake/[VERSAO]/pdfmake.min.js
curl -L -o vfs_fonts.js https://cdnjs.cloudflare.com/ajax/libs/pdfmake/[VERSAO]/vfs_fonts.js
```

Substitua `[VERSAO]` pela versão desejada.

## Verificação

Execute o teste de vendorização:

```bash
node test-pdfmake.js
```

Este teste verifica se:
- Os arquivos foram baixados corretamente
- Os arquivos HTML foram atualizados
- Os tamanhos dos arquivos estão dentro do esperado
