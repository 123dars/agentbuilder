import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '../actions/_utils/graphql';
import { gql } from 'graphql-request';

const CREATE_ORG_MUTATION = gql`
  mutation CreateOrg($orgName: String!, $userId: uuid!) {
    insert_organizations_one(object: {
      name: $orgName, 
      quota_limit: 100, 
      quota_used: 0,
      members: {
        data: [
          {
            user_id: $userId,
            role: "owner"
          }
        ]
      }
    }) {
      id
      name
    }
  }
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orgName, userId } = body;
    
    if (!orgName || !userId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const adminClient = getAdminClient();
    
    const data = await adminClient.request<any>(CREATE_ORG_MUTATION, { orgName, userId });

    return NextResponse.json({
      organization: data.insert_organizations_one
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ message: "Internal Server Error", error: err?.message }, { status: 500 });
  }
}
