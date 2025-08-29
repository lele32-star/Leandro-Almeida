module.exports = {
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    // Avisos ao invés de erros para não quebrar o build
    'no-unused-vars': 'warn',
    'no-console': 'off', // Permitir console.log para debug
    'no-undef': 'warn',
    'no-redeclare': 'warn',
    'no-empty': 'warn', // Empty catch blocks são comuns neste projeto
    'no-inner-declarations': 'warn',
    'no-useless-escape': 'warn',
    'no-prototype-builtins': 'warn',
    
    // Boas práticas
    'eqeqeq': 'warn',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'prefer-const': 'warn',
    'no-var': 'warn',
  },
  globals: {
    // Globals específicos do projeto
    pdfMake: 'readonly',
    html2canvas: 'readonly',
    L: 'readonly', // Leaflet
    
    // DOM globals que podem não estar presentes nos testes
    document: 'readonly',
    window: 'readonly',
    localStorage: 'readonly',
    alert: 'readonly',
    fetch: 'readonly',
  },
  overrides: [
    {
      files: ['test.js', 'test*.js'],
      rules: {
        'no-undef': 'off', // Testes podem usar globais específicos
      },
    },
  ],
};