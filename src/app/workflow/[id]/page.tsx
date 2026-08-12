"use client";

import { useAuthenticationStatus } from "@nhost/nextjs";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useSubscription, useMutation, gql } from "@apollo/client";
import { Activity, Play, CheckCircle, XCircle, PauseCircle, ChevronRight, Settings, ArrowLeft, Terminal, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const GET_WORKFLOW = gql`
  query GetWorkflowDetails($id: uuid!) {
    workflows_by_pk(id: $id) {
      id
      name
      description
      org_id
      steps(order_by: { step_order: asc }) {
        id
        type
        config
        step_order
      }
      runs(order_by: { started_at: desc }, limit: 1) {
        id
        status
      }
    }
  }
`;

const SUB_RUN_STEPS = gql`
  query OnRunStepsUpdated($run_id: uuid!) {
    step_runs(where: { run_id: { _eq: $run_id } }, order_by: { step_id: asc }) {
      id
      step_id
      status
      output
      error
    }
    workflow_runs_by_pk(id: $run_id) {
      status
    }
  }
`;

const TRIGGER_WORKFLOW = gql`
  mutation TriggerWorkflow($workflow_id: String!) {
    triggerWorkflowRun(workflow_id: $workflow_id) {
      run_id
      status
    }
  }
`;

const APPROVE_STEP = gql`
  mutation ApproveStep($step_run_id: String!, $approved: Boolean!) {
    approveStep(step_run_id: $step_run_id, approved: $approved) {
      success
    }
  }
`;

const RETRY_STEP = gql`
  mutation RetryStep($run_id: String!) {
    retryStep(run_id: $run_id) {
      success
    }
  }
`;

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const stepVariants = {
  hidden: { opacity: 0, x: -30 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function WorkflowPage() {
  const params = useParams();
  const id = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuthenticationStatus();
  const router = useRouter();

  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const { data: wfData, loading: wfLoading, refetch } = useQuery(GET_WORKFLOW, {
    variables: { id },
    skip: !isAuthenticated || !id
  });

  useEffect(() => {
    if (wfData?.workflows_by_pk?.runs?.length > 0 && !activeRunId) {
        setActiveRunId(wfData.workflows_by_pk.runs[0].id);
    }
  }, [wfData, activeRunId]);

  const { data: subData } = useQuery(SUB_RUN_STEPS, {
    variables: { run_id: activeRunId },
    skip: !activeRunId,
    pollInterval: 1000
  });

  const [triggerRun, { loading: triggering }] = useMutation(TRIGGER_WORKFLOW);
  const [approveStep, { loading: approving }] = useMutation(APPROVE_STEP);
  const [retryStep, { loading: retrying }] = useMutation(RETRY_STEP);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/");
  }, [authLoading, isAuthenticated, router]);

  if (wfLoading || authLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-white"><Activity className="animate-spin text-blue-500 w-8 h-8" /></div>;
  }

  const workflow = wfData?.workflows_by_pk;
  if (!workflow) {
    return <div className="p-8 text-white">Workflow not found or access denied.</div>;
  }

  const stepRuns = subData?.step_runs || [];
  const runStatus = subData?.workflow_runs_by_pk?.status || workflow.runs?.[0]?.status;

  const handleRun = async () => {
    try {
      const res = await triggerRun({ variables: { workflow_id: id } });
      if (res.data?.triggerWorkflowRun?.run_id) {
          setActiveRunId(res.data.triggerWorkflowRun.run_id);
          refetch();
      }
    } catch (e: any) {
      alert("Failed to trigger: " + e.message);
    }
  };

  const handleApprove = async (stepRunId: string, approved: boolean) => {
      try {
          await approveStep({ variables: { step_run_id: stepRunId, approved }});
      } catch (e: any) {
          alert("Approval failed: " + e.message);
      }
  }

  const handleRetry = async () => {
      if (!activeRunId) return;
      try {
          await retryStep({ variables: { run_id: activeRunId }});
          refetch();
      } catch (e: any) {
          alert("Retry failed: " + e.message);
      }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden">
      {/* Background glowing orbs */}
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none" />

      {/* Topbar */}
      <header className="border-b border-neutral-800/50 bg-neutral-900/40 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="w-8 h-8 rounded-full bg-neutral-800/50 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors border border-neutral-700/50">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="font-medium text-neutral-300">Execution Details</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-12 relative z-10">
        {/* Header Section */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row items-start md:items-center justify-between bg-neutral-900/30 backdrop-blur-xl p-8 rounded-3xl border border-neutral-800/50 shadow-2xl">
          <div className="mb-6 md:mb-0">
            <h1 className="text-4xl font-bold tracking-tight text-white">{workflow.name}</h1>
            <p className="text-neutral-400 mt-2 text-lg">{workflow.description}</p>
            {runStatus && (
                <div className="mt-6 flex items-center gap-3 text-sm">
                    <span className="text-neutral-500 font-medium">Status</span>
                    <span className={`px-4 py-1.5 rounded-full font-bold capitalize text-xs tracking-wide shadow-inner ${
                        runStatus === 'completed' ? 'bg-green-950/80 text-green-400 border border-green-900/50' :
                        runStatus === 'failed' ? 'bg-red-950/80 text-red-400 border border-red-900/50' :
                        runStatus === 'paused' ? 'bg-yellow-950/80 text-yellow-400 border border-yellow-900/50' :
                        'bg-blue-950/80 text-blue-400 border border-blue-900/50 shadow-[0_0_15px_rgba(37,99,235,0.2)]'
                    }`}>
                        {runStatus}
                    </span>
                </div>
            )}
          </div>
          <button 
            onClick={handleRun}
            disabled={triggering || runStatus === 'running'}
            className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-semibold shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all disabled:opacity-50 group"
          >
            {triggering || runStatus === 'running' ? <Activity className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />}
            {runStatus === 'running' ? 'Running...' : 'Run Workflow'}
          </button>
        </motion.div>

        {/* Steps Timeline */}
        <div className="relative pl-4 md:pl-0">
          {/* Glowing connecting line */}
          <div className="absolute left-10 top-10 bottom-10 w-0.5 bg-gradient-to-b from-blue-600/20 via-indigo-600/20 to-neutral-800/50 z-0 hidden md:block"></div>

          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
            {workflow.steps.map((step: any, index: number) => {
              const stepRun = stepRuns.find((sr: any) => sr.step_id === step.id);
              const status = stepRun?.status || 'pending';
              
              const isCompleted = status === 'completed';
              const isFailed = status === 'failed';
              const isPaused = status === 'paused';
              const isRunning = status === 'running';

              return (
                <motion.div variants={stepVariants} key={step.id} className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-8 group">
                  <div className="flex-none pt-2 hidden md:block">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 shadow-xl backdrop-blur-md transition-all duration-300 ${
                        isCompleted ? 'bg-green-950/80 border-green-500/50 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]' :
                        isRunning ? 'bg-blue-950/80 border-blue-500/50 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-110' :
                        isPaused ? 'bg-yellow-950/80 border-yellow-500/50 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.2)]' :
                        isFailed ? 'bg-red-950/80 border-red-500/50 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]' :
                        'bg-neutral-900/50 border-neutral-800/80 text-neutral-600'
                    }`}>
                      {isCompleted ? <CheckCircle className="w-6 h-6" /> :
                       isRunning ? <Activity className="w-6 h-6 animate-spin" /> :
                       isPaused ? <PauseCircle className="w-6 h-6" /> :
                       isFailed ? <XCircle className="w-6 h-6" /> :
                       <span className="font-bold text-lg">{index + 1}</span>}
                    </div>
                  </div>
                  
                  <div className={`flex-grow backdrop-blur-xl border rounded-3xl p-6 transition-all duration-300 shadow-2xl ${
                      isRunning ? 'bg-neutral-900/80 border-blue-500/30 ring-1 ring-blue-500/20' :
                      isFailed ? 'bg-neutral-900/60 border-red-500/30' :
                      isPaused ? 'bg-neutral-900/60 border-yellow-500/30' :
                      'bg-neutral-900/40 border-neutral-800/60 hover:bg-neutral-900/60'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h3 className="text-xl font-bold tracking-tight text-white capitalize flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-neutral-950/50 border border-neutral-800/80`}>
                             <Settings className="w-5 h-5 text-neutral-400" />
                          </div>
                          {step.type.replace('_', ' ')}
                      </h3>
                      {status !== 'pending' && (
                        <span className={`text-xs font-bold uppercase tracking-wider ${isCompleted ? 'text-green-400' : isFailed ? 'text-red-400' : isPaused ? 'text-yellow-400' : 'text-blue-400'}`}>
                          {status}
                        </span>
                      )}
                    </div>

                    <div className="mt-6">
                       <div className="flex items-center gap-2 mb-2 px-1">
                         <Terminal className="w-4 h-4 text-neutral-500" />
                         <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Configuration</span>
                       </div>
                       <div className="p-4 bg-[#0a0a0a]/80 rounded-2xl border border-neutral-800/80 overflow-x-auto text-sm text-neutral-400 font-mono shadow-inner leading-relaxed">
                          {JSON.stringify(step.config, null, 2)}
                       </div>
                    </div>

                    {stepRun && (
                      <div className="mt-6">
                          {isPaused && step.type === 'approval_gate' ? (
                              <div className="bg-gradient-to-r from-yellow-950/40 to-yellow-900/10 border border-yellow-900/50 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-sm">
                                  <span className="text-yellow-400 font-semibold flex items-center gap-3 text-lg">
                                      <div className="p-2 bg-yellow-900/30 rounded-full animate-pulse"><AlertTriangle className="w-5 h-5" /></div>
                                      Action Required
                                  </span>
                                  <div className="flex gap-3 w-full sm:w-auto">
                                      <button 
                                        onClick={() => handleApprove(stepRun.id, false)}
                                        disabled={approving}
                                        className="flex-1 sm:flex-none px-6 py-3 bg-red-950/60 hover:bg-red-900/80 text-red-300 rounded-xl font-medium transition-all border border-red-900/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                      >
                                          Reject
                                      </button>
                                      <button 
                                        onClick={() => handleApprove(stepRun.id, true)}
                                        disabled={approving}
                                        className="flex-1 sm:flex-none px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]"
                                      >
                                          {approving ? "Approving..." : "Approve"}
                                      </button>
                                  </div>
                              </div>
                          ) : (
                              <div className="space-y-4">
                                  {stepRun.output && (
                                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                          <div className="flex items-center gap-2 mb-2 px-1">
                                            <ChevronRight className="w-4 h-4 text-green-500" />
                                            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Execution Output</span>
                                          </div>
                                          <pre className="p-4 bg-[#051505]/80 rounded-2xl border border-green-900/30 text-green-400 text-sm overflow-x-auto shadow-inner leading-relaxed">
                                              {JSON.stringify(stepRun.output, null, 2)}
                                          </pre>
                                      </motion.div>
                                  )}
                                  {stepRun.error && (
                                      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                                          <div className="flex items-center justify-between mb-2 px-1">
                                            <div className="flex items-center gap-2">
                                              <AlertTriangle className="w-4 h-4 text-red-500" />
                                              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Error Trace</span>
                                            </div>
                                            <button 
                                              onClick={handleRetry}
                                              disabled={retrying}
                                              className="px-4 py-1.5 bg-red-950 hover:bg-red-900 text-red-300 rounded-lg text-xs font-medium transition-colors border border-red-900/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                            >
                                              {retrying ? "Retrying..." : "Retry Failed Step"}
                                            </button>
                                          </div>
                                          <div className="p-4 bg-[#1a0505]/80 rounded-2xl text-red-400 text-sm border border-red-900/30 shadow-inner">
                                              {stepRun.error}
                                          </div>
                                      </motion.div>
                                  )}
                              </div>
                          )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
