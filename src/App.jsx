import { useState, useCallback, useEffect } from 'react';
import {
  Background,
  ReactFlow,
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
            value={data.baseValue}
            min="0"
            max="1000"
            step="10"
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
            Efficiency ({(data.efficiency * 100).toFixed(0)}%)
          </div>

          <input
            className="nodrag"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={data.efficiency}
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
            value={data.efficiency}
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
  {
    id: 'fuel',
    type: 'energy',
    position: { x: 0, y: 100 },
    data: {
      label: 'Fuel',
      isSource: true,
      baseValue: 500,
    },
  },
  {
    id: 'gen',
    type: 'energy',
    position: { x: 250, y: 100 },
    data: {
      label: 'Generator',
      efficiency: 0.85,
    },
  },
  {
    id: 't1',
    type: 'energy',
    position: { x: 500, y: 0 },
    data: {
      label: 'Transformer A',
      efficiency: 0.95,
    },
  },
  {
    id: 't2',
    type: 'energy',
    position: { x: 500, y: 200 },
    data: {
      label: 'Transformer B',
      efficiency: 0.9,
    },
  },
];

const initialEdges = [
  { id: 'e1', source: 'fuel', target: 'gen' },
  { id: 'e2', source: 'gen', target: 't1' },
  { id: 'e3', source: 'gen', target: 't2' },
];

/* ---------------- MAIN APP ---------------- */

export default function App() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const updateNodeData = (id, changes) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, ...changes } }
          : n
      )
    );
  };

  const onNodesChange = useCallback(
    (changes) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) => addEdge(params, eds)),
    []
  );

  /* --------- PROPAGATE WHENEVER GRAPH CHANGES --------- */

  useEffect(() => {
    const computed = propagate(nodes, edges);

    setNodes((nds) =>
      computed.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onChange: updateNodeData,
        },
      }))
    );
  }, [edges, nodes.length]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={{ energy: EnergyNode }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
      </ReactFlow>
    </div>
  );
}