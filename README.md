# AgentBuilder: AI Agent Workflow Builder

A powerful, mini n8n clone purpose-built for chaining AI agent steps. Built with Next.js, Nhost (PostgreSQL + Hasura), and GraphQL.

## Features Built
- **Full Org-based multi-tenancy**: Workflows belong to organizations. Users have roles (`owner`, `editor`, `viewer`).
- **Visual Workflow Builder**: Built with `@xyflow/react` with beautiful custom nodes.
- **Dynamic Steps**: Support for `http_request`, `llm_call`, `db_write`, `notify`, `conditional_branch`, and `approval_gate`.
- **Approval Gates**: Workflows pause mid-execution and wait for human intervention.
- **Live Execution Tracking**: Real-time subscriptions power the execution timeline in the UI.
- **Premium UI**: Framer Motion animations, glassmorphism, glowing nodes, and 3D interactions.
- **Strict Permissions**: 
  - Row-Level Security (RLS) in Hasura ensures cross-tenant isolation.
  - Step-level gating in the backend executor prevents non-owners from bypassing approval gates or adding restricted nodes.

## Prerequisites

- Node.js 18+
- Nhost CLI (`npm install -g nhost`)
- Docker (required by Nhost CLI to run Hasura locally)

## Local Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the local Nhost backend:**
   ```bash
   nhost up
   ```
   *This spins up PostgreSQL, Hasura GraphQL Engine, and the Nhost Auth service.*

3. **Set your Environment Variables:**
   Create a `.env.local` file in the root of the project with:
   ```env
   NEXT_PUBLIC_NHOST_SUBDOMAIN=local
   NEXT_PUBLIC_NHOST_REGION=
   OPENAI_API_KEY=your_openai_api_key_here
   ```
   *(Note: If you do not provide an OpenAI key, the backend executor will fall back to an artificial delay and stubbed LLM response).*

4. **Start the Next.js Frontend:**
   ```bash
   npm run dev
   ```

5. **Visit the app:**
   Open `http://localhost:3000` in your browser.

## Testing the Final Task Scenario

1. Sign up a new user (this creates `Org A`).
2. Build a workflow with an `http_request`, an `llm_call`, and a `conditional_branch`. Add an `approval_gate`.
3. Click "Trigger Workflow" and watch the live timeline pause at the approval gate.
4. Click "Approve" (as you are the Owner).
5. Open an Incognito window and sign up a second user (`Org B`).
6. Attempt to access `Org A`'s workflow using the direct URL. You will see it fails due to Hasura RLS restrictions.
