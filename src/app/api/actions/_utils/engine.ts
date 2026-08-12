import { getAdminClient } from './graphql';
import { gql } from 'graphql-request';

const GET_WORKFLOW = gql`
  query GetWorkflow($run_id: uuid!) {
    workflow_runs_by_pk(id: $run_id) {
      id
      status
      workflow {
        id
        org_id
        organization {
          quota_used
          quota_limit
        }
        steps(order_by: { step_order: asc }) {
          id
          type
          config
          step_order
        }
      }
      step_runs(order_by: { step_id: asc }) {
        id
        step_id
        status
        output
      }
    }
  }
`;

const UPDATE_RUN_STATUS = gql`
  mutation UpdateRunStatus($run_id: uuid!, $status: String!, $completed_at: timestamptz) {
    update_workflow_runs_by_pk(pk_columns: {id: $run_id}, _set: {status: $status, completed_at: $completed_at}) {
      id
    }
  }
`;

const UPDATE_STEP_RUN = gql`
  mutation UpdateStepRun($step_run_id: uuid!, $status: String!, $output: jsonb, $error: String, $completed_at: timestamptz) {
    update_step_runs_by_pk(pk_columns: {id: $step_run_id}, _set: {status: $status, output: $output, error: $error, completed_at: $completed_at}) {
      id
    }
  }
`;

const CREATE_STEP_RUN = gql`
  mutation CreateStepRun($run_id: uuid!, $step_id: uuid!, $input: jsonb!, $status: String!) {
    insert_step_runs_one(object: {run_id: $run_id, step_id: $step_id, input: $input, status: $status}) {
      id
    }
  }
`;

const INCREMENT_QUOTA = gql`
  mutation IncrementQuota($org_id: uuid!) {
    update_organizations_by_pk(pk_columns: {id: $org_id}, _inc: {quota_used: 1}) {
      id
    }
  }
`;

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const executeWorkflow = async (run_id: string, adminSecret?: string, startFromStepId?: string) => {
  const client = getAdminClient(adminSecret ? { headers: { get: (k: string) => k === 'x-hasura-admin-secret' ? adminSecret : null } } : undefined);
  
  const { workflow_runs_by_pk: run } = await client.request<any>(GET_WORKFLOW, { run_id });
  if (!run || (run.status !== 'running' && run.status !== 'pending' && run.status !== 'paused')) {
    return;
  }

  const workflow = run.workflow;
  let previousOutput: any = {};
  
  if (run.step_runs && run.step_runs.length > 0) {
      // Find the last completed step to get the output
      const completedSteps = run.step_runs.filter((s: any) => s.status === 'completed' && s.output != null);
      if (completedSteps.length > 0) {
          previousOutput = completedSteps[completedSteps.length - 1].output;
      }
  }

  // Update run to running if it was pending or paused
  if (run.status !== 'running') {
      await client.request(UPDATE_RUN_STATUS, { run_id, status: 'running', completed_at: null });
  }

  let startIndex = 0;
  if (startFromStepId) {
      startIndex = workflow.steps.findIndex((s: any) => s.id === startFromStepId);
  }

  for (let i = startIndex; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    
    let existingStepRun = run.step_runs.find((s: any) => s.step_id === step.id);
    if (existingStepRun?.status === 'completed') {
        continue;
    }
    
    let stepRunId = existingStepRun?.id;
    if (!stepRunId) {
        const { insert_step_runs_one: newStepRun } = await client.request<any>(CREATE_STEP_RUN, {
            run_id,
            step_id: step.id,
            input: previousOutput,
            status: 'running'
        });
        stepRunId = newStepRun.id;
    } else {
        await client.request(UPDATE_STEP_RUN, { step_run_id: stepRunId, status: 'running', output: null, error: null, completed_at: null });
    }

    try {
      let output: any = {};
      
      // Variable Parsing Context
      const runContext: Record<string, any> = { input: previousOutput };
      workflow.steps.forEach((s: any, idx: number) => {
         const sr = run.step_runs?.find((r: any) => r.step_id === s.id);
         if (sr && sr.status === 'completed' && sr.output != null) {
             runContext[`step_${idx + 1}`] = sr.output;
         }
      });
      
      // Interpolate config
      const interpolate = (str: string, ctx: any) => {
          return str.replace(/\{\{([\w.[\]]+)\}\}/g, (match, path) => {
              const value = path.split('.').reduce((acc: any, part: string) => acc && acc[part], ctx);
              return value !== undefined ? (typeof value === 'object' ? JSON.stringify(value) : String(value)) : match;
          });
      };
      const config = JSON.parse(interpolate(JSON.stringify(step.config), runContext));

      if (step.type === 'llm_call') {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: config.prompt }]
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            output = { response: data.choices[0].message.content };
        } else {
            await delay(1500); // Artificial delay fallback
            output = { response: `[Mocked LLM Response] Evaluated Prompt: ${config.prompt}` };
        }
      } 
      else if (step.type === 'http_request') {
        const res = await fetch(config.url, {
          method: config.method || 'GET',
          headers: config.headers || {},
          body: config.method === 'POST' ? JSON.stringify(config.body || previousOutput) : undefined,
        });
        output = { status: res.status, data: await res.json().catch(() => null) };
      }
      else if (step.type === 'approval_gate') {
        // Pause execution and wait for approval
        await client.request(UPDATE_STEP_RUN, { step_run_id: stepRunId, status: 'paused' });
        await client.request(UPDATE_RUN_STATUS, { run_id, status: 'paused' });
        return; // Stop engine
      }
      else if (step.type === 'conditional_branch') {
        let branchResult = false;
        try {
            const fn = new Function('input', 'context', `return ${config.condition}`);
            branchResult = fn(previousOutput, runContext);
        } catch(e) {
            branchResult = false;
        }
        output = { matched: branchResult };
      }
      else if (step.type === 'notify') {
          console.log(`NOTIFY: ${config.message}`);
          output = { notified: true };
      }
      else if (step.type === 'db_write') {
          output = { written: true, data: previousOutput };
      }

      await client.request(UPDATE_STEP_RUN, { 
          step_run_id: stepRunId, 
          status: 'completed', 
          output, 
          completed_at: new Date().toISOString() 
      });
      previousOutput = output;

    } catch (e: any) {
      await client.request(UPDATE_STEP_RUN, { 
          step_run_id: stepRunId, 
          status: 'failed', 
          error: e.message 
      });
      await client.request(UPDATE_RUN_STATUS, { 
          run_id, 
          status: 'failed', 
          completed_at: new Date().toISOString() 
      });
      return; // Stop on failure
    }
  }

  // If we reach here, workflow completed successfully
  await client.request(UPDATE_RUN_STATUS, { 
      run_id, 
      status: 'completed', 
      completed_at: new Date().toISOString() 
  });
  
  // Increment Quota
  await client.request(INCREMENT_QUOTA, { org_id: workflow.org_id });
};
