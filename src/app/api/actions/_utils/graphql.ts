import { GraphQLClient } from 'graphql-request';

// Disable SSL verification for local Nhost self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN || 'local';
const region = process.env.NEXT_PUBLIC_NHOST_REGION || '';

const HASURA_ENDPOINT = subdomain === 'local' 
  ? 'https://local.graphql.local.nhost.run/v1'
  : `https://${subdomain}.graphql.${region}.nhost.run/v1`;

const ADMIN_SECRET = process.env.NHOST_ADMIN_SECRET || 'nhost-admin-secret';

export const getAdminClient = () => {
  return new GraphQLClient(HASURA_ENDPOINT, {
    headers: {
      'x-hasura-admin-secret': ADMIN_SECRET,
    },
  });
};

export const getCallerClient = (req: any) => {
    // Forward the authorization header to act as the user
    const authHeader = req.headers.get ? req.headers.get('authorization') : req.headers.authorization;
    const headers: any = {};
    if (authHeader) {
        headers['Authorization'] = authHeader;
    }
    
    return new GraphQLClient(HASURA_ENDPOINT, {
        headers
    });
}
