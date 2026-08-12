import { GraphQLClient } from 'graphql-request';

const HURA_ENDPOINT = process.env.NHOST_BACKEND_URL
  ? `${process.env.NHOST_BACKEND_URL}/v1/graphql`
  : 'http://localhost:8080/v1/graphql';

export const getAdminClient = () => {
  return new GraphQLClient(HURA_ENDPOINT, {
    headers: {
      'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET || 'nhost-admin-secret',
    },
  });
};

export const getCallerClient = (req: any) => {
    // Forward the authorization header to act as the user
    return new GraphQLClient(HURA_ENDPOINT, {
        headers: {
            'Authorization': req.headers.authorization || '',
        }
    });
}
