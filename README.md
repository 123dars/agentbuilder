<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/workflow.svg" width="100" height="100" alt="Workflow Icon">
  <h1>✨ AgentBuilder ✨</h1>
  <p><strong>A powerful, multi-tenant AI workflow automation platform.</strong></p>
  
  [![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![Nhost](https://img.shields.io/badge/Nhost-Backend-blue?style=for-the-badge)](https://nhost.io/)
  [![GraphQL](https://img.shields.io/badge/GraphQL-Enabled-e10098?style=for-the-badge&logo=graphql)](https://graphql.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=for-the-badge&logo=postgresql)](https://postgresql.org/)
</div>

<br />

> **🟢 Live Demo:** [https://agentbuilder-d9zi-puce.vercel.app/](https://agentbuilder-d9zi-puce.vercel.app/)

> **AgentBuilder** is a custom-built, highly scalable alternative to tools like n8n and Zapier. It empowers users to orchestrate complex AI operations by chaining together LLM calls, HTTP requests, logic branches, and manual approval gates within isolated multi-tenant workspaces.

---

## 🚀 Features at a Glance

- **🏢 Enterprise Multi-Tenancy**: Built-in support for Organizations, strict Row-Level Security (RLS) data isolation, and user roles (`owner`, `editor`, `viewer`).
- **🎨 Interactive Visual Builder**: Powered by `@xyflow/react` with a stunning custom-designed node UI and glassmorphic aesthetic.
- **⚡ Dynamic Execution Nodes**: Full support for `llm_call`, `http_request`, `conditional_branch`, `db_write`, `notify`, and `approval_gate`.
- **🛑 Human-in-the-loop (Approval Gates)**: Workflows can securely pause mid-execution and wait for human intervention via Next.js API gating.
- **📡 Live Execution Tracking**: Hasura GraphQL subscriptions stream execution state to the frontend timeline in real-time.
- **🛡️ Multi-Layer Security**: Enforcement via database Row-Level Security (Layer 1) and Backend Execution Gating (Layer 2) to ensure non-owners cannot bypass approval gates or trigger malicious nodes.

---

## 🛠️ Tech Stack
- **Frontend**: React, Next.js (App Router), Tailwind CSS, Framer Motion, React Flow
- **Backend**: Nhost (Hasura GraphQL Engine, PostgreSQL, Nhost Auth)
- **API Engine**: Next.js Serverless API routes acting as Hasura Actions

---

## 💻 Local Setup Instructions

### Prerequisites
- Node.js 18+
- [Nhost CLI](https://docs.nhost.io/platform/cli) (`npm install -g nhost`)
- Docker (required by Nhost CLI for local development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Backend (Nhost)
*This command spins up PostgreSQL, Hasura GraphQL Engine, and the Nhost Auth service inside Docker.*
```bash
nhost up
```

### 3. Environment Variables
Create a `.env.local` file in the root of the project with the following configuration:
```env
NEXT_PUBLIC_NHOST_SUBDOMAIN=local
NEXT_PUBLIC_NHOST_REGION=
OPENAI_API_KEY=your_openai_api_key_here
```
> **Note:** If you do not provide an `OPENAI_API_KEY`, the backend executor will intelligently fall back to a simulated delay and return a stubbed LLM response, allowing testing without API credits!

### 4. Start the Frontend
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing the Final Task Scenario

Reviewers grading this assignment can test the strict multi-tenant architecture and execution engine by following these steps:

1. **Create an Org:** Sign up as a new user. The app will prompt you to create an Organization (e.g., `Org A`). You are automatically assigned the `owner` role.
2. **Build a Pipeline:** Create a new workflow and add an `http_request`, an `llm_call`, and a `conditional_branch`. Finally, attach an `approval_gate`.
3. **Trigger:** Click "Trigger Workflow" and watch the live timeline execute node-by-node.
4. **Human-in-the-Loop:** Watch the workflow pause perfectly at the Approval Gate. Since you are the Owner, click **Approve** to resume it.
5. **Security Verification:** Open an Incognito window and sign up as a second user (creating `Org B`). Try to access `Org A`'s workflow using the direct URL. You will see it fails to load entirely, proving airtight cross-tenant isolation via Hasura RLS.

---
*Built with ❤️ for the AI Agent Workflow Builder Assignment.*
