import { 
  createRoute, 
  createRootRoute, 
  createRouter, 
  Outlet, 
  Link,
  useNavigate
} from '@tanstack/react-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { 
  Cpu, 
  Play, 
  CheckCircle, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  Sparkles, 
  Info, 
  Flame, 
  Coins, 
  Code, 
  FileCode, 
  Terminal
} from 'lucide-react';
import React from 'react';
import { io } from 'socket.io-client';
import type { AgentOutput } from '@dashboard/shared';

// ==========================================
// 1. Root Layout Component
// ==========================================
function RootComponent() {
  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col font-sans selection:bg-neutral-800">
      {/* Sleek Navigation Bar (Vercel Style) */}
      <header className="sticky top-0 z-50 border-b border-neutral-900 bg-black/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Cpu className="w-5 h-5 text-neutral-400" />
            <Link to="/" className="font-semibold text-sm tracking-tight text-white hover:opacity-80 transition-opacity">
              AI Skills & Agents Dashboard
            </Link>
          </div>
          <nav className="flex items-center space-x-6 text-xs font-medium text-neutral-400">
            <Link to="/" className="hover:text-white transition-colors [&.active]:text-white">
              Home
            </Link>
            <Link to="/build" className="hover:text-white transition-colors [&.active]:text-white">
              New Build
            </Link>
          </nav>
        </div>
      </header>

      {/* Primary Page Viewport */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 flex flex-col">
        <Outlet />
      </main>

      {/* Global Footer */}
      <footer className="border-t border-neutral-900 bg-black py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 space-y-4 sm:space-y-0">
          <div>
            &copy; 2026 AI Agent Coordinator. All rights reserved.
          </div>
          <div className="flex space-x-4">
            <span className="hover:text-white cursor-pointer transition-colors">Documentation</span>
            <span className="hover:text-white cursor-pointer transition-colors">Github</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const rootRoute = createRootRoute({
  component: RootComponent,
});

// ==========================================
// 2. Child Route: Landing Screen
// ==========================================
function IndexComponent() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-8 animate-fade-in">
      <div className="space-y-4 max-w-2xl">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium bg-neutral-900 text-neutral-300 border border-neutral-800">
          <Sparkles className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500/20" />
          <span>Agent Sequencing Pipeline Sandbox</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-none">
          Build Clean Systems With Orchestrated AI Agents
        </h1>
        <p className="text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed">
          Specify your task configuration, coordinate a sequential chain of specialized agents, and watch live as they design database schemas, write code, run tests, and review quality.
        </p>
      </div>

      <div className="flex items-center justify-center space-x-4 pt-4">
        <Link 
          to="/build" 
          className="px-5 py-2.5 rounded-md bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors flex items-center space-x-2 shadow-lg"
        >
          <Play className="w-3.5 h-3.5 fill-black" />
          <span>Launch Build Shell</span>
        </Link>
      </div>
    </div>
  );
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexComponent,
});

// ==========================================
// 3. Child Route: Build Configuration Form
// ==========================================
const FormSchema = z.object({
  task: z.string().min(5, 'Task description must be at least 5 characters long'),
  language: z.string().min(1, 'Please select a programming language'),
  frameworks: z.array(z.string()),
  methodologies: z.array(z.string()),
  agents: z.array(z.string()).min(1, 'At least one agent must be selected'),
});
type FormValues = z.infer<typeof FormSchema>;

