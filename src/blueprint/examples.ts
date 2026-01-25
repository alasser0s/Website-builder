import type { BlueprintStateSnapshot } from '../theme01/foundation/types';

export const exampleMinimal: BlueprintStateSnapshot = {
	root: {
		id: 'pg_min',
		type: 'page',
		children: [],
	},
};

export const exampleWithContainer: BlueprintStateSnapshot = {
	root: {
		id: 'pg1',
		type: 'page',
		children: [
      { id: 'hdr1', type: 'header', children: [], slots: { logo: [], right: [] }, data: { navItems: [] } } as any,
			{
				id: 'sec1',
				type: 'section',
				children: [
					{ id: 'cont1', type: 'container', children: [{ id: 'cmp1', type: 'component', children: [] }] },
				],
			},
      { id: 'ftr1', type: 'footer', children: [], columns: [] } as any,
		],
	},
};


