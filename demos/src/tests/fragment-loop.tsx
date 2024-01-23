import { Transition, useEffect, useForceUpdate } from 'alien-dom'

const colors = ['red', 'blue']

export function Test() {
  const forceUpdate = useForceUpdate()
  console.log('Test.render')

  return (
    <div class="w-full gap-100 justify-center items-center text-0.5">
      <button onClick={forceUpdate}>force update</button>
      <div class="flex-row gap-100">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} class="w-150 h-150">
            <Transition
              id={i}
              enter={({ initial }) => ({
                from: { scale: 0 },
                to: { scale: 1 },
              })}>
              <Pulsate
                class="w-full h-full justify-center items-center text-80 font-bold color-white"
                style={{ background: colors.at(i) }}>
                {i}
              </Pulsate>
            </Transition>
          </div>
        ))}
      </div>
    </div>
  )
}

function Pulsate(props: any) {
  const element = <div {...props} />

  useEffect(() => {
    const animation = () =>
      element.spring({
        to: { rotate: 0 },
        from: { rotate: 360 },
        velocity: -0.005,
        spring: { frequency: 5 },
        onRest: animation,
      })

    animation()
  }, [])

  return element
}
