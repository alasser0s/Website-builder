Theme 01 — Foundation

State container and validators for building an in-memory page blueprint.

State shape

- HistoryState: `{ past: Snapshot[], present: Snapshot, future: Snapshot[] }`
- Snapshot: `{ root: BlueprintNode }`
- BlueprintNode: `{ id: string, type: 'page'|'header'|'section'|'footer'|'container'|'component', data?, styles?, children? }`

Root node must have type: 'page'.

Actions

- addComponent(parentId, node)
- updateData(nodeId, data)
- updateStyles(nodeId, styles)
- reorder(parentId, from, to)
- wrapInContainer(nodeId, 'container')
- remove(nodeId)
- undo() / redo()

All actions validate with validateTree before committing history.

Selectors

- selectNodeById(root, id)
- selectChildren(root, id)
- selectPath(root, id) → `{ idPath, indexPath }`

Initial skeleton

A minimal page with Header / Section / Footer placeholders.

Testing

Use vitest to run unit tests. Snapshot tests verify reducer outputs and invariants.


