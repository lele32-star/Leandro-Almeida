// Teste para verificar se pdfMake funciona no ambiente vendorizado
const fs = require('fs');
const path = require('path');

console.log('Testando vendorização do pdfMake...');

// Verificar se os arquivos foram baixados
const pdfmakePath = path.join(__dirname, 'libs', 'pdfmake.min.js');
const vfsFontsPath = path.join(__dirname, 'libs', 'vfs_fonts.js');

if (!fs.existsSync(pdfmakePath)) {
  console.error('❌ Arquivo pdfmake.min.js não encontrado em libs/');
  process.exit(1);
}

if (!fs.existsSync(vfsFontsPath)) {
  console.error('❌ Arquivo vfs_fonts.js não encontrado em libs/');
  process.exit(1);
}

const pdfmakeSize = fs.statSync(pdfmakePath).size;
const vfsFontsSize = fs.statSync(vfsFontsPath).size;

console.log(`✅ pdfmake.min.js encontrado (${(pdfmakeSize / 1024).toFixed(1)} KB)`);
console.log(`✅ vfs_fonts.js encontrado (${(vfsFontsSize / 1024).toFixed(1)} KB)`);

// Verificar se os arquivos HTML foram atualizados
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
if (indexHtml.includes('libs/pdfmake.min.js') && indexHtml.includes('libs/vfs_fonts.js')) {
  console.log('✅ index.html atualizado para usar arquivos locais');
} else {
  console.error('❌ index.html não foi atualizado corretamente');
  process.exit(1);
}

// Verificar outros arquivos HTML de teste
const testFiles = [
  'test-ui.html',
  'test-premium-pdf.html',
  'verificar-premium.html',
  'debug-pdf.html'
];

let allUpdated = true;
testFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('libs/pdfmake.min.js') && content.includes('libs/vfs_fonts.js')) {
      console.log(`✅ ${file} atualizado para usar arquivos locais`);
    } else {
      console.error(`❌ ${file} não foi atualizado corretamente`);
      allUpdated = false;
    }
  }
});

if (!allUpdated) {
  process.exit(1);
}

console.log('\n🎉 Vendorização do pdfMake concluída com sucesso!');
console.log('📝 Benefícios:');
console.log('  - Funciona offline');
console.log('  - Não depende de CDN externo');
console.log('  - Funciona em ambientes CI/CD');
console.log('  - Versão fixa (0.2.7) garante consistência');
