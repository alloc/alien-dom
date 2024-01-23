import { ref, useAsync, useEffect } from 'alien-dom'

const activeTest = ref<() => Promise<{ Test?: () => JSX.Element }>>(null)

function ActiveTest() {
  let message: string | undefined

  const loadTest = activeTest.value
  if (!loadTest) {
    message = 'Test not found.'
  }

  const { status, result, error } = useAsync(loadTest, [loadTest])

  const { Test } = result || {}

  if (status === 'loading') {
    message = 'Loading...'
  } else if (error) {
    message = error.message
    console.error(error)
  } else if (typeof Test !== 'function') {
    message = 'Test component not found.'
  }

  if (message) {
    return (
      <div class="w-full h-full both-center">
        <span class="text-60 font-bold">{message}</span>
      </div>
    )
  }

  return <Test />
}

function TestList({
  tests,
}: {
  tests: Record<string, () => Promise<{ Test: () => JSX.Element }>>
}) {
  console.log(tests)

  useEffect(() => {
    const slug = location.hash.slice(1)
    if (slug) {
      const name = Object.keys(tests).find(name => toSlug(name) === slug)
      activeTest.value = tests[name]
    }
  }, [])

  return (
    <div class="w-400 h-full shrink-0 text-size-[min(0.08vw,0.66px)] span:text-30 gap-30 border-r-1 border-r-gray300">
      {Object.keys(tests).map(name => (
        <div
          class={[
            'px-18 py-14',
            activeTest.computedMap(
              test => test === tests[name] && 'bg-gray100'
            ),
          ]}
          role="button"
          onClick={() => {
            location.hash = toSlug(name)
            activeTest.value = tests[name]
          }}>
          <span>{toTitleCase(name.match(/\.\/tests\/([\w-]+)/)![1])}</span>
        </div>
      ))}
    </div>
  )
}

export function App({ tests }: { tests: Record<string, () => Promise<any>> }) {
  return (
    <div class="flex-row h-100vh">
      <TestList tests={tests} />
      <ActiveTest />
    </div>
  )
}

function toTitleCase(str: string) {
  return str
    .replace(/(\w)(\w*)/g, (_, c1, c2) => c1.toUpperCase() + c2)
    .replace(/-/g, ' ')
}

function toSlug(str: string) {
  return str.match(/\/([\w-]+)\./)![1]
}
