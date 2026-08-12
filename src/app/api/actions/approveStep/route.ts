import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { step_run_id, approved } = body.input;
    const userId = body.session_variables['x-hasura-user-id'];
    
    if (!userId) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const adminClient = getAdminClient(req);

    const { step_runs_by_pk: stepRun } = await adminClient.request<any>(VERIFY_STEP_RUN, { step_run_id });
    
    if (!stepRun || stepRun.status !== 'paused') {
      return NextResponse.json({ message: "Step run not found or not awaiting approval" }, { status: 400 });
    }

    const orgId = stepRun.step.workflow.org_id;
    const runId = stepRun.run_id;

    const CHECK_ROLE = gql`
      query CheckRole($org_id: uuid!, $user_id: uuid!) {
        org_members(where: {org_id: {_eq: $org_id}, user_id: {_eq: $user_id}}) {
          role
        }
      }
    `;
    const { org_members } = await adminClient.request<any>(CHECK_ROLE, { org_id: orgId, user_id: userId });
    
    if (org_members.length === 0 || org_members[0].role === 'viewer') {
       return NextResponse.json({ message: "Only owners and editors can approve steps" }, { status: 403 });
    }

    if (approved) {
        await adminClient.request(UPDATE_STEP_RUN_APPROVED, { 
            step_run_id, 
            user_id: userId, 
            time: new Date().toISOString() 
        });
        const adminSecret = req.headers.get ? req.headers.get('x-hasura-admin-secret') : (req.headers as any)['x-hasura-admin-secret'];
        await executeWorkflow(runId, adminSecret || undefined).catch(console.error);
    } else {
        await adminClient.request(REJECT_STEP_RUN, { step_run_id });
        const UPDATE_RUN_STATUS = gql`
          mutation UpdateRunStatus($run_id: uuid!) {
            update_workflow_runs_by_pk(pk_columns: {id: $run_id}, _set: {status: "failed", completed_at: "${new Date().toISOString()}"}) {
              id
            }
          }
        `;
        await adminClient.request(UPDATE_RUN_STATUS, { run_id: runId });
    }

    return NextResponse.json({
      success: true
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
