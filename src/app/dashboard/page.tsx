"use client";

import { useAuthenticationStatus, useUserData, useSignOut } from "@nhost/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { LogOut, Plus, Activity, Settings, Workflow, ChevronRight, Zap } from "lucide-react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";

const GET_DASHBOARD_DATA = gql`
  query GetDashboardData {
    organizations {
      id
      name
      quota_limit
      quota_used
      workflows {
        id
        name
        description
        updated_at
      }
    }
  }
`;

const CREATE_ORG = gql`
  mutation CreateOrg($orgName: String!) {
    insert_organizations_one(object: {
      name: $orgName, 
      quota_limit: 100, 
      quota_used: 0,
      members: {
        data: [
          {
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

const containerVariants: Variants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 1, y: 0, scale: 1 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } }
};

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuthenticationStatus();
  const user = useUserData();
  const router = useRouter();
  const { signOut } = useSignOut();

  const [createOrg] = useMutation(CREATE_ORG);

  const { data, loading, error, refetch } = useQuery(GET_DASHBOARD_DATA, {
    skip: !isAuthenticated,
    fetchPolicy: "network-only"
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen bg-[#050505] text-white"><Activity className="animate-spin text-blue-500 w-8 h-8" /></div>;
  }

  const organizations = data?.organizations || [];

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-100 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-radial from-transparent to-[#050505] pointer-events-none" />
      
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/20 blur-[150px] pointer-events-none" 
      />
      <motion.div 
        animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/20 blur-[150px] pointer-events-none" 
      />

      {/* Topbar */}
      <header className="border-b border-white/5 bg-[#050505]/60 backdrop-blur-3xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <Workflow className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white drop-shadow-md">AgentBuilder</span>
          </div>
          <button 
            onClick={() => signOut()}
            className="p-2.5 text-neutral-400 hover:text-white transition-all bg-neutral-900/50 hover:bg-neutral-800 rounded-xl border border-white/5 hover:border-white/10"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {error && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="p-4 mb-8 bg-red-950/40 border border-red-500/30 rounded-2xl text-red-300 backdrop-blur-md shadow-[0_0_20px_rgba(239,68,68,0.1)] flex justify-between items-center">
            <p className="font-medium">Error loading dashboard: {error.message}</p>
            <button onClick={() => refetch()} className="px-4 py-2 bg-red-900/50 hover:bg-red-800/80 text-white rounded-xl transition-colors border border-red-500/30 text-sm font-semibold">
              Retry
            </button>
          </motion.div>
        )}

        {organizations.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto text-center py-20">
            <div className="bg-neutral-900/40 backdrop-blur-xl inline-flex p-8 rounded-[2rem] mb-6 border border-white/5 shadow-2xl relative">
              <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full" />
              <Settings className="w-16 h-16 text-blue-500 relative z-10" />
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-3">Welcome to AgentBuilder!</h2>
            <p className="text-neutral-400 text-lg mb-8">Let's create your first workspace to get started.</p>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const orgName = formData.get('orgName');
              
              try {
                await createOrg({
                  variables: {
                    orgName
                  }
                });
                refetch();
              } catch (err) {
                console.error("Failed to create org:", err);
                alert("Failed to create workspace. Check console.");
              }
            }} className="space-y-4">
              <div className="relative group text-left">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl opacity-0 group-focus-within:opacity-30 blur transition duration-500" />
                <input 
                  type="text" 
                  name="orgName"
                  className="relative w-full px-5 py-4 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-2xl focus:border-blue-500/50 outline-none transition-all text-white placeholder:text-neutral-600 shadow-inner"
                  placeholder="e.g. Acme Corp"
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_40px_rgba(37,99,235,0.6)] group/btn overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-100 group-hover/btn:scale-105 transition-transform duration-500" />
                <span className="relative z-10 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create Workspace
                </span>
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-16">
            {organizations.map((org: any) => (
              <motion.div variants={itemVariants} key={org.id} className="space-y-10">
                
                {/* Org Header Card */}
                <div className="relative group overflow-hidden bg-neutral-900/40 backdrop-blur-2xl border border-white/5 p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                      <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-white to-neutral-400 bg-clip-text text-transparent">{org.name}</h2>
                      <div className="flex items-center gap-4 mt-4 text-sm font-medium">
                        <span className="flex items-center gap-2 bg-[#0a0a0a]/80 px-4 py-2 rounded-xl border border-white/10 shadow-inner text-neutral-300">
                          <Activity className="w-4 h-4 text-blue-400" /> 
                          Quota: <span className="text-white font-bold">{org.quota_used} / {org.quota_limit}</span>
                        </span>
                      </div>
                    </div>
                    
                    <Link 
                      href={`/workflow/new?orgId=${org.id}`}
                      className="relative inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_40px_rgba(37,99,235,0.6)] group/btn overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-100 group-hover/btn:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover/btn:translate-y-[100%] transition-transform duration-1000 ease-in-out" />
                      <span className="relative z-10 flex items-center gap-2">
                        <Plus className="w-5 h-5 group-hover/btn:rotate-90 transition-transform duration-300" />
                        New Workflow
                      </span>
                    </Link>
                  </div>
                </div>

                {(org.workflows || []).length === 0 ? (
                  <div className="p-16 border border-white/10 border-dashed rounded-[2rem] text-center bg-neutral-900/20 backdrop-blur-sm shadow-inner">
                    <Workflow className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-neutral-300 mb-2">No workflows created yet</h3>
                    <p className="text-neutral-500">Click the 'New Workflow' button to build your first automation.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(org.workflows || []).map((wf: any) => (
                      <Link 
                        key={wf.id} 
                        href={`/workflow/${wf.id}`}
                        className="group relative block p-8 bg-neutral-900/50 backdrop-blur-xl border border-white/5 hover:border-blue-500/30 rounded-[2rem] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className="relative z-10">
                          <div className="w-12 h-12 bg-[#0a0a0a] rounded-xl flex items-center justify-center border border-white/5 mb-5 shadow-inner group-hover:border-blue-500/50 transition-colors">
                            <Zap className="w-6 h-6 text-neutral-500 group-hover:text-blue-400 transition-colors" />
                          </div>
                          
                          <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors mb-3">
                            {wf.name}
                          </h3>
                          
                          {wf.description ? (
                            <p className="text-sm text-neutral-400 line-clamp-2 leading-relaxed">
                              {wf.description}
                            </p>
                          ) : (
                            <p className="text-sm text-neutral-600 italic">
                              No description provided.
                            </p>
                          )}
                          
                          <div className="mt-6 flex items-center text-xs font-semibold text-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-10px] group-hover:translate-x-0">
                            Open Workflow <ChevronRight className="w-4 h-4 ml-1" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
