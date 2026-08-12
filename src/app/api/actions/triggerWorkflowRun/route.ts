import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workflow_id } = body.input;
    
    const callerClient = getCallerClient(req);
    const adminClient = getAdminClient(req);

    const { workflows_by_pk: workflow } = await callerClient.request<any>(VERIFY_WORKFLOW, { workflow_id });
    
    if (!workflow) {
      return NextResponse.json({ message: "Workflow not found or access denied" }, { status: 403 });
    }

    if (workflow.organization.quota_used >= workflow.organization.quota_limit) {
      return NextResponse.json({ message: "Organization quota exhausted" }, { status: 400 });
    }

    const userId = body.session_variables['x-hasura-user-id'];
    const CHECK_ROLE = gql`
      query CheckRole($org_id: uuid!, $user_id: uuid!) {
        org_members(where: {org_id: {_eq: $org_id}, user_id: {_eq: $user_id}}) {
          role
        }
      }
    `;
    const { org_members } = await adminClient.request<any>(CHECK_ROLE, { org_id: workflow.org_id, user_id: userId });
    
    if (org_members.length === 0 || org_members[0].role === 'viewer') {
       return NextResponse.json({ message: "Only owners and editors can trigger workflows" }, { status: 403 });
    }

    const { insert_workflow_runs_one: run } = await adminClient.request<any>(CREATE_RUN, { workflow_id });

    const adminSecret = req.headers.get ? req.headers.get('x-hasura-admin-secret') : (req.headers as any)['x-hasura-admin-secret'];
    await executeWorkflow(run.id, adminSecret || undefined).catch(console.error);

    return NextResponse.json({
      run_id: run.id,
      status: "pending"
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ 
      message: err?.message || "Internal Server Error", 
      extensions: { code: "action_execution_failed" }
    }, { status: 400 });
  }
}
