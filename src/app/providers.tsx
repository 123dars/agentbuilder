"use client";

import { NhostClient, NhostProvider, useAccessToken } from "@nhost/nextjs";
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { useMemo } from "react";

const nhost = new NhostClient({
  subdomain: process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN || "local",
  region: process.env.NEXT_PUBLIC_NHOST_REGION || "local",
});

function ApolloWrapper({ children }: { children: React.ReactNode }) {
  const token = useAccessToken();

  const apolloClient = useMemo(() => {
    const httpLink = createHttpLink({
      uri: nhost.graphql.httpUrl,
    });

    const authLink = setContext((_, { headers }) => {
      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : "",
        }
      }
    });

    return new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache()
    });
  }, [token]);

  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NhostProvider nhost={nhost}>
      <ApolloWrapper>{children}</ApolloWrapper>
    </NhostProvider>
  );
}
