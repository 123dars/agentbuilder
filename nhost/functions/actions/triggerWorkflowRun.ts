import { Request, Response } from 'express';
import { getCallerClient, getAdminClient } from '../_utils/graphql';
import { executeWorkflow } from '../_utils/engine';
import { gql } from 'graphql-request';

const VERIFY_WORKFLOW = gql`
  query VerifyWorkflow($workflow_id: uuid!) {
    workflows_by_pk(id: $workflow_id) {
      id
      org_id
      organization {
        quota_used
        quota_limit
      }
    }
  }
`;

const CREATE_RUN = gql`
  mutation CreateRun($workflow_id: uuid!) {
    insert_workflow_runs_one(object: {workflow_id: $workflow_id, status: "pending"}) {
      id
    }
  }
`;

export default async function handler(req: Request, res: Response) {
  // Extract Hasura action input
  const { workflow_id } = req.body.input;
  
  // 1. Verify caller has access (Layer 1 + Layer 2)
  // We use the caller's token to query the workflow. 
  // If RLS allows them to see it, they are in the org.
  // Then we check if they are owner or editor via an admin query (or RLS if configured).
  const callerClient = getCallerClient(req);
  const adminClient = getAdminClient();

  try {
    // Check if the user can even see this workflow (Layer 1 isolation)
    const { workflows_by_pk: workflow } = await callerClient.request<any>(VERIFY_WORKFLOW, { workflow_id });
    
    if (!workflow) {
      return res.status(403).json({ message: "Workflow not found or access denied" });
    }

    // Check quota
    if (workflow.organization.quota_used >= workflow.organization.quota_limit) {
      return res.status(400).json({ message: "Organization quota exhausted" });
    }

    // Verify role (Layer 2: must be owner or editor to trigger)
    // Actually, RLS on 'workflows' for 'user' role is usually select for all members.
    // Let's explicitly check the role.
    const userId = req.body.session_variables['x-hasura-user-id'];
    const CHECK_ROLE = gql`
      query CheckRole($org_id: uuid!, $user_id: uuid!) {
        org_members(where: {org_id: {_eq: $org_id}, user_id: {_eq: $user_id}}) {
          role
        }
      }
    `;
    const { org_members } = await adminClient.request<any>(CHECK_ROLE, { org_id: workflow.org_id, user_id: userId });
    
    if (org_members.length === 0 || org_members[0].role === 'viewer') {
       return res.status(403).json({ message: "Only owners and editors can trigger workflows" });
    }

    // 2. Create the run
    const { insert_workflow_runs_one: run } = await adminClient.request<any>(CREATE_RUN, { workflow_id });

    // 3. Execute async
    // In a real Nhost setup, you might trigger an Event Trigger or send to a queue. 
    // Here we just execute it asynchronously (floating promise) to not block the HTTP response.
    executeWorkflow(run.id).catch(console.error);

    return res.status(200).json({
      run_id: run.id,
      status: "pending"
    });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
