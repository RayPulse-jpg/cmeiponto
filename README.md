# CMEI - Gerador de Folha de Ponto

[![License: Institutional](https://img.shields.io/badge/License-Institutional-blue.svg)](LICENSE)
[![Firebase](https://img.shields.io/badge/Powered%20By-Firebase-orange.svg)](https://firebase.google.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-green.svg)](manifest.json)

Sistema oficial de geração e gerenciamento de folhas de ponto desenvolvido para o **CMEI Maria Jandira de Sousa Fonseca**. Esta ferramenta digitaliza o processo de controle de frequência, garantindo precisão, agilidade e segurança no armazenamento de dados dos servidores.

---

## 🚀 Funcionalidades Principais

- **📋 Gestão de Servidores**: Cadastro completo por setor (Administrativo, Professoras, Monitoras e Apoio).
- **⏰ Automação de Turnos**: Preenchimento automático de horários (Matutino, Vespertino, Integral) ou inserção Manual.
- **🛠️ Atalhos de Marcação**:
  - `Clique Esquerdo`: Marcação rápida de **Recesso**.
  - `Clique Direito`: Marcação rápida de **Atestado**.
  - `Edição Especial`: Clique em um Sábado para abrir a linha para edição.
- **🖨️ Impressão e Lote**:
  - Layout otimizado para os padrões oficiais da unidade.
  - Opção de impressão individual ou de todos os servidores simultaneamente.
- **☁️ Sincronização em Nuvem**: Dados sincronizados via Firebase para acesso de diferentes dispositivos.
- **📱 Versão Mobile (PWA)**: Pode ser instalado no celular ou tablet para uso mais prático no dia a dia da unidade.
- **📂 Exportação e Segurança**:
  - Exportação para planilha **Excel**.
  - Sistema robusto de backup e restauração via JSON.

---

## 🏗️ Estrutura do Projeto

O projeto utiliza tecnologias web leves e modernas para garantir velocidade e facilidade de manutenção:

- `index.html`: Dashboard administrativo e visualização de folhas.
- `login.html`: Portal de acesso restrito para administradores.
- `style.css`: Estilização completa com suporte a modo escuro.
- `script.js`: "Cérebro" do sistema, cuidando da lógica e integração com nuvem.
- `sw.js` & `manifest.json`: Arquivos que permitem o funcionamento como aplicativo (PWA).

### Especificações Técnicas
- **Plataforma**: Web Progressiva (PWA).
- **Tecnologias**: HTML5, CSS3 Puro, JavaScript Vanilla.
- **Persistência**: Firebase Realtime Database.
- **Autenticação**: Firebase Authentication.

---

## 🔧 Configuração e Uso

### Para Administradores (Setup do Firebase)
Para utilizar este gerador em uma nova unidade, é necessário configurar uma instância do Firebase:
1. Configure um projeto no [Firebase Console](https://console.firebase.google.com/).
2. Ative as chaves de API no arquivo `script.js`.
3. Garanta que as regras do banco de dados permitam leitura/escrita autenticada.

### Para Usuários
1. Acesse o sistema via navegador.
2. Para instalar, procure a opção "Adicionar à tela de início" ou o ícone de instalação na barra de endereços.
3. Selecione o servidor, o período (mês/ano) e o turno desejado.
4. Realize as marcações clicando sobre os dias necessários.
5. Imprima a folha finalizada.

---

## 📄 Licença e Créditos

Este sistema é uma ferramenta de uso institucional exclusiva para o **CMEI Maria Jandira de Sousa Fonseca**.
Fátima - Bahia | CNPJ: 24.755.198/0001-81

---
**CMEI - Gerador de Folha de Ponto &copy; 2026** - *Inovação na Gestão Escolar.*
