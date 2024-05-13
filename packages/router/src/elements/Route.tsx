import { attachRefs, useAsync, useEffect, useMemo, useState } from 'alien-dom'
import { Route } from '../objects/Route'
import { deepMerge } from '../util/deepMerge'
import { RouteContext, RouteInstance } from './RouteContext'

export function Route({
  instance,
  transformTitle,
}: {
  instance: RouteInstance
  transformTitle?: (title: string) => string
}) {
  const { route, match } = instance
  const state = useState(initRouteState, route, match.params)

  const app = route.app!
  const dataPromise = useMemo(() => app.load(route, match, state), [])
  const dataMemo = useState(() => ({ value: undefined as any }))
  const dataTask = useAsync(
    () =>
      dataPromise.then(data => {
        return (dataMemo.value = deepMerge(dataMemo.value, data))
      }),
    [dataPromise]
  )

  const data = useLastTruthy(dataTask.result)

  let error = dataTask.error
  let title = ''
  if (typeof route.title === 'string') {
    title = route.title
  } else {
    const getTitle = route.title
    const titleTask = useAsync(() => {
      return data !== undefined
        ? getTitle({ data, params: match.params, state })
        : undefined
    }, [data])

    if (titleTask.error) {
      error ||= titleTask.error
    } else if (titleTask.result) {
      title = titleTask.result
    }
  }

  useEffect(() => {
    if (error) {
      console.error(error)
    }
  }, [error])

  useEffect(() => {
    document.title = transformTitle ? transformTitle(title) : title
  }, [title])

  if (!route.data || data !== undefined) {
    const LoadedRoute = route.component
    return (
      <RouteContext value={instance}>
        <LoadedRoute data={data} params={match.params} state={state} />
      </RouteContext>
    )
  }

  if (dataTask.error) {
    return (
      <div class="flex-1 justify-center items-center">
        <span class="text-20">Error: {dataTask.error}</span>
      </div>
    )
  }

  return (
    <div class="flex-1 justify-center items-center">
      <span class="text-20">Loading...</span>
    </div>
  )
}

function initRouteState(Route: Route, params: any) {
  let { state, setState } = Route.app!
  if (!state && Route.state) {
    state = Route.state(params)
    if (state) {
      setState(state)
    }
  }
  return state ? attachRefs(state, () => setState({ ...state })) : null
}

type Falsy = false | null | undefined | 0 | ''

function useLastTruthy<T>(value: T): Exclude<T, Falsy> | undefined {
  const state = useState(UseLastTruthy)
  if (value) {
    state.value = value
  }
  return state.value
}

class UseLastTruthy {
  value: any = undefined
  dispose = true
}
