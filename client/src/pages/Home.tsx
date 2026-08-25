import { LineageGraph } from "@/components/LineageGraph";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import type { ProvenanceNode, ProvenanceStatus } from "@shared/provenance";
import { AlertTriangle, ArrowDownToLine, ArrowUpRight, Bell, Box, Check, ChevronDown, CircleDot, Database, FileText, GitCompareArrows, History, Layers3, Play, RefreshCw, Search, ShieldCheck, Sparkles, Workflow, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

type NavItem = "Overview" | "Lineage explorer" | "Runs" | "Versions" | "Reports";

const nav: { label: NavItem; icon: typeof Layers3 }[] = [
  { label: "Overview", icon: Layers3 },
  { label: "Lineage explorer", icon: Workflow },
  { label: "Runs", icon: History },
  { label: "Versions", icon: GitCompareArrows },
  { label: "Reports", icon: FileText },
];

const kindIcon: Record<ProvenanceNode["kind"], typeof Database> = {
  dataset: Database,
  transformation: RefreshCw,
  feature: Sparkles,
  model: Box,
  run: Play,
  result: FileText,
  job: Workflow,
};

function StatusPill({ status }: { status: ProvenanceStatus }) {
  const words: Record<ProvenanceStatus, string> = { fresh: "Fresh", stale: "Stale", changed: "Changed", running: "Running", archived: "Archived" };
  return <span className={`status-pill status-${status}`}><span className="status-dot" />{words[status]}</span>;
}

function MetricCard({ item }: { item: { label: string; value: string; change: string; tone: string } }) {
  return (
    <article className="metric-card">
      <p className="eyebrow">{item.label}</p>
      <div className="metric-value">{item.value}</div>
      <p className={`metric-change ${item.tone === "warning" ? "warning" : item.tone === "positive" ? "positive" : ""}`}>{item.change}</p>
    </article>
  );
}

export default function Home() {
  const { data, isLoading } = trpc.provenance.overview.useQuery();
  const [activeNav, setActiveNav] = useState<NavItem>("Overview");
  const [selectedId, setSelectedId] = useState("result-risk");
  const [traceMode, setTraceMode] = useState<"upstream" | "downstream" | "all">("upstream");
  const [showReport, setShowReport] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [replayed, setReplayed] = useState(false);

  const traceQuery = trpc.provenance.trace.useQuery({ id: selectedId, direction: traceMode });
  const reportQuery = trpc.provenance.report.useQuery({ entityId: selectedId });
  const compareQuery = trpc.provenance.compare.useQuery({ baseline: "v2.7.4", candidate: "v2.8.0" });
  const selected = useMemo(() => data?.graph.nodes.find(node => node.id === selectedId) ?? data?.graph.nodes.at(-1), [data, selectedId]);
  const onSelect = useCallback((id: string) => setSelectedId(id), []);

  if (isLoading || !data || !selected) {
    return <div className="app-loading"><div className="loading-mark">PX</div><p>Preparing the provenance graph</p></div>;
  }

  const traceGraph = traceQuery.data ?? data.graph;
  const SelectedIcon = kindIcon[selected.kind];
  const exportReport = () => {
    if (!reportQuery.data) return;
    const report = reportQuery.data;
    const markdown = `# ${report.title}\n\nGenerated: ${report.generatedAt}\n\n## Subject\n- Asset: ${report.subject.name}\n- Version: ${report.subject.version}\n- Integrity: ${report.integrity}\n- Upstream assets: ${report.upstreamAssets}\n\n## Freshness finding\n${report.staleReason}\n\n## Reproduction\n- Workflow: ${report.reproduction.workflow}\n- Recorded run: ${report.reproduction.runId}\n- Specification: ${report.reproduction.specification}\n- Environment: ${report.reproduction.environment}\n`;
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report.subject.name}-provenance-report.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-wrap">
          <div className="brand-mark"><span>P</span><i /></div>
          <div><div className="brand-name">Provenance<span>X</span></div><p className="brand-sub">LINEAGE INTELLIGENCE</p></div>
        </div>
        <div className="environment"><span className="env-pulse" />Production <ChevronDown size={14} /></div>
        <nav className="side-nav" aria-label="Primary navigation">
          <p className="nav-caption">Workspace</p>
          {nav.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-link ${activeNav === label ? "active" : ""}`} onClick={() => setActiveNav(label)}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === "Runs" && <b>3</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="pipeline-card">
            <div className="pipeline-card-icon"><Workflow size={17} /></div>
            <div><p>Pipeline health</p><strong>96.2% fresh</strong></div>
            <ArrowUpRight size={15} />
          </div>
          <div className="profile"><div className="profile-avatar">IH</div><div><strong>Isla Hart</strong><p>Data Platform</p></div><ChevronDown size={15} /></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div><p className="page-path">WORKSPACE / <span>{activeNav.toUpperCase()}</span></p><h1>{activeNav === "Overview" ? "System overview" : activeNav}</h1></div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={() => setSearchOpen(!searchOpen)} aria-label="Search assets"><Search size={18} /></button>
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /><i className="notification-dot" /></button>
            <Button className="new-run" onClick={() => setReplayed(true)}><Play size={15} fill="currentColor" />{replayed ? "Replay queued" : "Replay pipeline"}</Button>
          </div>
        </header>

        {searchOpen && <div className="search-panel"><Search size={16} /><input autoFocus placeholder="Find a dataset, pipeline, model, or run…" /><kbd>ESC</kbd></div>}

        <section className="hero-row">
          <div><p className="section-kicker">Data-to-model observability</p><h2>Trace every result to its exact origin.</h2><p className="hero-copy">Understand the versions, transformations, and runs that produced your data products — then reproduce any decision with confidence.</p></div>
          <div className="hero-meta"><div><ShieldCheck size={16} /><span>Integrity monitored</span></div><p>Last graph sync<br /><strong>09:31 UTC</strong></p></div>
        </section>

        <section className="metric-grid">{data.metrics.map(metric => <MetricCard key={metric.label} item={metric} />)}</section>

        <section className="alert-banner">
          <div className="alert-symbol"><AlertTriangle size={18} /></div>
          <div><p>{data.alert.title}</p><span>{data.alert.description}</span></div>
          <button onClick={() => { setSelectedId(data.alert.resultId); setTraceMode("upstream"); }} className="alert-action">Investigate <ArrowUpRight size={15} /></button>
          <button className="dismiss"><X size={17} /></button>
        </section>

        <section className="panel lineage-panel">
          <div className="panel-header">
            <div><p className="section-kicker">Lineage map</p><h3>Retention risk pipeline</h3></div>
            <div className="graph-actions">
              <div className="segmented-control">
                {(["upstream", "downstream", "all"] as const).map(mode => <button key={mode} onClick={() => setTraceMode(mode)} className={traceMode === mode ? "selected" : ""}>{mode}</button>)}
              </div>
              <Button variant="outline" className="report-button" onClick={() => setShowReport(true)}><FileText size={15} />Provenance report</Button>
            </div>
          </div>
          <div className="lineage-body">
            <div className="graph-stage"><LineageGraph nodes={traceGraph.nodes} edges={traceGraph.edges} selectedId={selectedId} onSelect={onSelect} /></div>
            <aside className="asset-drawer">
              <div className="drawer-top"><span>SELECTED ASSET</span><StatusPill status={selected.status} /></div>
              <div className="asset-icon"><SelectedIcon size={23} /></div>
              <h4>{selected.name}</h4><p className="asset-version">{selected.version}</p><p className="asset-description">{selected.description}</p>
              <div className="metadata-list">
                <div><span>TYPE</span><strong>{selected.kind}</strong></div>
                <div><span>OWNER</span><strong>{selected.owner}</strong></div>
                <div><span>UPDATED</span><strong>{selected.updatedAt}</strong></div>
                {Object.entries(selected.metadata).slice(0, 2).map(([key, value]) => <div key={key}><span>{key.toUpperCase()}</span><strong className="mono">{value}</strong></div>)}
              </div>
              <div className="drawer-actions"><Button onClick={() => setShowReport(true)}><FileText size={15} />View report</Button><Button variant="outline" onClick={() => setReplayed(true)}><RefreshCw size={15} />Replay</Button></div>
            </aside>
          </div>
          <div className="graph-footer"><div className="legend"><span><i className="legend-dot dataset" />Dataset</span><span><i className="legend-dot transform" />Transform</span><span><i className="legend-dot feature" />Features</span><span><i className="legend-dot model" />Model</span><span><i className="legend-dot result" />Result</span></div><p>Click an asset to inspect its metadata</p></div>
        </section>

        <section className="lower-grid">
          <article className="panel history-panel">
            <div className="panel-header compact"><div><p className="section-kicker">Dataset history</p><h3>orders_raw</h3></div><button className="text-button" onClick={() => setActiveNav("Versions")}>View all <ArrowUpRight size={14} /></button></div>
            <div className="history-table">
              <div className="history-row history-head"><span>VERSION</span><span>RECEIVED</span><span>ROWS</span><span>STATUS</span></div>
              {data.datasetHistory.map(item => <div className="history-row" key={item.version}><div><strong>{item.version}</strong><small>{item.note}</small></div><span>{item.time}</span><span className="mono">{item.rows}</span><StatusPill status={item.status as ProvenanceStatus} /></div>)}
            </div>
          </article>
          <article className="panel runs-panel">
            <div className="panel-header compact"><div><p className="section-kicker">Recorded runs</p><h3>Latest executions</h3></div><button className="text-button" onClick={() => setActiveNav("Runs")}>Run history <ArrowUpRight size={14} /></button></div>
            <div className="runs-list">{data.runHistory.map((run, index) => <div className="run-item" key={run.id}><div className={`run-timeline ${index === 0 ? "attention" : ""}`}><i /></div><div className="run-data"><strong>{run.label}</strong><span>{run.id}</span><p>{run.time} <b>·</b> {run.duration} <b>·</b> {run.note}</p><p className="run-io">Inputs: orders_raw, customers_raw <b>→</b> Output: 4.1M risk predictions</p></div><StatusPill status={run.status as ProvenanceStatus} /></div>)}</div>
          </article>
        </section>

        <section className="panel comparison-teaser">
          <div><p className="section-kicker">Version intelligence</p><h3>See what changed between pipeline versions.</h3><p>Compare inputs, transformations, environments, and outputs before you replay a run.</p></div>
          <div className="version-pair"><div><span>BASELINE</span><strong>v2.7.4</strong><small>11 Feb 2025</small></div><GitCompareArrows size={24} /><div className="current"><span>CANDIDATE</span><strong>v2.8.0</strong><small>18 Feb 2025</small></div></div>
          <Button onClick={() => setShowCompare(true)}>Compare versions <GitCompareArrows size={16} /></Button>
        </section>
      </main>

      {showReport && reportQuery.data && <div className="modal-backdrop" role="presentation"><section className="modal report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title"><button className="modal-close" onClick={() => setShowReport(false)}><X size={18} /></button><div className="report-header"><div className="report-brand"><span>PX</span>PROVENANCEX</div><StatusPill status={reportQuery.data.subject.status} /></div><p className="section-kicker">Generated {reportQuery.data.generatedAt}</p><h2 id="report-title">{reportQuery.data.title}</h2><p className="report-subject">A compact, reproducible record for <strong>{reportQuery.data.subject.version}</strong>.</p><div className="report-stats"><div><span>UPSTREAM ASSETS</span><strong>{reportQuery.data.upstreamAssets}</strong></div><div><span>INTEGRITY</span><strong>{reportQuery.data.integrity}</strong></div><div><span>REPLAY SPEC</span><strong className="mono">{reportQuery.data.reproduction.specification}</strong></div></div><div className="report-warning"><AlertTriangle size={17} /><div><strong>Freshness finding</strong><p>{reportQuery.data.staleReason}</p></div></div><div className="reproduction-box"><div><CircleDot size={17} /><div><strong>Reproduce this output</strong><p>{reportQuery.data.reproduction.workflow} · {reportQuery.data.reproduction.runId}</p><code>{reportQuery.data.reproduction.environment}</code></div></div><Button onClick={() => { setReplayed(true); setShowReport(false); }}>Replay run <Play size={15} /></Button></div><div className="report-actions"><Button variant="outline" onClick={() => setShowReport(false)}>Close</Button><Button onClick={exportReport}><ArrowDownToLine size={15} />Export report</Button></div></section></div>}
      {showCompare && compareQuery.data && <div className="modal-backdrop" role="presentation"><section className="modal compare-modal" role="dialog" aria-modal="true" aria-labelledby="compare-title"><button className="modal-close" onClick={() => setShowCompare(false)}><X size={18} /></button><p className="section-kicker">Pipeline comparison</p><h2 id="compare-title">v2.7.4 <GitCompareArrows size={20} /> v2.8.0</h2><p className="report-subject">Three material changes were detected before replay.</p><div className="diff-list">{compareQuery.data.changedStages.map(change => <div className="diff-row" key={change.stage}><div><strong>{change.stage}</strong><span>{change.change}</span></div><code>{change.before}</code><ArrowUpRight size={16} /><code className="after">{change.after}</code></div>)}</div><div className="compare-footer"><div><Check size={16} />Output contract unchanged</div><Button onClick={() => { setShowCompare(false); setReplayed(true); }}>Replay v2.8.0 <Play size={15} /></Button></div></section></div>}
      {replayed && <div className="toast-notice"><Check size={16} />Replay queued from the recorded v2.8.0 specification.<button onClick={() => setReplayed(false)}><X size={15} /></button></div>}
    </div>
  );
}
