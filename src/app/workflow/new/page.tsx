"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, gql } from "@apollo/client";
import { Activity, Save, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  NodeProps,
  Node,
  Edge
} from "@xyflow/react";
import '@xyflow/react/dist/style.css';
import { Globe, BrainCircuit, GitBranch, UserCheck, Database, Bell, Trash2, Code2 } from "lucide-react";

const CREATE_WORKFLOW = gql`
  mutation CreateWorkflow(
    $org_id: uuid!
    $name: String!
    $description: String
    $steps: [workflow_steps_insert_input!]!
    $triggers: [workflow_triggers_insert_input!]!
  ) {
    insert_workflows_one(
      object: {
        org_id: $org_id
        name: $name
        description: $description
        steps: { data: $steps }
        triggers: { data: $triggers }
      }
    ) {
      id
    }
  }
`;

type StepType = 'llm_call' | 'http_request' | 'db_write' | 'notify' | 'conditional_branch' | 'approval_gate';

const NODE_META: Record<StepType, { icon: any, color: string, bg: string, border: string }> = {
  http_request: { icon: Globe, color: "text-blue-400", bg: "bg-blue-950/30", border: "border-blue-900/50" },
  llm_call: { icon: BrainCircuit, color: "text-purple-400", bg: "bg-purple-950/30", border: "border-purple-900/50" },
  conditional_branch: { icon: GitBranch, color: "text-orange-400", bg: "bg-orange-950/30", border: "border-orange-900/50" },
  approval_gate: { icon: UserCheck, color: "text-green-400", bg: "bg-green-950/30", border: "border-green-900/50" },
  db_write: { icon: Database, color: "text-indigo-400", bg: "bg-indigo-950/30", border: "border-indigo-900/50" },
  notify: { icon: Bell, color: "text-yellow-400", bg: "bg-yellow-950/30", border: "border-yellow-900/50" },
};

const CustomNode = ({ id, data, isConnectable, selected }: NodeProps) => {
  const d = data as any;
  const meta = NODE_META[d.type as StepType] || NODE_META.http_request;
  const Icon = meta.icon;

  return (
    <div className={`w-[320px] rounded-2xl overflow-hidden backdrop-blur-xl transition-all duration-200 ${selected ? 'ring-2 ring-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.2)] bg-neutral-900/90' : 'border border-neutral-800/80 bg-neutral-900/60 shadow-xl'}`}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-4 h-4 bg-neutral-800 border-2 border-neutral-600 rounded-full !top-[-8px] transition-colors hover:bg-blue-500 hover:border-blue-400" />
      
      <div className={`px-5 py-4 border-b border-neutral-800 flex justify-between items-center ${meta.bg}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${meta.border} border bg-neutral-950/50 shadow-inner`}>
            <Icon className={`w-5 h-5 ${meta.color}`} />
          </div>
          <div>
            <span className="font-bold text-white tracking-wide text-sm">{d.type.replace('_', ' ').toUpperCase()}</span>
            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">ID: {id.slice(-6)}</div>
          </div>
        </div>
        <button onClick={() => d.onDelete(id)} className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer group">
          <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Code2 className="w-4 h-4 text-neutral-500" />
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Configuration</span>
        </div>
        <textarea
          className="w-full h-32 bg-neutral-950/50 border border-neutral-800/80 rounded-xl p-3 font-mono text-[11px] leading-relaxed text-blue-200 focus:ring-2 focus:ring-blue-500/50 outline-none nodrag resize-none shadow-inner"
          value={d.config}
          onChange={(e) => d.onChangeConfig(id, e.target.value)}
          placeholder="{}"
          spellCheck={false}
        />
      </div>

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-4 h-4 bg-neutral-800 border-2 border-neutral-600 rounded-full !bottom-[-8px] transition-colors hover:bg-blue-500 hover:border-blue-400" />
    </div>
  );
};