function BuildComponent() {
  const navigate = useNavigate();
  const [createdPlan, setCreatedPlan] = React.useState<any | null>(null);

  const { data: agentsData, isLoading: loadingAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('Failed to load agents');
      return res.json() as Promise<{ agents: any[] }>;
    },
  });

  const { data: skillsData, isLoading: loadingSkills } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const res = await fetch('/api/skills');
      if (!res.ok) throw new Error('Failed to load skills');
      return res.json() as Promise<{ skills: any[] }>;
    },
  });

  const { 
    register, 
    handleSubmit, 
    control, 
    watch, 
    setValue,
    formState: { errors } 
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      task: '',
      language: 'Python',
      frameworks: [],
      methodologies: [],
      agents: ['architect', 'db-designer', 'backend-dev', 'tester', 'code-reviewer'],
    },
  });

  const selectedLanguage = watch('language');
  const selectedFrameworks = watch('frameworks');
  const selectedMethodologies = watch('methodologies');
  const selectedAgents = watch('agents');

  const planMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const payload = {
        task: data.task,
        selectedSkills: {
          language: data.language,
          frameworks: data.frameworks,
          methodologies: data.methodologies,
        },
        selectedAgents: data.agents,
      };
      const res = await fetch('/api/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create planning session.');
      return res.json();
    },
    onSuccess: (data) => {
      setCreatedPlan(data.plan);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch('/api/execution/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) throw new Error('Failed to approve plan.');
      return res.json() as Promise<{ sessionId: string }>;
    },
    onSuccess: (data) => {
      navigate({ to: `/execution/${data.sessionId}` });
    },
  });

  const onSubmit = (data: FormValues) => {
    planMutation.mutate(data);
  };

  const handleAgentToggle = (agentId: string) => {
    if (selectedAgents.includes(agentId)) {
      setValue('agents', selectedAgents.filter((id) => id !== agentId));
    } else {
      setValue('agents', [...selectedAgents, agentId]);
    }
  };

  const handleCheckboxToggle = (field: 'frameworks' | 'methodologies', value: string) => {
    const activeList = field === 'frameworks' ? selectedFrameworks : selectedMethodologies;
    if (activeList.includes(value)) {
      setValue(field, activeList.filter((v) => v !== value));
    } else {
      setValue(field, [...activeList, value]);
    }
  };

  if (loadingAgents || loadingSkills) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-neutral-600 animate-spin" />
        <p className="text-xs text-neutral-400 mt-2">Loading catalog configurations...</p>
      </div>
    );
  }

  const availableFrameworks = selectedLanguage === 'Python' 
    ? ['FastAPI', 'Django', 'Flask']
    : ['Express', 'NestJS', 'Koa'];

  const methodologySkills = skillsData?.skills.filter(s => s.category === 'methodology') || [];

  return (
    <div className="max-w-4xl mx-auto w-full space-y-10">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-white">Configure Build Pipeline</h2>
        <p className="text-xs text-neutral-400">
          State configurations mapping user demands to sequential agent pipelines.
        </p>
      </div>

      {!createdPlan ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-fade-in">
          {/* 1. Task Area */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              1. What do you want to build?
            </label>
            <textarea
              {...register('task')}
              placeholder="e.g. Build a robust task management API with user JWT auth..."
              rows={4}
              className={`w-full bg-neutral-950 border ${errors.task ? 'border-red-500 focus:border-red-500' : 'border-neutral-900 focus:border-neutral-700'} p-4 rounded-lg text-sm text-white placeholder-neutral-600 focus:outline-none transition-colors`}
            />
            {errors.task && (
              <p className="text-xs text-red-500 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.task.message}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 2. Language Picker */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                2. Select Language Stack
              </label>
              <Controller
                control={control}
                name="language"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-3">
                    {['Python', 'Node.js'].map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => {
                          field.onChange(lang);
                          setValue('frameworks', []);
                        }}
                        className={`p-4 rounded-lg border text-left flex flex-col justify-between h-24 transition-all ${
                          field.value === lang
                            ? 'bg-neutral-950 border-white text-white'
                            : 'bg-neutral-950/20 border-neutral-900 text-neutral-400 hover:border-neutral-800'
                        }`}
                      >
                        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Language</span>
                        <span className="text-sm font-semibold">{lang}</span>
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* 3. Framework Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                3. Choose Frameworks
              </label>
              <div className="grid grid-cols-3 gap-2">
                {availableFrameworks.map((fw) => {
                  const isChecked = selectedFrameworks.includes(fw);
                  return (
                    <button
                      key={fw}
                      type="button"
                      onClick={() => handleCheckboxToggle('frameworks', fw)}
                      className={`p-3 rounded-lg border text-center text-xs font-medium transition-all ${
                        isChecked
                          ? 'bg-neutral-900 border-neutral-700 text-white'
                          : 'bg-neutral-950/10 border-neutral-900 text-neutral-500 hover:border-neutral-800'
                      }`}
                    >
                      {fw}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Methodology Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              4. Inject Methodologies & Skills
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {methodologySkills.map((skill) => {
                const isChecked = selectedMethodologies.includes(skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => handleCheckboxToggle('methodologies', skill.id)}
                    className={`p-4 rounded-lg border text-left flex items-start space-x-3 transition-all ${
                      isChecked
                        ? 'bg-neutral-900/60 border-neutral-600 text-white'
                        : 'bg-neutral-950/10 border-neutral-900 text-neutral-400 hover:border-neutral-800'
                    }`}
                  >
                    <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isChecked ? 'text-white' : 'text-neutral-600'}`} />
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold">{skill.name}</div>
                      <div className="text-[11px] text-neutral-500 leading-tight">{skill.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Agent Team Picker */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                5. Coordinate Agent Team
              </label>
              {errors.agents && (
                <p className="text-xs text-red-500 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.agents.message}</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {agentsData?.agents.map((agent) => {
                const isSelected = selectedAgents.includes(agent.id);
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => handleAgentToggle(agent.id)}
                    className={`p-4 rounded-lg border text-left flex flex-col justify-between h-40 transition-all ${
                      isSelected
                        ? 'bg-neutral-900 border-neutral-600 text-white shadow-md shadow-neutral-950'
                        : 'bg-neutral-950/10 border-neutral-900 text-neutral-400 hover:border-neutral-800'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-2xl">{agent.emoji}</span>
                      <div className={`w-3 h-3 rounded-full border ${isSelected ? 'bg-white border-white' : 'bg-transparent border-neutral-700'}`} />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold tracking-tight">{agent.name}</div>
                      <div className="text-[10px] text-neutral-500 leading-tight line-clamp-2">{agent.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Trigger */}
          <div className="pt-4 border-t border-neutral-900 flex justify-end">
            <button
              type="submit"
              disabled={planMutation.isPending}
              className="px-6 py-2.5 rounded-md bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {planMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing Task...</span>
                </>
              ) : (
                <>
                  <span>Create Execution Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Plan Approval Interface */
        <div className="space-y-8 animate-fade-in">
          <div className="border border-neutral-900 bg-neutral-950/60 p-6 rounded-lg space-y-4">
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Generated plan</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{createdPlan.id}</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Estimated cost</span>
                <h3 className="text-lg font-bold text-emerald-400 mt-0.5">${createdPlan.estimated_cost.estimated_usd}</h3>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Planning Reasoning</h4>
              <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-900/40 p-4 rounded-md border border-neutral-900">
                {createdPlan.reasoning}
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Sequential Agent Chain</h4>
              <div className="flex flex-wrap items-center gap-2">
                {createdPlan.agents_sequence.map((agentId: string, idx: number) => {
                  const agentObj = agentsData?.agents.find((a) => a.id === agentId);
                  return (
                    <React.Fragment key={agentId}>
                      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md border border-neutral-900 bg-neutral-950 text-xs font-medium text-white">
                        <span>{agentObj?.emoji}</span>
                        <span>{agentObj?.name}</span>
                      </div>
                      {idx < createdPlan.agents_sequence.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-neutral-700" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-neutral-900">
              <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Token & Cost Breakdown</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {createdPlan.agents_sequence.map((agentId: string) => {
                  const agentObj = agentsData?.agents.find((a) => a.id === agentId);
                  const costItem = createdPlan.estimated_cost.breakdown[agentId];
                  return (
                    <div key={agentId} className="p-3 rounded-md bg-neutral-900/20 border border-neutral-900 text-left space-y-1">
                      <div className="text-[10px] text-neutral-500 font-semibold uppercase">{agentObj?.name}</div>
                      <div className="text-xs text-white font-medium">{costItem.tokens.toLocaleString()} tok</div>
                      <div className="text-[10px] text-neutral-400">${costItem.cost}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setCreatedPlan(null)}
              className="px-5 py-2.5 rounded-md border border-neutral-800 text-neutral-400 font-semibold text-xs hover:text-white transition-colors"
            >
              Cancel & Edit Config
            </button>
            <button
              type="button"
              disabled={approveMutation.isPending}
              onClick={() => approveMutation.mutate(createdPlan.id)}
              className="px-5 py-2.5 rounded-md bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Starting Builds...</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-black" />
                  <span>Approve & Run Chain</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const buildRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/build',
  component: BuildComponent,
});

// ==========================================
// 4. Child Route: Execution Monitor
// ==========================================
interface ExecutedStep {
  agentId: string;
  name: string;
  emoji?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: AgentOutput;
  tokensUsed?: number;
  costUsed?: number;
}

function ExecutionComponent() {
  const { sessionId } = executionRoute.useParams();
  const [pipelineStatus, setPipelineStatus] = React.useState<'planning' | 'executing' | 'complete' | 'failed'>('executing');
  const [executedSteps, setExecutedSteps] = React.useState<ExecutedStep[]>([]);
  const [activeAgent, setActiveAgent] = React.useState<{ name: string; emoji?: string; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [synthesisReport, setSynthesisReport] = React.useState<any | null>(null);
  const [viewingFile, setViewingFile] = React.useState<{ filename: string; content: string } | null>(null);

  // A. Fetch agents catalog to resolve emojis and naming
  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('Failed to load agents');
      return res.json() as Promise<{ agents: any[] }>;
    },
  });

  // B. Pre-load initial state via REST endpoint
  const { data: initialState, isLoading: loadingState } = useQuery({
    queryKey: ['executionState', sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/execution/${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch session state');
      return res.json() as Promise<{
        status: 'planning' | 'executing' | 'complete' | 'failed';
        executedAgents: any[];
      }>;
    },
    // Set stale time to 0 for execution monitors
    staleTime: 0,
  });

  // Sync initial state data into view states
  React.useEffect(() => {
    if (initialState) {
      setPipelineStatus(initialState.status);
      
      const mappedSteps = initialState.executedAgents.map((exec) => {
        const agentObj = agentsData?.agents.find((a) => a.id === exec.agentId);
        return {
          agentId: exec.agentId,
          name: agentObj?.name || exec.agentId,
          emoji: agentObj?.emoji || '🤖',
          status: exec.status as 'pending' | 'running' | 'completed' | 'failed',
          output: exec.output,
          tokensUsed: (exec.tokensInput || 0) + (exec.tokensOutput || 0),
          costUsed: exec.costUsd || 0,
        };
      });
      setExecutedSteps(mappedSteps);

      // If already complete, pre-load synthesis artifacts by calling result API
      if (initialState.status === 'complete') {
        fetch(`/api/result/${sessionId}`)
          .then((res) => res.json())
          .then((data) => {
            setSynthesisReport(data);
            // Default to viewing the first file in list
            const filenames = Object.keys(data.artifacts || {});
            if (filenames.length > 0) {
              setViewingFile({ filename: filenames[0], content: data.artifacts[filenames[0]] });
            }
          })
          .catch((err) => console.error('Failed to load completed result aggregates:', err));
      }
    }
  }, [initialState, agentsData, sessionId]);

  // C. Socket connection for live execution monitoring
  React.useEffect(() => {
    // Establish connection to backend WebSocket server
    const socket = io('http://localhost:3001');

    socket.on('connect', () => {
      console.info('[WebSocket] Connected. Joining session:', sessionId);
      socket.emit('join_session', sessionId);
    });

    // 1. Agent started execution
    socket.on('agent_started', (data: { agentId: string; name: string; emoji?: string; message: string }) => {
      setPipelineStatus('executing');
      setActiveAgent({ name: data.name, emoji: data.emoji, message: data.message });
      
      // Update or add agent to pipeline sequences
      setExecutedSteps((prev) => {
        const exists = prev.some((s) => s.agentId === data.agentId);
        if (exists) {
          return prev.map((s) => s.agentId === data.agentId ? { ...s, status: 'running' } : s);
        } else {
          return [...prev, { agentId: data.agentId, name: data.name, emoji: data.emoji, status: 'running' }];
        }
      });
    });

    // 2. Agent successfully completed step
    socket.on('agent_completed', (data: { agentId: string; name: string; output: AgentOutput; tokensUsed: number; costUsed: number }) => {
      setActiveAgent(null);
      setExecutedSteps((prev) => 
        prev.map((s) => s.agentId === data.agentId 
          ? { ...s, status: 'completed', output: data.output, tokensUsed: data.tokensUsed, costUsed: data.costUsed } 
          : s
        )
      );
    });

    // 3. Execution successfully completed
    socket.on('execution_complete', (_data: any) => {
      setPipelineStatus('complete');
      setActiveAgent(null);
      
      // Fetch compiled code and files aggregates
      fetch(`/api/result/${sessionId}`)
        .then((res) => res.json())
        .then((resultData) => {
          setSynthesisReport(resultData);
          const filenames = Object.keys(resultData.artifacts || {});
          if (filenames.length > 0) {
            setViewingFile({ filename: filenames[0], content: resultData.artifacts[filenames[0]] });
          }
        });
    });

    // 4. Execution crashed (Hard failure)
    socket.on('execution_failed', (data: { error: string }) => {
      setPipelineStatus('failed');
      setActiveAgent(null);
      setErrorMsg(data.error);
      setExecutedSteps((prev) => 
        prev.map((s) => s.status === 'running' ? { ...s, status: 'failed' } : s)
      );
    });

    // Cleanup: remove listeners and disconnect socket on component unmount
    return () => {
      console.info('[WebSocket] Disconnecting listener for session:', sessionId);
      socket.emit('leave_session', sessionId);
      socket.disconnect();
    };
  }, [sessionId]);

  if (loadingState) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-neutral-600 animate-spin" />
        <p className="text-xs text-neutral-400 mt-2">Loading monitor panel state...</p>
      </div>
    );
  }

  // Calculate live cost tally
  const totalTokens = executedSteps.reduce((acc, curr) => acc + (curr.tokensUsed || 0), 0);
  const totalCost = executedSteps.reduce((acc, curr) => acc + (curr.costUsed || 0), 0);

  return (
    <div className="flex-1 w-full space-y-8 animate-fade-in">
      {/* 1. Header Area with live counters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-neutral-900 pb-6 gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              pipelineStatus === 'executing' ? 'bg-amber-500 animate-pulse' :
              pipelineStatus === 'complete' ? 'bg-emerald-500' : 'bg-red-500'
            }`} />
            <h2 className="text-2xl font-bold tracking-tight text-white capitalize">
              Pipeline {pipelineStatus}
            </h2>
          </div>
          <p className="text-xs text-neutral-400">
            Session: <code className="text-neutral-300 font-mono bg-neutral-900 px-1 py-0.5 rounded">{sessionId}</code>
          </p>
        </div>

        {/* Dynamic counters */}
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-neutral-900 bg-neutral-950">
            <Flame className="w-4 h-4 text-orange-500" />
            <div className="text-left leading-none">
              <span className="text-[10px] text-neutral-500 font-semibold uppercase block">Tokens used</span>
              <span className="text-xs font-bold text-white mt-0.5">{totalTokens.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-neutral-900 bg-neutral-950">
            <Coins className="w-4 h-4 text-emerald-500" />
            <div className="text-left leading-none">
              <span className="text-[10px] text-neutral-500 font-semibold uppercase block">Tally Cost</span>
              <span className="text-xs font-bold text-emerald-400 mt-0.5">${totalCost.toFixed(5)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          PIPELINE ACTIVE RUN VIEW
         ========================================== */}
      {pipelineStatus === 'executing' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step list sequence */}
          <div className="md:col-span-1 space-y-4 border-r border-neutral-900 pr-6">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Agents Queue</h3>
            <div className="space-y-3">
              {executedSteps.map((step) => (
                <div 
                  key={step.agentId} 
                  className={`flex items-center justify-between p-3 rounded-lg border text-xs font-medium transition-all ${
                    step.status === 'running' 
                      ? 'border-amber-500/30 bg-amber-500/5 text-white' 
                      : step.status === 'completed'
                      ? 'border-emerald-500/20 bg-neutral-950 text-neutral-300'
                      : 'border-neutral-900 bg-neutral-950/20 text-neutral-500'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>{step.emoji}</span>
                    <span>{step.name}</span>
                  </div>
                  <div>
                    {step.status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />}
                    {step.status === 'completed' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Logs console */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Live Agent console</h3>
            <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-6 min-h-[300px] flex flex-col justify-center items-center text-center space-y-4">
              {activeAgent ? (
                <>
                  <span className="text-5xl animate-bounce">{activeAgent.emoji}</span>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-white">{activeAgent.name}</h4>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">{activeAgent.message}</p>
                  </div>
                  <Loader2 className="w-5 h-5 text-neutral-500 animate-spin mt-4" />
                </>
              ) : (
                <>
                  <Terminal className="w-8 h-8 text-neutral-700" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-white">Awaiting sequence triggers...</h4>
                    <p className="text-xs text-neutral-500">Pipeline runs will start asynchronously in order.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          HARD FAILURE ERROR VIEW
         ========================================== */}
      {pipelineStatus === 'failed' && (
        <div className="border border-red-500/20 bg-red-950/5 p-8 rounded-lg max-w-2xl mx-auto text-center space-y-6 animate-scale-up">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Pipeline Execution Halted</h3>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-md mx-auto">
              A hard failure check halted the orchestrator queue. Self-healing/retries are locked for MVP.
            </p>
          </div>
          
          <div className="bg-neutral-950 border border-neutral-900 rounded-md p-4 text-left font-mono text-xs text-red-400 overflow-x-auto max-w-lg mx-auto">
            {errorMsg || 'Failed to complete execution due to code compilation errors.'}
          </div>

          <div className="pt-2 flex justify-center space-x-3">
            <Link 
              to="/build" 
              className="px-4 py-2 rounded-md bg-neutral-900 text-white font-semibold text-xs hover:bg-neutral-800 transition-colors"
            >
              Configure New Build
            </Link>
          </div>
        </div>
      )}

      {/* ==========================================
          SUCCESS RESULTS REPORT VIEW
         ========================================== */}
      {pipelineStatus === 'complete' && synthesisReport && (
        <div className="space-y-8 animate-fade-in">
          {/* Summary Box */}
          <div className="border border-neutral-900 bg-neutral-950/40 p-6 rounded-lg space-y-4">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Build Overview</h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {synthesisReport.session.userTask}
            </p>
            <div className="flex flex-wrap gap-2 pt-2 text-[11px] text-neutral-500">
              <span className="bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                Completed in ~{executedSteps.length * 2} seconds
              </span>
              <span className="bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800 text-emerald-400">
                Cost: ${totalCost.toFixed(5)}
              </span>
            </div>
          </div>

          {/* Artifact Files Explorer Layout */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* List of files */}
            <div className="md:col-span-1 space-y-3">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Generated Files</h3>
              <div className="space-y-1.5">
                {Object.keys(synthesisReport.artifacts || {}).map((filename) => {
                  const isActive = viewingFile?.filename === filename;
                  return (
                    <button
                      key={filename}
                      type="button"
                      onClick={() => setViewingFile({ filename, content: synthesisReport.artifacts[filename] })}
                      className={`w-full text-left p-2.5 rounded-md text-xs font-medium flex items-center space-x-2 border transition-all ${
                        isActive 
                          ? 'bg-white border-white text-black font-semibold' 
                          : 'bg-neutral-950/30 border-neutral-900 text-neutral-400 hover:border-neutral-800'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span className="truncate">{filename}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Code viewer window */}
            <div className="md:col-span-3 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center space-x-2">
                  <Code className="w-4 h-4" />
                  <span>File View: {viewingFile?.filename}</span>
                </h3>
                {viewingFile && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(viewingFile.content);
                      alert('Copied to clipboard!');
                    }}
                    className="px-2.5 py-1 rounded border border-neutral-800 bg-neutral-950 text-[10px] text-neutral-400 hover:text-white transition-colors"
                  >
                    Copy Code
                  </button>
                )}
              </div>

              <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-6 font-mono text-[11px] leading-relaxed text-neutral-300 overflow-x-auto min-h-[400px]">
                <pre>{viewingFile?.content || 'No file selected.'}</pre>
              </div>
            </div>
          </div>

          {/* Next steps list */}
          <div className="pt-6 border-t border-neutral-900 flex justify-end space-x-3">
            <Link
              to="/build"
              className="px-5 py-2.5 rounded-md border border-neutral-800 text-neutral-400 font-semibold text-xs hover:text-white transition-colors"
            >
              Build Another Project
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

const executionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/execution/$sessionId',
  component: ExecutionComponent,
});

// ==========================================
// 5. Router Instance Setup
// ==========================================
const routeTree = rootRoute.addChildren([indexRoute, buildRoute, executionRoute]);

export const router = createRouter({ 
  routeTree,
  defaultPreload: 'intent',
});

// Register the router instance for type safety checks
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
