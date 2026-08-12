import { Request, Response } from 'express';
import { getAdminClient } from '../_utils/graphql';
import { executeWorkflow } from '../_utils/engine';
import { gql } from 'graphql-request';

const VERIFY_STEP_RUN = gql`
  query VerifyStepRun($step_run_id: uuid!) {
    step_runs_by_pk(id: $step_run_id) {
      id
      status
      run_id
      step {
        id
        workflow {
          id
          org_id
        }
      }
    }
  }
`;

const UPDATE_STEP_RUN_APPROVED = gql`
  mutation UpdateStepRunApproved($step_run_id: uuid!, $user_id: uuid!, $time: timestamptz!) {
    update_step_runs_by_pk(pk_columns: {id: $step_run_id}, _set: {status: "completed", approved_by: $user_id, approved_at: $time}) {
      id
    }
  }
`;

const REJECT_STEP_RUN = gql`
  mutation RejectStepRun($step_run_id: uuid!) {
    update_step_runs_by_pk(pk_columns: {id: $step_run_id}, _set: {status: "failed", error: "Rejected by user"}) {
      id
    }
  }
`;

export default async function handler(req: Request, res: Response) {
  const { step_run_id, approved } = req.body.input;
  const userId = req.body.session_variables['x-hasura-user-id'];
  
  if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
  }

  const adminClient = getAdminClient();

  try {
    // 1. Get step run info
    const { step_runs_by_pk: stepRun } = await adminClient.request<any>(VERIFY_STEP_RUN, { step_run_id });
    
    if (!stepRun || stepRun.status !== 'paused') {
      return res.status(400).json({ message: "Step run not found or not awaiting approval" });
    }

    const orgId = stepRun.step.workflow.org_id;
    const runId = stepRun.run_id;

    // 2. Verify role (Layer 2: must be owner or editor in the org to approve)
    const CHECK_ROLE = gql`
      query CheckRole($org_id: uuid!, $user_id: uuid!) {
        org_members(where: {org_id: {_eq: $org_id}, user_id: {_eq: $user_id}}) {
          role
        }
      }
    `;
    const { org_members } = await adminClient.request<any>(CHECK_ROLE, { org_id: orgId, user_id: userId });
    
    if (org_members.length === 0 || org_members[0].role === 'viewer') {
       return res.status(403).json({ message: "Only owners and editors can approve steps" });
    }

    // 3. Update status
    if (approved) {
        await adminClient.request(UPDATE_STEP_RUN_APPROVED, { 
            step_run_id, 
            user_id: userId, 
            time: new Date().toISOString() 
        });
        
        // Resume workflow execution, starting from the next step!
        // executeWorkflow will start from the provided step id if we modify it, but 
        // wait, our logic starts from the first uncompleted step automatically if we don't pass startFromStepId.
        // Let's just call executeWorkflow. The loop in engine.ts checks for existing step_runs.
        // It will find the completed approval_gate step and proceed.
        executeWorkflow(runId).catch(console.error);
    } else {
        await adminClient.request(REJECT_STEP_RUN, { step_run_id });
        // Mark run as failed
        const UPDATE_RUN_STATUS = gql`
          mutation UpdateRunStatus($run_id: uuid!) {
            update_workflow_runs_by_pk(pk_columns: {id: $run_id}, _set: {status: "failed", completed_at: "${new Date().toISOString()}"}) {
              id
            }
          }
        `;
        await adminClient.request(UPDATE_RUN_STATUS, { run_id: runId });
    }

    return res.status(200).json({
      success: true
    });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
