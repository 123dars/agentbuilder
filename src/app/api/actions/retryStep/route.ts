import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '../_utils/graphql';
import { executeWorkflow } from '../_utils/engine';
import { gql } from 'graphql-request';

const RETRY_RUN = gql`
  mutation RetryRun($run_id: uuid!) {
    update_step_runs(where: {run_id: {_eq: $run_id}, status: {_eq: "failed"}}, _set: {status: "pending", error: null}) {
      affected_rows
    }
    update_workflow_runs_by_pk(pk_columns: {id: $run_id}, _set: {status: "running", completed_at: null}) {
      id
    }
  }
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { run_id } = body.input;
    const userId = body.session_variables['x-hasura-user-id'];
    
    if (!userId) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const adminClient = getAdminClient();

    // Reset failed steps in this run to pending
    await adminClient.request(RETRY_RUN, { run_id });

    // Re-invoke the engine. It will skip completed steps and run the pending one.
    await executeWorkflow(run_id).catch(console.error);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
