import type { Meta, StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';
import { BlueprintProvider } from '../foundation/renderer/Renderer';
import { Renderer } from '../foundation/renderer/Renderer';
import type { BlueprintNode } from '../foundation/types';
import { theme01Tokens } from './tokens';

type Args = {
  bg?: string;
  text?: string;
  p?: number;
  rounded?: string;
  fontSize?: string;
  shadow?: string;
  sm_p?: number;
  md_p?: number;
  lg_p?: number;
};

const meta: Meta<Args> = {
  title: 'Styles/Demo',
  args: { p: 4, bg: 'muted', text: 'neutral' },
  argTypes: {
    bg: { control: 'select', options: Object.keys(theme01Tokens.color) },
    text: { control: 'select', options: Object.keys(theme01Tokens.color) },
    p: { control: 'select', options: [undefined,0,1,2,3,4,6,8,10,12,16] },
    rounded: { control: 'select', options: [undefined,'none','sm','md','lg','xl','full'] },
    fontSize: { control: 'select', options: [undefined,'xs','sm','base','lg','xl','2xl','3xl'] },
    shadow: { control: 'select', options: [undefined,'none','sm','md','lg','xl'] },
    sm_p: { control: 'select', options: [undefined,0,1,2,3,4,6,8,10,12,16] },
    md_p: { control: 'select', options: [undefined,0,1,2,3,4,6,8,10,12,16] },
    lg_p: { control: 'select', options: [undefined,0,1,2,3,4,6,8,10,12,16] },
  },
};

export default meta;
type Story = StoryObj<Args>;

export const SectionDemo: Story = {
  render: (args) => {
    const root: BlueprintNode = useMemo(() => ({
      id: 'page',
      type: 'page',
      children: [{
        id: 'sec', type: 'section', children: [], content: [],
        styles: {
          bg: args.bg, text: args.text, p: args.p, rounded: args.rounded, fontSize: args.fontSize, shadow: args.shadow,
          sm: { p: args.sm_p }, md: { p: args.md_p }, lg: { p: args.lg_p },
        },
      } as any],
    } as any), [args]);

    return (
      <BlueprintProvider snapshot={{ root }}>
        <Renderer nodeId="page" />
      </BlueprintProvider>
    );
  },
};


