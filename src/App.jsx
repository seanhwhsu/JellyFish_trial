import { useState, useCallback, useEffect } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

/* ---------------- PROPAGATION ENGINE ---------------- */
function propagate(nodes, edges) {
  const nodeMap = {};
  nodes.forEach((n) => {
    nodeMap[n.id] = { ...n, computed: 0 };
  });

  const incoming = {};
  edges.forEach((e) => {
    if (!incoming[e.target]) incoming[e.target] = [];
    incoming[e.target].push(e.source);
  });

  let changed = true;
  while (changed) {
    changed = false;
    nodes.forEach((node) => {
      const inc = incoming[node.id] || [];
      let inputSum = 0;
      inc.forEach((srcId) => {
        inputSum += nodeMap[srcId]?.computed || 0;
      });

      let newValue;
      if (node.data.isSource) {
        newValue = node.data.baseValue;
      } else {
        newValue = inputSum * (node.data.efficiency ?? 1);
      }

      if (nodeMap[node.id].computed !== newValue) {
        nodeMap[node.id].computed = newValue;
        changed = true;
      }
    });
  }

  return nodes.map((n) => ({
    ...n,
    data: {
      ...n.data,
      output: nodeMap[n.id].computed,
    },
  }));
}

/* ---------------- CONTROL PANEL ---------------- */
function ControlPanel() {
  const { zoomIn, zoomOut, fitView, setViewport, getZoom } = useReactFlow();

  const handleReset = () => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  };

  return (
    <div
      style={{
        width: 220,
        padding: 20,
        background: '#f4f4f4',
        borderRight: '1px solid #ccc',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontFamily: 'sans-serif',
      }}
    >
      <h3>Control Panel</h3>

      <button onClick={() => zoomIn({ duration: 300 })}>Zoom In</button>
      <button onClick={() => zoomOut({ duration: 300 })}>Zoom Out</button>
      <button onClick={() => fitView({ duration: 500 })}>Fit View</button>
      <button onClick={handleReset}>Reset View</button>

      <div style={{ marginTop: 10 }}>
        Current Zoom: {getZoom().toFixed(2)}
      </div>
    </div>
  );
}

/* ---------------- CUSTOM NODE ---------------- */
function EnergyNode({ id, data }) {
  const stop = (e) => e.stopPropagation();

  return (
    <div
      style={{
        padding: 10,
        width: 220,
        border: '1px solid #333',
        borderRadius: 8,
        background: 'white',
        color: 'black',
        fontFamily: 'sans-serif',
      }}
    >
      <strong>{data.label}</strong>

      <div style={{ fontSize: 12, marginTop: 5 }}>
        Output: {(data.output ?? 0).toFixed(2)}
      </div>

      {data.isSource && (
        <>
          <div style={{ fontSize: 12, marginTop: 5 }}>Base Value</div>

          <input
            className="nodrag"
            type="range"
            min="0"
            max="1000"
            step="10"
            value={data.baseValue}
            onChange={(e) =>
              data.onChange(id, { baseValue: Number(e.target.value) })
            }
            onMouseDown={stop}
            style={{ width: '100%' }}
          />

          <input
            className="nodrag"
            type="number"
            min="0"
            max="1000"
            step="10"
            value={data.baseValue}
            onChange={(e) =>
              data.onChange(id, { baseValue: Number(e.target.value) })
            }
            onMouseDown={stop}
            style={{ width: '100%', marginTop: 5 }}
          />
        </>
      )}

      {!data.isSource && (
        <>
          <div style={{ fontSize: 12, marginTop: 5 }}>
            Efficiency ({((data.efficiency ?? 1) * 100).toFixed(0)}%)
          </div>

          <input
            className="nodrag"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={data.efficiency ?? 1}
            onChange={(e) =>
              data.onChange(id, { efficiency: Number(e.target.value) })
            }
            onMouseDown={stop}
            style={{ width: '100%' }}
          />

          <input
            className="nodrag"
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={data.efficiency ?? 1}
            onChange={(e) =>
              data.onChange(id, { efficiency: Number(e.target.value) })
            }
            onMouseDown={stop}
            style={{ width: '100%', marginTop: 5 }}
          />
        </>
      )}

      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

/* ---------------- INITIAL GRAPH ---------------- */
const initialNodes = [
  { id: 'source', type: 'energy', position: { x: 0, y: 100 }, data: { label: 'Hydrothermal Vents', isSource: true, baseValue: 500 } },
  { id: 'ocean', type: 'energy', position: { x: 300, y: 100 }, data: { label: 'Ocean', efficiency: 0.85 } },
  { id: 't1', type: 'energy', position: { x: 600, y: 0 }, data: { label: 'Plume', efficiency: 0.95 } },
  { id: 't2', type: 'energy', position: { x: 600, y: 200 }, data: { label: 'Dike', efficiency: 0.9 } },
  { id: 'collect', type: 'energy', position: { x: 900, y: 100 }, data: { label: 'Collection', efficiency: 0.5 } },
  { id: 'out', type: 'energy', position: { x: 1200, y: 100 }, data: { label: 'Processing', efficiency: 0.5 } },
];

const initialEdges = [
  { id: 'e1', source: 'source', target: 'ocean' },
  { id: 'e2', source: 'ocean', target: 't1' },
  { id: 'e3', source: 'ocean', target: 't2' },
  { id: 'e4', source: 't1', target: 'collect' },
  { id: 'e5', source: 't2', target: 'collect' },
  { id: 'e6', source: 'collect', target: 'out' },
];

/* ---------------- MAIN APP ---------------- */
export default function App() {
  return (
    <ReactFlowProvider>
      <FlowApp />
    </ReactFlowProvider>
  );
}

/* ---------------- FLOW WRAPPER ---------------- */
function FlowApp() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const updateNodeData = (id, changes) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...changes } } : n
      )
    );
  };

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  useEffect(() => {
    const computed = propagate(nodes, edges);

    setNodes((nds) =>
      nds.map((n) => {
        const updated = computed.find((c) => c.id === n.id);
        return {
          ...n,
          data: {
            ...n.data,
            output: updated?.data.output,
            onChange: updateNodeData,
          },
        };
      })
    );
  }, [
    edges,
    ...nodes.map((n) =>
      n.data.isSource ? n.data.baseValue : n.data.efficiency
    ),
  ]);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <ControlPanel />

      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={{ energy: EnergyNode }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}