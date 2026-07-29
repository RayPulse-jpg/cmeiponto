# AutomaPonto (Versão de Portfólio / Demo)

[![License: Institutional](https://img.shields.io/badge/License-Institutional-blue.svg)](LICENSE)
[![LocalStorage](https://img.shields.io/badge/Storage-Local-green.svg)](#)
[![PWA](https://img.shields.io/badge/PWA-Ready-green.svg)](manifest.json)

> **⚠️ AVISO IMPORTANTE:** Este repositório contém a versão de demonstração (portfólio) do AutomaPonto. Para garantir a segurança dos dados e preservar as chaves de acesso, o backend em Firebase foi removido desta versão. Ela utiliza o `localStorage` do navegador para simular o banco de dados. Qualquer alteração feita aqui fica salva apenas no seu próprio navegador e não afeta o sistema real de produção.

Sistema de geração e gerenciamento de folhas de ponto desenvolvido originalmente para o **CMEI Maria Jandira de Sousa Fonseca**. Esta ferramenta digitaliza o processo de controle de frequência, garantindo precisão, agilidade e segurança no armazenamento de dados dos servidores.

---

## 🚀 Funcionalidades Demonstradas

- **📋 Gestão de Servidores**: Cadastro completo por setor (Administrativo, Professoras, Monitoras e Apoio).
- **⏰ Automação de Turnos**: Preenchimento automático de horários (Matutino, Vespertino, Integral, Grade Semanal Dinâmica) ou inserção Manual.
- **🛠️ Atalhos de Marcação**:
  - `Clique Esquerdo`: Marcação rápida de **Recesso**.
  - `Clique Direito`: Marcação rápida de **Atestado**.
  - `Edição Especial`: Clique em um Sábado para abrir a linha para edição.
- **🖨️ Impressão e Lote**:
  - Layout otimizado para os padrões oficiais da unidade (Folha Padrão e Folha Atena).
  - Opção de impressão individual ou de todos os servidores simultaneamente.
- **📱 Versão Mobile (PWA)**: Pode ser instalado no celular ou tablet para uso mais prático.
- **📂 Exportação e Segurança**:
  - Exportação para planilha **Excel**.
  - Sistema robusto de backup e restauração via JSON.

---

## 🏗️ Estrutura do Projeto

O projeto utiliza tecnologias web leves e modernas:

- `index.html`: Dashboard administrativo e visualização de folhas.
- `login.html`: Portal de acesso de demonstração.
- `style.css`: Estilização completa com suporte a modo escuro e design responsivo.
- `script.js`: "Cérebro" do sistema, cuidando da lógica e simulação de banco de dados (`localStorage`).
- `sw.js` & `manifest.json`: Arquivos que permitem o funcionamento como aplicativo (PWA).

### Especificações Técnicas (Demo)
- **Plataforma**: Web Progressiva (PWA).
- **Tecnologias**: HTML5, CSS3 Puro, JavaScript Vanilla.
- **Persistência**: Memória Local (`window.localStorage`).
- **Autenticação**: Simulada (Mock).

---

## 🔧 Como Testar

1. Acesse o [Link da Demonstração no GitHub Pages](https://raypulse-jpg.github.io/cmeiponto/login.html).
2. Clique no botão "Acessar Demonstração".
3. Explore as funcionalidades, adicione ou remova servidores, imprima folhas e faça testes. Ao recarregar a página, seus testes continuarão salvos no seu navegador atual.

---

## 📄 Licença e Créditos

Este sistema foi originalmente projetado para o **CMEI Maria Jandira de Sousa Fonseca**.
Fátima - Bahia | CNPJ: 24.755.198/0001-81

---
**CMEI - Gerador de Folha de Ponto &copy; 2026** - *Inovação na Gestão Escolar.*
