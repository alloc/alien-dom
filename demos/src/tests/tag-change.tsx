import { useEffect, useRef } from 'alien-dom'

export function Test() {
  const currentTag = useRef(() => A)

  useEffect(() => {
    setInterval(() => {
      currentTag.set(tag => (tag === A ? B : A))
    }, 500)
  }, [])

  const Tag = currentTag.value
  return (
    <div class="w-full h-full flex-wrap justify-center items-center">
      <Tag key="0" />
    </div>
  )
}

// FIXME(hmr): change both components at once. only the component that is
// currently rendered will use the updated code.
function A() {
  return (
    <div class="w-200 h-400 bg-red200 shrink-0 rounded-20">
      <div class="w-80 text-center">
        <span class="text-80 font-bold color-red500">A</span>
      </div>
    </div>
  )
}

function B() {
  return (
    <div class="w-200 h-400 bg-blue200 shrink-0 rounded-20">
      <div class="w-80 text-center">
        <span class="text-80 font-bold color-blue500">B</span>
      </div>
    </div>
  )
}
