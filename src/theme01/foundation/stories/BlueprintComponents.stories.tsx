import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { BlueprintProvider, Renderer } from '../renderer/Renderer';
import type {
  BlueprintNode,
  BlueprintNodeData,
  BlueprintNodeStyles,
  BlueprintStateSnapshot,
  ButtonNodeData,
  BadgeNodeData,
  DividerNodeData,
  CardNodeData,
  HeadingNodeData,
  ParagraphNodeData,
  ListNodeData,
  ImageNodeData,
  InputNodeData,
  TextareaNodeData,
  SelectNodeData,
  NodeType,
} from '../types';

const WRAPPER_STYLE: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  padding: 24,
  borderRadius: 16,
  maxWidth: 480,
  width: '100%',
  boxShadow: '0 20px 45px rgba(15, 23, 42, 0.12)',
};

const HIDE_DND_STYLE = `
  [data-drop-zone],
  span[title="Drag"] {
    display: none !important;
  }
`;

type StoryComponentType = Extract<NodeType,
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'image'
  | 'button'
  | 'badge'
  | 'divider'
  | 'card'
  | 'input'
  | 'textarea'
  | 'select'
>;

interface BlueprintStoryArgs {
  type: StoryComponentType;
  data: BlueprintNodeData;
  styles?: BlueprintNodeStyles;
}

const BlueprintStoryView: React.FC<BlueprintStoryArgs> = ({ type, data, styles }) => {
  const node: BlueprintNode = {
    id: 'storybook-node',
    type,
    data,
    styles,
    children: [],
  } as BlueprintNode;

  const snapshot: BlueprintStateSnapshot = {
    root: {
      id: 'storybook-root',
      type: 'page',
      children: [node],
    } as BlueprintNode,
  };

  return (
    <div style={WRAPPER_STYLE}>
      <style>{HIDE_DND_STYLE}</style>
      <BlueprintProvider snapshot={snapshot}>
        <Renderer nodeId={node.id} />
      </BlueprintProvider>
    </div>
  );
};

const meta: Meta<BlueprintStoryArgs> = {
  title: 'Theme01/Blueprint Components',
  render: (args) => <BlueprintStoryView {...args} />,
  argTypes: {
    type: { control: false },
    data: { control: 'object' },
    styles: { control: 'object' },
  },
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
  },
};

export default meta;

type Story = StoryObj<BlueprintStoryArgs>;

export const Heading: Story = {
  args: {
    type: 'heading',
    data: {
      text: 'Lead with clarity',
      level: 2,
      align: 'center',
    } as HeadingNodeData,
    styles: {
      text: 'primary',
      fontWeight: 'semibold',
      px: 4,
      py: 2,
    },
  },
  parameters: {
    screenshot: { image: '/storybook-screenshots/heading.png', alt: 'Heading component screenshot' },
  },
};

export const Paragraph: Story = {
  args: {
    type: 'paragraph',
    data: {
      text: 'Use Theme 01 components to compose polished marketing pages with confidence. Tweak typography, space, and structure with a click.',
    } as ParagraphNodeData,
    styles: {
      text: 'muted',
      lineHeight: 'relaxed',
      px: 4,
    },
  },
  parameters: {
    screenshot: { image: '/storybook-screenshots/paragraph.png', alt: 'Paragraph component screenshot' },
  },
};

export const List: Story = {
  args: {
    type: 'list',
    data: {
      items: ['Composable layouts', 'Responsive tokens', 'Editor friendly'],
      ordered: false,
    } as ListNodeData,
    styles: {
      itemGap: 2,
    },
  },
  parameters: {
    screenshot: { image: '/storybook-screenshots/list.png', alt: 'List component screenshot' },
  },
};

export const Image: Story = {
  args: {
    type: 'image',
    data: {
      src: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=960&q=80',
      alt: 'Product team collaborating around a laptop',
      objectFit: 'cover',
      aspect: '16:9',
    } as ImageNodeData,
    styles: {
      rounded: 'lg',
      shadow: 'md',
    },
  },
  parameters: {
    screenshot: { image: '/storybook-screenshots/image.png', alt: 'Image component screenshot' },
  },
};

export const Button: Story = {
  args: {
    type: 'button',
    data: {
      label: 'Get started',
      href: { kind: 'route', slug: 'get-started' },
      size: 'md',
      variant: 'solid',
    } as ButtonNodeData,
    styles: {
      justify: 'center',
    },
  },
  parameters: {
    screenshot: { image: '/storybook-screenshots/button.png', alt: 'Button component screenshot' },
  },
};

export const Badge: Story = {
  args: {
    type: 'badge',
    data: {
      text: 'New',
      variant: 'solid',
    } as BadgeNodeData,
    styles: {
      text: 'surface',
      bg: 'primary',
    },
  },
  parameters: {
    screenshot: { image: '/storybook-screenshots/badge.png', alt: 'Badge component screenshot' },
  },
};

export const Divider: Story = {
  args: {
    type: 'divider',
    data: {
      orientation: 'horizontal',
    } as DividerNodeData,
    styles: {
      borderColor: 'muted',
      borderWidth: 1,
    },
  },
  parameters: {
    screenshot: { image: '/storybook-screenshots/divider.png', alt: 'Divider component screenshot' },
  },
};

export const Card: Story = {
  args: {
    type: 'card',
    data: {
      title: 'Scale content operations',
      body: 'Bring your brand foundations, layout primitives, and storytelling components together in one editor.',
      media: {
        kind: 'image',
        src: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=960&q=80',
        alt: 'Team planning with sticky notes',
      },
      actions: [
        { label: 'Explore styles' },
        { label: 'Contact sales' },
      ],
    } as CardNodeData,
    styles: {
      rounded: 'lg',
      shadow: 'md',
      bg: 'surface',
      p: 4,
    },
  },
  parameters: {
    screenshot: { image: '/storybook-screenshots/card.png', alt: 'Card component screenshot' },
  },
};

export const Input: Story = {
  args: {
    type: 'input',
    data: {
      label: 'Work email',
      placeholder: 'name@example.com',
      required: true,
      type: 'email',
    } as InputNodeData,
    styles: {
      width: 'full',
    },
  },
  parameters: {
    screenshot: { image: '/storybook-screenshots/input.png', alt: 'Input component screenshot' },
  },
};

export const Textarea: Story = {
  args: {
    type: 'textarea',
    data: {
      label: 'Project goals',
      placeholder: 'Share how we can help…',
      required: false,
      rows: 4,
    } as TextareaNodeData,
    styles: {
      width: 'full',
    },
  },
  parameters: {
    screenshot: { image: '/storybook-screenshots/textarea.png', alt: 'Textarea component screenshot' },
  },
};

export const Select: Story = {
  args: {
    type: 'select',
    data: {
      label: 'Team size',
      required: true,
      options: [
        { label: '1-10 people', value: 'small' },
        { label: '11-50 people', value: 'medium' },
        { label: '51-250 people', value: 'large' },
      ],
    } as SelectNodeData,
    styles: {
      width: 'full',
    },
  },
  parameters: {
    screenshot: { image: '/storybook-screenshots/select.png', alt: 'Select component screenshot' },
  },
};
