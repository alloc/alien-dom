import { Transition, useRef } from 'alien-dom'

const colors = ['black', 'red', 'green', 'blue', 'yellow', 'purple']

export function Test() {
  const clicked = useRef(false)
  const color = useRef(0)

  return (
    <div class="w-full justify-center">
      <div class="self-center gap-20">
        <div
          role="button"
          class="cursor-pointer px-40 py-10 bg-gray100 hover:bg-gray200 rounded-full"
          onClick={() => (clicked.value = !clicked.value)}>
          <Transition
            id={clicked.value}
            enter={{
              from: { opacity: 0 },
              to: { opacity: 1 },
              spring: { dilate: 4 },
            }}
            leave={{
              to: { opacity: 0 },
              spring: { dilate: 4 },
            }}
            leaveClass="justify-center items-center">
            {clicked.value === false ? (
              <span
                class="text-40 font-bold"
                style={{ color: colors[color.value] }}>
                Click me
              </span>
            ) : (
              <span
                class="text-40 font-bold"
                style={{ color: colors[color.value] }}>
                Do it again
              </span>
            )}
          </Transition>
        </div>
        <div
          role="button"
          class="cursor-pointer px-40 py-10 bg-gray100 hover:bg-gray200 rounded-full self-center"
          onClick={() => {
            const nextColor = (color.value + 1) % colors.length
            console.log('nextColor:', nextColor, colors[nextColor])
            color.value = nextColor
          }}>
          <span class="text-25 font-bold">Change color</span>
        </div>
      </div>
    </div>
  )
}
