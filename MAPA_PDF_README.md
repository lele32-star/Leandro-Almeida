# Funcionalidade de Mapa no PDF

## Como funciona

O sistema agora suporta incluir uma imagem do mapa no PDF gerado automaticamente. A captura funciona das seguintes maneiras:

### 1. Captura Automática (Recomendado)
- Quando o usuário clica em "Gerar PDF" e a opção "Incluir Mapa" está marcada
- O sistema automaticamente captura o mapa atual usando html2canvas
- A imagem é incluída no PDF sem necessidade de intervenção manual

### 2. Captura Manual
- Use a função `captureMapDataUrl()` para capturar o mapa
- O resultado é armazenado em `window.__mapDataUrl`
- Na próxima geração de PDF, a imagem será incluída

### 3. DataURL Direto
- Passe `mapDataUrl` diretamente no estado quando chamar `gerarPDF()`
- Exemplo: `gerarPDF({ ...state, mapDataUrl: 'data:image/png;base64,...' })`

## Dependências

Para captura automática completa, inclua:
```html
<script src="https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
```

## Teste

Use o arquivo `test-mapa-pdf.html` para testar a funcionalidade:
1. Abra o arquivo no navegador
2. Clique em "Capturar Mapa" para testar a captura
3. Clique em "Gerar PDF com Mapa" para simular a inclusão no PDF

## Fallbacks

Se html2canvas não estiver disponível:
- Tenta usar canvas.toDataURL() diretamente
- Busca por imagens dataURL no container do mapa
- Mostra texto "Mapa:" como fallback se nenhuma imagem for encontrada
