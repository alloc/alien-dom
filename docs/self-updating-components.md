# Self Updating Components

- wrapped with `selfUpdating` call

## Limitations

- replacing or removing the root node of a self-updating component with native DOM methods will break component effects

## Temporary limitations

- the root element returned by the component should always have the same
  `nodeName` as the initial render
