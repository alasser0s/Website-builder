import type { BlueprintNode } from '../../foundation/types';

interface StubRendererProps {
  node: BlueprintNode;
}

export function StubRenderer({ node }: StubRendererProps) {
  const Tag = (node.type === 'page' ? 'main' : node.type === 'container' ? 'div' : 'div') as any;
  return (
    <Tag data-node-id={node.id} style={{ outline: '1px dashed #888', padding: 8, margin: 6 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>#{node.id} [{node.type}]</div>
      {node.children.map((child) => (
        <StubRenderer key={child.id} node={child} />
      ))}
    </Tag>
  );
}


