<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { tasks, agents, stats, kanbanColumns, sseConnected, dataMode, loadMockData, createTask, transitionTask, runPipeline, loadTasks, loadAgents, loadStats } from '$lib/stores/quay';
  import type { Task } from '$lib/types/index.js';

  // ── State (Svelte 5 runes) ─────────────────────────────────
  let newTaskTitle = $state('');
  let newTaskDesc = $state('');
  let showNewTask = $state(false);
  let activeTab = $state('overview');
  let selectedTask: Task | null = $state(null);
  let projectId = 'demo-project';

  const COLORS: Record<string, string> = {
    BACKLOG: '#6b7280', QUEUED: '#3b82f6', IN_PROGRESS: '#f59e0b',
    REVIEW: '#8b5cf6', DONE: '#10b981', FAILED: '#ef4444', BLOCKED: '#f97316',
  };

  // ── Lifecycle ───────────────────────────────────────────────
  onMount(async () => {
    loadMockData();
    // Resolve real project UUID for when user switches to live mode
    try {
      const res = await fetch('http://localhost:3001/api/projects', {
        headers: { 'Authorization': 'Bearer quay-dev-key' },
      });
      const projects = await res.json();
      if (projects.length > 0) projectId = projects[0].id;
    } catch { /* ignore */ }
  });

  async function toggleMode() {
    const next = get(dataMode) === 'mock' ? 'live' : 'mock';
    dataMode.set(next);
    if (next === 'live' && projectId !== 'demo-project') {
      await Promise.all([loadTasks(projectId), loadAgents(), loadStats(projectId)]);
    } else if (next === 'mock') {
      loadMockData();
    }
  }

  async function handleCreateTask() {
    if (!newTaskTitle.trim()) return;
    const t: Task = {
      id: crypto.randomUUID(), projectId, title: newTaskTitle,
      description: newTaskDesc, state: 'BACKLOG', priority: 5,
      schedulingPolicy: 'FAIR_SHARE', assignedAgentId: null,
      correlationId: null, parentTaskId: null,
      createdAt: Date.now(), updatedAt: Date.now(), completedAt: null,
    };
    tasks.update(ts => [t, ...ts]);
    newTaskTitle = ''; newTaskDesc = ''; showNewTask = false;
  }

  async function handleRun(taskId: string) {
    tasks.update(ts => ts.map(t => t.id === taskId ? { ...t, state: 'IN_PROGRESS' } : t));
    setTimeout(() => {
      tasks.update(ts => ts.map(t => t.id === taskId ? { ...t, state: 'DONE' } : t));
    }, 2000);
  }

  function timeAgo(ts: number): string {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  const activityFeed = [
    { agent: 'Alice Coder', action: 'implemented OAuth2 login', time: Date.now() - 300000, type: 'code' },
    { agent: 'Bob Reviewer', action: 'approved payment retry PR', time: Date.now() - 900000, type: 'review' },
    { agent: 'Carol Security', action: 'ran SAST scan — 0 vulns', time: Date.now() - 1800000, type: 'security' },
    { agent: 'Alice Coder', action: 'started Redis caching task', time: Date.now() - 3600000, type: 'code' },
    { agent: 'Dave Architect', action: 'completed API rate limit spec', time: Date.now() - 7200000, type: 'spec' },
    { agent: 'Eve Deployer', action: 'deployed v2.4.1 to staging', time: Date.now() - 14400000, type: 'deploy' },
  ];

  const agentIcons: Record<string, string> = { CODING: '✏️', REVIEW: '👁️', SECURITY: '🔒', ARCHITECT: '🏗️', QA: '🧪', DEPLOYER: '🚀', RESEARCHER: '🔬' };
  const agentColors: Record<string, string> = { IDLE: '#10b981', BUSY: '#f59e0b', OFFLINE: '#374151', ERROR: '#ef4444' };
  const activityIconMap: Record<string, string> = { code: '✏️', review: '👁️', security: '🔒', deploy: '🚀', spec: '📋' };
  function getActivityIcon(type: string): string { return activityIconMap[type] ?? '📋'; }
</script>

<div class="app">
  <!-- SIDEBAR -->
  <aside class="sidebar">
    <div class="sidebar-logo">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="8" fill="#5A1BA9"/>
        <path d="M7 8h14M7 14h8M7 20h11" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <circle cx="21" cy="20" r="3" fill="#10b981"/>
      </svg>
      <div>
        <div class="logo-name">Quay</div>
        <div class="logo-sub">Software Factory</div>
      </div>
    </div>

    <nav class="sidebar-nav">
      {#each [
        { id: 'overview', label: 'Dashboard', icon: '▣' },
        { id: 'kanban', label: 'Kanban', icon: '☰' },
        { id: 'agents', label: 'Agents', icon: '⚙' },
        { id: 'pipelines', label: 'Pipelines', icon: '⟫' },
        { id: 'activity', label: 'Activity', icon: '◎' },
        { id: 'settings', label: 'Settings', icon: '◈' },
      ] as item}
        <button
          class="nav-item"
          class:active={activeTab === item.id}
          onclick={() => activeTab = item.id}
        >{item.icon} {item.label}</button>
      {/each}
    </nav>

    <div class="sidebar-bottom">
      <div class="mode-toggle">
        <button class="mode-btn" class:active={$dataMode === 'mock'} onclick={toggleMode}>Mock</button>
        <button class="mode-btn" class:active={$dataMode === 'live'} onclick={toggleMode}>Live</button>
      </div>
      <div class="user-info">
        <div class="user-avatar">SC</div>
        <div>
          <div class="user-name">Subho C.</div>
          <div class="user-role">Admin</div>
        </div>
      </div>
    </div>
  </aside>

  <!-- MAIN -->
  <main class="main">
    <header class="topbar">
      <div class="topbar-left">
        <h1 class="page-title">Dashboard</h1>
        <span class="project-badge">Demo Project</span>
        {#if $sseConnected}<span class="live-dot" title="Live"></span>{/if}
      </div>
      <div class="topbar-right">
        <div class="search-box">
          <span>🔍</span>
          <input type="text" placeholder="Search tasks, agents..." />
        </div>
        <button class="btn-primary" onclick={() => showNewTask = true}>+ New Task</button>
      </div>
    </header>

    <!-- KPI Cards -->
    <section class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-label">Success Rate</div>
        <div class="kpi-value" style="color:#10b981">97.2%</div>
        <div class="kpi-sub">+1.4% from last week</div>
        <div class="kpi-bar"><div class="kpi-fill" style="width:97.2%;background:#10b981"></div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Active Agents</div>
        <div class="kpi-value">{$stats?.activeAgents ?? 3}<span class="kpi-total">/{$stats?.totalAgents ?? 5}</span></div>
        <div class="kpi-sub">3 running, 2 idle</div>
        <div class="agent-dots">
          {#each $agents as agent}
            <div class="agent-dot" style="background:{agentColors[agent.status] ?? '#10b981'}" title="{agent.name}: {agent.status}"></div>
          {/each}
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Pipeline Health</div>
        <div class="kpi-value" style="color:#10b981">10<span class="kpi-unit">/12</span></div>
        <div class="kpi-sub">succeeded today</div>
        <div class="donut">
          <svg viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="15" fill="none" stroke="#1e293b" stroke-width="6"/>
            <circle cx="20" cy="20" r="15" fill="none" stroke="#10b981" stroke-width="6"
              stroke-dasharray="78.2 94.2" stroke-linecap="round" transform="rotate(-90 20 20)"/>
          </svg>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Today's Cost</div>
        <div class="kpi-value">${($stats?.totalCostToday ?? 0.0847).toFixed(4)}</div>
        <div class="kpi-sub">{$stats?.totalRunsToday ?? 12} runs · avg {$stats?.avgLatencyMs ?? 1240}ms</div>
        <div class="kpi-trend up">↗ 8% vs yesterday</div>
      </div>
    </section>

    <!-- Content Grid -->
    <div class="content-grid">
      <!-- Left: Kanban -->
      <div class="kanban-section">
        <div class="section-header">
          <h2>Tasks</h2>
          <div class="tab-row">
            <button class="tab" class:active={activeTab === 'overview'} onclick={() => activeTab = 'overview'}>Overview</button>
            <button class="tab" class:active={activeTab === 'kanban'} onclick={() => activeTab = 'kanban'}>Kanban</button>
          </div>
        </div>

        {#if activeTab === 'kanban'}
          <div class="kanban-board">
            {#each $kanbanColumns as col}
              {#if col.tasks.length > 0 || col.state !== 'BACKLOG'}
                <div class="kanban-col">
                  <div class="col-header" style="border-color:{COLORS[col.state]}">
                    <span class="col-label" style="color:{COLORS[col.state]}">{col.label}</span>
                    <span class="col-count">{col.tasks.length}</span>
                  </div>
                  <div class="col-tasks">
                    {#each col.tasks as task}
                      <div class="task-card" onclick={() => selectedTask = task} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (selectedTask = task)}>
                        <div class="task-title">{task.title}</div>
                        <div class="task-meta">
                          <span class="task-priority">{'★'.repeat(Math.ceil(task.priority / 3))}</span>
                          <span class="task-time">{timeAgo(task.updatedAt)}</span>
                        </div>
                        {#if task.state === 'IN_PROGRESS'}
                          <div class="task-progress"><div class="task-progress-bar"></div></div>
                        {/if}
                        {#if col.state === 'BLOCKED'}
                          <div class="blocked-badge">🔒 Human review needed</div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        {:else}
          <div class="task-table">
            {#each $tasks.slice(0, 8) as task}
              <div class="task-row" onclick={() => selectedTask = task} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (selectedTask = task)}>
                <div class="task-row-left">
                  <span class="task-state-dot" style="background:{COLORS[task.state]}"></span>
                  <span class="task-row-title">{task.title}</span>
                </div>
                <div class="task-row-right">
                  <span class="task-row-state" style="color:{COLORS[task.state]}">{task.state.replace('_', ' ')}</span>
                  <button class="run-btn" onclick={(e) => { e.stopPropagation(); handleRun(task.id); }}>▶ Run</button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Right: Activity -->
      <div class="activity-section">
        <div class="section-header"><h2>Recent Activity</h2></div>
        <div class="activity-feed">
          {#each activityFeed as event}
            <div class="activity-item">
              <div class="activity-icon {event.type}">{getActivityIcon(event.type)}</div>
              <div class="activity-body">
                <div class="activity-agent">{event.agent}</div>
                <div class="activity-action">{event.action}</div>
              </div>
              <div class="activity-time">{timeAgo(event.time)}</div>
            </div>
          {/each}
        </div>
        <div class="quick-stats">
          {#each [['Uptime', `${(($stats?.uptimeSeconds ?? 86400) / 86400).toFixed(1)}d`], ['This week', '47 runs'], ['Savings', '62%']] as [label, val]}
            <div class="qs-item">
              <span class="qs-label">{label}</span>
              <span class="qs-value" style={label === 'Savings' ? 'color:#10b981' : ''}>{val}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </main>
</div>

<!-- New Task Modal -->
{#if showNewTask}
  <div class="modal-overlay" onclick={() => showNewTask = false} onkeydown={(e) => e.key === 'Escape' && (showNewTask = false)} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
      <div class="modal-header">
        <h3>New Task</h3>
        <button class="modal-close" onclick={() => showNewTask = false}>×</button>
      </div>
      <div class="modal-body">
        <label class="form-label">
          Title
          <input class="form-input" type="text" bind:value={newTaskTitle} placeholder="e.g., Add user profile page" />
        </label>
        <label class="form-label">
          Description
          <textarea class="form-input" bind:value={newTaskDesc} placeholder="Detailed description..." rows="3"></textarea>
        </label>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" onclick={() => showNewTask = false}>Cancel</button>
        <button class="btn-primary" onclick={handleCreateTask}>Create Task</button>
      </div>
    </div>
  </div>
{/if}

<!-- Task Detail Modal -->
{#if selectedTask}
  <div class="modal-overlay" onclick={() => selectedTask = null} onkeydown={(e) => e.key === 'Escape' && (selectedTask = null)} role="presentation">
    <div class="modal modal-lg" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
      <div class="modal-header">
        <h3>{selectedTask.title}</h3>
        <button class="modal-close" onclick={() => selectedTask = null}>×</button>
      </div>
      <div class="modal-body">
        <p class="task-desc">{selectedTask.description || 'No description'}</p>
        <div class="task-detail-grid">
          {#each [
            ['State', selectedTask.state, COLORS[selectedTask.state]],
            ['Priority', `${'★'.repeat(Math.ceil(selectedTask.priority / 3))} (${selectedTask.priority}/10)`, '#f59e0b'],
            ['Scheduling', selectedTask.schedulingPolicy, '#94a3b8'],
            ['Created', timeAgo(selectedTask.createdAt), '#94a3b8'],
          ] as [label, val, color]}
            <div class="td-item">
              <span class="td-label">{label}</span>
              <span class="td-value" style="color:{color}">{val}</span>
            </div>
          {/each}
        </div>
      </div>
      <div class="modal-footer">
        {#if selectedTask.state === 'BACKLOG'}
          <button class="btn-primary" onclick={() => { transitionTask(selectedTask!.id, 'SUBMIT'); selectedTask = null; }}>Submit to Queue</button>
        {/if}
        {#if selectedTask.state === 'QUEUED'}
          <button class="btn-primary" onclick={() => { handleRun(selectedTask!.id); selectedTask = null; }}>▶ Run Pipeline</button>
        {/if}
        {#if selectedTask.state === 'FAILED'}
          <button class="btn-primary" onclick={() => { transitionTask(selectedTask!.id, 'RETRY'); selectedTask = null; }}>↻ Retry</button>
        {/if}
        <button class="btn-ghost" onclick={() => selectedTask = null}>Close</button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(*) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) { background: #0a0e12; color: #e2e8f0; font-family: 'Inter', system-ui, sans-serif; }

  .app { display: grid; grid-template-columns: 220px 1fr; height: 100vh; overflow: hidden; }

  .sidebar { background: #0d1117; border-right: 1px solid #1e293b; display: flex; flex-direction: column; padding: 16px 0; }
  .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 0 16px 20px; border-bottom: 1px solid #1e293b; margin-bottom: 12px; }
  .logo-name { font-size: 16px; font-weight: 700; color: #f8fafc; }
  .logo-sub { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }

  .sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 0 8px; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 6px; background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 13px; text-align: left; width: 100%; transition: all 0.15s; font-family: inherit; }
  .nav-item:hover { background: #1e293b; color: #e2e8f0; }
  .nav-item.active { background: rgba(90,27,169,0.2); color: #c084fc; }

  .sidebar-bottom { padding: 12px 16px 0; border-top: 1px solid #1e293b; display: flex; flex-direction: column; gap: 12px; }
  .mode-toggle { display: flex; background: #1e293b; border-radius: 8px; padding: 3px; }
  .mode-btn { flex: 1; padding: 5px; border: none; background: none; color: #64748b; cursor: pointer; border-radius: 6px; font-size: 12px; transition: all 0.15s; font-family: inherit; }
  .mode-btn.active { background: #5A1BA9; color: #fff; }
  .user-info { display: flex; align-items: center; gap: 10px; }
  .user-avatar { width: 32px; height: 32px; background: #5A1BA9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #fff; }
  .user-name { font-size: 13px; font-weight: 500; }
  .user-role { font-size: 11px; color: #64748b; }

  .main { display: flex; flex-direction: column; overflow: hidden; }
  .topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid #1e293b; background: #0d1117; }
  .topbar-left { display: flex; align-items: center; gap: 12px; }
  .page-title { font-size: 18px; font-weight: 600; color: #f8fafc; }
  .project-badge { background: #1e293b; color: #94a3b8; font-size: 11px; padding: 3px 8px; border-radius: 4px; }
  .live-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  .topbar-right { display: flex; align-items: center; gap: 12px; }
  .search-box { display: flex; align-items: center; gap: 8px; background: #1e293b; border: 1px solid #2d3748; border-radius: 8px; padding: 6px 12px; }
  .search-box input { background: none; border: none; outline: none; color: #e2e8f0; font-size: 13px; width: 200px; font-family: inherit; }
  .search-box input::placeholder { color: #64748b; }
  .btn-primary { background: #5A1BA9; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-size: 13px; cursor: pointer; font-weight: 500; transition: background 0.15s; font-family: inherit; }
  .btn-primary:hover { background: #4a1590; }
  .btn-ghost { background: none; color: #94a3b8; border: 1px solid #2d3748; padding: 8px 16px; border-radius: 8px; font-size: 13px; cursor: pointer; font-family: inherit; }
  .btn-ghost:hover { border-color: #5A1BA9; color: #c084fc; }

  .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 20px 24px; }
  .kpi-card { background: #0d1117; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; position: relative; overflow: hidden; }
  .kpi-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
  .kpi-value { font-size: 28px; font-weight: 700; color: #f8fafc; }
  .kpi-total { font-size: 16px; color: #64748b; }
  .kpi-unit { font-size: 14px; color: #64748b; }
  .kpi-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
  .kpi-bar { height: 4px; background: #1e293b; border-radius: 2px; margin-top: 10px; overflow: hidden; }
  .kpi-fill { height: 100%; border-radius: 2px; transition: width 0.5s; }
  .kpi-trend { display: flex; align-items: center; gap: 4px; font-size: 11px; margin-top: 6px; color: #10b981; }
  .donut { position: absolute; right: 12px; bottom: 12px; width: 40px; height: 40px; opacity: 0.8; }
  .agent-dots { display: flex; gap: 5px; margin-top: 8px; }
  .agent-dot { width: 8px; height: 8px; border-radius: 50%; }

  .content-grid { display: grid; grid-template-columns: 1fr 300px; gap: 20px; padding: 0 24px 24px; flex: 1; overflow: hidden; min-height: 0; }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .section-header h2 { font-size: 14px; font-weight: 600; color: #e2e8f0; }
  .tab-row { display: flex; gap: 4px; }
  .tab { background: none; border: none; color: #64748b; font-size: 12px; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-family: inherit; }
  .tab.active { background: #1e293b; color: #e2e8f0; }

  .kanban-section { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
  .kanban-board { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 12px; flex: 1; }
  .kanban-col { min-width: 200px; flex: 1; display: flex; flex-direction: column; gap: 8px; }
  .col-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-left: 3px solid; border-radius: 6px; background: #0d1117; }
  .col-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .col-count { background: #1e293b; color: #64748b; font-size: 11px; padding: 1px 7px; border-radius: 10px; }
  .col-tasks { display: flex; flex-direction: column; gap: 8px; }
  .task-card { background: #0d1117; border: 1px solid #1e293b; border-radius: 8px; padding: 10px; cursor: pointer; transition: all 0.15s; }
  .task-card:hover { border-color: #5A1BA9; background: rgba(90,27,169,0.05); }
  .task-title { font-size: 12px; font-weight: 500; color: #e2e8f0; line-height: 1.4; }
  .task-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
  .task-priority { color: #f59e0b; font-size: 10px; }
  .task-time { font-size: 10px; color: #475569; }
  .task-progress { margin-top: 6px; height: 3px; background: #1e293b; border-radius: 2px; overflow: hidden; }
  .task-progress-bar { height: 100%; background: linear-gradient(90deg, #5A1BA9, #c084fc); width: 60%; animation: progress 2s ease-in-out infinite; }
  @keyframes progress { 0% { width: 30%; } 100% { width: 80%; } }
  .blocked-badge { margin-top: 6px; font-size: 10px; color: #f97316; background: rgba(249,115,22,0.1); padding: 3px 6px; border-radius: 4px; }

  .task-table { display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
  .task-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #0d1117; border: 1px solid #1e293b; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
  .task-row:hover { border-color: #5A1BA9; }
  .task-row-left { display: flex; align-items: center; gap: 10px; }
  .task-state-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .task-row-title { font-size: 13px; color: #e2e8f0; }
  .task-row-right { display: flex; align-items: center; gap: 10px; }
  .task-row-state { font-size: 11px; font-weight: 500; text-transform: uppercase; }
  .run-btn { background: rgba(90,27,169,0.2); color: #c084fc; border: none; padding: 4px 10px; border-radius: 5px; font-size: 11px; cursor: pointer; }
  .run-btn:hover { background: #5A1BA9; color: #fff; }

  .activity-section { display: flex; flex-direction: column; gap: 12px; min-height: 0; }
  .activity-feed { display: flex; flex-direction: column; gap: 2px; overflow-y: auto; flex: 1; }
  .activity-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 8px; border-radius: 8px; transition: background 0.15s; }
  .activity-item:hover { background: #0d1117; }
  .activity-icon { width: 28px; height: 28px; border-radius: 50%; background: #1e293b; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
  .activity-body { flex: 1; min-width: 0; }
  .activity-agent { font-size: 11px; font-weight: 600; color: #94a3b8; }
  .activity-action { font-size: 12px; color: #cbd5e1; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .activity-time { font-size: 10px; color: #475569; flex-shrink: 0; margin-top: 2px; }
  .quick-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding-top: 12px; border-top: 1px solid #1e293b; }
  .qs-item { display: flex; flex-direction: column; align-items: center; gap: 2px; background: #0d1117; border: 1px solid #1e293b; border-radius: 8px; padding: 10px; }
  .qs-label { font-size: 10px; color: #64748b; }
  .qs-value { font-size: 16px; font-weight: 700; color: #e2e8f0; }

  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; }
  .modal { background: #0d1117; border: 1px solid #1e293b; border-radius: 16px; width: 480px; max-width: 90vw; overflow: hidden; }
  .modal-lg { width: 600px; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #1e293b; }
  .modal-header h3 { font-size: 15px; font-weight: 600; color: #f8fafc; }
  .modal-close { background: none; border: none; color: #64748b; font-size: 22px; cursor: pointer; line-height: 1; }
  .modal-close:hover { color: #e2e8f0; }
  .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
  .modal-footer { padding: 16px 20px; border-top: 1px solid #1e293b; display: flex; gap: 10px; justify-content: flex-end; }
  .form-label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #94a3b8; }
  .form-input { background: #0a0e12; border: 1px solid #2d3748; border-radius: 8px; padding: 8px 12px; color: #e2e8f0; font-size: 13px; outline: none; resize: vertical; font-family: inherit; }
  .form-input:focus { border-color: #5A1BA9; }
  .task-desc { font-size: 13px; color: #94a3b8; line-height: 1.6; }
  .task-detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .td-item { display: flex; flex-direction: column; gap: 3px; }
  .td-label { font-size: 10px; color: #64748b; text-transform: uppercase; }
  .td-value { font-size: 13px; font-weight: 500; }
</style>