export default function WorkflowBuilder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createWorkflow, { loading }] = useMutation(CREATE_WORKFLOW);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const handleDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }, [setNodes, setEdges]);

  const handleChangeConfig = useCallback((id: string, config: string) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          n.data = { ...n.data, config };
        }
        return n;
      })
    );
  }, [setNodes]);

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  if (!orgId) return <div className="p-8 text-white">Missing orgId parameter.</div>;

  const handleAddStep = (type: StepType) => {
    let defaultConfig = "{}";
    if (type === 'http_request') defaultConfig = '{\n  "url": "https://api.example.com",\n  "method": "GET"\n}';
    if (type === 'llm_call') defaultConfig = '{\n  "prompt": "Analyze this data: {{input}}"\n}';
    if (type === 'conditional_branch') defaultConfig = '{\n  "condition": "input.status == 200"\n}';
    
    const newNode: Node = {
      id: Date.now().toString(),
      type: 'custom',
      position: { x: 250, y: nodes.length * 200 + 100 },
      data: {
        type,
        config: defaultConfig,
        onDelete: handleDeleteNode,
        onChangeConfig: handleChangeConfig
      }
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleSave = async () => {
    try {
      // Sort nodes by Y position to simulate a linear step_order
      const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
      
      const formattedSteps = sortedNodes.map((n, idx) => ({
        step_order: idx + 1,
        type: n.data.type as string,
        config: JSON.parse(n.data.config as string) // Validates JSON
      }));

      const res = await createWorkflow({
        variables: {
          org_id: orgId,
          name,
          description,
          steps: formattedSteps,
          triggers: [{ type: "manual", config: {} }]
        }
      });

      if (res.data?.insert_workflows_one?.id) {
        router.push(`/workflow/${res.data.insert_workflows_one.id}`);
      }
    } catch (e: any) {
      alert("Failed to save workflow. Please check your JSON configs. Error: " + e.message);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-950 text-neutral-100 overflow-hidden relative">
      {/* Header */}
      <div className="flex-none h-16 border-b border-neutral-800/50 bg-neutral-900/40 backdrop-blur-2xl px-6 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="w-8 h-8 rounded-full bg-neutral-800/50 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors border border-neutral-700/50">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex gap-4 items-center">
            <input
              type="text"
              placeholder="Workflow Name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-transparent font-bold text-lg outline-none placeholder:text-neutral-600 w-48 focus:w-64 transition-all text-white"
            />
            <div className="h-4 w-px bg-neutral-700 hidden md:block"></div>
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="bg-transparent text-sm text-neutral-400 outline-none placeholder:text-neutral-600 w-64 focus:w-96 transition-all hidden md:block"
            />
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading || !name || nodes.length === 0}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all disabled:opacity-50"
        >
          {loading ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Workflow
        </button>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative flex">
        {/* Sidebar */}
        <div className="w-72 bg-neutral-900/60 backdrop-blur-xl border-r border-neutral-800/50 p-5 flex flex-col gap-3 z-10 overflow-y-auto">
          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 px-1">Add Nodes</div>
          {(['http_request', 'llm_call', 'conditional_branch', 'approval_gate', 'db_write', 'notify'] as StepType[]).map(type => {
            const meta = NODE_META[type] || NODE_META.http_request;
            const Icon = meta.icon;
            return (
              <button
                key={type}
                onClick={() => handleAddStep(type)}
                className="group flex items-center justify-between px-4 py-3 bg-neutral-950/40 hover:bg-neutral-800/60 rounded-xl text-sm font-medium transition-all border border-neutral-800 hover:border-neutral-700 text-left w-full shadow-sm"
              >
                <div className="flex items-center gap-3">
                   <div className={`p-1.5 rounded-lg ${meta.bg} ${meta.border} border`}>
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                   </div>
                   <span className="text-neutral-300 group-hover:text-white transition-colors">{type.replace('_', ' ').toUpperCase()}</span>
                </div>
                <div className="w-6 h-6 rounded-md bg-neutral-800/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <Plus className="w-4 h-4 text-neutral-400" />
                </div>
              </button>
            )
          })}
        </div>
        
        {/* React Flow Canvas */}
        <div className="flex-1 h-full w-full relative bg-[#0a0a0a]">
          {/* Subtle Grid and Glows */}
          <div className="absolute top-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[20%] right-[20%] w-[40%] h-[40%] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none" />
          
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            colorMode="dark"
          >
            <Background color="#222" gap={16} size={1} />
            <Controls className="bg-neutral-900 border-neutral-800 fill-neutral-400 !shadow-xl !rounded-xl overflow-hidden" />
            <MiniMap 
              className="!bg-neutral-900/80 !border-neutral-800/50 !backdrop-blur-md !shadow-2xl !rounded-2xl" 
              maskColor="#00000040" 
              nodeColor="#2563eb" 
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
