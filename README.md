# Sistema de Controle de Técnicos

Aplicação para gestão de agendamentos e controle de tempo de atendimento de técnicos externos, com painel para secretárias e funcionalidades adaptadas para desktop e mobile.

## ✅ Funcionalidades

- Agendamentos por secretárias com definição de cliente, endereço, tipo de serviço e horário.
- Técnicos registram saída, chegada e finalização do atendimento.
- Controle de tempo de deslocamento e tempo de atendimento.
- Cancelamento de agendamentos com registro de motivo.
- Envio de localização via GPS pelo técnico (em desenvolvimento).
- Visualização de dados em tempo real via painel web.

## 🛠 Tecnologias Utilizadas

- **React** com **TypeScript**
- **Vite** como bundler
- **Tailwind CSS** para estilização
- **shadcn/ui** para componentes
- **Supabase** como banco de dados e autenticação

## 📦 Instalação Local

### Pré-requisitos

- [Node.js](https://nodejs.org/) (recomenda-se usar com [nvm](https://github.com/nvm-sh/nvm))
- [Git](https://git-scm.com/)

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/seu-repo.git

# 2. Acesse o diretório
cd nome-do-projeto

# 3. Instale as dependências
npm install

# 4. Crie um arquivo .env com as variáveis:
cp .env.example .env
# edite com suas chaves do Supabase

# 5. Inicie o servidor de desenvolvimento
npm run dev
```

## 🌐 Deploy

Este projeto pode ser hospedado em:

- [Vercel](https://vercel.com/)
- [Netlify](https://netlify.com/)
- Ou em servidor próprio (ex: VPS com Nginx ou Docker)

## 📱 Acesso via celular

- A aplicação é responsiva.
- Tecnologias de geolocalização via navegador são utilizadas para envio da localização dos técnicos.
- Requer **HTTPS** para uso da API de localização.

## ✨ Contribuindo

Pull requests são bem-vindos! Sinta-se à vontade para sugerir melhorias, reportar bugs ou criar funcionalidades.

---

## 🔐 Observações

- A geolocalização requer que o site esteja servindo em HTTPS.
- Apenas agendamentos com status `agendado` podem ser cancelados.
- O Supabase impõe regras de integridade via `CHECK CONSTRAINT`.

---

## 📄 Licença

Este projeto é de uso interno. Direitos reservados.