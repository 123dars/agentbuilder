import { GraphQLClient } from 'graphql-request';

// Disable SSL verification for local Nhost self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Nhost CLI exposes GraphQL on 443 via Traefik router locally
const HASURA_ENDPOINT = 'https://local.graphql.local.nhost.run/v1';

export const getAdminClient = () => {
  return new GraphQLClient(HASURA_ENDPOINT, {
    headers: {
      'x-hasura-admin-secret': 'nhost-admin-secret',
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
